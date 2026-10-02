---
title: Test Bold prompt-template changes against real retrieval without shipping them
date: 2026-10-02
category: developer-experience
module: Bold answer_synthesis prompt templates (bold_admin AnswerSynthesizer, account overrides)
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - Changing an account's answer_synthesis prompt template or persona fields before shipping
  - Sampling a draft prompt against real library retrieval and the account's live model
  - Checking that caller-prescribed formats still pass through a draft prompt
  - Running ad-hoc Elixir on the bold_admin production node via rpc
symptoms:
  - A draft prompt can only be tried by activating it for every live caller
  - The evals runner needs a saved template row (prompt_fork_id) before it can test a variant
  - Harness runs of ARCADE-style prompts retrieved nothing even with the live prompt
  - rpc script writes failed with permission denied inside docker cp'd directories
related_components:
  - service_layer
  - infrastructure
tags: [prompt-template, answer-synthesis, bold-admin, rpc, prod-testing, evals, gtm-game]
---

# Test Bold prompt-template changes against real retrieval without shipping them

## Context

The GTM Game's answers come from Bold's `answer_synthesis` prompt template, overridden per account in bold_admin's `prompt_templates` table. A template change goes live for every caller of that account the moment a new active version exists. The account's callers include the portal's answers, the Objection Dodger (ARCADE MODE) and Roast my pitch (ROAST MODE). Local testing doesn't help much: the useful signal is how the real model answers with the account's real retrieval, persona and library. This session needed to see 5–10 sample answers per draft before shipping, across several drafts (prompt v2 through v2.4, which became prod template versions 1–5).

Paths below starting with `lib/bold_admin/`, plus `justfile`, are in the bold_admin repository (`~/code/BOLD/code/bold_admin`), not this portal repo.

bold_admin has two built-in paths, and neither fit:

- **Mission Control's RAG workbench** shows and runs the account's active template (`lib/bold_admin/ai/workbench.ex`): it accepts draft *model* overrides but not a draft template, and it runs with `viewer: nil`.
- **The Evals runner** can synthesize a variant against a frozen retrieval, but `fetch_prompt_template/2` loads the variant from the DB (`lib/bold_admin/evals/runner.ex:164-165`, `Repo.get(PromptTemplate, prompt_fork_id)`). That means inserting a row first, and its `build_context/1` sets `viewer: nil` (`runner.ex:181`, `:191`), so personalized answers can't be tested.

The hook that makes in-memory testing possible: `synthesize_with_stable_citations/4` (`lib/bold_admin/ai/askers/answer_synthesizer.ex:276`) resolves its template as `Keyword.get(opts, :prompt_template) || PromptTemplates.get_active_template(...)` (`answer_synthesizer.ex:456`). Pass a `%PromptTemplate{}` struct that never touches the DB, and the real pipeline renders it.

## Guidance

**The harness.** It lives at `thoughts/shared/plans/2026-10-02-gtm-game-prompt-v2/run_samples.exs` in the portal repo. `thoughts/` is gitignored (`.gitignore:46`), so it's a local file. Its shape:

```elixir
tpl = %PromptTemplate{template_type: "answer_synthesis", system_prompt_template: sys,
                      user_prompt_template: usr, account_id: 110, version: 0, is_active: false}
ctx = %{tenant: "bt_gtm-gym", account_id: 110, account: account, account_settings: settings,
        org: %{profile: ...}, viewer: %{"profile" => "..."}, history: history,
        library_manifest: BoldAdmin.AI.LibraryManifest.get_cached(account, tenant), classify_intent: true}
{:ok, sr} = Runner.DefaultSearch.search([q], ctx)            # real two-tier retrieval
chunks = sr |> Map.get(:chunks, []) |> SourceEvidence.normalize_chunks(tenant)
{:ok, res} = AnswerSynthesizer.synthesize_with_stable_citations(q, chunks, ctx,
               confidence: Map.get(sr, :confidence, :high),
               intent: get_in(sr, [:metadata, :intent]) || "insight", prompt_template: tpl)
```

Notes on the parts:

- **Viewer profile:** it must be a string-keyed `"profile"` map. `PromptVariables` checks `Map.has_key?(viewer, "profile")` (`lib/bold_admin/ai/prompt_variables.ex:46`).
- **Persona:** persona fields come from the account's DB settings (`prompt_variables.ex:50`). To preview *new* persona text, the harness string-replaces `{{ persona.voice }}` and friends in the draft before building the struct (`run_samples.exs:17`).
- **Follow-ups:** a follow-up is a second call with `history: [%{role: "user", ...}, %{role: "assistant", ...}]`.
- **Appended blocks:** the synthesizer still appends the citation contract, video-title and style blocks unless the template already contains their sentinels (`answer_synthesizer.ex:496-498`). The rendered prompt therefore matches production.

