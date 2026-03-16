import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFileFromR2 } from "@/lib/r2";

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

export async function DELETE() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const masterCV = await prisma.masterCV.findUnique({
		where: { userId: session.user.id },
		select: { id: true, r2Key: true },
	});

	if (!masterCV) {
		return NextResponse.json({ error: "No CV found" }, { status: 404 });
	}

	if (masterCV.r2Key) {
		await deleteFileFromR2(masterCV.r2Key);
	}

	await prisma.masterCV.delete({ where: { id: masterCV.id } });

	return NextResponse.json({ success: true });
}
