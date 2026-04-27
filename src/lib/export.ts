import {
	AlignmentType,
	BorderStyle,
	Document,
	ExternalHyperlink,
	HeadingLevel,
	Packer,
	Paragraph,
	type ParagraphChild,
	TabStopType,
	TextRun,
	UnderlineType,
} from "docx";
import type {
	TailoredCv,
	TailoredCvCertification,
	TailoredCvEducation,
	TailoredCvExperience,
	TailoredCvHeader,
	TailoredCvProject,
	TailoredCvSkillGroup,
} from "@/lib/cv-schema";
import { CV_STYLES, docxLineSpacing, inchesToTwips, ptToHalfPt, ptToTwips } from "@/lib/cv-styles";
import { parseInlineEmphasis } from "@/lib/inline-emphasis";

// ─── Shared docx primitives ─────────────────────────────────────────────

const FONT = CV_STYLES.font;
const BODY_HALF = ptToHalfPt(CV_STYLES.fontSize.body);
const CONTACT_HALF = ptToHalfPt(CV_STYLES.fontSize.contact);
const H1_HALF = ptToHalfPt(CV_STYLES.fontSize.h1);
const H2_HALF = ptToHalfPt(CV_STYLES.fontSize.h2);
const H3_HALF = ptToHalfPt(CV_STYLES.fontSize.h3);
const LINE = docxLineSpacing(CV_STYLES.lineHeight, CV_STYLES.fontSize.body);
// US Letter (8.5") minus left+right margins gives the printable width used as
// the right tab-stop for date alignment.
const RIGHT_TAB = inchesToTwips(8.5 - CV_STYLES.margin.left - CV_STYLES.margin.right);

function emphasisRuns(
	text: string,
	opts: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {},
): TextRun[] {
	return parseInlineEmphasis(text).map(
		(t) =>
			new TextRun({
				text: t.text,
				bold: opts.bold || t.bold,
				italics: opts.italics || t.italic,
				color: opts.color ?? CV_STYLES.color.text,
				font: FONT,
				size: opts.size ?? BODY_HALF,
			}),
	);
}

function hyperlinkRun(text: string, url: string, size = BODY_HALF): ExternalHyperlink {
	return new ExternalHyperlink({
		link: url,
		children: [
			new TextRun({
				text,
				font: FONT,
				size,
				color: CV_STYLES.color.accent,
				underline: { type: UnderlineType.SINGLE, color: CV_STYLES.color.accent },
			}),
		],
	});
}

// ─── CV (TailoredCv → DOCX) ─────────────────────────────────────────────

function nameHeading(name: string): Paragraph {
	return new Paragraph({
		alignment: AlignmentType.CENTER,
		spacing: { after: ptToTwips(CV_STYLES.spacing.sectionAfter) },
		children: [
			new TextRun({
				text: name,
				bold: true,
				color: CV_STYLES.color.heading,
				font: FONT,
				size: H1_HALF,
			}),
		],
	});
}

function plainContactRun(text: string): TextRun {
	return new TextRun({
		text,
		font: FONT,
		size: CONTACT_HALF,
		color: CV_STYLES.color.text,
	});
}

function contactSeparator(): TextRun {
	return new TextRun({
		text: "  •  ",
		font: FONT,
		size: CONTACT_HALF,
		color: CV_STYLES.color.muted,
	});
}

function contactLine(header: TailoredCvHeader): Paragraph | null {
	const parts: ParagraphChild[] = [];
	const push = (child: ParagraphChild) => {
		if (parts.length > 0) parts.push(contactSeparator());
		parts.push(child);
	};

	if (header.title) {
		push(
			new TextRun({
				text: header.title,
				italics: true,
				font: FONT,
				size: CONTACT_HALF,
				color: CV_STYLES.color.muted,
			}),
		);
	}
	if (header.email) push(hyperlinkRun(header.email, `mailto:${header.email}`, CONTACT_HALF));
	if (header.phone) push(plainContactRun(header.phone));
	if (header.location) push(plainContactRun(header.location));
	for (const link of header.links) {
		push(hyperlinkRun(link.label ?? link.url, link.url, CONTACT_HALF));
	}

	if (parts.length === 0) return null;
	return new Paragraph({
		alignment: AlignmentType.CENTER,
		spacing: { after: ptToTwips(CV_STYLES.spacing.sectionAfter) },
		children: parts,
	});
}

