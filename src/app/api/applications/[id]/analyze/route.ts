import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeMatch, parseJobRequirements } from "@/lib/gemini";
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
		const [matchAnalysis, parsedRequirements] = await Promise.all([
			analyzeMatch(masterCV.rawText, application.rawDescription),
			application.parsedRequirements
				? Promise.resolve(null)
				: parseJobRequirements(application.rawDescription),
		]);

		const updated = await prisma.jobApplication.update({
			where: { id },
			data: {
				matchAnalysis: JSON.parse(JSON.stringify(matchAnalysis)),
				...(parsedRequirements
					? { parsedRequirements: JSON.parse(JSON.stringify(parsedRequirements)) }
					: {}),
				status: "ANALYZED",
			},
		});

		return NextResponse.json(updated);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Analysis failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
