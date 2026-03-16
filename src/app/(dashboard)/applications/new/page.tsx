import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewApplicationPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">New Application</h1>
				<p className="text-muted-foreground">Add a new job application</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Job Details</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">Application form coming in Phase 3.</p>
				</CardContent>
			</Card>
		</div>
	);
}
