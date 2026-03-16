"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

type UploadStep = "idle" | "uploading" | "extracting" | "parsing" | "done";

const STEP_LABELS: Record<UploadStep, string> = {
	idle: "",
	uploading: "Uploading file to storage...",
	extracting: "Extracting text from document...",
	parsing: "Parsing CV with AI...",
	done: "Done!",
};

interface CVUploadZoneProps {
	onUploadComplete: () => void;
	hasExistingCV: boolean;
}

export function CVUploadZone({ onUploadComplete, hasExistingCV }: CVUploadZoneProps) {
	const [step, setStep] = useState<UploadStep>("idle");

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			const file = acceptedFiles[0];
			if (!file) return;

			try {
				// Step 1: Get presigned URL
				setStep("uploading");
				const presignRes = await fetch("/api/cv/presigned-url", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						fileName: file.name,
						contentType: file.type,
					}),
				});

				if (!presignRes.ok) {
					const err = await presignRes.json();
					throw new Error(err.error ?? "Failed to get upload URL");
				}

				const { url, r2Key } = await presignRes.json();

				// Step 2: Upload directly to R2
				const uploadRes = await fetch(url, {
					method: "PUT",
					body: file,
					headers: { "Content-Type": file.type },
				});

				if (!uploadRes.ok) {
					throw new Error("Failed to upload file to storage");
				}

				// Step 3: Confirm upload + extract + parse
				setStep("extracting");
				const processRes = await fetch("/api/cv/upload", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						r2Key,
						fileName: file.name,
						contentType: file.type,
					}),
				});

				setStep("parsing");

				if (!processRes.ok) {
					const err = await processRes.json();
					throw new Error(err.error ?? "Failed to process CV");
				}

				setStep("done");
				toast.success("CV uploaded and parsed successfully");
				onUploadComplete();
			} catch (error) {
				const message = error instanceof Error ? error.message : "Upload failed";
				toast.error(message);
			} finally {
				setTimeout(() => setStep("idle"), 1500);
			}
		},
		[onUploadComplete],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_TYPES,
		maxSize: MAX_SIZE,
		maxFiles: 1,
		disabled: step !== "idle",
		onDropRejected: (rejections) => {
			const error = rejections[0]?.errors[0];
			if (error?.code === "file-too-large") {
				toast.error("File is too large. Maximum size is 10MB.");
			} else if (error?.code === "file-invalid-type") {
				toast.error("Invalid file type. Please upload a PDF or DOCX file.");
			} else {
				toast.error("File rejected. Please try again.");
			}
		},
	});

	const isProcessing = step !== "idle" && step !== "done";

	return (
		<div
			{...getRootProps()}
			className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
				isDragActive
					? "border-primary bg-primary/5"
					: isProcessing
						? "cursor-not-allowed border-border bg-muted/30"
						: "border-border hover:border-primary/50 hover:bg-muted/30"
			}`}
		>
			<input {...getInputProps()} />

			{isProcessing ? (
				<>
					<Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
					<p className="text-sm font-medium">{STEP_LABELS[step]}</p>
					<div className="mt-3 flex gap-1.5">
						{(["uploading", "extracting", "parsing"] as const).map((s) => (
							<div
								key={s}
								className={`h-1.5 w-8 rounded-full transition-colors ${
									step === s
										? "bg-primary"
										: ["uploading", "extracting", "parsing"].indexOf(s) <
												["uploading", "extracting", "parsing"].indexOf(step)
											? "bg-primary/40"
											: "bg-muted"
								}`}
							/>
						))}
					</div>
				</>
			) : (
				<>
					<div className="mb-4 rounded-full bg-primary/10 p-4">
						{hasExistingCV ? (
							<FileText className="h-8 w-8 text-primary" />
						) : (
							<Upload className="h-8 w-8 text-primary" />
						)}
					</div>
					<h3 className="mb-1 text-lg font-medium">
						{hasExistingCV ? "Replace your CV" : "Upload your CV"}
					</h3>
					<p className="mb-4 max-w-sm text-sm text-muted-foreground">
						{isDragActive
							? "Drop your file here..."
							: "Drag and drop your PDF or DOCX file here, or click to browse."}
					</p>
					<Button variant="outline" size="sm" type="button">
						{hasExistingCV ? "Choose new file" : "Browse files"}
					</Button>
					<p className="mt-2 text-xs text-muted-foreground/60">PDF or DOCX, max 10MB</p>
				</>
			)}
		</div>
	);
}
