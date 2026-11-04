import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("A Smart Bear")
    .items([
      S.documentTypeListItem("episode").title("Episodes"),
      S.documentTypeListItem("person").title("People"),
      S.documentTypeListItem("tool").title("Toolbox"),
      S.divider(),
      S.listItem().title("The book").id("book").child(S.document().schemaType("book").documentId("book")),
      S.documentTypeListItem("bookChapter").title("Book chapters"),
      S.documentTypeListItem("talk").title("Talks"),
      S.divider(),
      S.listItem().title("Site").id("siteSettings").child(S.document().schemaType("siteSettings").documentId("siteSettings")),
    ]);
