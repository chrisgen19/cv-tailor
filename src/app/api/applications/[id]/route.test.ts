import { describe, expect, it } from "vitest";
import { normalizeEmptyStringsToNull, resolveEditedTailoredCvJson } from "./route";

describe("normalizeEmptyStringsToNull", () => {
	it("rewrites empty strings to null for the listed nullable text fields", () => {
		const result = normalizeEmptyStringsToNull({
			salaryCurrency: "",
			locationAddress: "",
			companyWebsite: "",
			contactName: "",
			contactEmail: "",
			contactPhone: "",
		});
		expect(result).toEqual({
			salaryCurrency: null,
			locationAddress: null,
			companyWebsite: null,
			contactName: null,
			contactEmail: null,
			contactPhone: null,
		});
	});

	it("preserves non-empty strings", () => {
		const result = normalizeEmptyStringsToNull({
			contactEmail: "jane@example.com",
			contactName: "Jane",
		});
		expect(result.contactEmail).toBe("jane@example.com");
		expect(result.contactName).toBe("Jane");
	});

	it("leaves explicit null values alone", () => {
		const result = normalizeEmptyStringsToNull({ companyWebsite: null });
		expect(result.companyWebsite).toBeNull();
	});

	it("does not touch fields outside the nullable text list", () => {
		const input = { contactName: "Jane", title: "" } as unknown as {
			salaryCurrency?: string | null;
			contactName?: string | null;
		};
		const result = normalizeEmptyStringsToNull(input);
		// title is an empty string but is not in NULLABLE_TEXT_FIELDS, so it stays.
		expect((result as unknown as { title: string }).title).toBe("");
		expect(result.contactName).toBe("Jane");
	});
});

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
