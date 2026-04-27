import type { TailoredCv } from "@/lib/cv-schema";
import { TailoredCvSchema } from "@/lib/cv-schema";

const SECTION_HEADINGS = {
	summary: "Summary",
	skills: "Skills",
	experience: "Experience",
	education: "Education",
	projects: "Projects",
	certifications: "Certifications",
} as const;

// ─── JSON → Markdown ────────────────────────────────────────────────────

export function jsonToMarkdown(cv: TailoredCv): string {
	const lines: string[] = [];

	lines.push(`# ${cv.header.name}`);
	// Blank lines turn each header component into its own paragraph. Without
	// them, markdown-to-html collapses title + contact into a single <p> per
	// CommonMark soft-break rules, and the editor round-trip then merges them
	// so parseHeader can no longer detect the **title** line.
	if (cv.header.title) lines.push("", `**${cv.header.title}**`);

	const contactBits: string[] = [];
	if (cv.header.email) contactBits.push(cv.header.email);
	if (cv.header.phone) contactBits.push(cv.header.phone);
	if (cv.header.location) contactBits.push(cv.header.location);
	for (const link of cv.header.links) {
		contactBits.push(link.label ? `[${link.label}](${link.url})` : link.url);
	}
	if (contactBits.length > 0) lines.push("", contactBits.join(" • "));

	if (cv.summary?.trim()) {
		lines.push("", `## ${SECTION_HEADINGS.summary}`, "", cv.summary.trim());
	}

	if (cv.skills.length > 0) {
		lines.push("", `## ${SECTION_HEADINGS.skills}`, "");
		for (const group of cv.skills) {
			lines.push(`- **${group.category}:** ${group.items.join(", ")}`);
		}
	}

	if (cv.experience.length > 0) {
		lines.push("", `## ${SECTION_HEADINGS.experience}`, "");
		for (const job of cv.experience) {
			const dates = formatDateRange(job.start, job.end);
			const headerRight = [job.location, dates].filter(Boolean).join(" | ");
			lines.push(`### ${job.company} — *${job.role}*`);
			if (headerRight) lines.push(`*${headerRight}*`);
			lines.push("");
			for (const bullet of job.bullets) lines.push(`- ${bullet}`);
			lines.push("");
		}
	}

	if (cv.education.length > 0) {
		lines.push("", `## ${SECTION_HEADINGS.education}`, "");
		for (const edu of cv.education) {
			const dates = formatDateRange(edu.start, edu.end);
			const right = dates ? ` *(${dates})*` : "";
			const degree = edu.degree ? ` — ${edu.degree}` : "";
			lines.push(`### ${edu.school}${degree}${right}`);
			if (edu.details) lines.push(edu.details);
			lines.push("");
		}
	}

	if (cv.projects.length > 0) {
		lines.push("", `## ${SECTION_HEADINGS.projects}`, "");
		for (const project of cv.projects) {
			const linkPart = project.url ? ` ([link](${project.url}))` : "";
			lines.push(`### ${project.name}${linkPart}`);
			if (project.description) lines.push(project.description);
			for (const bullet of project.bullets) lines.push(`- ${bullet}`);
			lines.push("");
		}
	}

	if (cv.certifications.length > 0) {
		lines.push("", `## ${SECTION_HEADINGS.certifications}`, "");
		for (const cert of cv.certifications) {
			const meta = [cert.issuer, cert.date].filter(Boolean).join(" • ");
			lines.push(`- **${cert.name}**${meta ? ` — ${meta}` : ""}`);
		}
	}

	return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatDateRange(start?: string, end?: string): string {
	if (start && end) return `${start} – ${end}`;
	if (start) return start;
	if (end) return end;
	return "";
}

// ─── Markdown → JSON (best-effort) ──────────────────────────────────────

interface RawSection {
	heading: string;
	lines: string[];
}

/**
 * Tiptap stores edited content as HTML. Best-effort markdown parsing on HTML
 * input dumps the entire blob into header.name and yields zero sections, so
 * we refuse rather than persist garbage. Callers should treat this as
 * "JSON not available" and leave the legacy markdown/HTML column as the source
 * of truth until the next re-tailor populates structured JSON cleanly.
 */
export function looksLikeHtml(input: string): boolean {
	const trimmed = input.trimStart();
	// Match: opening/closing tags, HTML comments, doctype, XML processing instructions.
	// Tag name pattern allows hyphens (custom elements) and namespace colons.
	return /^<\s*(?:!--|!doctype\b|\?xml\b|\/?[a-z][\w:-]*)/i.test(trimmed);
}

export function markdownToJson(markdown: string): TailoredCv {
	if (looksLikeHtml(markdown)) {
		throw new Error("Input is HTML, not markdown — refusing to parse");
	}
	const sections = splitIntoSections(markdown);
	const header = parseHeader(sections.preamble);
	// Guard against degenerate parses: when the source has no line-anchored `##`
	// headings (e.g. Tiptap stored markdown as literal text inside <p> tags), the
	// entire blob lands in header.name and every section comes back empty. Render
	// would produce one giant bold "name" — refuse so the export route can return
	// a clear error instead of silently emitting a mangled PDF/DOCX.
	const sectionKeys = Object.keys(sections.byKey);
	const looksDegenerate =
		sectionKeys.length === 0 &&
		(header.name.length > 200 || /(^|\s)#{2,3}\s/.test(header.name));
	if (looksDegenerate) {
		throw new Error("Markdown has no recognizable sections — refusing to parse");
	}
	const cv: TailoredCv = TailoredCvSchema.parse({
		header,
		summary: extractSummary(sections.byKey.summary),
		skills: parseSkills(sections.byKey.skills),
		experience: parseExperience(sections.byKey.experience),
		education: parseEducation(sections.byKey.education),
		projects: parseProjects(sections.byKey.projects),
		certifications: parseCertifications(sections.byKey.certifications),
	});
	return cv;
}

function splitIntoSections(markdown: string): {
	preamble: string[];
	byKey: Record<string, RawSection | undefined>;
} {
	const lines = markdown.split("\n");
	const preamble: string[] = [];
	const byKey: Record<string, RawSection> = {};
	let current: RawSection | null = null;

	for (const line of lines) {
		const h2 = line.match(/^##\s+(.+?)\s*$/);
		if (h2 && !line.startsWith("###")) {
			const heading = h2[1].trim();
			current = { heading, lines: [] };
			byKey[normalizeKey(heading)] = current;
			continue;
		}
		if (current) {
			current.lines.push(line);
		} else {
			preamble.push(line);
		}
	}
	return { preamble, byKey };
}

function normalizeKey(heading: string): string {
	const lower = heading.toLowerCase();
	if (lower.includes("summary") || lower.includes("objective") || lower.includes("profile"))
		return "summary";
	if (lower.includes("skill")) return "skills";
	if (lower.includes("experience") || lower.includes("employment") || lower.includes("work"))
		return "experience";
	if (lower.includes("education")) return "education";
	if (lower.includes("project")) return "projects";
	if (lower.includes("certif") || lower.includes("license")) return "certifications";
	return lower;
}

function parseHeader(preamble: string[]): TailoredCv["header"] {
	const trimmed = preamble.map((l) => l.trim()).filter(Boolean);
	const nameLine = trimmed.find((l) => l.startsWith("# ")) ?? trimmed[0] ?? "";
	const name = nameLine.replace(/^#\s+/, "").replace(/\*\*/g, "").trim() || "Unknown";

	const remaining = trimmed.filter((l) => l !== nameLine);
	let title: string | undefined;
	const contactCandidates: string[] = [];
	for (const line of remaining) {
		if (/^\*\*.+\*\*$/.test(line) && !title) {
			title = line.replace(/^\*\*|\*\*$/g, "").trim();
			continue;
		}
		contactCandidates.push(line);
	}

	const links: { url: string; label?: string }[] = [];
	let email: string | undefined;
	let phone: string | undefined;
	let location: string | undefined;

	for (const candidate of contactCandidates) {
		// Legacy round-trip recovery: when an editor save merged the **Title**
		// line onto the contact line (because of CommonMark soft-break collapse),
		// the candidate looks like "**Senior Dev** email@x.com • phone • ...".
		// Extract the leading **bold** as the title and let the rest fall through
		// to normal contact parsing.
		let working = candidate;
		if (!title) {
			const merged = working.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
			if (merged) {
				title = merged[1].trim();
				working = merged[2].replace(/^[\s•|]+/, "");
				if (!working) continue;
			}
		}
		const tokens = working.split(/\s*[•|]\s*/);
		for (const token of tokens) {
			if (!token.trim()) continue;
			const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
			if (linkMatch) {
				links.push({ label: linkMatch[1], url: linkMatch[2] });
				continue;
			}
			if (/^https?:\/\//.test(token)) {
				links.push({ url: token });
				continue;
			}
			if (token.includes("@") && !email) {
				email = token;
				continue;
			}
			if (/[\d()+-][\d\s()+-]{6,}/.test(token) && !phone) {
				phone = token;
				continue;
			}
			if (!location) location = token;
		}
	}

	return { name, title, email, phone, location, links };
}

function extractSummary(section: RawSection | undefined): string {
	if (!section) return "";
	return section.lines
		.map((l) => l.trim())
		.filter(Boolean)
		.join(" ")
		.trim();
}

function parseSkills(section: RawSection | undefined): TailoredCv["skills"] {
	if (!section) return [];
	const groups: TailoredCv["skills"] = [];
	for (const raw of section.lines) {
		const line = raw.trim();
		if (!line.startsWith("- ") && !line.startsWith("* ")) continue;
		const stripped = line.slice(2);
		const colonIdx = stripped.indexOf(":");
		if (colonIdx === -1) {
			groups.push({ category: "General", items: splitItems(stripped) });
			continue;
		}
		const category = stripped.slice(0, colonIdx).replace(/\*\*/g, "").trim();
		const items = splitItems(stripped.slice(colonIdx + 1));
		groups.push({ category, items });
	}
	return groups;
}

function splitItems(text: string): string[] {
	return text
		.split(/[,;]/)
		.map((s) => s.trim().replace(/^\*\*|\*\*$/g, "").trim())
		.filter(Boolean);
}

function parseExperience(section: RawSection | undefined): TailoredCv["experience"] {
	if (!section) return [];
	return parseEntries(section.lines).map((entry) => {
		const { company, role } = splitCompanyRole(entry.heading);
		const { location, start, end } = parseMetaLine(entry.metaLine);
		return {
			company,
			role,
			location,
			start,
			end,
			bullets: entry.bullets,
		};
	});
}

function parseEducation(section: RawSection | undefined): TailoredCv["education"] {
	if (!section) return [];
	return parseEntries(section.lines).map((entry) => {
		const trailingDate = entry.heading.match(/\*\(([^)]+)\)\*\s*$/)?.[1];
		const { primary, secondary } = splitOnDash(entry.heading);
		const fromMeta = parseMetaLine(entry.metaLine);
		const fromHeading = trailingDate ? parseMetaLine(trailingDate) : {};
		return {
			school: primary,
			degree: secondary,
			start: fromMeta.start ?? fromHeading.start,
			end: fromMeta.end ?? fromHeading.end,
			details: entry.bullets.join(" ") || undefined,
		};
	});
}

function parseProjects(section: RawSection | undefined): TailoredCv["projects"] {
	if (!section) return [];
	return parseEntries(section.lines).map((entry) => {
		const linkMatch = entry.heading.match(/\(\[(?:link|url)\]\(([^)]+)\)\)\s*$/i);
		const url = linkMatch?.[1];
		const name = entry.heading.replace(/\s*\(\[[^\]]+\]\([^)]+\)\)\s*$/, "").trim();
		return {
			name,
			url,
			description: entry.metaLine || undefined,
			bullets: entry.bullets,
		};
	});
}