**Running it on the prod node** (no deploy, no DB writes except normal AI logging):

```bash
C=$(ssh deploy@bold-app-1 "docker ps --format '{{.Names}}' | grep bold-admin-web-production | head -1")  # re-resolve every time
scp files deploy@bold-app-1:/tmp/gtm_v2/ && ssh deploy@bold-app-1 \
  "docker exec $C mkdir -p /tmp/gtm_v2; docker cp /tmp/gtm_v2/<f> $C:/tmp/gtm_v2/<f>;
   docker exec $C bin/bold_admin rpc 'Code.eval_file(\"/tmp/gtm_v2/run_samples.exs\")';
   docker exec $C cat /tmp/gtm_v2_out/out.json" > out.json
```

Read-only checks go through `ssh deploy@bold-db-1 "docker exec bold-admin-db psql -U bold bold_admin -c ..."`, the non-interactive form of `just psql` (`justfile:312-313`).

**Shipping a tested draft.** Use `PromptTemplates.create_new_version/2`. It deactivates the current version and inserts version+1 inside `Repo.transaction` (`lib/bold_admin/ai/prompt_templates.ex:136-139`), then clears the account's AI caches (`:155`). It returns `{:ok, template}`, so pattern-match the tuple. The old row stays for rollback. Account templates win over the system template in `get_active_template` (`:50`). After shipping, confirm with a SQL read (`select id, version, is_active … where account_id = …`) and one live question through the Bold API.

### Pitfalls hit along the way

- **Struct vs map:** `Map.new(citation)` crashed. `ordered_citations` are `%BoldAdmin.AI.Citation{}` structs, so read fields directly (`c.id`, `c.video_title`, `c.timestamp_seconds`).
- **Output permissions:** `docker cp` created `/tmp/gtm_v2` owned by a different user than the app, and `File.write!` failed with `:eacces`. Write outputs to a directory the app creates itself (`out_dir = "/tmp/gtm_v2_out"`, `File.mkdir_p!`, `run_samples.exs:7`).
- **Stream timeouts:** "Stream failed: :timeout" hit about 1 in 7 runs in this session under parallel synthesis. The harness retries each synthesis 3 times (`run_samples.exs:63`), runs at `max_concurrency: 3` (`:90`), and writes each answer as it lands.
- **Raw-query retrieval:** `DefaultSearch` searches the raw question (`runner.ex:283-298`); the production ask pipeline rewrites it first. The ARCADE MODE request therefore retrieved nothing for both the live v1 template *and* the v2 draft. Comparing both templates in the same harness proved it was the harness, not the draft. To test format passthrough, retrieve with a rewritten query and synthesize with the real prompt.
- **Container replaced:** a bold_admin deploy mid-session swapped the container (`bold-admin-web-production-<sha>`), so `docker exec` failed with "is not running". Re-resolve the name with `docker ps` before every run, and re-copy the files.
- **Misleading crash on ship:** the first ship script wrapped `create_new_version/2`'s result in another `{:ok, …}` (`ship.exs:22`, still in the local file), so the follow-up `IO.puts` raised even though the version had been created. Match the result directly (`{:ok, new} = PromptTemplates.create_new_version(...)`, as the later ship scripts did), and verify with SQL before retrying, or you'll create a duplicate version.

## Why This Matters

A prompt change is a production deploy without CI: it changes every caller at once, including formats another feature depends on. The in-memory harness gave real answers for each draft in a few minutes in this session, which let the session catch a marker-dropping regression, a factual-intent gap and a follow-up bait-and-switch before users saw them.

## When to Apply

- Any edit to an account's `answer_synthesis` template or persona text.
- Comparing two drafts on the same questions. Run both in the same harness so retrieval differences cancel out.
- Before shipping, always include: off-topic questions, a two-level follow-up thread, and each caller's explicit format (ARCADE, ROAST).

## Examples

Before: "edit in Mission Control, ask live, hope". The draft is live for every caller while you look.

After: draft in `v2_system.liquid`, then 5–10 sample answers from the prod node in memory, then a fix and re-run, then `create_new_version`, an SQL check, and one live API question. Each draft from prompt v2 to v2.4 went through this loop.

## Related

- `docs/solutions/design-patterns/prompt-portal-answer-contract.md`: what to sample for (shape, detours, caller formats, follow-up promises) and why the prompt and portal parser change together.
- `thoughts/shared/plans/2026-10-02-gtm-game-prompt-v2/README.md` (local only; `thoughts/` is gitignored): the v1 ship notes and the harness files (`run_samples.exs`, `ship.exs`).
