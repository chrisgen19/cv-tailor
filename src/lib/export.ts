import {
	Document,
	HeadingLevel,
	Packer,
	Paragraph,
	TextRun,
	AlignmentType,
} from "docx";

// ─── Markdown → Structured Blocks ───────────────────────────────────

interface Block {
	type: "heading" | "paragraph" | "bullet" | "ordered";
	level?: number;
	text: string;
}

function parseMarkdownToBlocks(markdown: string): Block[] {
	const lines = markdown.split("\n");
	const blocks: Block[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		// Headings
		const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
		if (headingMatch) {
			blocks.push({
				type: "heading",
				level: headingMatch[1].length,
				text: headingMatch[2],
			});
			continue;
		}

		// Bullet list
		if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
			blocks.push({ type: "bullet", text: trimmed.slice(2) });
			continue;
		}

		// Ordered list
		const orderedMatch = trimmed.match(/^\d+\.\s+(.+)/);
		if (orderedMatch) {
			blocks.push({ type: "ordered", text: orderedMatch[1] });
			continue;
		}

		// Regular paragraph
		blocks.push({ type: "paragraph", text: trimmed });
	}

	return blocks;
}

function stripMarkdownFormatting(text: string): string {
	return text
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/\*(.+?)\*/g, "$1")
		.replace(/__(.+?)__/g, "$1")
		.replace(/_(.+?)_/g, "$1");
}

// ─── DOCX Export ─────────────────────────────────────────────────────

export async function generateDocx(content: string, title?: string): Promise<Buffer> {
	const blocks = parseMarkdownToBlocks(content);
	const paragraphs: Paragraph[] = [];

	for (const block of blocks) {
		const cleanText = stripMarkdownFormatting(block.text);

		switch (block.type) {
			case "heading":
				paragraphs.push(
					new Paragraph({
						text: cleanText,
						heading:
							block.level === 1
								? HeadingLevel.HEADING_1
								: block.level === 2
									? HeadingLevel.HEADING_2
									: HeadingLevel.HEADING_3,
						spacing: { before: 240, after: 120 },
					}),
				);
				break;
			case "bullet":
				paragraphs.push(
					new Paragraph({
						children: [new TextRun({ text: cleanText, size: 22 })],
						bullet: { level: 0 },
						spacing: { before: 60, after: 60 },
					}),
				);
				break;
			case "ordered":
				paragraphs.push(
					new Paragraph({
						children: [new TextRun({ text: cleanText, size: 22 })],
						numbering: { reference: "default-numbering", level: 0 },
						spacing: { before: 60, after: 60 },
					}),
				);
				break;
			default:
				paragraphs.push(
					new Paragraph({
						children: [new TextRun({ text: cleanText, size: 22 })],
						spacing: { before: 60, after: 60 },
					}),
				);
		}
	}

	const doc = new Document({
		title: title ?? "Document",
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
							top: 1440,
							right: 1440,
							bottom: 1440,
							left: 1440,
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
