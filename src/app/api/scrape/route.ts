import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractJobMeta } from "@/lib/gemini";
import { scrapeJobPosting } from "@/lib/scraper";
import { scrapeUrlSchema } from "@/lib/validations";

export async function POST(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = scrapeUrlSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid URL", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	try {
		const description = await scrapeJobPosting(parsed.data.url);
		const meta = await extractJobMeta(description);

		return NextResponse.json({
			description,
			title: meta.title,
			company: meta.company,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to scrape URL";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
