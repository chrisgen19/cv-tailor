// Convert Tiptap-style HTML (the output of TiptapEditor.editor.getHTML()) to
// markdown that the rest of the export pipeline understands. Tiptap emits a
// well-formed, narrow subset of HTML — paragraphs, headings, lists, inline
// emphasis, line breaks, anchors — which makes a regex-based converter
// tractable without pulling in a DOM parser. Content is treated as untrusted
// markdown after conversion; downstream renderers do not interpret HTML.

const ENTITIES: Record<string, string> = {
	"&nbsp;": " ",
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
	"&apos;": "'",
};

export function htmlToMarkdown(html: string): string {
	let s = html.replace(/\r\n?/g, "\n");

	// Headings before paragraphs so we don't strip their wrapping tags first.
	s = s.replace(/<\s*h1\b[^>]*>([\s\S]*?)<\s*\/h1\s*>/gi, "\n# $1\n\n");
	s = s.replace(/<\s*h2\b[^>]*>([\s\S]*?)<\s*\/h2\s*>/gi, "\n## $1\n\n");
	s = s.replace(/<\s*h3\b[^>]*>([\s\S]*?)<\s*\/h3\s*>/gi, "\n### $1\n\n");
	s = s.replace(/<\s*h[4-6]\b[^>]*>([\s\S]*?)<\s*\/h[4-6]\s*>/gi, "\n#### $1\n\n");

	// Block-level breaks.
	s = s
		.replace(/<\s*br\s*\/?\s*>/gi, "\n")
		.replace(/<\s*\/p\s*>/gi, "\n\n")
		.replace(/<\s*\/div\s*>/gi, "\n\n")
		.replace(/<\s*p\b[^>]*>/gi, "")
		.replace(/<\s*div\b[^>]*>/gi, "");

	// Lists — treat ordered and unordered identically (downstream re-numbers).
	s = s.replace(/<\s*li\b[^>]*>([\s\S]*?)<\s*\/li\s*>/gi, "- $1\n");
	s = s.replace(/<\s*\/?(?:ul|ol)\b[^>]*>/gi, "\n");

	// Inline emphasis.
	s = s.replace(/<\s*(?:strong|b)\b[^>]*>([\s\S]*?)<\s*\/(?:strong|b)\s*>/gi, "**$1**");
	s = s.replace(/<\s*(?:em|i)\b[^>]*>([\s\S]*?)<\s*\/(?:em|i)\s*>/gi, "*$1*");

	// Anchors — preserve href as a markdown link.
	s = s.replace(/<\s*a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\s*\/a\s*>/gi, "[$2]($1)");

	// Strip any remaining tags.
	s = s.replace(/<[^>]+>/g, "");

	// Decode the handful of entities Tiptap commonly emits.
	s = s.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (m) => ENTITIES[m] ?? m);

	// Collapse runs of blank lines and normalize trailing whitespace.
	s = s.replace(/\n{3,}/g, "\n\n");
	return s.trim();
}
