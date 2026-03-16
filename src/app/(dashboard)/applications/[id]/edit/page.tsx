import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Edit Application</h1>
				<p className="text-muted-foreground">Application ID: {id}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Edit Job Details</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">Edit form coming in Phase 3.</p>
				</CardContent>
			</Card>
		</div>
	);
}
