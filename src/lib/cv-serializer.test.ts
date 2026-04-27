import { describe, expect, it } from "vitest";
import type { TailoredCv } from "@/lib/cv-schema";
import { jsonToMarkdown, looksLikeHtml, markdownToJson } from "@/lib/cv-serializer";

const sample: TailoredCv = {
	header: {
		name: "Jane Doe",
		title: "Senior Software Engineer",
		email: "jane@example.com",
		phone: "+1 555 123 4567",
		location: "Remote",
		links: [
			{ url: "https://github.com/janedoe", label: "GitHub" },
			{ url: "https://janedoe.dev" },
		],
	},
	summary: "Engineer with 8 years of experience building scalable web platforms.",
	skills: [
		{ category: "Languages", items: ["TypeScript", "Python", "Go"] },
		{ category: "Frameworks", items: ["Next.js", "React", "FastAPI"] },
	],
	experience: [
		{
			company: "Acme Corp",
			role: "Staff Engineer",
			location: "Remote",
			start: "2022",
			end: "Present",
			bullets: [
				"Led migration to **Next.js** App Router across 12 services.",
				"Cut p95 latency 35% by introducing edge caching.",
			],
		},
		{
			company: "Globex",
			role: "Senior Engineer",
			start: "2019",
			end: "2022",
			bullets: ["Shipped real-time billing pipeline handling 2M events/day."],
		},
	],
	education: [
		{
			school: "State University",
			degree: "B.S. Computer Science",
			start: "2013",
			end: "2017",
		},
	],
	projects: [
		{
			name: "OpenLogger",
			url: "https://github.com/jane/openlogger",
			description: "Structured logging library for Deno.",
			bullets: ["1.2k GitHub stars", "Used in production by three startups"],
		},
	],
	certifications: [
		{ name: "AWS Solutions Architect", issuer: "AWS", date: "2023" },
	],
};

