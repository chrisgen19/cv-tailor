import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const masterCV = await prisma.masterCV.findUnique({
		where: { userId: session.user.id },
	});

	if (!masterCV) {
		return NextResponse.json(null);
	}

	return NextResponse.json({
		id: masterCV.id,
		fileName: masterCV.originalFileName,
		fileUrl: masterCV.originalFileUrl,
		parsedSections: masterCV.parsedSections,
		createdAt: masterCV.createdAt,
		updatedAt: masterCV.updatedAt,
	});
}
