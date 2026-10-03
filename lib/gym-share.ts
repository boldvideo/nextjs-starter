/**
 * The sharer's first name on a shared link (?by=Marcel), so whoever opens it
 * sees who asked. Letters only, short: it lands in page titles and the share
 * card, so nothing else gets through.
 */
// Any letter, any script (constructed: the tsconfig target predates the u flag)
const NOT_A_NAME = new RegExp("[^\\p{L}' -]", "gu");

export function sharerName(raw: string | null | undefined): string | null {
  const name = raw?.trim().replace(NOT_A_NAME, "").slice(0, 24).trim();
  return name ? name : null;
}
