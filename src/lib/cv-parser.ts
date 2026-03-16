import mammoth from "mammoth";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
	const pdf = await getDocumentProxy(new Uint8Array(buffer));
	const { text } = await extractPdfText(pdf, { mergePages: true });
	const trimmed = (text as string).trim();
	if (!trimmed) throw new Error("No text content found in PDF");
	return trimmed;
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
