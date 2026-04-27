import { GoogleGenAI } from "@google/genai";
import type { TailoredCv } from "@/lib/cv-schema";
import { TailoredCvResponseSchema, TailoredCvSchema } from "@/lib/cv-schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-3.1-pro-preview";
const MAX_RETRIES = 2;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt < MAX_RETRIES) {
				await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
			}
		}
	}
	throw lastError;
}

export interface ParsedCV {
	contact: {
		name: string;
		email?: string;
		phone?: string;
		location?: string;
		linkedin?: string;
		website?: string;
	};
	summary: string;
	experience: Array<{
		company: string;
		title: string;
		startDate: string;
		endDate: string;
		bullets: string[];
	}>;
	education: Array<{
		institution: string;
		degree: string;
		field: string;
		startDate: string;
		endDate: string;
	}>;
	skills: Record<string, string[]>;
	certifications: Array<{
		name: string;
		issuer?: string;
		date?: string;
	}>;
}

export async function parseCV(rawText: string): Promise<ParsedCV> {
	return withRetry(async () => {
		const response = await ai.models.generateContent({
			model: MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `You are an expert CV/resume parser. Extract structured data from the following CV text.

Return a JSON object with these fields:
- contact: { name, email, phone, location, linkedin, website } (strings, use empty string if not found)
- summary: string (professional summary/objective, or empty string)
- experience: array of { company, title, startDate, endDate, bullets: string[] }
- education: array of { institution, degree, field, startDate, endDate }
- skills: object where keys are category names (e.g. "Programming Languages", "Frameworks") and values are arrays of skill strings
- certifications: array of { name, issuer, date }

If a section is not found in the CV, use an empty array or empty string as appropriate.

CV TEXT:
${rawText}`,
						},
					],
				},
			],
			config: {
				responseMimeType: "application/json",
			},
		});

		const text = response.text;
		if (!text) throw new Error("Empty response from Gemini");
		return JSON.parse(text) as ParsedCV;
	});
}

// ─── Job Meta Extraction ──────────────────────────────────────────────

export interface JobMeta {
	title: string;
	company: string;
}

export async function extractJobMeta(description: string): Promise<JobMeta> {
	return withRetry(async () => {
		const response = await ai.models.generateContent({
			model: MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `Extract the job title and company name from this job description. If not found, use empty string.

Return JSON: { "title": "...", "company": "..." }

JOB DESCRIPTION:
${description.slice(0, 3000)}`,
						},
					],
				},
			],
			config: { responseMimeType: "application/json" },
		});

		const text = response.text;
		if (!text) throw new Error("Empty response from Gemini");
		return JSON.parse(text) as JobMeta;
	});
}

// ─── Job Requirements Parsing ─────────────────────────────────────────

export interface ParsedRequirements {
	requiredSkills: string[];
	preferredSkills: string[];
	responsibilities: string[];
	qualifications: string[];
	experienceLevel: string;
	employmentType: string;
}

export async function parseJobRequirements(
	description: string,
): Promise<ParsedRequirements> {
	return withRetry(async () => {
		const response = await ai.models.generateContent({
			model: MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `You are an expert job description analyzer. Parse this job description into structured requirements.

Return a JSON object with:
- requiredSkills: string[] (must-have skills explicitly stated)
- preferredSkills: string[] (nice-to-have or preferred skills)
- responsibilities: string[] (key job responsibilities)
- qualifications: string[] (education, certifications, or other qualifications)
- experienceLevel: string (e.g. "Entry", "Mid", "Senior", "Lead", or "Not specified")
- employmentType: string (e.g. "Full-time", "Part-time", "Contract", or "Not specified")

JOB DESCRIPTION:
${description}`,
						},
					],
				},
			],
			config: { responseMimeType: "application/json" },
		});

		const text = response.text;
		if (!text) throw new Error("Empty response from Gemini");
		return JSON.parse(text) as ParsedRequirements;
	});
}

// ─── Match Analysis ──────────────────────────────────────────────────

export interface MatchAnalysis {
	matchScore: number;
	summary: string;
	matchedSkills: Array<{
		skill: string;
		evidence: string;
		relevance: "high" | "medium" | "low";
	}>;
	missingSkills: Array<{
		skill: string;
		importance: "required" | "preferred";
		suggestion: string;
	}>;
	recommendations: string[];
}

