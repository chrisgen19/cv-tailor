import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
import { markdownToHtml } from "@/lib/markdown-to-html";

describe("markdownToHtml", () => {
	it("converts headings and paragraphs", () => {
		const md = "# Title\n\n## Section\n\nA paragraph.";
		expect(markdownToHtml(md)).toBe(
			"<h1>Title</h1><h2>Section</h2><p>A paragraph.</p>",
		);
	});

	it("clamps headings beyond h3 to match Tiptap config", () => {
		expect(markdownToHtml("#### Deep")).toBe("<h3>Deep</h3>");
	});

	it("converts bullet lists with inline emphasis", () => {
		const md = "- **First** item\n- *Second* item";
		expect(markdownToHtml(md)).toBe(
			"<ul><li><strong>First</strong> item</li><li><em>Second</em> item</li></ul>",
		);
	});

	it("renders links with safe target+rel attributes", () => {
		const md = "Visit [my site](https://example.com) for more.";
		expect(markdownToHtml(md)).toBe(
			'<p>Visit <a href="https://example.com" target="_blank" rel="noopener noreferrer">my site</a> for more.</p>',
		);
	});

	it("escapes HTML entities in plain text", () => {
		expect(markdownToHtml("a < b & c > d")).toBe(
			"<p>a &lt; b &amp; c &gt; d</p>",
		);
	});

	it("handles bold-then-italic without crossing tag boundaries", () => {
		expect(markdownToHtml("**bold** and *italic*")).toBe(
			"<p><strong>bold</strong> and <em>italic</em></p>",
		);
	});

	it("treats blank lines as paragraph breaks and closes lists", () => {
		const md = "Para one.\n\n- item\n\nPara two.";
		expect(markdownToHtml(md)).toBe(
			"<p>Para one.</p><ul><li>item</li></ul><p>Para two.</p>",
		);
	});

	it("returns empty string for empty input", () => {
		expect(markdownToHtml("")).toBe("");
	});

	it("rejects unsafe protocols and renders the literal markdown instead", () => {
		expect(markdownToHtml("[click](javascript:alert(1))")).toBe(
			"<p>[click](javascript:alert(1))</p>",
		);
		expect(markdownToHtml("[mail](mailto:hi@example.com)")).toBe(
			'<p><a href="mailto:hi@example.com" target="_blank" rel="noopener noreferrer">mail</a></p>',
		);
	});

	it("links survive a markdown → HTML → markdown round trip", () => {
		const md = "Visit [Site](https://example.com) and [GitHub](https://github.com/x).";
		const roundTripped = htmlToMarkdown(markdownToHtml(md));
		expect(roundTripped).toContain("[Site](https://example.com)");
		expect(roundTripped).toContain("[GitHub](https://github.com/x)");
	});
});
