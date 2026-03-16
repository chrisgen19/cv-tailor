import { extract } from "@extractus/article-extractor";

export async function scrapeJobPosting(url: string): Promise<string> {
	try {
		const article = await extract(url);
		if (article?.content) {
			// Strip HTML tags and normalize whitespace
			const text = article.content
				.replace(/<[^>]*>/g, " ")
				.replace(/&nbsp;/g, " ")
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&#39;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/\s+/g, " ")
				.trim();

			if (text.length > 100) return text;
		}
	} catch {
		// Fall through to fallback
	}

	// Fallback: fetch HTML and extract text from main/article tags
	const res = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		},
	});

	if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

	const html = await res.text();

	// Try to extract from main or article tags
	const mainMatch = html.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
	const bodyContent = mainMatch?.[1] ?? html;

	const text = bodyContent
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (!text) throw new Error("No text content found at URL");
	return text;
}
