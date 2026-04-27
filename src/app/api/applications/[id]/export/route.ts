import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TailoredCvSchema } from "@/lib/cv-schema";
import { jsonToMarkdown, looksLikeHtml, markdownToJson } from "@/lib/cv-serializer";
import { generateCvDocx, generateDocx, markdownToPlainText } from "@/lib/export";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
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
	// Tiptap saves edits as HTML (via `editor.getHTML()`); normalize to markdown
	// up-front so neither downstream renderer ever sees raw tags. Empty input
	// resolves to null and the route returns 400 below.
	const markdown = normalizeContent(rawContent);
	const cv = isCoverLetter ? null : resolveTailoredCv(application.tailoredCvJson, markdown);

	if (!markdown && !cv) {
		return NextResponse.json(
			{ error: `No ${isCoverLetter ? "cover letter" : "tailored CV"} to export` },
			{ status: 400 },
		);
	}

	const baseName = `${application.company.replace(/[^a-zA-Z0-9]/g, "-")}_${
		isCoverLetter ? "cover-letter" : "tailored-cv"
	}`;

	if (format === "pdf") {
		if (isCoverLetter) {
			return NextResponse.json(
				{ error: "PDF export is only supported for the tailored CV" },
				{ status: 400 },
			);
		}
		if (!cv) {
			return NextResponse.json(
				{
					error:
						"Structured tailored CV not available — please re-run Tailor on this application to regenerate the data, then export again.",
				},
				{ status: 400 },
			);
		}
		const { generateCvPdf } = await import("@/lib/pdf-export");
		const pdfBuffer = await generateCvPdf(cv, `${application.title} - Tailored CV`);
		return new NextResponse(new Uint8Array(pdfBuffer), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${baseName}.pdf"`,
			},
		});
	}

	if (format === "docx") {
		let buffer: Buffer;
		if (isCoverLetter) {
			// Guarded above — markdown is non-null here.
			buffer = await generateDocx(markdown as string, `Cover Letter - ${application.title}`);
		} else if (cv) {
			buffer = await generateCvDocx(cv, `${application.title} - Tailored CV`);
		} else {
			// CV with no parseable JSON — render the normalized markdown.
			buffer = await generateDocx(markdown as string, `${application.title} - Tailored CV`);
		}

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"Content-Disposition": `attachment; filename="${baseName}.docx"`,
			},
		});
	}

	// Plain text fallback (for PDF, client renders). When the CV row has only
	// structured JSON (no markdown), serialize the JSON first so the response
	// isn't an empty file.
	const sourceMarkdown = markdown ?? (cv ? jsonToMarkdown(cv) : "");
	const plainText = markdownToPlainText(sourceMarkdown);
	return new NextResponse(plainText, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Content-Disposition": `attachment; filename="${baseName}.txt"`,
		},
	});
}

// Trim, drop empty content, and convert Tiptap HTML to markdown.
function normalizeContent(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (looksLikeHtml(trimmed)) {
		const converted = htmlToMarkdown(trimmed).trim();
		return converted ? converted : null;
	}
	return trimmed;
}

// Prefer the structured JSON when present; fall back to parsing the
// (now-markdown) edited content so legacy applications still get the styled DOCX.
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
