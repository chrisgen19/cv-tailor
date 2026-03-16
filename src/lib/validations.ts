import { z } from "zod";

export const presignedUrlSchema = z.object({
	fileName: z.string().min(1),
	contentType: z.enum([
		"application/pdf",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	]),
});

export const cvUploadSchema = z.object({
	r2Key: z.string().min(1),
	fileName: z.string().min(1),
	contentType: z.enum([
		"application/pdf",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	]),
});
