import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
	DRAFT: {
		label: "Draft",
		className: "bg-muted text-muted-foreground",
	},
	ANALYZED: {
		label: "Analyzed",
		className: "bg-blue-500/15 text-blue-400",
	},
	TAILORED: {
		label: "Tailored",
		className: "bg-primary/15 text-primary",
	},
	APPLIED: {
		label: "Applied",
		className: "bg-purple-500/15 text-purple-400",
	},
	REJECTED: {
		label: "Rejected",
		className: "bg-destructive/15 text-destructive",
	},
	INTERVIEW: {
		label: "Interview",
		className: "bg-amber-500/15 text-amber-400",
	},
	OFFER: {
		label: "Offer",
		className: "bg-emerald-500/15 text-emerald-400",
	},
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
	const config = STATUS_CONFIG[status];
	return <Badge className={cn("border-0 font-medium", config.className)}>{config.label}</Badge>;
}
