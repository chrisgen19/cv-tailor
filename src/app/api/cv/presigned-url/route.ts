import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/r2";
import { presignedUrlSchema } from "@/lib/validations";

export async function POST(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = presignedUrlSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { fileName, contentType } = parsed.data;
	const ext = fileName.split(".").pop();
	const r2Key = `cvs/${session.user.id}/${Date.now()}.${ext}`;

	try {
		const url = await getPresignedUploadUrl(r2Key, contentType);
		return NextResponse.json({ url, r2Key });
	} catch {
		return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
	}
}
