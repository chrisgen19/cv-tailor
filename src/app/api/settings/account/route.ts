import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFileFromR2, extractR2KeyFromUrl } from "@/lib/r2";

export async function DELETE() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Clean up R2 files before deleting user
	const masterCV = await prisma.masterCV.findUnique({
		where: { userId: session.user.id },
		select: { r2Key: true, originalFileUrl: true },
	});
	const r2Key = masterCV?.r2Key ?? extractR2KeyFromUrl(masterCV?.originalFileUrl);
	if (r2Key) {
		await deleteFileFromR2(r2Key);
	}

	// Cascading delete: User model has onDelete: Cascade on all relations
	await prisma.user.delete({
		where: { id: session.user.id },
	});

	return NextResponse.json({ success: true });
}
