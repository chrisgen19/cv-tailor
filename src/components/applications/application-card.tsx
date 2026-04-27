"use client";

import { formatDistanceToNow } from "date-fns";
import {
	Banknote,
	Briefcase,
	Building2,
	Calendar,
	ExternalLink,
	MoreVertical,
	Pencil,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { JobApplication } from "@/generated/prisma/client";
import { WORK_SETUP_LABELS } from "./compensation-fields";
import { StatusBadge } from "./status-badge";

interface ApplicationCardProps {
	application: JobApplication;
	selected: boolean;
	onSelect: (id: string, checked: boolean) => void;
	onDelete: (id: string) => void;
}

function compactSalary(min: number | null, max: number | null, currency: string | null) {
	if (min == null && max == null) return null;
	const prefix = currency?.trim() ? `${currency.trim()} ` : "";
	// Math.floor so the compact label never overstates pay (e.g. 1501 → "1k", not "2k").
	const fmt = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}k` : String(n));
	if (min != null && max != null) return `${prefix}${fmt(min)}–${fmt(max)}/mo`;
	if (min != null) return `${prefix}${fmt(min)}+/mo`;
	return `≤ ${prefix}${fmt(max!)}/mo`;
}

export function ApplicationCard({
	application,
	selected,
	onSelect,
	onDelete,
}: ApplicationCardProps) {
	const salary = compactSalary(
		application.salaryMin,
		application.salaryMax,
		application.salaryCurrency,
	);
	const setupLabel = application.workSetup ? WORK_SETUP_LABELS[application.workSetup] : null;

	return (
		<Card size="sm" className="group relative transition-colors hover:ring-primary/30">
			<CardHeader>
				<div className="flex items-start gap-3">
					<span className="pt-0.5">
						<Checkbox
							checked={selected}
							onCheckedChange={(checked) => onSelect(application.id, !!checked)}
						/>
					</span>
					<div className="min-w-0 flex-1">
						<div className="mb-1 flex items-center gap-2">
							<CardTitle className="truncate">
								<Link
									href={`/applications/${application.id}`}
									className="hover:text-primary transition-colors"
								>
									{application.title}
								</Link>
							</CardTitle>
							<StatusBadge status={application.status} />
						</div>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<Building2 className="h-3 w-3" />
								{application.company}
							</span>
							<span className="flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								{formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
							</span>
							{salary ? (
								<span className="flex items-center gap-1">
									<Banknote className="h-3 w-3" />
									{salary}
								</span>
							) : null}
							{setupLabel ? (
								<span className="flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
									<Briefcase className="h-3 w-3" />
									{setupLabel}
								</span>
							) : null}
						</div>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
							<MoreVertical className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem render={<Link href={`/applications/${application.id}/edit`} />}>
								<Pencil className="mr-2 h-3.5 w-3.5" />
								Edit
							</DropdownMenuItem>
							{application.sourceUrl && (
								<DropdownMenuItem
									onSelect={() =>
										window.open(application.sourceUrl!, "_blank", "noopener,noreferrer")
									}
								>
									<ExternalLink className="mr-2 h-3.5 w-3.5" />
									View posting
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={() => onDelete(application.id)}
							>
								<Trash2 className="mr-2 h-3.5 w-3.5" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
			{application.notes && (
				<CardContent className="pt-0">
					<p className="line-clamp-2 text-xs text-muted-foreground">{application.notes}</p>
				</CardContent>
			)}
		</Card>
	);
}
