import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCachedMasterCvStrict } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { deleteFileFromR2, extractR2KeyFromUrl } from "@/lib/r2";

export async function DELETE() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Clean up Gemini cache FIRST, strictly. If it fails (other than "already
	// gone"), surface the error rather than orphaning personal CV data in the
	// third-party cache after we've dropped the local user record.
	const masterCV = await prisma.masterCV.findUnique({
		where: { userId: session.user.id },
		select: { r2Key: true, originalFileUrl: true, geminiCacheName: true },
	});
	if (masterCV?.geminiCacheName) {
		try {
			await deleteCachedMasterCvStrict(masterCV.geminiCacheName);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to delete cached CV from Gemini";
			return NextResponse.json(
				{ error: `Could not remove cached CV from Gemini: ${message}` },
				{ status: 502 },
			);
		}
	}
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
