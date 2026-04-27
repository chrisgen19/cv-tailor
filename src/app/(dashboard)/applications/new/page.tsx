"use client";

import { ArrowLeft, Globe, Loader2, Type } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	CompensationFields,
	type CompensationValue,
	compensationToPayload,
	EMPTY_COMPENSATION,
} from "@/components/applications/compensation-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function NewApplicationPage() {
	const router = useRouter();
	const [tab, setTab] = useState("paste");

	// Form fields
	const [title, setTitle] = useState("");
	const [company, setCompany] = useState("");
	const [rawDescription, setRawDescription] = useState("");
	const [sourceUrl, setSourceUrl] = useState("");
	const [notes, setNotes] = useState("");
	const [compensation, setCompensation] = useState<CompensationValue>(EMPTY_COMPENSATION);

	// Scrape state
	const [scrapeUrl, setScrapeUrl] = useState("");
	const [scraping, setScraping] = useState(false);

	// Submit state
	const [submitting, setSubmitting] = useState(false);

	const handleScrape = async () => {
		if (!scrapeUrl.trim()) return;
		setScraping(true);
		try {
			const res = await fetch("/api/scrape", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: scrapeUrl }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to scrape URL");
			}
			const data = await res.json();
			setRawDescription(data.description);
			if (data.title) setTitle(data.title);
			if (data.company) setCompany(data.company);
			setSourceUrl(scrapeUrl);
			toast.success("Job posting scraped successfully");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to scrape URL");
		} finally {
			setScraping(false);
		}
	};

	const handleSubmit = async () => {
		if (!title.trim() || !company.trim() || rawDescription.trim().length < 10) {
			toast.error("Please fill in the title, company, and description (min 10 chars)");
			return;
		}

		const compPayload = compensationToPayload(compensation);
		if (
			compPayload.salaryMin != null &&
			compPayload.salaryMax != null &&
			compPayload.salaryMax < compPayload.salaryMin
		) {
			toast.error("Max salary must be greater than or equal to min salary");
			return;
		}

		setSubmitting(true);
		try {
			const res = await fetch("/api/applications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: title.trim(),
					company: company.trim(),
					rawDescription: rawDescription.trim(),
					sourceUrl: sourceUrl.trim() || undefined,
					notes: notes.trim() || undefined,
					...compPayload,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to create application");
			}
			const application = await res.json();
			toast.success("Application created");
			router.push(`/applications/${application.id}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to create application");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" render={<Link href="/applications" />}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-semibold">New Application</h1>
					<p className="text-sm text-muted-foreground">Add a job you want to apply for</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Job Description</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Tabs value={tab} onValueChange={setTab}>
						<TabsList>
							<TabsTrigger value="paste">
								<Type className="mr-1.5 h-3.5 w-3.5" />
								Paste Text
							</TabsTrigger>
							<TabsTrigger value="url">
								<Globe className="mr-1.5 h-3.5 w-3.5" />
								From URL
							</TabsTrigger>
						</TabsList>
						<TabsContent value="paste" className="mt-4">
							<div className="space-y-2">
								<Label htmlFor="raw-description">Job Description</Label>
								<Textarea
									id="raw-description"
									placeholder="Paste the full job description here..."
									value={rawDescription}
									onChange={(e) => setRawDescription(e.target.value)}
									rows={10}
								/>
							</div>
						</TabsContent>
						<TabsContent value="url" className="mt-4">
							<div className="space-y-3">
								<div className="space-y-2">
									<Label htmlFor="scrape-url">Job Posting URL</Label>
									<div className="flex gap-2">
										<Input
											id="scrape-url"
											placeholder="https://example.com/jobs/..."
											value={scrapeUrl}
											onChange={(e) => setScrapeUrl(e.target.value)}
										/>
										<Button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()}>
											{scraping ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Globe className="mr-2 h-4 w-4" />
											)}
											Scrape
										</Button>
									</div>
								</div>
								{rawDescription && (
									<div className="space-y-2">
										<Label>Extracted Description</Label>
										<Textarea
											value={rawDescription}
											onChange={(e) => setRawDescription(e.target.value)}
											rows={10}
										/>
									</div>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Job Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="title">Job Title</Label>
							<Input
								id="title"
								placeholder="e.g. Senior Frontend Developer"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="company">Company</Label>
							<Input
								id="company"
								placeholder="e.g. Acme Corp"
								value={company}
								onChange={(e) => setCompany(e.target.value)}
							/>
						</div>
					</div>
					{tab === "paste" && (
						<div className="space-y-2">
							<Label htmlFor="source-url">Source URL (optional)</Label>
							<Input
								id="source-url"
								placeholder="https://..."
								value={sourceUrl}
								onChange={(e) => setSourceUrl(e.target.value)}
							/>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="notes">Notes (optional)</Label>
						<Textarea
							id="notes"
							placeholder="Any notes about this application..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
						/>
					</div>
				</CardContent>
			</Card>

			<CompensationFields value={compensation} onChange={setCompensation} />

			<div className="flex justify-end gap-3">
				<Button variant="outline" render={<Link href="/applications" />}>
					Cancel
				</Button>
				<Button onClick={handleSubmit} disabled={submitting}>
					{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Create Application
				</Button>
			</div>
		</div>
	);
}
