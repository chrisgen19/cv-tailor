import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { markdownToJson } from "@/lib/cv-serializer";
import { prisma } from "@/lib/prisma";
import { updateApplicationSchema } from "@/lib/validations";

async function getApplication(userId: string, id: string) {
	return prisma.jobApplication.findFirst({
		where: { id, userId },
	});
}

async function backfillTailoredCvJson(id: string, markdown: string) {
	try {
		const parsed = markdownToJson(markdown);
		await prisma.jobApplication.update({
			where: { id },
			data: { tailoredCvJson: parsed },
		});
		return parsed;
	} catch {
		return null;
	}
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const application = await getApplication(session.user.id, id);
	if (!application) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const markdown = application.tailoredCVEdited ?? application.tailoredCV;
	if (!application.tailoredCvJson && markdown) {
		const backfilled = await backfillTailoredCvJson(application.id, markdown);
		if (backfilled) {
			return NextResponse.json({ ...application, tailoredCvJson: backfilled });
		}
	}

	return NextResponse.json(application);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const existing = await getApplication(session.user.id, id);
	if (!existing) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = await request.json();
	const parsed = updateApplicationSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const data: Prisma.JobApplicationUpdateInput = { ...parsed.data };
	if (parsed.data.tailoredCVEdited) {
		try {
			data.tailoredCvJson = markdownToJson(
				parsed.data.tailoredCVEdited,
			) as unknown as Prisma.InputJsonValue;
		} catch {
			// keep markdown edit, leave JSON unchanged
		}
	}

	const updated = await prisma.jobApplication.update({
		where: { id },
		data,
	});

	return NextResponse.json(updated);
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const existing = await getApplication(session.user.id, id);
	if (!existing) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	await prisma.jobApplication.delete({ where: { id } });

	return NextResponse.json({ success: true });
}
