"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ArrowLeft,
	Building2,
	Calendar,
	Check,
	Clipboard,
	Download,
	ExternalLink,
	FileText,
	Loader2,
	Pencil,
	RefreshCw,
	Sparkles,
	Target,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { JobDetailsPanel } from "@/components/applications/job-details-panel";
import { MatchScoreRing } from "@/components/applications/match-score-ring";
import { StatusBadge } from "@/components/applications/status-badge";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Badge } from "@/components/ui/badge";
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
import type { JobApplication } from "@/generated/prisma/client";
import type { MatchAnalysis, ParsedRequirements } from "@/lib/gemini";
import { cn } from "@/lib/utils";

export default function ApplicationDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [application, setApplication] = useState<JobApplication | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// AI action states
	const [analyzing, setAnalyzing] = useState(false);
	const [tailoring, setTailoring] = useState(false);
	const [generatingCL, setGeneratingCL] = useState(false);

	// Auto-save states
	const [savingCV, setSavingCV] = useState(false);
	const [savedCV, setSavedCV] = useState(false);
	const [savingCL, setSavingCL] = useState(false);
	const [savedCL, setSavedCL] = useState(false);

	// Regenerate confirmation
	const [confirmRegenerate, setConfirmRegenerate] = useState<"tailor" | "cover-letter" | null>(
		null,
	);

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

	// ─── AI Actions ──────────────────────────────────────────────────

	const handleAnalyze = async () => {
		setAnalyzing(true);
		try {
			const res = await fetch(`/api/applications/${id}/analyze`, { method: "POST" });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Analysis failed");
			}
			setApplication(await res.json());
			toast.success("Match analysis complete");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Analysis failed");
		} finally {
			setAnalyzing(false);
		}
	};

	const handleTailor = async () => {
		setConfirmRegenerate(null);
		setTailoring(true);
		try {
			const res = await fetch(`/api/applications/${id}/tailor`, { method: "POST" });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Tailoring failed");
			}
			setApplication(await res.json());
			toast.success("Tailored CV generated");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Tailoring failed");
		} finally {
			setTailoring(false);
		}
	};

	const handleGenerateCoverLetter = async () => {
		setConfirmRegenerate(null);
		setGeneratingCL(true);
		try {
			const res = await fetch(`/api/applications/${id}/cover-letter`, { method: "POST" });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Generation failed");
			}
			setApplication(await res.json());
			toast.success("Cover letter generated");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Generation failed");
		} finally {
			setGeneratingCL(false);
		}
	};

	// ─── Auto-save (debounced 2s) ────────────────────────────────────

	const cvTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
	const clTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

	const saveEdited = useCallback(
		async (field: "tailoredCVEdited" | "coverLetter", content: string) => {
			const setSaving = field === "tailoredCVEdited" ? setSavingCV : setSavingCL;
			const setSaved = field === "tailoredCVEdited" ? setSavedCV : setSavedCL;
			setSaving(true);
			setSaved(false);
			try {
				const res = await fetch(`/api/applications/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ [field]: content }),
				});
				if (!res.ok) throw new Error();
				setSaved(true);
				setTimeout(() => setSaved(false), 2000);
			} catch {
				toast.error("Failed to save changes");
			} finally {
				setSaving(false);
			}
		},
		[id],
	);

	const handleCVUpdate = useCallback(
		(content: string) => {
			if (cvTimerRef.current) clearTimeout(cvTimerRef.current);
			cvTimerRef.current = setTimeout(() => saveEdited("tailoredCVEdited", content), 2000);
		},
		[saveEdited],
	);

	const handleCLUpdate = useCallback(
		(content: string) => {
			if (clTimerRef.current) clearTimeout(clTimerRef.current);
			clTimerRef.current = setTimeout(() => saveEdited("coverLetter", content), 2000);
		},
		[saveEdited],
	);

	// ─── Delete ──────────────────────────────────────────────────────

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

	// ─── Copy to Clipboard ───────────────────────────────────────────

	const copyToClipboard = async (html: string) => {
		const tmp = document.createElement("div");
		tmp.innerHTML = html;
		await navigator.clipboard.writeText(tmp.textContent || "");
		toast.success("Copied to clipboard");
	};

	// ─── Download Export ─────────────────────────────────────────────

	const downloadExport = (type: "cv" | "cover-letter", format: "docx" | "pdf" = "docx") => {
		const url = `/api/applications/${id}/export?type=${type}&format=${format}`;
		const link = document.createElement("a");
		link.href = url;
		link.download = "";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
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
	const matchAnalysis = application.matchAnalysis as MatchAnalysis | null;

	return (
		<div className="mx-auto max-w-5xl space-y-6">
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
									className="flex items-center gap-1 transition-colors hover:text-primary"
								>
									<ExternalLink className="h-3.5 w-3.5" />
									View posting
								</a>
							)}
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" render={<Link href={`/applications/${id}/edit`} />}>
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

				{/* ─── Job Description Tab ─────────────────────────────────── */}
				<TabsContent value="description" className="mt-4 space-y-4">
					<JobDetailsPanel application={application} />

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
						</div>
					)}
				</TabsContent>

				{/* ─── Match Analysis Tab ──────────────────────────────────── */}
				<TabsContent value="analysis" className="mt-4">
					{matchAnalysis ? (
						<div className="space-y-4">
							{/* Score + Summary */}
							<Card>
								<CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-start sm:gap-8">
									<MatchScoreRing score={matchAnalysis.matchScore} />
									<div className="flex-1 text-center sm:text-left">
										<h3 className="mb-2 text-lg font-medium">Match Summary</h3>
										<p className="text-sm text-muted-foreground">{matchAnalysis.summary}</p>
										<Button
											variant="outline"
											size="sm"
											className="mt-4"
											onClick={handleAnalyze}
											disabled={analyzing}
										>
											{analyzing ? (
												<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
											) : (
												<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
											)}
											Re-analyze
										</Button>
									</div>
								</CardContent>
							</Card>

							{/* Matched Skills */}
							{matchAnalysis.matchedSkills.length > 0 && (
								<Card size="sm">
									<CardHeader>
										<CardTitle className="text-emerald-400">Matched Skills</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										{matchAnalysis.matchedSkills.map((s) => (
											<div key={s.skill} className="space-y-1">
												<div className="flex items-center gap-2">
													<Badge className="border-0 bg-emerald-500/15 text-emerald-400">
														{s.skill}
													</Badge>
													<span className="text-[10px] uppercase text-muted-foreground">
														{s.relevance}
													</span>
												</div>
												<p className="text-xs text-muted-foreground">{s.evidence}</p>
											</div>
										))}
									</CardContent>
								</Card>
							)}

							{/* Missing Skills */}
							{matchAnalysis.missingSkills.length > 0 && (
								<Card size="sm">
									<CardHeader>
										<CardTitle className="text-amber-400">Skill Gaps</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										{matchAnalysis.missingSkills.map((s) => (
											<div key={s.skill} className="space-y-1">
												<div className="flex items-center gap-2">
													<Badge
														className={cn(
															"border-0",
															s.importance === "required"
																? "bg-red-500/15 text-red-400"
																: "bg-amber-500/15 text-amber-400",
														)}
													>
														{s.skill}
													</Badge>
													<span className="text-[10px] uppercase text-muted-foreground">
														{s.importance}
													</span>
												</div>
												<p className="text-xs text-muted-foreground">{s.suggestion}</p>
											</div>
										))}
									</CardContent>
								</Card>
							)}

							{/* Recommendations */}
							{matchAnalysis.recommendations.length > 0 && (
								<Card size="sm">
									<CardHeader>
										<CardTitle>Recommendations</CardTitle>
									</CardHeader>
									<CardContent>
										<ul className="space-y-2 text-sm text-muted-foreground">
											{matchAnalysis.recommendations.map((rec) => (
												<li key={rec} className="flex gap-2">
													<Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
													{rec}
												</li>
											))}
										</ul>
									</CardContent>
								</Card>
							)}
						</div>
					) : (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<Target className="mb-3 h-10 w-10 text-muted-foreground/40" />
								<h3 className="mb-1 text-lg font-medium">Match Analysis</h3>
								<p className="mb-4 max-w-sm text-sm text-muted-foreground">
									Compare your master CV against this job's requirements to see how well you match.
								</p>
								<Button onClick={handleAnalyze} disabled={analyzing}>
									{analyzing ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Sparkles className="mr-2 h-4 w-4" />
									)}
									{analyzing ? "Analyzing..." : "Run Analysis"}
								</Button>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* ─── Tailored CV Tab ─────────────────────────────────────── */}
				<TabsContent value="tailored" className="mt-4">
					{application.tailoredCVEdited ? (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<h3 className="text-sm font-medium">Tailored CV Editor</h3>
									<SaveIndicator saving={savingCV} saved={savedCV} />
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => copyToClipboard(application.tailoredCVEdited!)}
									>
										<Clipboard className="mr-1.5 h-3.5 w-3.5" />
										Copy
									</Button>
									<Button variant="outline" size="sm" onClick={() => downloadExport("cv", "docx")}>
										<Download className="mr-1.5 h-3.5 w-3.5" />
										DOCX
									</Button>
									<Button variant="outline" size="sm" onClick={() => downloadExport("cv", "pdf")}>
										<Download className="mr-1.5 h-3.5 w-3.5" />
										PDF
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											if (application.tailoredCVEdited !== application.tailoredCV) {
												setConfirmRegenerate("tailor");
											} else {
												handleTailor();
											}
										}}
										disabled={tailoring}
									>
										{tailoring ? (
											<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
										) : (
											<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
										)}
										Regenerate
									</Button>
								</div>
							</div>
							<TiptapEditor content={application.tailoredCVEdited} onUpdate={handleCVUpdate} />
						</div>
					) : (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
								<h3 className="mb-1 text-lg font-medium">Tailored CV</h3>
								<p className="mb-4 max-w-sm text-sm text-muted-foreground">
									{matchAnalysis
										? "Generate an AI-tailored version of your CV optimized for this job."
										: "Run match analysis first, then generate a tailored CV."}
								</p>
								<Button onClick={handleTailor} disabled={tailoring || !matchAnalysis}>
									{tailoring ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Sparkles className="mr-2 h-4 w-4" />
									)}
									{tailoring ? "Generating..." : "Generate Tailored CV"}
								</Button>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* ─── Cover Letter Tab ────────────────────────────────────── */}
				<TabsContent value="cover-letter" className="mt-4">
					{application.coverLetter ? (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<h3 className="text-sm font-medium">Cover Letter Editor</h3>
									<SaveIndicator saving={savingCL} saved={savedCL} />
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => copyToClipboard(application.coverLetter!)}
									>
										<Clipboard className="mr-1.5 h-3.5 w-3.5" />
										Copy
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => downloadExport("cover-letter")}
									>
										<Download className="mr-1.5 h-3.5 w-3.5" />
										DOCX
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setConfirmRegenerate("cover-letter")}
										disabled={generatingCL}
									>
										{generatingCL ? (
											<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
										) : (
											<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
										)}
										Regenerate
									</Button>
								</div>
							</div>
							<TiptapEditor content={application.coverLetter} onUpdate={handleCLUpdate} />
						</div>
					) : (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
								<h3 className="mb-1 text-lg font-medium">Cover Letter</h3>
								<p className="mb-4 max-w-sm text-sm text-muted-foreground">
									Generate a personalized cover letter for this application.
								</p>
								<Button onClick={handleGenerateCoverLetter} disabled={generatingCL}>
									{generatingCL ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Sparkles className="mr-2 h-4 w-4" />
									)}
									{generatingCL ? "Generating..." : "Generate Cover Letter"}
								</Button>
							</CardContent>
						</Card>
					)}
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

			{/* Regenerate Confirmation Dialog */}
			<Dialog
				open={!!confirmRegenerate}
				onOpenChange={(open) => !open && setConfirmRegenerate(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Regenerate Content</DialogTitle>
						<DialogDescription>
							This will overwrite your current edits with a new AI-generated version. This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmRegenerate(null)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (confirmRegenerate === "tailor") handleTailor();
								else handleGenerateCoverLetter();
							}}
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Regenerate
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function SaveIndicator({ saving, saved }: { saving: boolean; saved: boolean }) {
	if (saving) {
		return (
			<span className="flex items-center gap-1 text-xs text-muted-foreground">
				<Loader2 className="h-3 w-3 animate-spin" />
				Saving...
			</span>
		);
	}
	if (saved) {
		return (
			<span className="flex items-center gap-1 text-xs text-emerald-400">
				<Check className="h-3 w-3" />
				Saved
			</span>
		);
	}
	return null;
}
