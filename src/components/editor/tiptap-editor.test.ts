import { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { editorExtensions } from "@/components/editor/extensions";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
import { markdownToHtml } from "@/lib/markdown-to-html";

// These tests exercise the actual Tiptap schema used by TiptapEditor. A pure
// markdownToHtml ↔ htmlToMarkdown round-trip cannot catch the regression where
// StarterKit alone (no Link extension) silently strips <a> tags on parse —
// only a real Editor instance does, since the schema lives in @tiptap/core.

function loadAndExport(content: string): { html: string; markdown: string } {
	const editor = new Editor({ extensions: editorExtensions, content });
	const html = editor.getHTML();
	editor.destroy();
	return { html, markdown: htmlToMarkdown(html) };
}

describe("TiptapEditor schema", () => {
	it("registers the link mark — without it, anchors are stripped on parse", () => {
		// Direct schema assertion: if a future StarterKit upgrade or `link: false`
		// config drops the mark, the round-trip test below also fails, but this
		// gives a clearer error message about *why*.
		const editor = new Editor({ extensions: editorExtensions, content: "" });
		expect(Object.keys(editor.schema.marks)).toContain("link");
		editor.destroy();
	});

	it("does not register duplicate extensions", () => {
		// StarterKit v3 already bundles Link and Underline — registering a
		// second instance produces two extensions with the same name and
		// implementation-defined resolution. Lock in single-registration so a
		// future contributor doesn't accidentally re-add `Link` to the array.
		const editor = new Editor({ extensions: editorExtensions, content: "" });
		const names = editor.extensionManager.extensions.map((x) => x.name);
		const dupes = names.filter((n, i) => names.indexOf(n) !== i);
		editor.destroy();
		expect(dupes).toEqual([]);
	});

	it("preserves markdown links across a load → getHTML → htmlToMarkdown round trip", () => {
		const md = "Visit [Site](https://example.com) for details.";
		const { html, markdown } = loadAndExport(markdownToHtml(md));

		expect(html).toContain('href="https://example.com"');
		expect(markdown).toContain("[Site](https://example.com)");
	});

	it("preserves multiple contact links the way a CV header would emit them", () => {
		const md =
			"# Jane Doe\n\n**Senior Engineer**\n\njane@example.com • [Website](https://example.com) • [LinkedIn](https://linkedin.com/in/jane)";
		const { markdown } = loadAndExport(markdownToHtml(md));

		expect(markdown).toContain("[Website](https://example.com)");
		expect(markdown).toContain("[LinkedIn](https://linkedin.com/in/jane)");
		// Title and name survive as block elements.
		expect(markdown).toMatch(/# Jane Doe/);
		expect(markdown).toContain("**Senior Engineer**");
	});
});