function sectionHeading(text: string): Paragraph {
	return new Paragraph({
		keepNext: true,
		spacing: {
			before: ptToTwips(CV_STYLES.spacing.sectionBefore),
			after: ptToTwips(CV_STYLES.spacing.sectionAfter),
		},
		border: {
			bottom: {
				style: BorderStyle.SINGLE,
				size: 6,
				color: CV_STYLES.color.heading,
				space: 1,
			},
		},
		children: [
			new TextRun({
				text: text.toUpperCase(),
				bold: true,
				color: CV_STYLES.color.heading,
				font: FONT,
				size: H2_HALF,
			}),
		],
	});
}

function summaryParagraph(summary: string): Paragraph {
	return new Paragraph({
		spacing: { after: ptToTwips(CV_STYLES.spacing.sectionAfter), line: LINE },
		children: emphasisRuns(summary.trim()),
	});
}

function skillParagraph(group: TailoredCvSkillGroup): Paragraph {
	return new Paragraph({
		spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
		children: [
			new TextRun({
				text: `${group.category}: `,
				bold: true,
				font: FONT,
				size: BODY_HALF,
				color: CV_STYLES.color.heading,
			}),
			new TextRun({
				text: group.items.join(", "),
				font: FONT,
				size: BODY_HALF,
				color: CV_STYLES.color.text,
			}),
		],
	});
}

function formatDateRange(start?: string, end?: string): string {
	const s = start?.trim();
	const e = end?.trim();
	if (s && e) return `${s} – ${e}`;
	if (s) return `${s} – Present`;
	if (e) return e;
	return "";
}

function experienceParagraphs(job: TailoredCvExperience): Paragraph[] {
	const paragraphs: Paragraph[] = [];
	const dateRange = formatDateRange(job.start, job.end);
	const meta = [job.location, dateRange].filter(Boolean).join(" • ");

	const headerChildren: ParagraphChild[] = [
		new TextRun({
			text: job.company,
			bold: true,
			font: FONT,
			size: H3_HALF,
			color: CV_STYLES.color.heading,
		}),
	];
	if (job.role) {
		headerChildren.push(
			new TextRun({
				text: "  —  ",
				font: FONT,
				size: H3_HALF,
				color: CV_STYLES.color.muted,
			}),
			new TextRun({
				text: job.role,
				italics: true,
				font: FONT,
				size: H3_HALF,
				color: CV_STYLES.color.text,
			}),
		);
	}
	if (meta) {
		headerChildren.push(
			new TextRun({ text: "\t", font: FONT }),
			new TextRun({
				text: meta,
				font: FONT,
				size: BODY_HALF,
				color: CV_STYLES.color.muted,
			}),
		);
	}

	paragraphs.push(
		new Paragraph({
			keepNext: true,
			spacing: { before: ptToTwips(4), after: ptToTwips(2), line: LINE },
			tabStops: meta ? [{ type: TabStopType.RIGHT, position: RIGHT_TAB }] : undefined,
			children: headerChildren,
		}),
	);

	for (const bullet of job.bullets) {
		paragraphs.push(
			new Paragraph({
				bullet: { level: 0 },
				indent: { left: inchesToTwips(0.25), hanging: inchesToTwips(0.15) },
				spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
				children: emphasisRuns(bullet),
			}),
		);
	}
	return paragraphs;
}

function educationParagraphs(edu: TailoredCvEducation): Paragraph[] {
	const dateRange = formatDateRange(edu.start, edu.end);
	const headerChildren: ParagraphChild[] = [
		new TextRun({
			text: edu.school,
			bold: true,
			font: FONT,
			size: H3_HALF,
			color: CV_STYLES.color.heading,
		}),
	];
	if (edu.degree) {
		headerChildren.push(
			new TextRun({
				text: ` — ${edu.degree}`,
				font: FONT,
				size: H3_HALF,
				color: CV_STYLES.color.text,
			}),
		);
	}
	if (dateRange) {
		headerChildren.push(
			new TextRun({ text: "\t", font: FONT }),
			new TextRun({
				text: dateRange,
				font: FONT,
				size: BODY_HALF,
				color: CV_STYLES.color.muted,
			}),
		);
	}

	const paragraphs: Paragraph[] = [
		new Paragraph({
			keepNext: Boolean(edu.details),
			spacing: { before: ptToTwips(4), after: ptToTwips(2), line: LINE },
			tabStops: dateRange ? [{ type: TabStopType.RIGHT, position: RIGHT_TAB }] : undefined,
			children: headerChildren,
		}),
	];
	if (edu.details) {
		paragraphs.push(
			new Paragraph({
				spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
				children: emphasisRuns(edu.details),
			}),
		);
	}
	return paragraphs;
}

