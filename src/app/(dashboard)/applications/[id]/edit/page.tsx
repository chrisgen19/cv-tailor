"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STATUSES: { value: ApplicationStatus; label: string }[] = [
	{ value: "DRAFT", label: "Draft" },
	{ value: "ANALYZED", label: "Analyzed" },
	{ value: "TAILORED", label: "Tailored" },
	{ value: "APPLIED", label: "Applied" },
	{ value: "REJECTED", label: "Rejected" },
	{ value: "INTERVIEW", label: "Interview" },
	{ value: "OFFER", label: "Offer" },
];

export default function EditApplicationPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();

	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	const [title, setTitle] = useState("");
	const [company, setCompany] = useState("");
	const [rawDescription, setRawDescription] = useState("");
	const [status, setStatus] = useState<ApplicationStatus>("DRAFT");
	const [notes, setNotes] = useState("");

	useEffect(() => {
		async function load() {
			try {
				const res = await fetch(`/api/applications/${id}`);
				if (!res.ok) throw new Error();
				const app = await res.json();
				setTitle(app.title);
				setCompany(app.company);
				setRawDescription(app.rawDescription);
				setStatus(app.status);
				setNotes(app.notes ?? "");
			} catch {
				toast.error("Failed to load application");
				router.push("/applications");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [id, router]);

	const handleSubmit = async () => {
		if (!title.trim() || !company.trim()) {
			toast.error("Title and company are required");
			return;
		}

		setSubmitting(true);
		try {
			const res = await fetch(`/api/applications/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: title.trim(),
					company: company.trim(),
					rawDescription: rawDescription.trim(),
					status,
					notes: notes.trim() || undefined,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to update");
			}
			toast.success("Application updated");
			router.push(`/applications/${id}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to update application");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" render={<Link href={`/applications/${id}`} />}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-semibold">Edit Application</h1>
					<p className="text-sm text-muted-foreground">Update job application details</p>
				</div>
			</div>

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
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="company">Company</Label>
							<Input
								id="company"
								value={company}
								onChange={(e) => setCompany(e.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="status">Status</Label>
						<Select value={status} onValueChange={(v) => v && setStatus(v as ApplicationStatus)}>
							<SelectTrigger className="w-full sm:w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUSES.map((s) => (
									<SelectItem key={s.value} value={s.value}>
										{s.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="description">Job Description</Label>
						<Textarea
							id="description"
							value={rawDescription}
							onChange={(e) => setRawDescription(e.target.value)}
							rows={10}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
						/>
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end gap-3">
				<Button variant="outline" render={<Link href={`/applications/${id}`} />}>
					Cancel
				</Button>
				<Button onClick={handleSubmit} disabled={submitting}>
					{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Save Changes
				</Button>
			</div>
		</div>
	);
}
