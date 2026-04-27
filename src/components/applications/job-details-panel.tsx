"use client";

import { Banknote, Briefcase, Globe, Mail, MapPin, Phone, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobApplication } from "@/generated/prisma/client";

const WORK_SETUP_LABELS: Record<NonNullable<JobApplication["workSetup"]>, string> = {
	REMOTE: "Remote",
	HYBRID: "Hybrid",
	ONSITE: "Onsite",
};

function formatSalary(min: number | null, max: number | null, currency: string | null) {
	if (min == null && max == null) return null;
	const fmt = (n: number) => n.toLocaleString();
	const prefix = currency?.trim() ? `${currency.trim()} ` : "";
	if (min != null && max != null) return `${prefix}${fmt(min)} – ${fmt(max)} / month`;
	if (min != null) return `${prefix}${fmt(min)}+ / month`;
	return `Up to ${prefix}${fmt(max!)} / month`;
}

function ensureProtocol(url: string) {
	return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function JobDetailsPanel({ application }: { application: JobApplication }) {
	const salary = formatSalary(
		application.salaryMin,
		application.salaryMax,
		application.salaryCurrency,
	);
	const setupLabel = application.workSetup ? WORK_SETUP_LABELS[application.workSetup] : null;
	const hasContact =
		application.contactName || application.contactEmail || application.contactPhone;

	const hasAny =
		salary || setupLabel || application.locationAddress || application.companyWebsite || hasContact;

	if (!hasAny) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Job Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				{salary ? (
					<DetailRow icon={<Banknote className="h-3.5 w-3.5" />} label="Salary">
						{salary}
					</DetailRow>
				) : null}
				{setupLabel ? (
					<DetailRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Work setup">
						<span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
							{setupLabel}
						</span>
					</DetailRow>
				) : null}
				{application.locationAddress ? (
					<DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
						{application.locationAddress}
					</DetailRow>
				) : null}
				{application.companyWebsite ? (
					<DetailRow icon={<Globe className="h-3.5 w-3.5" />} label="Website">
						<a
							href={ensureProtocol(application.companyWebsite)}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary transition-colors hover:underline"
						>
							{application.companyWebsite}
						</a>
					</DetailRow>
				) : null}
				{hasContact ? (
					<div className="space-y-1.5 border-t border-border pt-3">
						<p className="text-xs font-medium text-muted-foreground">Contact person</p>
						{application.contactName ? (
							<DetailRow icon={<UserIcon className="h-3.5 w-3.5" />} label="Name">
								{application.contactName}
							</DetailRow>
						) : null}
						{application.contactEmail ? (
							<DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
								<a
									href={`mailto:${application.contactEmail}`}
									className="text-primary transition-colors hover:underline"
								>
									{application.contactEmail}
								</a>
							</DetailRow>
						) : null}
						{application.contactPhone ? (
							<DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone">
								<a
									href={`tel:${application.contactPhone}`}
									className="text-primary transition-colors hover:underline"
								>
									{application.contactPhone}
								</a>
							</DetailRow>
						) : null}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function DetailRow({
	icon,
	label,
	children,
}: {
	icon: React.ReactNode;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="flex w-24 shrink-0 items-center gap-1.5 text-muted-foreground">
				{icon}
				{label}
			</span>
			<span className="flex-1">{children}</span>
		</div>
	);
}
