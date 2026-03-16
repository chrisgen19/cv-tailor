import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

// Disable worker to avoid missing worker file in Next.js server environment
PDFParse.setWorker("");

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
	const parser = new PDFParse({ data: new Uint8Array(buffer) });
	const result = await parser.getText();
	await parser.destroy();
	const text = result.text.trim();
	if (!text) throw new Error("No text content found in PDF");
	return text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
	const result = await mammoth.extractRawText({ buffer });
	const text = result.value.trim();
	if (!text) throw new Error("No text content found in DOCX");
	return text;
}

export function extractText(buffer: Buffer, fileType: string): Promise<string> {
	if (fileType === "application/pdf" || fileType === "pdf") {
		return extractTextFromPdf(buffer);
	}
	if (
		fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
		fileType === "docx"
	) {
		return extractTextFromDocx(buffer);
	}
	throw new Error(`Unsupported file type: ${fileType}`);
}
