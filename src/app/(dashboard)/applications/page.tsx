"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import type { JobApplication } from "@/generated/prisma/client";
import { ApplicationCard } from "@/components/applications/application-card";
import { ApplicationFilters } from "@/components/applications/application-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function ApplicationsPage() {
	const [applications, setApplications] = useState<JobApplication[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);

	// Filters
	const [status, setStatus] = useState("ALL");
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState("createdAt:desc");

	// Selection
	const [selected, setSelected] = useState<Set<string>>(new Set());

	// Delete dialog
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Bulk status dialog
	const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
	const [bulkStatus, setBulkStatus] = useState("");
	const [bulkUpdating, setBulkUpdating] = useState(false);

	const [sortField, sortOrder] = sort.split(":");

	const fetchApplications = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: String(page),
				limit: String(PAGE_SIZE),
				sort: sortField,
				order: sortOrder,
			});
			if (status !== "ALL") params.set("status", status);
			if (search) params.set("search", search);

			const res = await fetch(`/api/applications?${params}`);
			if (!res.ok) throw new Error("Failed to fetch applications");
			const data = await res.json();
			setApplications(data.applications);
			setTotal(data.total);
		} catch {
			toast.error("Failed to load applications");
		} finally {
			setLoading(false);
		}
	}, [page, status, search, sortField, sortOrder]);

	useEffect(() => {
		fetchApplications();
	}, [fetchApplications]);

	// Debounce search
	const [searchInput, setSearchInput] = useState("");
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchInput);
			setPage(1);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const handleSelect = (id: string, checked: boolean) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const handleDelete = async () => {
		if (!deleteId) return;
		setDeleting(true);
		try {
			const res = await fetch(`/api/applications/${deleteId}`, { method: "DELETE" });
			if (!res.ok) throw new Error();
			toast.success("Application deleted");
			setSelected((prev) => {
				const next = new Set(prev);
				next.delete(deleteId);
				return next;
			});
			setDeleteId(null);
			fetchApplications();
		} catch {
			toast.error("Failed to delete application");
		} finally {
			setDeleting(false);
		}
	};

	const handleBulkStatusUpdate = async () => {
		if (!bulkStatus || selected.size === 0) return;
		setBulkUpdating(true);
		try {
			const res = await fetch("/api/applications/bulk-status", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: [...selected], status: bulkStatus }),
			});
			if (!res.ok) throw new Error();
			toast.success(`Updated ${selected.size} application(s)`);
			setSelected(new Set());
			setBulkStatusOpen(false);
			setBulkStatus("");
			fetchApplications();
		} catch {
			toast.error("Failed to update applications");
		} finally {
			setBulkUpdating(false);
		}
	};

	const totalPages = Math.ceil(total / PAGE_SIZE);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Applications</h1>
					<p className="text-sm text-muted-foreground">
						{total} application{total !== 1 ? "s" : ""}
					</p>
				</div>
				<Button render={<Link href="/applications/new" />}>
					<Plus className="mr-2 h-4 w-4" />
					New Application
				</Button>
			</div>

			<ApplicationFilters
				status={status}
				search={searchInput}
				sort={sort}
				onStatusChange={(v) => {
					setStatus(v);
					setPage(1);
				}}
				onSearchChange={setSearchInput}
				onSortChange={(v) => {
					setSort(v);
					setPage(1);
				}}
			/>

			{selected.size > 0 && (
				<div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
					<span className="text-sm font-medium">
						{selected.size} selected
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setBulkStatusOpen(true)}
					>
						Update Status
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground"
						onClick={() => setSelected(new Set())}
					>
						Clear
					</Button>
				</div>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : applications.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 text-center">
						<Briefcase className="mb-3 h-10 w-10 text-muted-foreground/40" />
						<h3 className="mb-1 text-lg font-medium">No applications yet</h3>
						<p className="mb-4 max-w-sm text-sm text-muted-foreground">
							Create your first job application by pasting a job description or URL.
						</p>
						<Button render={<Link href="/applications/new" />}>
							<Plus className="mr-2 h-4 w-4" />
							Create Application
						</Button>
					</CardContent>
				</Card>
			) : (
				<motion.div
					className="space-y-3"
					initial="hidden"
					animate="show"
					variants={{
						hidden: { opacity: 0 },
						show: { opacity: 1, transition: { staggerChildren: 0.05 } },
					}}
				>
					{applications.map((app) => (
						<motion.div
							key={app.id}
							variants={{
								hidden: { opacity: 0, y: 10 },
								show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
							}}
						>
							<ApplicationCard
								application={app}
								selected={selected.has(app.id)}
								onSelect={handleSelect}
								onDelete={setDeleteId}
							/>
						</motion.div>
					))}
				</motion.div>
			)}

			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2 pt-4">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
					>
						Previous
					</Button>
					<span className="text-sm text-muted-foreground">
						Page {page} of {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</Button>
				</div>
			)}

			{/* Delete Confirmation */}
			<Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Application</DialogTitle>
						<DialogDescription>
							This will permanently delete this application and all associated data. This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Bulk Status Update */}
			<Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update Status</DialogTitle>
						<DialogDescription>
							Change the status of {selected.size} selected application(s).
						</DialogDescription>
					</DialogHeader>
					<Select value={bulkStatus} onValueChange={(v) => v && setBulkStatus(v)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="DRAFT">Draft</SelectItem>
							<SelectItem value="ANALYZED">Analyzed</SelectItem>
							<SelectItem value="TAILORED">Tailored</SelectItem>
							<SelectItem value="APPLIED">Applied</SelectItem>
							<SelectItem value="REJECTED">Rejected</SelectItem>
							<SelectItem value="INTERVIEW">Interview</SelectItem>
							<SelectItem value="OFFER">Offer</SelectItem>
						</SelectContent>
					</Select>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setBulkStatusOpen(false)}
							disabled={bulkUpdating}
						>
							Cancel
						</Button>
						<Button onClick={handleBulkStatusUpdate} disabled={!bulkStatus || bulkUpdating}>
							{bulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Update
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
