"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const STATUSES = [
	{ value: "ALL", label: "All statuses" },
	{ value: "DRAFT", label: "Draft" },
	{ value: "ANALYZED", label: "Analyzed" },
	{ value: "TAILORED", label: "Tailored" },
	{ value: "APPLIED", label: "Applied" },
	{ value: "REJECTED", label: "Rejected" },
	{ value: "INTERVIEW", label: "Interview" },
	{ value: "OFFER", label: "Offer" },
] as const;

const SORT_OPTIONS = [
	{ value: "createdAt:desc", label: "Newest first" },
	{ value: "createdAt:asc", label: "Oldest first" },
	{ value: "title:asc", label: "Title A-Z" },
	{ value: "title:desc", label: "Title Z-A" },
	{ value: "company:asc", label: "Company A-Z" },
] as const;

interface ApplicationFiltersProps {
	status: string;
	search: string;
	sort: string;
	hideStatus?: boolean;
	onStatusChange: (status: string) => void;
	onSearchChange: (search: string) => void;
	onSortChange: (sort: string) => void;
}

export function ApplicationFilters({
	status,
	search,
	sort,
	hideStatus,
	onStatusChange,
	onSearchChange,
	onSortChange,
}: ApplicationFiltersProps) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div className="relative flex-1">
				<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search by title or company..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9 pr-8"
				/>
				{search && (
					<Button
						variant="ghost"
						size="icon-xs"
						className="absolute right-1.5 top-1/2 -translate-y-1/2"
						onClick={() => onSearchChange("")}
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				)}
			</div>
			<div className="flex gap-2">
				{!hideStatus && (
					<Select value={status} onValueChange={(v) => v && onStatusChange(v)}>
						<SelectTrigger className="w-[140px]">
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
				)}
				<Select value={sort} onValueChange={(v) => v && onSortChange(v)}>
					<SelectTrigger className="w-[150px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