describe("cv-serializer", () => {
	it("renders JSON to markdown with sections and bullets", () => {
		const md = jsonToMarkdown(sample);
		expect(md).toContain("# Jane Doe");
		expect(md).toContain("**Senior Software Engineer**");
		expect(md).toContain("## Summary");
		expect(md).toContain("## Skills");
		expect(md).toContain("- **Languages:** TypeScript, Python, Go");
		expect(md).toContain("## Experience");
		expect(md).toContain("### Acme Corp — *Staff Engineer*");
		expect(md).toContain("Led migration to **Next.js**");
		expect(md).toContain("## Education");
		expect(md).toContain("## Projects");
		expect(md).toContain("## Certifications");
	});

	it("round-trips core fields through markdown→JSON parser", () => {
		const md = jsonToMarkdown(sample);
		const parsed = markdownToJson(md);

		expect(parsed.header.name).toBe("Jane Doe");
		expect(parsed.header.title).toBe("Senior Software Engineer");
		expect(parsed.header.email).toBe("jane@example.com");
		expect(parsed.header.phone).toBe("+1 555 123 4567");
		expect(parsed.header.links.map((l) => l.url)).toContain("https://janedoe.dev");
		expect(parsed.header.links.find((l) => l.label === "GitHub")?.url).toBe(
			"https://github.com/janedoe",
		);

		expect(parsed.summary).toContain("8 years");

		expect(parsed.skills).toHaveLength(2);
		expect(parsed.skills[0].category).toBe("Languages");
		expect(parsed.skills[0].items).toEqual(["TypeScript", "Python", "Go"]);

		expect(parsed.experience).toHaveLength(2);
		expect(parsed.experience[0].company).toBe("Acme Corp");
		expect(parsed.experience[0].role).toBe("Staff Engineer");
		expect(parsed.experience[0].start).toBe("2022");
		expect(parsed.experience[0].end).toBe("Present");
		expect(parsed.experience[0].bullets[0]).toContain("Next.js");

		expect(parsed.education[0].school).toBe("State University");
		expect(parsed.education[0].degree).toBe("B.S. Computer Science");
		expect(parsed.education[0].start).toBe("2013");
		expect(parsed.education[0].end).toBe("2017");

		expect(parsed.projects[0].name).toBe("OpenLogger");
		expect(parsed.projects[0].url).toBe("https://github.com/jane/openlogger");

		expect(parsed.certifications[0].name).toBe("AWS Solutions Architect");
		expect(parsed.certifications[0].issuer).toBe("AWS");
		expect(parsed.certifications[0].date).toBe("2023");
	});

	it("refuses to parse HTML (Tiptap output) as markdown", () => {
		const html =
			"<p>Here is your CV.</p><h1>Jane Doe</h1><p>jane@example.com</p>";
		expect(looksLikeHtml(html)).toBe(true);
		expect(() => markdownToJson(html)).toThrow(/HTML/);
	});

	it("detects a broad set of HTML inputs (not just p/div/h1)", () => {
		expect(looksLikeHtml("<table><tr><td>x</td></tr></table>")).toBe(true);
		expect(looksLikeHtml("<article>Body</article>")).toBe(true);
		expect(looksLikeHtml("<section>x</section>")).toBe(true);
		expect(looksLikeHtml("<!DOCTYPE html><html><body>x</body></html>")).toBe(true);
		expect(looksLikeHtml("<!-- comment --><p>after</p>")).toBe(true);
		expect(looksLikeHtml('<?xml version="1.0"?><root/>')).toBe(true);
		expect(looksLikeHtml("<custom-element>x</custom-element>")).toBe(true);
		expect(looksLikeHtml("</closing>")).toBe(true);

		// Negative cases — these are real markdown leading characters.
		expect(looksLikeHtml("# Heading\n\nBody")).toBe(false);
		expect(looksLikeHtml("- bullet")).toBe(false);
		expect(looksLikeHtml("Just plain text")).toBe(false);
	});

	it("recovers title when an editor round-trip merged it onto the contact line", () => {
		// jsonToMarkdown previously emitted **Title** and the contact line on
		// consecutive lines (no blank between). CommonMark soft-break rules then
		// caused markdown-to-html to merge them into one <p>; htmlToMarkdown on
		// save produced a single line — we still want title recovered cleanly.
		const merged =
			"# Jane Doe\n**Senior Engineer** jane@example.com • +1 555 123 4567 • Remote • [Site](https://jane.dev)";
		const parsed = markdownToJson(merged);
		expect(parsed.header.name).toBe("Jane Doe");
		expect(parsed.header.title).toBe("Senior Engineer");
		expect(parsed.header.email).toBe("jane@example.com");
		expect(parsed.header.phone).toBe("+1 555 123 4567");
		expect(parsed.header.location).toBe("Remote");
		expect(parsed.header.links[0]).toEqual({ label: "Site", url: "https://jane.dev" });
	});

	it("refuses degenerate markdown where ## markers are not line-anchored", () => {
		// Reproduces the Tiptap-stored-as-literal-text failure mode: an entire CV
		// collapsed onto a single line where `##` and `###` are not at line start.
		const collapsed =
			"Christian Diomampo Senior Full Stack Developer chrisgen19@gmail.com ## Summary ten years of experience ## Skills - React, Next.js ### Some Company — *Senior Dev*";
		expect(() => markdownToJson(collapsed)).toThrow(/no recognizable sections/);
	});

	it("handles markdown with missing optional sections", () => {
		const minimal = "# John Smith\n\njohn@example.com\n\n## Summary\n\nMinimal CV.";
		const parsed = markdownToJson(minimal);
		expect(parsed.header.name).toBe("John Smith");
		expect(parsed.header.email).toBe("john@example.com");
		expect(parsed.summary).toBe("Minimal CV.");
		expect(parsed.experience).toEqual([]);
		expect(parsed.education).toEqual([]);
	});
});
