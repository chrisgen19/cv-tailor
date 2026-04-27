import { describe, expect, it } from "vitest";
import { TAILOR_SYSTEM_INSTRUCTION, buildTailorUserPrompt } from "@/lib/gemini";

describe("tailor prompt", () => {
	it("system instruction contains all five strengthened rules", () => {
		expect(TAILOR_SYSTEM_INSTRUCTION).toMatch(/RULE 1 — ANTI-FABRICATION/);
		expect(TAILOR_SYSTEM_INSTRUCTION).toMatch(/RULE 2 — LENGTH BUDGET/);
		expect(TAILOR_SYSTEM_INSTRUCTION).toMatch(/RULE 3 — KEYWORD DENSITY/);
		expect(TAILOR_SYSTEM_INSTRUCTION).toMatch(/RULE 4 — EMPHASIS PRESERVATION/);
		expect(TAILOR_SYSTEM_INSTRUCTION).toMatch(/RULE 5 — BULLET STYLE/);
	});

	it("system instruction encodes specific length, density, and bullet limits", () => {
		expect(TAILOR_SYSTEM_INSTRUCTION).toContain("550 total words");
		expect(TAILOR_SYSTEM_INSTRUCTION).toContain("950 total words");
		expect(TAILOR_SYSTEM_INSTRUCTION).toContain("70–80%");
		expect(TAILOR_SYSTEM_INSTRUCTION).toContain("25 words");
	});

	it("user prompt embeds CV, JD, and match analysis", () => {
		const prompt = buildTailorUserPrompt("CV BODY", "JD BODY", {
			matchScore: 0,
			summary: "",
			matchedSkills: [
				{ skill: "TypeScript", evidence: "", relevance: "high" },
				{ skill: "React", evidence: "", relevance: "high" },
			],
			missingSkills: [{ skill: "Rust", importance: "preferred", suggestion: "" }],
			recommendations: ["Add metrics", "Reorder sections"],
		});
		expect(prompt).toContain("ORIGINAL CV:\nCV BODY");
		expect(prompt).toContain("JOB DESCRIPTION:\nJD BODY");
		expect(prompt).toContain("Matched skills: TypeScript, React");
		expect(prompt).toContain("Missing skills: Rust");
		expect(prompt).toContain("Recommendations: Add metrics; Reorder sections");
	});

	it("handles empty match analysis arrays without crashing", () => {
		const prompt = buildTailorUserPrompt("CV", "JD", {
			matchScore: 0,
			summary: "",
			matchedSkills: [],
			missingSkills: [],
			recommendations: [],
		});
		expect(prompt).toContain("Matched skills:");
		expect(prompt).toContain("Missing skills:");
		expect(prompt).toContain("Recommendations:");
	});

	it("truncates oversized CV text to MAX_TAILOR_CV_CHARS", () => {
		const huge = "x".repeat(40_000);
		const prompt = buildTailorUserPrompt(huge, "JD", {
			matchScore: 0,
			summary: "",
			matchedSkills: [],
			missingSkills: [],
			recommendations: [],
		});
		const cvSection = prompt.split("JOB DESCRIPTION:")[0];
		expect(cvSection.length).toBeLessThan(31_000);
	});
});
