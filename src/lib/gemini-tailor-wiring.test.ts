import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
	GoogleGenAI: class {
		models = { generateContent };
	},
}));

const validTailoredCv = {
	header: { name: "Jane Doe" },
	summary: "Test summary.",
	skills: [],
	experience: [],
	education: [],
	projects: [],
	certifications: [],
};

describe("tailorCV wiring", () => {
	beforeEach(() => {
		generateContent.mockReset();
		generateContent.mockResolvedValue({ text: JSON.stringify(validTailoredCv) });
	});

	it("passes TAILOR_SYSTEM_INSTRUCTION via config.systemInstruction", async () => {
		const { tailorCV, TAILOR_SYSTEM_INSTRUCTION } = await import("@/lib/gemini");

		await tailorCV("CV TEXT", "JD TEXT", {
			matchScore: 0,
			summary: "",
			matchedSkills: [],
			missingSkills: [],
			recommendations: [],
		});

		expect(generateContent).toHaveBeenCalledTimes(1);
		const call = generateContent.mock.calls[0][0];
		expect(call.config.systemInstruction).toBe(TAILOR_SYSTEM_INSTRUCTION);
		expect(call.config.responseMimeType).toBe("application/json");
		expect(call.config.responseSchema).toBeDefined();
	});

	it("passes the user prompt (CV + JD + match analysis) as user content", async () => {
		const { tailorCV } = await import("@/lib/gemini");

		await tailorCV("CV BODY", "JD BODY", {
			matchScore: 0,
			summary: "",
			matchedSkills: [{ skill: "TypeScript", evidence: "", relevance: "high" }],
			missingSkills: [],
			recommendations: [],
		});

		const call = generateContent.mock.calls[0][0];
		expect(call.contents[0].role).toBe("user");
		const text = call.contents[0].parts[0].text as string;
		expect(text).toContain("ORIGINAL CV:\nCV BODY");
		expect(text).toContain("JOB DESCRIPTION:\nJD BODY");
		expect(text).toContain("Matched skills: TypeScript");
	});
});
