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

// ─── Applications ─────────────────────────────────────────────────────

export const createApplicationSchema = z.object({
	title: z.string().min(1, "Job title is required"),
	company: z.string().min(1, "Company name is required"),
	sourceUrl: z.string().url().optional().or(z.literal("")),
	rawDescription: z.string().min(10, "Job description is required"),
	notes: z.string().optional(),
});

export const updateApplicationSchema = z.object({
	title: z.string().min(1).optional(),
	company: z.string().min(1).optional(),
	rawDescription: z.string().min(10).optional(),
	status: z
		.enum(["DRAFT", "ANALYZED", "TAILORED", "APPLIED", "REJECTED", "INTERVIEW", "OFFER"])
		.optional(),
	notes: z.string().optional(),
	appliedAt: z.string().datetime().optional().nullable(),
});

export const bulkStatusUpdateSchema = z.object({
	ids: z.array(z.string().min(1)).min(1),
	status: z.enum(["DRAFT", "ANALYZED", "TAILORED", "APPLIED", "REJECTED", "INTERVIEW", "OFFER"]),
});

export const scrapeUrlSchema = z.object({
	url: z.string().url("Please enter a valid URL"),
});
