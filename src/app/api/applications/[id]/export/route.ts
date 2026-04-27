import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TailoredCvSchema } from "@/lib/cv-schema";
import { markdownToJson } from "@/lib/cv-serializer";
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

	const markdown = isCoverLetter
		? application.coverLetter
		: (application.tailoredCVEdited ?? application.tailoredCV);

	if (!markdown && (isCoverLetter || !application.tailoredCvJson)) {
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
			buffer = await generateDocx(markdown ?? "", `Cover Letter - ${application.title}`);
		} else {
			const cv = resolveTailoredCv(application.tailoredCvJson, markdown);
			buffer = cv
				? await generateCvDocx(cv, `${application.title} - Tailored CV`)
				: await generateDocx(markdown ?? "", `${application.title} - Tailored CV`);
		}

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"Content-Disposition": `attachment; filename="${baseName}.docx"`,
			},
		});
	}

	// Plain text fallback (for PDF, client will handle rendering)
	const plainText = markdownToPlainText(markdown ?? "");
	return new NextResponse(plainText, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Content-Disposition": `attachment; filename="${baseName}.txt"`,
		},
	});
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
