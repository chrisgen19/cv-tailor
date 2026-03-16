"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
	Briefcase,
	FileText,
	FileUp,
	Loader2,
	Plus,
	Target,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { StatusBadge } from "@/components/applications/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardData {
	stats: {
		total: number;
		applied: number;
		interviews: number;
		offers: number;
		avgScore: number | null;
	};
	recentApps: Array<{
		id: string;
		title: string;
		company: string;
		status: ApplicationStatus;
		matchAnalysis: { matchScore?: number } | null;
		createdAt: string;
	}>;
	hasMasterCV: boolean;
}

const STAT_CARDS = [
	{ key: "total" as const, label: "Total Applications", icon: Briefcase },
	{ key: "applied" as const, label: "Applied", icon: Target },
	{ key: "interviews" as const, label: "Interviews", icon: FileText },
	{ key: "offers" as const, label: "Offers", icon: Trophy },
];

const containerVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.08 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 12 },
	show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			try {
				const res = await fetch("/api/dashboard");
				if (res.ok) setData(await res.json());
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!data) return null;

	return (
		<motion.div
			className="space-y-6"
			variants={containerVariants}
			initial="hidden"
			animate="show"
		>
			<motion.div variants={itemVariants}>
				<h1 className="text-2xl font-semibold">Dashboard</h1>
				<p className="text-sm text-muted-foreground">Overview of your job applications</p>
			</motion.div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{STAT_CARDS.map(({ key, label, icon: Icon }) => (
					<motion.div key={key} variants={itemVariants}>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									{label}
								</CardTitle>
								<Icon className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-bold">{data.stats[key]}</p>
							</CardContent>
						</Card>
					</motion.div>
				))}
			</div>

			{/* Quick Actions */}
			<motion.div variants={itemVariants} className="flex flex-wrap gap-3">
				{!data.hasMasterCV && (
					<Button variant="outline" render={<Link href="/cv" />}>
						<FileUp className="mr-2 h-4 w-4" />
						Upload CV
					</Button>
				)}
				<Button render={<Link href="/applications/new" />}>
					<Plus className="mr-2 h-4 w-4" />
					New Application
				</Button>
			</motion.div>

			{/* Average Match Score */}
			{data.stats.avgScore !== null && (
				<motion.div variants={itemVariants}>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Average Match Score
							</CardTitle>
							<Target className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-bold">{data.stats.avgScore}%</p>
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Recent Applications */}
			<motion.div variants={itemVariants}>
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Recent Applications</CardTitle>
					</CardHeader>
					<CardContent>
						{data.recentApps.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Briefcase className="mb-3 h-10 w-10 text-muted-foreground/40" />
								<p className="text-sm text-muted-foreground">No applications yet</p>
								<p className="text-xs text-muted-foreground/70">
									Upload your CV and create your first application to get started.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{data.recentApps.map((app) => (
									<Link
										key={app.id}
										href={`/applications/${app.id}`}
										className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
									>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{app.title}</p>
											<p className="text-xs text-muted-foreground">{app.company}</p>
										</div>
										<div className="flex items-center gap-3">
											{app.matchAnalysis?.matchScore != null && (
												<span className="text-xs text-muted-foreground">
													{app.matchAnalysis.matchScore}%
												</span>
											)}
											<StatusBadge status={app.status} />
											<span className="hidden text-xs text-muted-foreground sm:inline">
												{formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
											</span>
										</div>
									</Link>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>
	);
}
