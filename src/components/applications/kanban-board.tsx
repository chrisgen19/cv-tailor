"use client";

import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { Banknote, Briefcase, Building2, GripVertical } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import type { JobApplication } from "@/generated/prisma/client";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { WORK_SETUP_LABELS } from "./compensation-fields";
import { STATUS_CONFIG } from "./status-badge";

const COLUMN_ORDER: ApplicationStatus[] = [
	"DRAFT",
	"ANALYZED",
	"TAILORED",
	"APPLIED",
	"INTERVIEW",
	"OFFER",
	"REJECTED",
];

function compactSalary(min: number | null, max: number | null, currency: string | null) {
	if (min == null && max == null) return null;
	const prefix = currency?.trim() ? `${currency.trim()} ` : "";
	const fmt = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}k` : String(n));
	if (min != null && max != null) return `${prefix}${fmt(min)}–${fmt(max)}/mo`;
	if (min != null) return `${prefix}${fmt(min)}+/mo`;
	return `≤ ${prefix}${fmt(max!)}/mo`;
}

/**
 * Returns a new list with the card matching `id` set to `status`. Exported so
 * we can unit-test the by-id update path that the optimistic drag and rollback
 * both rely on.
 */
export function setApplicationStatus(
	apps: JobApplication[],
	id: string,
	status: ApplicationStatus,
): JobApplication[] {
	return apps.map((a) => (a.id === id ? { ...a, status } : a));
}

type Props = {
	applications: JobApplication[];
	// React.Dispatch so the board can do functional updates and only revert
	// the moved card on failure — restoring a snapshot would clobber any
	// concurrent successful drags.
	onStatusChange: React.Dispatch<React.SetStateAction<JobApplication[]>>;
};

export function KanbanBoard({ applications, onStatusChange }: Props) {
	const [activeId, setActiveId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const grouped = useMemo(() => {
		const out: Record<ApplicationStatus, JobApplication[]> = {
			DRAFT: [],
			ANALYZED: [],
			TAILORED: [],
			APPLIED: [],
			INTERVIEW: [],
			OFFER: [],
			REJECTED: [],
		};
		for (const app of applications) {
			out[app.status].push(app);
		}
		return out;
	}, [applications]);

	const activeApp = activeId ? (applications.find((a) => a.id === activeId) ?? null) : null;

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(String(event.active.id));
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setActiveId(null);
		const { active, over } = event;
		if (!over) return;

		const activeId = String(active.id);
		const overId = String(over.id);

		const sourceApp = applications.find((a) => a.id === activeId);
		if (!sourceApp) return;

		// `overId` may be a column id (status) or another card id. Resolve to status.
		const targetStatus = (COLUMN_ORDER as string[]).includes(overId)
			? (overId as ApplicationStatus)
			: applications.find((a) => a.id === overId)?.status;

		if (!targetStatus || targetStatus === sourceApp.status) return;

		const previousStatus = sourceApp.status;
		onStatusChange((curr) => setApplicationStatus(curr, activeId, targetStatus));

		try {
			const res = await fetch(`/api/applications/${activeId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: targetStatus }),
			});
			if (!res.ok) throw new Error();
			toast.success(`Moved to ${STATUS_CONFIG[targetStatus].label}`);
		} catch {
			toast.error("Failed to update status");
			// Revert only the moved card so concurrent drags aren't clobbered.
			onStatusChange((curr) => setApplicationStatus(curr, activeId, previousStatus));
		}
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex gap-3 overflow-x-auto pb-2">
				{COLUMN_ORDER.map((status) => (
					<KanbanColumn key={status} status={status} applications={grouped[status]} />
				))}
			</div>
			<DragOverlay>
				{activeApp ? <KanbanCard application={activeApp} dragging /> : null}
			</DragOverlay>
		</DndContext>
	);
}

function KanbanColumn({
	status,
	applications,
}: {
	status: ApplicationStatus;
	applications: JobApplication[];
}) {
	const config = STATUS_CONFIG[status];
	const { setNodeRef, isOver } = useDroppable({ id: status });

	return (
		<div className="flex w-72 shrink-0 flex-col">
			<div className="mb-2 flex items-center justify-between px-1">
				<div className="flex items-center gap-2">
					<span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", config.className)}>
						{config.label}
					</span>
					<span className="text-xs text-muted-foreground">{applications.length}</span>
				</div>
			</div>
			<SortableContext
				id={status}
				items={applications.map((a) => a.id)}
				strategy={verticalListSortingStrategy}
			>
				<div
					ref={setNodeRef}
					className={cn(
						"flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto rounded-lg border border-dashed border-border/60 p-2 transition-colors",
						isOver && "border-primary/60 bg-primary/5",
					)}
				>
					{applications.length === 0 ? (
						<p className="px-1 py-6 text-center text-xs text-muted-foreground">Drop here</p>
					) : (
						applications.map((app) => <KanbanCard key={app.id} application={app} />)
					)}
				</div>
			</SortableContext>
		</div>
	);
}

function KanbanCard({
	application,
	dragging,
}: {
	application: JobApplication;
	dragging?: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: application.id,
	});

	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
		opacity: isDragging && !dragging ? 0.4 : 1,
	};

	const salary = compactSalary(
		application.salaryMin,
		application.salaryMax,
		application.salaryCurrency,
	);
	const setupLabel = application.workSetup ? WORK_SETUP_LABELS[application.workSetup] : null;

	return (
		<Card
			ref={setNodeRef}
			style={style}
			size="sm"
			// Listeners on the whole card so dragging works from any point.
			// The title <Link> below stops pointerdown so clicks still navigate.
			{...attributes}
			{...listeners}
			className={cn(
				"group cursor-grab transition-shadow hover:shadow-md active:cursor-grabbing",
				dragging && "shadow-lg ring-2 ring-primary",
			)}
		>
			<CardContent className="space-y-2 p-3">
				<div className="flex items-start justify-between gap-2">
					<Link
						href={`/applications/${application.id}`}
						className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
						onPointerDown={(e) => e.stopPropagation()}
					>
						{application.title}
					</Link>
					<GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground/40" />
				</div>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<Building2 className="h-3 w-3" />
						{application.company}
					</span>
					<span>·</span>
					<span>{formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}</span>
				</div>
				{(salary || setupLabel) && (
					<div className="flex flex-wrap items-center gap-2 text-xs">
						{salary ? (
							<span className="flex items-center gap-1 text-muted-foreground">
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
				)}
			</CardContent>
		</Card>
	);
}
