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
						{
							text: `You are an expert CV writer and ATS optimization specialist. Tailor this CV for the specific job description.

CRITICAL RULES:
- NEVER fabricate experience, skills, or qualifications. Only include items that appear verbatim or as a clear synonym in ORIGINAL CV.
- Reorder sections to prioritize the most relevant experience.
- Mirror exact keywords from the job description where truthful.
- Preserve quantifiable metrics from the original; do not invent new numbers.
- Compress or remove less relevant experience.
- Strengthen bullet points to align with job requirements.
- Use \`**term**\` (markdown bold) inside bullet text to flag JD keywords that should render emphasized in the final document.
- Keep links in header.links as { url, label }.

OUTPUT FORMAT:
Return JSON matching the provided response schema. Do not return markdown.

ORIGINAL CV:
${cvText}

JOB DESCRIPTION:
${jobDescription}

MATCH ANALYSIS:
Matched skills: ${matchAnalysis.matchedSkills.map((s) => s.skill).join(", ")}
Missing skills: ${matchAnalysis.missingSkills.map((s) => s.skill).join(", ")}
Recommendations: ${matchAnalysis.recommendations.join("; ")}`,
						},
					],
				},
			],
			config: {
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
