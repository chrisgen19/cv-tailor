import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateDocx, markdownToPlainText } from "@/lib/export";
import { prisma } from "@/lib/prisma";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
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

	const content =
		type === "cover-letter"
			? application.coverLetter
			: application.tailoredCVEdited ?? application.tailoredCV;

	if (!content) {
		return NextResponse.json(
			{ error: `No ${type === "cover-letter" ? "cover letter" : "tailored CV"} to export` },
			{ status: 400 },
		);
	}

	const baseName = `${application.company.replace(/[^a-zA-Z0-9]/g, "-")}_${type === "cover-letter" ? "cover-letter" : "tailored-cv"}`;

	if (format === "docx") {
		const buffer = await generateDocx(
			content,
			type === "cover-letter"
				? `Cover Letter - ${application.title}`
				: `${application.title} - Tailored CV`,
		);

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type":
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"Content-Disposition": `attachment; filename="${baseName}.docx"`,
			},
		});
	}

	// Plain text fallback (for PDF, client will handle rendering)
	const plainText = markdownToPlainText(content);
	return new NextResponse(plainText, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Content-Disposition": `attachment; filename="${baseName}.txt"`,
		},
	});
}
