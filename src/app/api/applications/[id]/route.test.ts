import { describe, expect, it } from "vitest";
import { resolveEditedTailoredCvJson } from "./route";

describe("resolveEditedTailoredCvJson", () => {
	it("leaves JSON untouched when tailoredCVEdited is absent from the patch", () => {
		expect(resolveEditedTailoredCvJson(undefined)).toEqual({ kind: "leave" });
	});

	it("clears JSON when the editor is cleared to empty string", () => {
		expect(resolveEditedTailoredCvJson("")).toEqual({ kind: "clear" });
		expect(resolveEditedTailoredCvJson("   \n  ")).toEqual({ kind: "clear" });
	});

	it("clears JSON when edited content is HTML (Tiptap) so it is not silently stale", () => {
		const html = "<p>Edited CV from the rich-text editor.</p>";
		expect(resolveEditedTailoredCvJson(html)).toEqual({ kind: "clear" });
	});

	it("sets JSON to the parsed structure when edited content is markdown", () => {
		const md = "# Jane Doe\n\njane@example.com\n\n## Summary\n\nTen years of experience.";
		const result = resolveEditedTailoredCvJson(md);
		expect(result.kind).toBe("set");
		if (result.kind !== "set") return;
		const value = result.value as { header: { name: string }; summary: string };
		expect(value.header.name).toBe("Jane Doe");
		expect(value.summary).toContain("Ten years");
	});
});
