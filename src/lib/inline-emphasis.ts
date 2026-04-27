export type EmphasisToken = {
	text: string;
	bold: boolean;
	italic: boolean;
};

// Tokenize a string containing **bold** and *italic* markdown emphasis into
// runs ready to feed into a DOCX TextRun. Bold is matched before italic so
// `**x**` does not get parsed as `*` + `*x*` + `*`. Nested emphasis is not
// supported — model output stays single-level.
export function parseInlineEmphasis(input: string): EmphasisToken[] {
	const tokens: EmphasisToken[] = [];
	const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null = pattern.exec(input);
	while (match !== null) {
		if (match.index > lastIndex) {
			tokens.push({
				text: input.slice(lastIndex, match.index),
				bold: false,
				italic: false,
			});
		}
		if (match[1] !== undefined) {
			tokens.push({ text: match[1], bold: true, italic: false });
		} else if (match[2] !== undefined) {
			tokens.push({ text: match[2], bold: false, italic: true });
		}
		lastIndex = pattern.lastIndex;
		match = pattern.exec(input);
	}
	if (lastIndex < input.length) {
		tokens.push({ text: input.slice(lastIndex), bold: false, italic: false });
	}

	return tokens.length > 0 ? tokens : [{ text: input, bold: false, italic: false }];
}
