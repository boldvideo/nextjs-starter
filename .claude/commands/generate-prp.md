# Create PRP for Elixir/Phoenix

## Feature file: $ARGUMENTS

Generate a complete PRP for Elixir/Phoenix feature implementation with thorough research. Ensure context is passed to the AI agent to enable self-validation and iterative refinement. Read the feature file first to understand what needs to be created, how the examples provided help, and any other considerations.

The AI agent only gets the context you are appending to the PRP and training data. Assume the AI agent has access to the codebase and the same knowledge cutoff as you, so it's important that your research findings are included or referenced in the PRP. The Agent has Web search capabilities, so pass URLs to documentation and examples.

## Research Process

1. **Codebase Analysis**

   - Search for similar GenServers/LiveViews/Contexts in the codebase
   - Identify Phoenix patterns (contexts, schemas, views) to reference
   - Check existing Ecto queries and changesets patterns
   - Review test factories and fixtures
   - Note supervision tree integration points
   - Identify files to reference in PRP
   - Check test patterns for validation approach

2. **External Research**

   - HexDocs for relevant packages (include specific URLs)
   - ElixirForum discussions on similar implementations
   - Specific sections from:
     - Phoenix Guides (https://hexdocs.pm/phoenix/overview.html)
     - Ecto documentation (https://hexdocs.pm/ecto/Ecto.html)
     - LiveView documentation if applicable (https://hexdocs.pm/phoenix_live_view)
   - Elixir School patterns (https://elixirschool.com)
   - GitHub examples of similar features
   - Best practices and common pitfalls

3. **Elixir-Specific Considerations**

   - OTP design principles application
   - Fault tolerance requirements
   - Process communication patterns
   - Memory/performance implications
   - Supervision strategy

4. **User Clarification** (if needed)
   - Specific patterns to mirror and where to find them?
   - Integration requirements with existing contexts?
   - Performance requirements?
   - Error handling expectations?

## PRP Generation

Using PRPs/templates/prp_base.md as template:

### Critical Context to Include

- **Documentation**: HexDocs URLs with specific sections
- **Code Examples**: Real snippets from codebase showing patterns
- **Dependencies**: Required hex packages and versions
- **Gotchas**: Library quirks, version issues, OTP considerations
- **Patterns**: Existing approaches to follow from codebase
- **Database**: Schema changes, migrations needed

### Elixir Idioms & Best Practices

- Pattern matching over conditionals
- Pipeline-friendly functions (|>)
- Explicit over implicit
- Let it crash philosophy
- Small, composable functions
- Proper use of with statements
- Function heads for default arguments

### Coding Style Inspiration

Reference patterns from Elixir thought leaders:

- **José Valim**: Pattern matching elegance, meta-programming restraint
- **Saša Jurić**: GenServer patterns from "Elixir in Action"
- **Dave Thomas**: Small functions, transformation pipelines
- **Chris McCord**: Phoenix patterns, LiveView architecture

### Implementation Blueprint

- Module structure and naming conventions
- Public API design with typespecs
- GenServer vs simple modules decision
- Database transaction boundaries
- Error handling with {:ok, _} | {:error, _} tuples
- Start with pseudocode showing approach
- Reference real files for patterns
- List tasks to be completed in order:
  1. Schema/Migration changes
  2. Context functions
  3. Core business logic
  4. Web layer (controllers/LiveViews)
  5. Tests
  6. Documentation

### Phoenix-Specific Patterns

- Context boundaries and responsibilities
- Schema vs embedded schema decisions
- Controller/LiveView action patterns
- Plug pipeline considerations
- PubSub usage patterns
- Channel patterns (if applicable)

### Testing Strategy

- Unit tests with ExUnit
- Property-based tests with StreamData (if applicable)
- Integration tests for contexts
- LiveView tests (if applicable)
- Mock/stub strategy using Mox
- Factory patterns with ExMachina
- Async vs sync test decisions

### Validation Gates (Must be Executable)

```bash
# Format check
mix format --check-formatted

# Static Analysis
mix credo --strict
mix dialyzer

# Compilation with warnings as errors
mix compile --warnings-as-errors

# Run tests with coverage
mix test --cover --warnings-as-errors

# Run tests with trace for debugging
mix test --trace --slowest 10

# Documentation generation
mix docs

# Database validations (if migrations involved)
mix ecto.create
mix ecto.migrate
mix ecto.rollback

# Security check
mix sobelow --config

# Dependency audit
mix deps.audit

# Full validation suite
mix format --check-formatted && \
  mix credo --strict && \
  mix compile --warnings-as-errors && \
  mix test --cover && \
  mix dialyzer
```

### Performance Considerations

- Identify potential bottlenecks
- Consider ETS/DETS for caching
- Database query optimization (N+1 queries)
- Process pooling requirements
- Memory usage patterns

### Monitoring & Observability

- Telemetry events to add
- Logger statements for debugging
- Error tracking integration
- Metrics to expose

### Rollback Plan

- Database migration rollback steps
- Feature flag considerations
- Backward compatibility requirements
- Data migration reversal (if applicable)

**_ CRITICAL: AFTER YOU ARE DONE RESEARCHING AND EXPLORING THE CODEBASE BEFORE YOU START WRITING THE PRP _**

**_ ULTRATHINK ABOUT THE PRP AND PLAN YOUR APPROACH THEN START WRITING THE PRP _**

## Output

Save as: `PRPs/{feature-name}.md`

## Quality Checklist

- [ ] All necessary context included for AI agent
- [ ] Validation gates are executable
- [ ] References existing patterns with file paths
- [ ] Clear implementation path with ordered tasks
- [ ] Error handling documented with examples
- [ ] Follows OTP principles
- [ ] Respects Phoenix contexts
- [ ] Includes proper typespecs examples
- [ ] Tests cover happy path and edge cases
- [ ] Performance implications considered
- [ ] Supervision tree integration documented
- [ ] Database migrations included (if needed)
- [ ] Dependencies listed with versions
- [ ] Rollback plan included for risky changes

## Confidence Score

Score the PRP on a scale of 1-10 (confidence level to succeed in one-pass implementation using Claude/Cursor)

Scoring Guidelines:

- 9-10: All patterns well-documented, similar examples in codebase, straightforward implementation
- 7-8: Most patterns clear, some complexity but manageable
- 5-6: Significant unknowns, may need iteration
- Below 5: Needs more research or scope refinement

Remember: The goal is one-pass implementation success through comprehensive context. Include all URLs, code examples, and specific patterns the AI needs to implement the feature correctly.
