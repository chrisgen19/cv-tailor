import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { MatchAnalysis } from "@/lib/gemini";
import { tailorCV } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
		const tailored = await tailorCV(
			masterCV.rawText,
			application.rawDescription,
			application.matchAnalysis as unknown as MatchAnalysis,
		);

		const updated = await prisma.jobApplication.update({
			where: { id },
			data: {
				tailoredCV: tailored,
				tailoredCVEdited: tailored,
				status: "TAILORED",
			},
		});

		return NextResponse.json(updated);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Tailoring failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