export async function analyzeMatch(
	cvText: string,
	jobDescription: string,
): Promise<MatchAnalysis> {
	return withRetry(async () => {
		const response = await ai.models.generateContent({
			model: MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `You are a senior recruitment consultant and ATS optimization expert. Analyze how well this CV matches the job description.

Return a JSON object with:
- matchScore: number 0-100 (realistic assessment — 90+ is rare)
- summary: string (2-3 sentence overview of fit)
- matchedSkills: array of { skill: string, evidence: string (quote or paraphrase from CV), relevance: "high"|"medium"|"low" }
- missingSkills: array of { skill: string, importance: "required"|"preferred", suggestion: string (how to address this gap) }
- recommendations: string[] (3-5 actionable tips to improve the match)

Be thorough but honest. Only mark skills as matched if there is clear evidence in the CV.

CV TEXT:
${cvText}

JOB DESCRIPTION:
${jobDescription}`,
						},
					],
				},
			],
			config: { responseMimeType: "application/json" },
		});

		const text = response.text;
		if (!text) throw new Error("Empty response from Gemini");
		return JSON.parse(text) as MatchAnalysis;
	});
}

// ─── CV Tailoring ────────────────────────────────────────────────────

/** Hard cap on CV text passed to the tailor prompt to bound token cost. */
export const MAX_TAILOR_CV_CHARS = 30_000;

/** TTL for the master-CV Gemini context cache. */
export const MASTER_CV_CACHE_TTL_SECONDS = 3600;

/**
 * System instruction for tailorCV. RULE 4 (Markdown bold inside bullets) is a
 * load-bearing contract with the DOCX/PDF renderers — see issues #10 and #11.
 * Edits should preserve that signal or update both renderers in lockstep.
 */
export const TAILOR_SYSTEM_INSTRUCTION = `You are an expert CV writer and ATS optimization specialist tailoring a candidate's CV to a specific job description.

RULE 1 — ANTI-FABRICATION (highest priority)
Only include skills, tools, employers, titles, dates, and accomplishments that appear verbatim or as a clear synonym in ORIGINAL CV. If the JOB DESCRIPTION asks for skill X and the ORIGINAL CV contains no evidence of X, omit X entirely. Never invent metrics, certifications, or employment history. When in doubt, leave it out.

RULE 2 — LENGTH BUDGET
Target one page: at most 550 total words across summary + experience bullets + project bullets + skills items combined. If the candidate has 10 or more years of experience evident in ORIGINAL CV, you may extend to a two-page budget of at most 950 total words. Compress or drop the least relevant experience to stay within budget.

RULE 3 — KEYWORD DENSITY
Mirror 70–80% of the JOB DESCRIPTION's hard skills (technologies, tools, methodologies, certifications) using the JD's exact phrasing wherever the candidate has matching evidence in ORIGINAL CV. Do not keyword-stuff: every keyword must appear inside a natural, truthful sentence describing real work the candidate has done.

RULE 4 — EMPHASIS PRESERVATION
Inside experience and project bullet text, wrap JD-aligned keywords in \`**term**\` (markdown bold) so downstream renderers can style them. Use emphasis sparingly — at most one or two bolded terms per bullet — and only on terms that match RULE 3.

RULE 5 — BULLET STYLE
Each experience and project bullet must:
- Start with a strong past-tense action verb (Led, Shipped, Migrated, Reduced, Architected, etc.) — never "Responsible for" or "Worked on".
- Contain a quantified result when ORIGINAL CV provides one. Do not fabricate numbers to satisfy this rule.
- Stay under 25 words. Trim filler words.

OUTPUT
Return JSON matching the provided response schema. Do not return markdown, explanations, or commentary outside the schema. Reorder \`experience\` so the most JD-relevant role appears first.`;

function formatMatchAnalysis(matchAnalysis: MatchAnalysis): string {
	return `MATCH ANALYSIS:
Matched skills: ${matchAnalysis.matchedSkills.map((s) => s.skill).join(", ")}
Missing skills: ${matchAnalysis.missingSkills.map((s) => s.skill).join(", ")}
Recommendations: ${matchAnalysis.recommendations.join("; ")}`;
}

export function buildTailorUserPrompt(
	cvText: string,
	jobDescription: string,
	matchAnalysis: MatchAnalysis,
): string {
	const boundedCv =
		cvText.length > MAX_TAILOR_CV_CHARS ? cvText.slice(0, MAX_TAILOR_CV_CHARS) : cvText;
	return `ORIGINAL CV:
${boundedCv}

JOB DESCRIPTION:
${jobDescription}

${formatMatchAnalysis(matchAnalysis)}`;
}

