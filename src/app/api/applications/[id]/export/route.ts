import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TailoredCvSchema } from "@/lib/cv-schema";
import { jsonToMarkdown, looksLikeHtml, markdownToJson } from "@/lib/cv-serializer";
import { generateCvDocx, generateDocx, markdownToPlainText } from "@/lib/export";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const application = await prisma.jobApplication.findFirst({
		where: { id, userId: session.user.id },
	});
	if (!application) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const format = request.nextUrl.searchParams.get("format") ?? "docx";
	const type = request.nextUrl.searchParams.get("type") ?? "cv";
	const isCoverLetter = type === "cover-letter";

	const rawContent = isCoverLetter
		? application.coverLetter
		: (application.tailoredCVEdited ?? application.tailoredCV);
	// Cover letters are saved as Tiptap HTML (no JSON fallback exists), so
	// HTML must pass through. CVs additionally have a structured-JSON path
	// — for them, treat HTML / whitespace-only markdown as "no markdown" so
	// the route never falls back to a renderer that would emit raw tags.
	const hasContent = Boolean(rawContent?.trim());
	const usableCvMarkdown = !isCoverLetter && isUsableMarkdown(rawContent) ? rawContent : null;
	const cv = isCoverLetter ? null : resolveTailoredCv(application.tailoredCvJson, usableCvMarkdown);

	const canExport = isCoverLetter ? hasContent : Boolean(usableCvMarkdown || cv);
	if (!canExport) {
		return NextResponse.json(
			{ error: `No ${isCoverLetter ? "cover letter" : "tailored CV"} to export` },
			{ status: 400 },
		);
	}

	const baseName = `${application.company.replace(/[^a-zA-Z0-9]/g, "-")}_${
		isCoverLetter ? "cover-letter" : "tailored-cv"
	}`;

	if (format === "docx") {
		let buffer: Buffer;
		if (isCoverLetter) {
			// Guarded above — rawContent is non-empty here.
			buffer = await generateDocx(rawContent as string, `Cover Letter - ${application.title}`);
		} else if (cv) {
			buffer = await generateCvDocx(cv, `${application.title} - Tailored CV`);
		} else {
			// Last resort: validated non-HTML markdown CV with no parseable JSON.
			buffer = await generateDocx(usableCvMarkdown as string, `${application.title} - Tailored CV`);
		}

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"Content-Disposition": `attachment; filename="${baseName}.docx"`,
			},
		});
	}

	// Plain text fallback (for PDF, client will handle rendering). When the CV
	// row has only structured JSON (no edited markdown), serialize the JSON
	// first so the response isn't an empty file. Cover letters fall through
	// the same plain-text path on whatever content they have.
	const sourceMarkdown = isCoverLetter
		? (rawContent ?? "")
		: (usableCvMarkdown ?? (cv ? jsonToMarkdown(cv) : ""));
	const plainText = markdownToPlainText(sourceMarkdown);
	return new NextResponse(plainText, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Content-Disposition": `attachment; filename="${baseName}.txt"`,
		},
	});
}

function isUsableMarkdown(value: string | null | undefined): value is string {
	if (!value) return false;
	const trimmed = value.trim();
	if (!trimmed) return false;
	return !looksLikeHtml(trimmed);
}

// Prefer the structured JSON when present; fall back to parsing the edited
// markdown so legacy applications (pre-#7) still get the styled DOCX.
function resolveTailoredCv(json: unknown, markdown: string | null) {
	if (json) {
		const parsed = TailoredCvSchema.safeParse(json);
		if (parsed.success) return parsed.data;
	}
	if (!markdown) return null;
	try {
		const fromMarkdown = markdownToJson(markdown);
		const parsed = TailoredCvSchema.safeParse(fromMarkdown);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
