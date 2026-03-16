import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ApplicationsPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Applications</h1>
					<p className="text-muted-foreground">Manage your job applications</p>
				</div>
				<Button render={<Link href="/applications/new" />}>
					<Plus className="mr-2 h-4 w-4" />
					New Application
				</Button>
			</div>

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
		</div>
	);
}
