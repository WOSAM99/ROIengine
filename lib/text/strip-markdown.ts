/**
 * Strip markdown syntax from AI-generated prose so it renders as clean plain text.
 *
 * The dashboard intentionally has no markdown renderer: AI narratives and chat
 * answers are displayed in styled `<p>` / `<li>` elements and the React layer owns
 * all formatting. When the model emits markdown emphasis (`**bold**`), headings
 * (`### Title`), or list markers (`* item`), the raw tokens would otherwise show as
 * literal characters. This function removes those tokens. It also cleans narratives
 * that were stored before the prompts were tightened, so no re-generation is needed.
 */

/**
 * Remove inline and block markdown tokens from a string, returning plain prose.
 * Safe on plain text (returns it unchanged aside from trimming).
 *
 * @param input Raw text that may contain markdown emphasis, headings, list markers,
 *   inline code, or links.
 * @returns The same text with markdown syntax removed.
 */
export function stripInlineMarkdown(input: string): string {
  if (!input) return input;
  return input.split("\n").map(stripLine).join("\n").trim();
}

/**
 * Strip markdown tokens from a single line: leading heading/blockquote/bullet
 * markers, then inline emphasis, inline code, and link syntax.
 *
 * @param line One line of text.
 * @returns The line with markdown removed, preserving its leading indentation.
 */
function stripLine(line: string): string {
  let out = line;

  out = out.replace(/^\s*#{1,6}\s+/, "");
  out = out.replace(/^\s*>\s?/, "");
  out = out.replace(/^(\s*)[-*+]\s+/, "$1");

  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  out = out.replace(/__(.+?)__/g, "$1");
  out = out.replace(/\*(.+?)\*/g, "$1");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Sweep any unbalanced emphasis markers the patterns above could not pair.
  out = out.replace(/\*\*/g, "");

  return out;
}
