import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = request.nextUrl;
	const status = searchParams.get("status");
	const search = searchParams.get("search");
	const sort = searchParams.get("sort") ?? "createdAt";
	const order = searchParams.get("order") ?? "desc";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "20");

	const where = {
		userId: session.user.id,
		...(status && status !== "ALL" ? { status: status as never } : {}),
		...(search
			? {
					OR: [
						{ title: { contains: search, mode: "insensitive" as const } },
						{ company: { contains: search, mode: "insensitive" as const } },
					],
				}
			: {}),
	};

	const [applications, total] = await Promise.all([
		prisma.jobApplication.findMany({
			where,
			orderBy: { [sort]: order },
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.jobApplication.count({ where }),
	]);

	return NextResponse.json({ applications, total, page, limit });
}

export async function POST(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = createApplicationSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const d = parsed.data;
	const application = await prisma.jobApplication.create({
		data: {
			userId: session.user.id,
			title: d.title,
			company: d.company,
			sourceUrl: d.sourceUrl || null,
			rawDescription: d.rawDescription,
			notes: d.notes || null,
			salaryMin: d.salaryMin ?? null,
			salaryMax: d.salaryMax ?? null,
			salaryCurrency: d.salaryCurrency || null,
			workSetup: d.workSetup ?? null,
			locationAddress: d.locationAddress || null,
			companyWebsite: d.companyWebsite || null,
			contactName: d.contactName || null,
			contactEmail: d.contactEmail || null,
			contactPhone: d.contactPhone || null,
		},
	});

	return NextResponse.json(application, { status: 201 });
}
