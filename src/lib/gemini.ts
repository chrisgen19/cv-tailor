import { GoogleGenAI } from "@google/genai";

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
