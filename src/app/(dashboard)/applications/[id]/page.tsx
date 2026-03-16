import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ApplicationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Application Detail</h1>
				<p className="text-muted-foreground">Application ID: {id}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Application Workspace</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Tabbed interface (Job Description, Match Analysis, Tailored CV, Cover Letter) coming in
						Phase 3–4.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
