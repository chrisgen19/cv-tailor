// Shared style tokens consumed by DOCX (Step 4) and PDF (Step 5) renderers.
// Single source of truth so the two exports stay visually in sync.

export const CV_STYLES = {
	font: "Calibri",
	fontSize: {
		body: 11,
		h1: 18,
		h2: 13,
		h3: 11.5,
		contact: 10,
	},
	color: {
		text: "222222",
		heading: "111111",
		muted: "555555",
		accent: "1A56DB",
	},
	// Inches.
	margin: {
		top: 0.75,
		right: 0.75,
		bottom: 0.75,
		left: 0.75,
	},
	lineHeight: 1.15,
	// Points.
	spacing: {
		sectionBefore: 8,
		sectionAfter: 4,
		bulletAfter: 2,
	},
} as const;

// ─── DOCX unit conversions ─────────────────────────────────────────────
// docx uses half-points for font size, twentieths-of-a-point for spacing,
// and twips (1440 per inch) for margins.

export const inchesToTwips = (inches: number): number => Math.round(inches * 1440);
export const ptToHalfPt = (pt: number): number => Math.round(pt * 2);
export const ptToTwips = (pt: number): number => Math.round(pt * 20);

// 1.15 line spacing in twentieths-of-a-point relative to body size.
export const docxLineSpacing = (lineHeight: number, bodyPt: number): number =>
	Math.round(lineHeight * bodyPt * 20);
