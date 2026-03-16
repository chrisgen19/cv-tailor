"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
	ArrowLeft,
	Building2,
	Calendar,
	ExternalLink,
	FileText,
	Loader2,
	Pencil,
	Sparkles,
	Target,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { JobApplication } from "@/generated/prisma/client";
import type { ParsedRequirements } from "@/lib/gemini";
import { StatusBadge } from "@/components/applications/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function ApplicationDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [application, setApplication] = useState<JobApplication | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const fetchApplication = useCallback(async () => {
		try {
			const res = await fetch(`/api/applications/${id}`);
			if (!res.ok) throw new Error();
			setApplication(await res.json());
		} catch {
			toast.error("Failed to load application");
			router.push("/applications");
		} finally {
			setLoading(false);
		}
	}, [id, router]);

	useEffect(() => {
		fetchApplication();
	}, [fetchApplication]);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error();
			toast.success("Application deleted");
			router.push("/applications");
		} catch {
			toast.error("Failed to delete application");
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!application) return null;

	const requirements = application.parsedRequirements as ParsedRequirements | null;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<Button variant="ghost" size="icon" render={<Link href="/applications" />}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<div className="mb-1 flex items-center gap-2">
							<h1 className="text-2xl font-semibold">{application.title}</h1>
							<StatusBadge status={application.status} />
						</div>
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span className="flex items-center gap-1">
								<Building2 className="h-3.5 w-3.5" />
								{application.company}
							</span>
							<span className="flex items-center gap-1">
								<Calendar className="h-3.5 w-3.5" />
								{formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
							</span>
							{application.sourceUrl && (
								<a
									href={application.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1 hover:text-primary transition-colors"
								>
									<ExternalLink className="h-3.5 w-3.5" />
									View posting
								</a>
							)}
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						render={<Link href={`/applications/${id}/edit`} />}
					>
						<Pencil className="mr-1.5 h-3.5 w-3.5" />
						Edit
					</Button>
					<Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
						<Trash2 className="mr-1.5 h-3.5 w-3.5" />
						Delete
					</Button>
				</div>
			</div>

			{/* Notes */}
			{application.notes && (
				<Card size="sm">
					<CardContent>
						<p className="text-sm text-muted-foreground">{application.notes}</p>
					</CardContent>
				</Card>
			)}

			{/* Tabs */}
			<Tabs defaultValue="description">
				<TabsList variant="line">
					<TabsTrigger value="description">
						<FileText className="mr-1.5 h-3.5 w-3.5" />
						Job Description
					</TabsTrigger>
					<TabsTrigger value="analysis">
						<Target className="mr-1.5 h-3.5 w-3.5" />
						Match Analysis
					</TabsTrigger>
					<TabsTrigger value="tailored">
						<Sparkles className="mr-1.5 h-3.5 w-3.5" />
						Tailored CV
					</TabsTrigger>
					<TabsTrigger value="cover-letter">
						<FileText className="mr-1.5 h-3.5 w-3.5" />
						Cover Letter
					</TabsTrigger>
				</TabsList>

				{/* Job Description Tab */}
				<TabsContent value="description" className="mt-4 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Job Description</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
								{application.rawDescription}
							</pre>
						</CardContent>
					</Card>

					{requirements && (
						<div className="grid gap-4 md:grid-cols-2">
							{requirements.requiredSkills.length > 0 && (
								<Card size="sm">
									<CardHeader>
										<CardTitle>Required Skills</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="flex flex-wrap gap-1.5">
											{requirements.requiredSkills.map((skill) => (
												<span
													key={skill}
													className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
												>
													{skill}
												</span>
											))}
										</div>
									</CardContent>
								</Card>
							)}
							{requirements.preferredSkills.length > 0 && (
								<Card size="sm">
									<CardHeader>
										<CardTitle>Preferred Skills</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="flex flex-wrap gap-1.5">
											{requirements.preferredSkills.map((skill) => (
												<span
													key={skill}
													className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
												>
													{skill}
												</span>
											))}
										</div>
									</CardContent>
								</Card>
							)}
							{requirements.responsibilities.length > 0 && (
								<Card size="sm">
									<CardHeader>
										<CardTitle>Responsibilities</CardTitle>
									</CardHeader>
									<CardContent>
										<ul className="space-y-1 text-sm text-muted-foreground">
											{requirements.responsibilities.map((item) => (
												<li key={item} className="flex gap-2">
													<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
													{item}
												</li>
											))}
										</ul>
									</CardContent>
								</Card>
							)}
							{requirements.qualifications.length > 0 && (
								<Card size="sm">
									<CardHeader>
										<CardTitle>Qualifications</CardTitle>
									</CardHeader>
									<CardContent>
										<ul className="space-y-1 text-sm text-muted-foreground">
											{requirements.qualifications.map((item) => (
												<li key={item} className="flex gap-2">
													<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
													{item}
												</li>
											))}
										</ul>
									</CardContent>
								</Card>
							)}
							{(requirements.experienceLevel !== "Not specified" ||
								requirements.employmentType !== "Not specified") && (
								<Card size="sm">
									<CardHeader>
										<CardTitle>Details</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2 text-sm">
										{requirements.experienceLevel !== "Not specified" && (
											<div>
												<span className="text-muted-foreground">Experience: </span>
												<span>{requirements.experienceLevel}</span>
											</div>
										)}
										{requirements.employmentType !== "Not specified" && (
											<div>
												<span className="text-muted-foreground">Type: </span>
												<span>{requirements.employmentType}</span>
											</div>
										)}
									</CardContent>
								</Card>
							)}
						</div>
					)}
				</TabsContent>

				{/* Match Analysis Tab — Phase 4 */}
				<TabsContent value="analysis" className="mt-4">
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<Target className="mb-3 h-10 w-10 text-muted-foreground/40" />
							<h3 className="mb-1 text-lg font-medium">Match Analysis</h3>
							<p className="mb-4 max-w-sm text-sm text-muted-foreground">
								AI-powered analysis comparing your CV with this job's requirements. Coming in Phase 4.
							</p>
							<Button disabled>
								<Sparkles className="mr-2 h-4 w-4" />
								Run Analysis
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Tailored CV Tab — Phase 4 */}
				<TabsContent value="tailored" className="mt-4">
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
							<h3 className="mb-1 text-lg font-medium">Tailored CV</h3>
							<p className="mb-4 max-w-sm text-sm text-muted-foreground">
								AI-generated CV optimized for this specific job. Coming in Phase 4.
							</p>
							<Button disabled>
								<Sparkles className="mr-2 h-4 w-4" />
								Generate Tailored CV
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Cover Letter Tab — Phase 4 */}
				<TabsContent value="cover-letter" className="mt-4">
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
							<h3 className="mb-1 text-lg font-medium">Cover Letter</h3>
							<p className="mb-4 max-w-sm text-sm text-muted-foreground">
								AI-generated cover letter tailored to this job. Coming in Phase 4.
							</p>
							<Button disabled>
								<Sparkles className="mr-2 h-4 w-4" />
								Generate Cover Letter
							</Button>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Delete Dialog */}
			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Application</DialogTitle>
						<DialogDescription>
							This will permanently delete "{application.title}" at {application.company}. This
							action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
