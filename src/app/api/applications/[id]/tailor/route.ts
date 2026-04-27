import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { MatchAnalysis } from "@/lib/gemini";
import {
	createCachedMasterCv,
	extendCachedMasterCv,
	tailorCVWithMeta,
} from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { jsonToMarkdown } from "@/lib/cv-serializer";
import { prisma } from "@/lib/prisma";

const CACHE_REFRESH_SLACK_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

async function ensureMasterCvCache(masterCv: {
	id: string;
	rawText: string;
	geminiCacheName: string | null;
	geminiCacheExpiresAt: Date | null;
}): Promise<string | undefined> {
	const now = Date.now();
	if (
		masterCv.geminiCacheName &&
		masterCv.geminiCacheExpiresAt &&
		masterCv.geminiCacheExpiresAt.getTime() - now > CACHE_REFRESH_SLACK_MS
	) {
		return masterCv.geminiCacheName;
	}

	if (masterCv.geminiCacheName) {
		const extendedAt = await extendCachedMasterCv(masterCv.geminiCacheName);
		if (extendedAt) {
			await prisma.masterCV.update({
				where: { id: masterCv.id },
				data: { geminiCacheExpiresAt: extendedAt },
			});
			return masterCv.geminiCacheName;
		}
		// Extend failed (likely expired/missing) — fall through and recreate.
	}

	const created = await createCachedMasterCv(masterCv.id, masterCv.rawText);
	if (!created) return undefined;
	await prisma.masterCV.update({
		where: { id: masterCv.id },
		data: {
			geminiCacheName: created.name,
			geminiCacheExpiresAt: created.expiresAt,
		},
	});
	return created.name;
}

export async function POST(
	_request: Request,
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

	if (!application.matchAnalysis) {
		return NextResponse.json(
			{ error: "Please run match analysis first" },
			{ status: 400 },
		);
	}

	const masterCV = await prisma.masterCV.findUnique({
		where: { userId: session.user.id },
	});
	if (!masterCV) {
		return NextResponse.json(
			{ error: "Please upload your master CV first" },
			{ status: 400 },
		);
	}

	try {
		const cachedContent = await ensureMasterCvCache(masterCV);
		const { cv: tailoredJson, cacheWasStale } = await tailorCVWithMeta({
			cvText: masterCV.rawText,
			jobDescription: application.rawDescription,
			matchAnalysis: application.matchAnalysis as unknown as MatchAnalysis,
			cachedContent,
		});
		if (cacheWasStale) {
			await prisma.masterCV.update({
				where: { id: masterCV.id },
				data: { geminiCacheName: null, geminiCacheExpiresAt: null },
			});
		}
		const tailoredMarkdown = jsonToMarkdown(tailoredJson);

		const updated = await prisma.jobApplication.update({
			where: { id },
			data: {
				tailoredCV: tailoredMarkdown,
				tailoredCVEdited: tailoredMarkdown,
				tailoredCvJson: tailoredJson,
				status: "TAILORED",
			},
		});

		return NextResponse.json(updated);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Tailoring failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
