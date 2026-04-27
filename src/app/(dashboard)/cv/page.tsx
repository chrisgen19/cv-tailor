"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CVSectionDisplay } from "@/components/cv/cv-section-display";
import { CVUploadZone } from "@/components/cv/cv-upload-zone";
import type { ParsedCV } from "@/lib/gemini";

interface MasterCVData {
	id: string;
	fileName: string;
	fileUrl: string;
	parsedSections: ParsedCV;
	createdAt: string;
	updatedAt: string;
}

export default function CVPage() {
	const [cv, setCv] = useState<MasterCVData | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchCV = useCallback(async () => {
		try {
			const res = await fetch("/api/cv");
			if (!res.ok) return;
			const data = await res.json();
			setCv(data);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCV();
	}, [fetchCV]);

	const handleUploadComplete = () => {
		fetchCV();
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">My CV</h1>
					<p className="text-muted-foreground">Manage your master CV</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">My CV</h1>
					<p className="text-muted-foreground">Manage your master CV</p>
				</div>
				{cv && (
					<div className="text-right text-xs text-muted-foreground">
						<div className="flex items-center gap-1.5">
							<FileText className="h-3.5 w-3.5" />
							{cv.fileName}
						</div>
						<p>Updated {formatDistanceToNow(new Date(cv.updatedAt), { addSuffix: true })}</p>
					</div>
				)}
			</div>

			<CVUploadZone onUploadComplete={handleUploadComplete} hasExistingCV={!!cv} />

			{cv?.parsedSections && <CVSectionDisplay parsedSections={cv.parsedSections} />}
		</div>
	);
}
