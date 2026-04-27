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

MATCH ANALYSIS:
Matched skills: ${matchAnalysis.matchedSkills.map((s) => s.skill).join(", ")}
Missing skills: ${matchAnalysis.missingSkills.map((s) => s.skill).join(", ")}
Recommendations: ${matchAnalysis.recommendations.join("; ")}`;
}

export async function tailorCV(
	cvText: string,
	jobDescription: string,
	matchAnalysis: MatchAnalysis,
): Promise<TailoredCv> {
	return withRetry(async () => {
		const response = await ai.models.generateContent({
			model: MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{ text: buildTailorUserPrompt(cvText, jobDescription, matchAnalysis) },
					],
				},
			],
			config: {
				systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
				responseMimeType: "application/json",
				responseSchema: TailoredCvResponseSchema,
			},
		});

		const text = response.text;
		if (!text) throw new Error("Empty response from Gemini");
		const parsed = JSON.parse(text);
		return TailoredCvSchema.parse(parsed);
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
