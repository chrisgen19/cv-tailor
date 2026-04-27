// Convert the narrow markdown subset our pipeline emits (jsonToMarkdown output:
// headings, paragraphs, bullets, inline emphasis, links) into HTML that Tiptap
// can render. Keeping this in-tree avoids pulling in marked/remark for what
// is, in practice, a fixed grammar. The inverse converter lives in
// `html-to-markdown.ts` and the two should evolve together.

const ESC_MAP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ESC_MAP[c] ?? c);
}

// Inline pass: links → emphasis. Order matters — we escape first, then inject
// tags so user-supplied `<` in plain text never escapes the encoder.
function renderInline(raw: string): string {
	let s = escapeHtml(raw);
	// [label](url) — both sides are already HTML-escaped, so quotes in URL are
	// encoded; that's fine for href attributes.
	s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
		return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
	});
	// **bold** before *italic* so `**x**` doesn't get eaten by the italic regex.
	s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
	return s;
}

export function markdownToHtml(markdown: string): string {
	const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
	const out: string[] = [];
	let inList = false;

	const closeList = () => {
		if (inList) {
			out.push("</ul>");
			inList = false;
		}
	};

	const paragraphBuf: string[] = [];
	const flushParagraph = () => {
		if (paragraphBuf.length === 0) return;
		const text = paragraphBuf.join(" ").trim();
		paragraphBuf.length = 0;
		if (text) out.push(`<p>${renderInline(text)}</p>`);
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed) {
			flushParagraph();
			closeList();
			continue;
		}

		const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
		if (heading) {
			flushParagraph();
			closeList();
			const level = Math.min(heading[1].length, 3); // Tiptap is configured for h1–h3
			out.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
			continue;
		}

		const bullet = trimmed.match(/^[-*]\s+(.+)$/);
		if (bullet) {
			flushParagraph();
			if (!inList) {
				out.push("<ul>");
				inList = true;
			}
			out.push(`<li>${renderInline(bullet[1].trim())}</li>`);
			continue;
		}

		closeList();
		paragraphBuf.push(trimmed);
	}

	flushParagraph();
	closeList();

	return out.join("");
}
