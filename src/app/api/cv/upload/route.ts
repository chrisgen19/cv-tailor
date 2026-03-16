import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractText } from "@/lib/cv-parser";
import { parseCV } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { getFileFromR2, getR2PublicUrl } from "@/lib/r2";
import { cvUploadSchema } from "@/lib/validations";

export async function POST(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = cvUploadSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { r2Key, fileName, contentType } = parsed.data;

	try {
		// 1. Fetch file from R2
		const buffer = await getFileFromR2(r2Key);

		// 2. Extract raw text
		const rawText = await extractText(buffer, contentType);

		// 3. Parse CV with Gemini AI
		const parsedSections = await parseCV(rawText);

		// 4. Upsert MasterCV (one-to-one: replace if exists)
		const cvData = {
			rawText,
			originalFileName: fileName,
			originalFileUrl: getR2PublicUrl(r2Key),
			parsedSections: JSON.parse(JSON.stringify(parsedSections)),
		};

		const masterCV = await prisma.masterCV.upsert({
			where: { userId: session.user.id },
			create: { userId: session.user.id, ...cvData },
			update: cvData,
		});

		return NextResponse.json({
			id: masterCV.id,
			fileName: masterCV.originalFileName,
			parsedSections: masterCV.parsedSections,
			updatedAt: masterCV.updatedAt,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to process CV";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
