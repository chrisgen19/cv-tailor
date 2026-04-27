import { describe, expect, it } from "vitest";
import type { TailoredCv } from "@/lib/cv-schema";
import { generateCvDocx, generateDocx } from "@/lib/export";

const sampleCv: TailoredCv = {
	header: {
		name: "Jane Doe",
		title: "Senior Software Engineer",
		email: "jane@example.com",
		phone: "+1 555 0100",
		location: "Remote",
		links: [{ url: "https://github.com/janedoe", label: "GitHub" }, { url: "https://janedoe.dev" }],
	},
	summary: "Engineer with **10 years** of full-stack experience.",
	skills: [
		{ category: "Languages", items: ["TypeScript", "Go", "Python"] },
		{ category: "Cloud", items: ["AWS", "GCP"] },
	],
	experience: [
		{
			company: "Acme Corp",
			role: "Staff Engineer",
			location: "Remote",
			start: "2022",
			end: "Present",
			bullets: [
				"Led migration to **TypeScript** across 8 services.",
				"Cut p95 latency by *40%* via caching.",
			],
		},
	],
	education: [
		{
			school: "State University",
			degree: "B.S. Computer Science",
			start: "2010",
			end: "2014",
		},
	],
	projects: [
		{
			name: "Side Project",
			url: "https://example.com/proj",
			description: "Open-source CLI for X.",
			bullets: ["Reached 1k GitHub stars."],
		},
	],
	certifications: [{ name: "AWS Solutions Architect", issuer: "AWS", date: "2023" }],
};

// DOCX is a zip; the PK header signals a non-empty, structurally valid bundle.
const isDocxBuffer = (buf: Buffer) => buf.length > 1000 && buf[0] === 0x50 && buf[1] === 0x4b;

describe("generateCvDocx", () => {
	it("renders a TailoredCv into a DOCX buffer", async () => {
		const buf = await generateCvDocx(sampleCv, "Sample - Tailored CV");
		expect(isDocxBuffer(buf)).toBe(true);
	});

	it("renders when optional sections are empty", async () => {
		const buf = await generateCvDocx({
			header: { name: "Minimal Person", links: [] },
			summary: "",
			skills: [],
			experience: [],
			education: [],
			projects: [],
			certifications: [],
		});
		expect(isDocxBuffer(buf)).toBe(true);
	});
});

describe("generateDocx (markdown / cover letter)", () => {
	it("renders markdown into a DOCX buffer", async () => {
		const buf = await generateDocx(
			"# Cover Letter\n\nDear Hiring Manager,\n\n- Point one\n- Point **two**\n\nThanks.",
			"Cover Letter",
		);
		expect(isDocxBuffer(buf)).toBe(true);
	});
});
