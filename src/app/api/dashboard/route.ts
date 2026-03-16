import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = session.user.id;

	const [total, applied, interviews, offers, recentApps, hasMasterCV] = await Promise.all([
		prisma.jobApplication.count({ where: { userId } }),
		prisma.jobApplication.count({ where: { userId, status: "APPLIED" } }),
		prisma.jobApplication.count({ where: { userId, status: "INTERVIEW" } }),
		prisma.jobApplication.count({ where: { userId, status: "OFFER" } }),
		prisma.jobApplication.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: 5,
			select: {
				id: true,
				title: true,
				company: true,
				status: true,
				matchAnalysis: true,
				createdAt: true,
			},
		}),
		prisma.masterCV.findUnique({ where: { userId }, select: { id: true } }),
	]);

	// Calculate average match score from analyzed applications
	const analyzedApps = recentApps.filter((a) => a.matchAnalysis);
	const avgScore =
		analyzedApps.length > 0
			? Math.round(
					analyzedApps.reduce((sum, a) => {
						const analysis = a.matchAnalysis as { matchScore?: number } | null;
						return sum + (analysis?.matchScore ?? 0);
					}, 0) / analyzedApps.length,
				)
			: null;

	return NextResponse.json({
		stats: { total, applied, interviews, offers, avgScore },
		recentApps,
		hasMasterCV: !!hasMasterCV,
	});
}
