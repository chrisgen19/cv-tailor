import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "@/lib/html-to-markdown";

describe("htmlToMarkdown", () => {
	it("converts Tiptap paragraphs", () => {
		expect(htmlToMarkdown("<p>Hello world</p><p>Second line</p>")).toBe(
			"Hello world\n\nSecond line",
		);
	});

	it("converts headings", () => {
		expect(htmlToMarkdown("<h1>Name</h1><h2>Section</h2>")).toBe("# Name\n\n## Section");
	});

	it("converts inline emphasis", () => {
		expect(htmlToMarkdown("<p>Built <strong>scalable</strong> <em>APIs</em></p>")).toBe(
			"Built **scalable** *APIs*",
		);
	});

	it("converts unordered and ordered lists", () => {
		expect(htmlToMarkdown("<ul><li>One</li><li>Two</li></ul><ol><li>A</li><li>B</li></ol>")).toBe(
			"- One\n- Two\n\n- A\n- B",
		);
	});

	it("converts anchors with href", () => {
		expect(htmlToMarkdown('<p>Visit <a href="https://example.com">our site</a></p>')).toBe(
			"Visit [our site](https://example.com)",
		);
	});

	it("decodes common entities", () => {
		expect(htmlToMarkdown("<p>R&amp;D &nbsp;rocks</p>")).toBe("R&D  rocks");
	});

	it("preserves <br> as a newline", () => {
		expect(htmlToMarkdown("<p>Line 1<br />Line 2</p>")).toBe("Line 1\nLine 2");
	});

	it("returns empty for empty/whitespace HTML", () => {
		expect(htmlToMarkdown("")).toBe("");
		expect(htmlToMarkdown("<p></p>")).toBe("");
	});
});
