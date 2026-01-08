import { visit } from "unist-util-visit";
import type { Root, Text, Link, Parent } from "mdast";
import type { AskCitation } from "@/lib/ask";

interface RemarkCitationsOptions {
  citations: AskCitation[];
  citationDisplayNumberById?: Map<string, number>;
}

const CITATION_REGEX = /\[(\d+|c_[^\]]+)\](?:\(citation:[^\)]+\))?/g;

export function remarkCitations(options: RemarkCitationsOptions) {
  const { citations, citationDisplayNumberById } = options;

  const localDisplayMap = new Map<string, number>();

  const getCitationForRef = (
    ref: string
  ): { citation?: AskCitation; displayNum?: number } => {
    let citation: AskCitation | undefined;
    let displayNum: number | undefined;

    if (/^\d+$/.test(ref)) {
      const idx = parseInt(ref, 10) - 1;
      if (idx >= 0 && idx < citations.length) {
        citation = citations[idx];
        displayNum = parseInt(ref, 10);
      }
    } else if (ref.startsWith("c_")) {
      citation = citations.find((c) => c.id === ref);
      if (citation) {
        displayNum =
          citationDisplayNumberById?.get(citation.id) ??
          localDisplayMap.get(citation.id);
        if (!displayNum) {
          displayNum = localDisplayMap.size + 1;
          localDisplayMap.set(citation.id, displayNum);
        }
      }
    }

    return { citation, displayNum };
  };

  return function transform(tree: Root) {
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || typeof index !== "number" || !node.value) return;

      const value = node.value;
      let match: RegExpExecArray | null;
      let lastIndex = 0;
      const newChildren: (Text | Link)[] = [];

      CITATION_REGEX.lastIndex = 0;

      while ((match = CITATION_REGEX.exec(value)) !== null) {
        const fullMatch = match[0];
        const ref = match[1];

        if (match.index > lastIndex) {
          newChildren.push({
            type: "text",
            value: value.slice(lastIndex, match.index),
          });
        }

        const { citation, displayNum } = getCitationForRef(ref);

        if (citation && displayNum != null) {
          newChildren.push({
            type: "link",
            url: "#",
            title: null,
            children: [{ type: "text", value: `[${displayNum}]` }],
            data: {
              hProperties: {
                "data-citation-id": citation.id,
                "data-citation-num": String(displayNum),
              },
            },
          });
        } else {
          newChildren.push({
            type: "link",
            url: "#",
            title: null,
            children: [{ type: "text", value: `[${ref}]` }],
            data: {
              hProperties: {
                "data-citation-ref": ref,
              },
            },
          });
        }

        lastIndex = match.index + fullMatch.length;
      }

      if (lastIndex === 0) return;

      if (lastIndex < value.length) {
        newChildren.push({
          type: "text",
          value: value.slice(lastIndex),
        });
      }

      parent.children.splice(index, 1, ...newChildren);
      return index + newChildren.length;
    });

    visit(tree, "link", (node: Link, index, parent: Parent | undefined) => {
      if (!parent || typeof index !== "number") return;
      if (!node.url.startsWith("citation:")) return;

      const labelText =
        node.children.length === 1 && node.children[0].type === "text"
          ? (node.children[0] as Text).value
          : "";
      const refMatch = /^(\d+|c_[^\]]+)$/.exec(labelText);
      if (!refMatch) return;

      const ref = refMatch[1];
      const { citation, displayNum } = getCitationForRef(ref);

      if (citation && displayNum != null) {
        node.url = "#";
        node.children = [{ type: "text", value: `[${displayNum}]` }];
        node.data = {
          ...(node.data || {}),
          hProperties: {
            ...((node.data?.hProperties as Record<string, unknown>) || {}),
            "data-citation-id": citation.id,
            "data-citation-num": String(displayNum),
          },
        };
      } else {
        node.url = "#";
        node.data = {
          ...(node.data || {}),
          hProperties: {
            ...((node.data?.hProperties as Record<string, unknown>) || {}),
            "data-citation-ref": ref,
          },
        };
      }
    });
  };
}