/** Used when ORIGINAL CV is supplied via Gemini context cache. */
export function buildTailorUserPromptCached(
	jobDescription: string,
	matchAnalysis: MatchAnalysis,
): string {
	return `JOB DESCRIPTION:
${jobDescription}

${formatMatchAnalysis(matchAnalysis)}`;
}

// ─── Master CV cache lifecycle ───────────────────────────────────────

export interface MasterCvCacheResult {
	name: string;
	expiresAt: Date;
}

/**
 * Create a Gemini context cache holding ORIGINAL CV + system instruction.
 * Returns null on failure (e.g. content below the model's minimum cache size,
 * transient SDK error). Callers should treat null as "no cache available" and
 * fall back to inline CV in the user prompt.
 */
export async function createCachedMasterCv(
	masterCvId: string,
	rawText: string,
): Promise<MasterCvCacheResult | null> {
	const boundedCv =
		rawText.length > MAX_TAILOR_CV_CHARS ? rawText.slice(0, MAX_TAILOR_CV_CHARS) : rawText;
	try {
		const cache = await ai.caches.create({
			model: MODEL,
			config: {
				contents: [
					{ role: "user", parts: [{ text: `ORIGINAL CV:\n${boundedCv}` }] },
				],
				systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
				ttl: `${MASTER_CV_CACHE_TTL_SECONDS}s`,
				displayName: `master-cv-${masterCvId}`,
			},
		});
		if (!cache.name) return null;
		return {
			name: cache.name,
			expiresAt: new Date(Date.now() + MASTER_CV_CACHE_TTL_SECONDS * 1000),
		};
	} catch (err) {
		console.warn(
			`[tailor] master CV cache create failed (id=${masterCvId}): ${err instanceof Error ? err.message : String(err)}`,
		);
		return null;
	}
}

export async function extendCachedMasterCv(name: string): Promise<Date | null> {
	try {
		await ai.caches.update({
			name,
			config: { ttl: `${MASTER_CV_CACHE_TTL_SECONDS}s` },
		});
		return new Date(Date.now() + MASTER_CV_CACHE_TTL_SECONDS * 1000);
	} catch (err) {
		console.warn(
			`[tailor] master CV cache extend failed: ${err instanceof Error ? err.message : String(err)}`,
		);
		return null;
	}
}

