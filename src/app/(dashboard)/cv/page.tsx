import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CVPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">My CV</h1>
				<p className="text-muted-foreground">Manage your master CV</p>
			</div>

			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12 text-center">
					<div className="mb-4 rounded-full bg-primary/10 p-4">
						<Upload className="h-8 w-8 text-primary" />
					</div>
					<h3 className="mb-1 text-lg font-medium">Upload your CV</h3>
					<p className="mb-4 max-w-sm text-sm text-muted-foreground">
						Upload a PDF or DOCX file. We&apos;ll parse it into structured sections using AI so it
						can be tailored for each job application.
					</p>
					<p className="text-xs text-muted-foreground/60">
						PDF or DOCX, max 10MB. Coming in Phase 2.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
