import { visit, SKIP } from "unist-util-visit";
import type { Root, Text, Link, Parent } from "mdast";
import { EPISODE_INDEX } from "./episode-index";

// "E10" or "E10 (Mindstamp)" -> a link node the `a` renderer turns into an
// episode chip. Text already inside a link is left alone.
const RE = /\bE(0[1-9]|1[0-2])\b(\s*\([^)\n]{1,40}\))?/g;

export function remarkEpisodes() {
  return function transform(tree: Root) {
    visit(tree, (node, index, parent: Parent | undefined) => {
      if (node.type === "link") return SKIP;
      if (node.type !== "text" || !parent || typeof index !== "number") return;
      const value = (node as Text).value;
      const out: (Text | Link)[] = [];
      let last = 0;
      RE.lastIndex = 0;
      for (let m; (m = RE.exec(value)); ) {
        const num = `E${m[1]}`;
        const ep = EPISODE_INDEX[num];
        if (!ep) continue;
        if (m.index > last) out.push({ type: "text", value: value.slice(last, m.index) });
        out.push({
          type: "link",
          url: `/v/${ep.slug}`,
          title: null,
          children: [{ type: "text", value: m[0] }],
          data: { hProperties: { "data-episode": num } },
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
