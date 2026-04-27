import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCachedMasterCvStrict } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { deleteFileFromR2, extractR2KeyFromUrl } from "@/lib/r2";

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
		select: {
			id: true,
			r2Key: true,
			originalFileUrl: true,
			geminiCacheName: true,
		},
	});

	if (!masterCV) {
		return NextResponse.json({ error: "No CV found" }, { status: 404 });
	}

	// Delete the Gemini cache FIRST, strictly. If it fails for any reason other
	// than "already gone", surface the error so the user retries — we don't want
	// to drop the local pointer while personal CV data still lives in the cache.
	if (masterCV.geminiCacheName) {
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

	const r2Key = masterCV.r2Key ?? extractR2KeyFromUrl(masterCV.originalFileUrl);
	if (r2Key) {
		await deleteFileFromR2(r2Key);
	}

	await prisma.masterCV.delete({ where: { id: masterCV.id } });

	return NextResponse.json({ success: true });
}
