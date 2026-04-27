import { describe, expect, it } from "vitest";
import { parseInlineEmphasis } from "@/lib/inline-emphasis";

describe("parseInlineEmphasis", () => {
	it("returns plain text unchanged", () => {
		expect(parseInlineEmphasis("hello world")).toEqual([
			{ text: "hello world", bold: false, italic: false },
		]);
	});

	it("parses **bold**", () => {
		expect(parseInlineEmphasis("Built **scalable** APIs")).toEqual([
			{ text: "Built ", bold: false, italic: false },
			{ text: "scalable", bold: true, italic: false },
			{ text: " APIs", bold: false, italic: false },
		]);
	});

	it("parses *italic*", () => {
		expect(parseInlineEmphasis("Used *Postgres* for storage")).toEqual([
			{ text: "Used ", bold: false, italic: false },
			{ text: "Postgres", bold: false, italic: true },
			{ text: " for storage", bold: false, italic: false },
		]);
	});

	it("parses bold and italic in the same string", () => {
		expect(parseInlineEmphasis("**A** then *B* end")).toEqual([
			{ text: "A", bold: true, italic: false },
			{ text: " then ", bold: false, italic: false },
			{ text: "B", bold: false, italic: true },
			{ text: " end", bold: false, italic: false },
		]);
	});

	it("does not double-match nested or empty markers", () => {
		// Empty markers should fall through as plain text.
		expect(parseInlineEmphasis("****")).toEqual([{ text: "****", bold: false, italic: false }]);
	});

	it("handles empty input", () => {
		expect(parseInlineEmphasis("")).toEqual([{ text: "", bold: false, italic: false }]);
	});
});
