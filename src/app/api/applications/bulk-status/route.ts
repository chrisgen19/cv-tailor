import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkStatusUpdateSchema } from "@/lib/validations";

export async function PATCH(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = bulkStatusUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { ids, status } = parsed.data;

	await prisma.jobApplication.updateMany({
		where: {
			id: { in: ids },
			userId: session.user.id,
		},
		data: { status },
	});

	return NextResponse.json({ success: true, updated: ids.length });
}
