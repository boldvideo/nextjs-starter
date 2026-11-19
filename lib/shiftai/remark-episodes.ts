import { visit, SKIP } from "unist-util-visit";
import type { Root, Text, Link, Parent } from "mdast";
import { EPISODE_INDEX, GUEST_RE, episodeKeyForName } from "./episode-index";

// A guest's name in an answer ("Olivier Pailhès (Aircall)") becomes a link the
// `a` renderer turns into an episode reference. Only the first mention of each
// guest in a text node is linked; text already inside a link is left alone.
export function remarkEpisodes() {
  return function transform(tree: Root) {
    const seen = new Set<string>();
    visit(tree, (node, index, parent: Parent | undefined) => {
      if (node.type === "link") return SKIP;
      if (node.type !== "text" || !parent || typeof index !== "number") return;
      const value = (node as Text).value;
      const out: (Text | Link)[] = [];
      let last = 0;
      GUEST_RE.lastIndex = 0;
      for (let m; (m = GUEST_RE.exec(value)); ) {
        const key = episodeKeyForName(m[1]);
        const ep = key ? EPISODE_INDEX[key] : null;
        if (!key || !ep?.slug || seen.has(key)) continue;
        seen.add(key);
        if (m.index > last) out.push({ type: "text", value: value.slice(last, m.index) });
        out.push({
          type: "link",
          url: `/v/${ep.slug}`,
          title: null,
          children: [{ type: "text", value: m[0] }],
          data: { hProperties: { "data-episode": key } },
        });
        last = m.index + m[0].length;
      }
      if (!out.length) return;
      if (last < value.length) out.push({ type: "text", value: value.slice(last) });
      parent.children.splice(index, 1, ...(out as Parent["children"]));
      return index + out.length;
    });
  };
}
