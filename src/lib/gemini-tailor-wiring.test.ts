import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchAnalysis } from "@/lib/gemini";

const generateContent = vi.fn();
const cachesCreate = vi.fn();
const cachesUpdate = vi.fn();
const cachesDelete = vi.fn();

vi.mock("@google/genai", () => ({
	GoogleGenAI: class {
		models = { generateContent };
		caches = {
			create: cachesCreate,
			update: cachesUpdate,
			delete: cachesDelete,
		};
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

const emptyMatch: MatchAnalysis = {
	matchScore: 0,
	summary: "",
	matchedSkills: [],
	missingSkills: [],
	recommendations: [],
};

beforeEach(() => {
	generateContent.mockReset();
	cachesCreate.mockReset();
	cachesUpdate.mockReset();
	cachesDelete.mockReset();
	generateContent.mockResolvedValue({ text: JSON.stringify(validTailoredCv) });
});

describe("tailorCV wiring", () => {
	it("passes TAILOR_SYSTEM_INSTRUCTION via config.systemInstruction on draft", async () => {
		const { tailorCV, TAILOR_SYSTEM_INSTRUCTION } = await import("@/lib/gemini");

		await tailorCV({
			cvText: "CV TEXT",
			jobDescription: "JD TEXT",
			matchAnalysis: emptyMatch,
			skipCritique: true,
		});

		expect(generateContent).toHaveBeenCalledTimes(1);
		const call = generateContent.mock.calls[0][0];
		expect(call.config.systemInstruction).toBe(TAILOR_SYSTEM_INSTRUCTION);
		expect(call.config.responseMimeType).toBe("application/json");
		expect(call.config.responseSchema).toBeDefined();
		expect(call.config.cachedContent).toBeUndefined();
	});

	it("passes the user prompt (CV + JD + match analysis) as user content", async () => {
		const { tailorCV } = await import("@/lib/gemini");

		await tailorCV({
			cvText: "CV BODY",
			jobDescription: "JD BODY",
			matchAnalysis: {
				...emptyMatch,
				matchedSkills: [{ skill: "TypeScript", evidence: "", relevance: "high" }],
			},
			skipCritique: true,
		});

		const call = generateContent.mock.calls[0][0];
		expect(call.contents[0].role).toBe("user");
		const text = call.contents[0].parts[0].text as string;
		expect(text).toContain("ORIGINAL CV:\nCV BODY");
		expect(text).toContain("JOB DESCRIPTION:\nJD BODY");
		expect(text).toContain("Matched skills: TypeScript");
	});

	it("uses cachedContent and omits CV from user prompt when provided", async () => {
		const { tailorCV } = await import("@/lib/gemini");

		await tailorCV({
			cvText: "CV BODY",
			jobDescription: "JD BODY",
			matchAnalysis: emptyMatch,
			cachedContent: "cachedContents/abc123",
			skipCritique: true,
		});

		const call = generateContent.mock.calls[0][0];
		expect(call.config.cachedContent).toBe("cachedContents/abc123");
		expect(call.config.systemInstruction).toBeUndefined();
		const text = call.contents[0].parts[0].text as string;
		expect(text).not.toContain("ORIGINAL CV:");
		expect(text).toContain("JOB DESCRIPTION:\nJD BODY");
	});

	it("runs the critique pass by default and returns its revised CV", async () => {
		const draft = { ...validTailoredCv, summary: "Draft summary" };
		const revised = { ...validTailoredCv, summary: "Revised summary" };
		generateContent
			.mockResolvedValueOnce({ text: JSON.stringify(draft) })
			.mockResolvedValueOnce({ text: JSON.stringify(revised) });

		const { tailorCV, TAILOR_CRITIQUE_SYSTEM_INSTRUCTION } = await import(
			"@/lib/gemini"
		);

		const out = await tailorCV({
			cvText: "CV",
			jobDescription: "JD",
			matchAnalysis: emptyMatch,
		});

		expect(generateContent).toHaveBeenCalledTimes(2);
		expect(generateContent.mock.calls[1][0].config.systemInstruction).toBe(
			TAILOR_CRITIQUE_SYSTEM_INSTRUCTION,
		);
		expect(out.summary).toBe("Revised summary");
	});

	it("skipCritique=true runs only one generateContent call", async () => {
		const { tailorCV } = await import("@/lib/gemini");
		await tailorCV({
			cvText: "CV",
			jobDescription: "JD",
			matchAnalysis: emptyMatch,
			skipCritique: true,
		});
		expect(generateContent).toHaveBeenCalledTimes(1);
	});
});

describe("master CV cache lifecycle", () => {
	it("createCachedMasterCv returns name + server expireTime on success", async () => {
		const serverExpiry = "2030-01-02T03:04:05Z";
		cachesCreate.mockResolvedValue({
			name: "cachedContents/xyz",
			expireTime: serverExpiry,
		});
		const { createCachedMasterCv } = await import("@/lib/gemini");

		const result = await createCachedMasterCv("master-1", "raw text".repeat(100));

		expect(cachesCreate).toHaveBeenCalledTimes(1);
		const params = cachesCreate.mock.calls[0][0];
		expect(params.config.ttl).toMatch(/^\d+s$/);
		expect(params.config.systemInstruction).toBeDefined();
		expect(result?.name).toBe("cachedContents/xyz");
		expect(result?.expiresAt.toISOString()).toBe(new Date(serverExpiry).toISOString());
	});

	it("createCachedMasterCv falls back to TTL-based expiry when server omits expireTime", async () => {
		cachesCreate.mockResolvedValue({ name: "cachedContents/xyz" });
		const { createCachedMasterCv } = await import("@/lib/gemini");

		const before = Date.now();
		const result = await createCachedMasterCv("master-1", "raw");
		const after = Date.now();

		expect(result?.expiresAt.getTime()).toBeGreaterThanOrEqual(before);
		expect(result?.expiresAt.getTime()).toBeLessThanOrEqual(after + 3600 * 1000 + 50);
	});

	it("createCachedMasterCv returns null on SDK failure (graceful fallback)", async () => {
		cachesCreate.mockRejectedValue(new Error("content too small"));
		const { createCachedMasterCv } = await import("@/lib/gemini");
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await createCachedMasterCv("master-1", "tiny");

		expect(result).toBeNull();
	});

	it("extendCachedMasterCv returns server expireTime on success", async () => {
		const serverExpiry = "2030-06-01T00:00:00Z";
		cachesUpdate.mockResolvedValue({ expireTime: serverExpiry });
		const { extendCachedMasterCv } = await import("@/lib/gemini");

		const result = await extendCachedMasterCv("cachedContents/xyz");

		expect(cachesUpdate).toHaveBeenCalledWith({
			name: "cachedContents/xyz",
			config: { ttl: expect.stringMatching(/^\d+s$/) },
		});
		expect(result?.toISOString()).toBe(new Date(serverExpiry).toISOString());
	});

	it("extendCachedMasterCv returns null on SDK failure", async () => {
		cachesUpdate.mockRejectedValue(new Error("not found"));
		const { extendCachedMasterCv } = await import("@/lib/gemini");
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await extendCachedMasterCv("cachedContents/xyz");

		expect(result).toBeNull();
	});

	it("deleteCachedMasterCv calls SDK delete and swallows errors", async () => {
		cachesDelete.mockResolvedValue({});
		const { deleteCachedMasterCv } = await import("@/lib/gemini");

		await deleteCachedMasterCv("cachedContents/xyz");

		expect(cachesDelete).toHaveBeenCalledWith({ name: "cachedContents/xyz" });
	});

	it("deleteCachedMasterCvStrict throws on real failures", async () => {
		cachesDelete.mockRejectedValue(new Error("network down"));
		const { deleteCachedMasterCvStrict } = await import("@/lib/gemini");

		await expect(deleteCachedMasterCvStrict("cachedContents/xyz")).rejects.toThrow(
			/network down/,
		);
	});

	it("deleteCachedMasterCvStrict treats not-found as success", async () => {
		cachesDelete.mockRejectedValue(new Error("HTTP 404 not found"));
		const { deleteCachedMasterCvStrict } = await import("@/lib/gemini");

		await expect(
			deleteCachedMasterCvStrict("cachedContents/xyz"),
		).resolves.toBeUndefined();
	});
});

describe("stale cachedContent fallback", () => {
	it("retries with inline CV when cached content is reported missing", async () => {
		const draft = { ...validTailoredCv, summary: "Inline draft" };
		generateContent
			.mockRejectedValueOnce(new Error("CachedContent not found: cachedContents/old"))
			.mockResolvedValueOnce({ text: JSON.stringify(draft) });
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const { tailorCVWithMeta } = await import("@/lib/gemini");

		const result = await tailorCVWithMeta({
			cvText: "FULL CV BODY",
			jobDescription: "JD",
			matchAnalysis: emptyMatch,
			cachedContent: "cachedContents/old",
			skipCritique: true,
		});

		expect(generateContent).toHaveBeenCalledTimes(2);
		const firstCall = generateContent.mock.calls[0][0];
		const secondCall = generateContent.mock.calls[1][0];
		expect(firstCall.config.cachedContent).toBe("cachedContents/old");
		expect(secondCall.config.cachedContent).toBeUndefined();
		expect(secondCall.config.systemInstruction).toBeDefined();
		expect(secondCall.contents[0].parts[0].text).toContain("ORIGINAL CV:\nFULL CV BODY");
		expect(result.cv.summary).toBe("Inline draft");
		expect(result.cacheWasStale).toBe(true);
	});

	it("does not fall back when error is unrelated to cache", async () => {
		generateContent.mockRejectedValue(new Error("rate limit exceeded"));

		const { tailorCVWithMeta } = await import("@/lib/gemini");

		await expect(
			tailorCVWithMeta({
				cvText: "CV",
				jobDescription: "JD",
				matchAnalysis: emptyMatch,
				cachedContent: "cachedContents/old",
				skipCritique: true,
			}),
		).rejects.toThrow(/rate limit/);
	});
});