function parseCertifications(
	section: RawSection | undefined,
): TailoredCv["certifications"] {
	if (!section) return [];
	const certs: TailoredCv["certifications"] = [];
	for (const raw of section.lines) {
		const line = raw.trim();
		if (!line.startsWith("- ") && !line.startsWith("* ")) continue;
		const stripped = line.slice(2).replace(/\*\*/g, "");
		const dashIdx = stripped.indexOf(" — ");
		if (dashIdx === -1) {
			certs.push({ name: stripped.trim() });
			continue;
		}
		const name = stripped.slice(0, dashIdx).trim();
		const metaParts = stripped
			.slice(dashIdx + 3)
			.split(/\s*•\s*/)
			.map((s) => s.trim())
			.filter(Boolean);
		certs.push({
			name,
			issuer: metaParts[0],
			date: metaParts[1],
		});
	}
	return certs;
}

interface ParsedEntry {
	heading: string;
	metaLine: string;
	bullets: string[];
}

function parseEntries(lines: string[]): ParsedEntry[] {
	const entries: ParsedEntry[] = [];
	let current: ParsedEntry | null = null;
	for (const raw of lines) {
		const line = raw.trim();
		if (!line) continue;
		const h3 = line.match(/^###\s+(.+)/);
		if (h3) {
			if (current) entries.push(current);
			current = { heading: h3[1].trim(), metaLine: "", bullets: [] };
			continue;
		}
		if (!current) continue;
		if (line.startsWith("- ") || line.startsWith("* ")) {
			current.bullets.push(line.slice(2).trim());
			continue;
		}
		if (!current.metaLine) current.metaLine = line.replace(/^\*|\*$/g, "").trim();
	}
	if (current) entries.push(current);
	return entries;
}

function splitCompanyRole(heading: string): { company: string; role: string } {
	const cleaned = heading.replace(/\*/g, "");
	const dashMatch = cleaned.match(/^(.+?)\s+[—–-]\s+(.+)$/);
	if (dashMatch) {
		return { company: dashMatch[1].trim(), role: dashMatch[2].trim() };
	}
	return { company: cleaned.trim(), role: "" };
}

function splitOnDash(heading: string): { primary: string; secondary?: string } {
	const cleaned = heading.replace(/\s*\*\([^)]+\)\*\s*$/, "").replace(/\*/g, "");
	const dashMatch = cleaned.match(/^(.+?)\s+[—–-]\s+(.+)$/);
	if (dashMatch) {
		return { primary: dashMatch[1].trim(), secondary: dashMatch[2].trim() };
	}
	return { primary: cleaned.trim() };
}

function parseMetaLine(meta: string): {
	location?: string;
	start?: string;
	end?: string;
} {
	if (!meta) return {};
	const cleaned = meta.replace(/\*/g, "").trim();
	const parts = cleaned.split(/\s*\|\s*/);
	let location: string | undefined;
	let dateRange: string | undefined;
	for (const part of parts) {
		if (/\d{4}/.test(part) || /present/i.test(part)) {
			dateRange = part;
		} else if (!location) {
			location = part;
		}
	}
	if (!dateRange && (/\d{4}/.test(cleaned) || /present/i.test(cleaned))) {
		dateRange = cleaned;
	}
	const range = dateRange?.match(/^(.+?)\s*[–-]\s*(.+)$/);
	if (range) {
		return { location, start: range[1].trim(), end: range[2].trim() };
	}
	return { location, start: dateRange };
}