function projectParagraphs(project: TailoredCvProject): Paragraph[] {
	const headerChildren: ParagraphChild[] = [
		new TextRun({
			text: project.name,
			bold: true,
			font: FONT,
			size: H3_HALF,
			color: CV_STYLES.color.heading,
		}),
	];
	if (project.url) {
		headerChildren.push(
			new TextRun({ text: "  ", font: FONT }),
			hyperlinkRun(project.url, project.url, BODY_HALF),
		);
	}
	const paragraphs: Paragraph[] = [
		new Paragraph({
			keepNext: true,
			spacing: { before: ptToTwips(4), after: ptToTwips(2), line: LINE },
			children: headerChildren,
		}),
	];
	if (project.description) {
		paragraphs.push(
			new Paragraph({
				spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
				children: emphasisRuns(project.description),
			}),
		);
	}
	for (const bullet of project.bullets) {
		paragraphs.push(
			new Paragraph({
				bullet: { level: 0 },
				indent: { left: inchesToTwips(0.25), hanging: inchesToTwips(0.15) },
				spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
				children: emphasisRuns(bullet),
			}),
		);
	}
	return paragraphs;
}

function certificationParagraph(cert: TailoredCvCertification): Paragraph {
	const meta = [cert.issuer, cert.date].filter(Boolean).join(" • ");
	const children: ParagraphChild[] = [
		new TextRun({
			text: cert.name,
			bold: true,
			font: FONT,
			size: BODY_HALF,
			color: CV_STYLES.color.heading,
		}),
	];
	if (meta) {
		children.push(
			new TextRun({ text: "\t", font: FONT }),
			new TextRun({
				text: meta,
				font: FONT,
				size: BODY_HALF,
				color: CV_STYLES.color.muted,
			}),
		);
	}
	return new Paragraph({
		spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
		tabStops: meta ? [{ type: TabStopType.RIGHT, position: RIGHT_TAB }] : undefined,
		children,
	});
}

function buildCvParagraphs(cv: TailoredCv): Paragraph[] {
	const paragraphs: Paragraph[] = [nameHeading(cv.header.name)];
	const contact = contactLine(cv.header);
	if (contact) paragraphs.push(contact);

	if (cv.summary?.trim()) {
		paragraphs.push(sectionHeading("Summary"), summaryParagraph(cv.summary));
	}
	if (cv.skills.length > 0) {
		paragraphs.push(sectionHeading("Skills"));
		for (const group of cv.skills) paragraphs.push(skillParagraph(group));
	}
	if (cv.experience.length > 0) {
		paragraphs.push(sectionHeading("Experience"));
		for (const job of cv.experience) paragraphs.push(...experienceParagraphs(job));
	}
	if (cv.projects.length > 0) {
		paragraphs.push(sectionHeading("Projects"));
		for (const project of cv.projects) paragraphs.push(...projectParagraphs(project));
	}
	if (cv.education.length > 0) {
		paragraphs.push(sectionHeading("Education"));
		for (const edu of cv.education) paragraphs.push(...educationParagraphs(edu));
	}
	if (cv.certifications.length > 0) {
		paragraphs.push(sectionHeading("Certifications"));
		for (const cert of cv.certifications) paragraphs.push(certificationParagraph(cert));
	}
	return paragraphs;
}

function buildDocument(paragraphs: Paragraph[], title?: string): Document {
	return new Document({
		title: title ?? "Document",
		styles: {
			default: {
				document: {
					run: { font: FONT, size: BODY_HALF, color: CV_STYLES.color.text },
					paragraph: { spacing: { line: LINE } },
				},
			},
		},
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: inchesToTwips(CV_STYLES.margin.top),
							right: inchesToTwips(CV_STYLES.margin.right),
							bottom: inchesToTwips(CV_STYLES.margin.bottom),
							left: inchesToTwips(CV_STYLES.margin.left),
						},
					},
				},
				children: paragraphs,
			},
		],
	});
}