export async function deleteCachedMasterCv(name: string): Promise<void> {
	try {
		await ai.caches.delete({ name });
	} catch (err) {
		console.warn(
			`[tailor] master CV cache delete failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

// ─── Tailor (with optional cache + self-critique) ────────────────────

interface UsageInfo {
	promptTokens?: number;
	cachedTokens?: number;
	outputTokens?: number;
}

function readUsage(meta: unknown): UsageInfo {
	const m = meta as
		| {
				promptTokenCount?: number;
				cachedContentTokenCount?: number;
				candidatesTokenCount?: number;
		  }
		| undefined;
	return {
		promptTokens: m?.promptTokenCount,
		cachedTokens: m?.cachedContentTokenCount,
		outputTokens: m?.candidatesTokenCount,
	};
}

function logUsage(label: string, usage: UsageInfo): void {
	if (process.env.TAILOR_LOG_USAGE === "0") return;
	console.log(
		`[tailor] ${label} prompt=${usage.promptTokens ?? "?"} cached=${usage.cachedTokens ?? 0} output=${usage.outputTokens ?? "?"}`,
	);
}

interface TailorOnceInput {
	cvText: string;
	jobDescription: string;
	matchAnalysis: MatchAnalysis;
	cachedContent?: string;
}

async function tailorDraft(
	input: TailorOnceInput,
): Promise<{ cv: TailoredCv; usage: UsageInfo }> {
	const userText = input.cachedContent
		? buildTailorUserPromptCached(input.jobDescription, input.matchAnalysis)
		: buildTailorUserPrompt(input.cvText, input.jobDescription, input.matchAnalysis);

	const response = await ai.models.generateContent({
		model: MODEL,
		contents: [{ role: "user", parts: [{ text: userText }] }],
		config: {
			...(input.cachedContent
				? { cachedContent: input.cachedContent }
				: { systemInstruction: TAILOR_SYSTEM_INSTRUCTION }),
			responseMimeType: "application/json",
			responseSchema: TailoredCvResponseSchema,
		},
	});

	const text = response.text;
	if (!text) throw new Error("Empty response from Gemini");
	return {
		cv: TailoredCvSchema.parse(JSON.parse(text)),
		usage: readUsage(response.usageMetadata),
	};
}

export const TAILOR_CRITIQUE_SYSTEM_INSTRUCTION = `You are reviewing a tailored CV draft for truthfulness and JD alignment.

Your task:
1. For each experience and project bullet in DRAFT, verify it traces to ORIGINAL CV. Remove or rewrite any bullet that fabricates skills, metrics, employers, or accomplishments.
2. Check keyword coverage: ensure 70–80% of JOB DESCRIPTION's hard skills appear naturally in the revised CV where supported by ORIGINAL CV.
3. Verify each bullet starts with a strong past-tense action verb and stays under 25 words. Trim or rewrite as needed.
4. Verify markdown \`**bold**\` is applied sparingly to JD-aligned terms only.
5. If DRAFT is already correct, return it unchanged.

Return JSON matching the provided response schema. Do not return commentary.`;

export function buildCritiquePrompt(
	cvText: string,
	jobDescription: string,
	draft: TailoredCv,
): string {
	const boundedCv =
		cvText.length > MAX_TAILOR_CV_CHARS ? cvText.slice(0, MAX_TAILOR_CV_CHARS) : cvText;
	return `ORIGINAL CV:
${boundedCv}

JOB DESCRIPTION:
${jobDescription}

DRAFT (JSON to review and revise):
${JSON.stringify(draft, null, 2)}`;
}

async function critiqueTailoredCv(
	cvText: string,
	jobDescription: string,
	draft: TailoredCv,
): Promise<{ cv: TailoredCv; usage: UsageInfo }> {
	const response = await ai.models.generateContent({
		model: MODEL,
		contents: [
			{
				role: "user",
				parts: [{ text: buildCritiquePrompt(cvText, jobDescription, draft) }],
			},
		],
		config: {
			systemInstruction: TAILOR_CRITIQUE_SYSTEM_INSTRUCTION,
			responseMimeType: "application/json",
			responseSchema: TailoredCvResponseSchema,
		},
	});
	const text = response.text;
	if (!text) throw new Error("Empty response from Gemini critique");
	return {
		cv: TailoredCvSchema.parse(JSON.parse(text)),
		usage: readUsage(response.usageMetadata),
	};
}

export interface TailorCvInput {
	cvText: string;
	jobDescription: string;
	matchAnalysis: MatchAnalysis;
	/** Resource name from createCachedMasterCv. When present, CV is supplied via cache. */
	cachedContent?: string;
	/** Skip the critique pass (cost-sensitive flows). Defaults to env TAILOR_SKIP_CRITIQUE === "1". */
	skipCritique?: boolean;
}

export async function tailorCV(input: TailorCvInput): Promise<TailoredCv> {
	return withRetry(async () => {
		const draft = await tailorDraft(input);
		logUsage("draft", draft.usage);

		const skipCritique = input.skipCritique ?? process.env.TAILOR_SKIP_CRITIQUE === "1";
		if (skipCritique) return draft.cv;

		const revised = await critiqueTailoredCv(input.cvText, input.jobDescription, draft.cv);
		logUsage("critique", revised.usage);
		return revised.cv;
	});
}

// ─── Cover Letter Generation ─────────────────────────────────────────

export async function generateCoverLetter(
	cvText: string,
	jobDescription: string,
	company: string,
	jobTitle: string,
): Promise<string> {
	return withRetry(async () => {
		const response = await ai.models.generateContent({
			model: MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `You are an expert cover letter writer. Write a compelling cover letter for this job application.

RULES:
- 3-4 paragraphs maximum
- No placeholder brackets like [Your Name] — write complete text
- Confident but authentic tone — not arrogant
- Reference specific experience from the CV that matches the job
- Show genuine interest in the company and role
- Include a strong opening that grabs attention
- End with a clear call to action

Output as clean markdown.

CV TEXT:
${cvText}

JOB DESCRIPTION:
${jobDescription}

COMPANY: ${company}
JOB TITLE: ${jobTitle}`,
						},
					],
				},
			],
		});

		const text = response.text;
		if (!text) throw new Error("Empty response from Gemini");
		return text;
	});
}