export async function generateCvDocx(cv: TailoredCv, title?: string): Promise<Buffer> {
	const doc = buildDocument(buildCvParagraphs(cv), title);
	return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Markdown DOCX (cover letters) ──────────────────────────────────────

interface MarkdownBlock {
	type: "heading" | "paragraph" | "bullet" | "ordered";
	level?: number;
	text: string;
}

function parseMarkdownToBlocks(markdown: string): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = [];
	for (const raw of markdown.split("\n")) {
		const line = raw.trim();
		if (!line) continue;

		const heading = line.match(/^(#{1,3})\s+(.+)/);
		if (heading) {
			blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
			continue;
		}
		if (line.startsWith("- ") || line.startsWith("* ")) {
			blocks.push({ type: "bullet", text: line.slice(2) });
			continue;
		}
		const ordered = line.match(/^\d+\.\s+(.+)/);
		if (ordered) {
			blocks.push({ type: "ordered", text: ordered[1] });
			continue;
		}
		blocks.push({ type: "paragraph", text: line });
	}
	return blocks;
}

export async function generateDocx(content: string, title?: string): Promise<Buffer> {
	const paragraphs: Paragraph[] = [];
	for (const block of parseMarkdownToBlocks(content)) {
		switch (block.type) {
			case "heading": {
				const level = block.level ?? 2;
				const size = level === 1 ? H1_HALF : level === 2 ? H2_HALF : H3_HALF;
				paragraphs.push(
					new Paragraph({
						heading:
							level === 1
								? HeadingLevel.HEADING_1
								: level === 2
									? HeadingLevel.HEADING_2
									: HeadingLevel.HEADING_3,
						keepNext: true,
						spacing: {
							before: ptToTwips(CV_STYLES.spacing.sectionBefore),
							after: ptToTwips(CV_STYLES.spacing.sectionAfter),
						},
						children: [
							new TextRun({
								text: block.text,
								bold: true,
								font: FONT,
								size,
								color: CV_STYLES.color.heading,
							}),
						],
					}),
				);
				break;
			}
			case "bullet":
				paragraphs.push(
					new Paragraph({
						bullet: { level: 0 },
						indent: { left: inchesToTwips(0.25), hanging: inchesToTwips(0.15) },
						spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
						children: emphasisRuns(block.text),
					}),
				);
				break;
			case "ordered":
				paragraphs.push(
					new Paragraph({
						numbering: { reference: "default-numbering", level: 0 },
						spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
						children: emphasisRuns(block.text),
					}),
				);
				break;
			default:
				paragraphs.push(
					new Paragraph({
						spacing: { after: ptToTwips(CV_STYLES.spacing.bulletAfter), line: LINE },
						children: emphasisRuns(block.text),
					}),
				);
		}
	}

	const doc = new Document({
		title: title ?? "Document",
		styles: {
			default: {
				document: {
					run: { font: FONT, size: BODY_HALF, color: CV_STYLES.color.text },
					paragraph: { spacing: { line: LINE } },
				},
			},
		},
		numbering: {
			config: [
				{
					reference: "default-numbering",
					levels: [
						{
							level: 0,
							format: "decimal",
							text: "%1.",
							alignment: AlignmentType.START,
						},
					],
				},
			],
		},
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: inchesToTwips(CV_STYLES.margin.top),
							right: inchesToTwips(CV_STYLES.margin.right),
							bottom: inchesToTwips(CV_STYLES.margin.bottom),
							left: inchesToTwips(CV_STYLES.margin.left),
						},
					},
				},
				children: paragraphs,
			},
		],
	});

	return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Plain Text Export (for PDF) ─────────────────────────────────────

export function markdownToPlainText(markdown: string): string {
	return markdown
		.replace(/^#{1,3}\s+/gm, "")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/\*(.+?)\*/g, "$1")
		.replace(/__(.+?)__/g, "$1")
		.replace(/_(.+?)_/g, "$1")
		.replace(/^[-*]\s+/gm, "  - ")
		.replace(/^\d+\.\s+/gm, (match) => `  ${match}`);
}
