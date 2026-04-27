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

const workSetupEnum = z.enum(["REMOTE", "HYBRID", "ONSITE"]);

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalEmail = z.string().email().optional().or(z.literal(""));

// Postgres INTEGER is 4 bytes signed (max 2,147,483,647). Stay below to avoid
// 500s from values that pass zod but blow up on Prisma write.
const PG_INT_MAX = 2_147_483_647;
const salaryAmount = z
	.number()
	.int()
	.nonnegative()
	.max(PG_INT_MAX, "Salary value is too large")
	.optional()
	.nullable();

const compensationFields = {
	salaryMin: salaryAmount,
	salaryMax: salaryAmount,
	salaryCurrency: z.string().trim().min(2).max(8).optional().or(z.literal("")),
	workSetup: workSetupEnum.optional().nullable(),
	locationAddress: z.string().trim().max(500).optional(),
	companyWebsite: optionalUrl,
	contactName: z.string().trim().max(200).optional(),
	contactEmail: optionalEmail,
	contactPhone: z.string().trim().max(50).optional(),
};

const salaryRangeRefinement = (
	data: { salaryMin?: number | null; salaryMax?: number | null },
	ctx: z.RefinementCtx,
) => {
	if (
		typeof data.salaryMin === "number" &&
		typeof data.salaryMax === "number" &&
		data.salaryMax < data.salaryMin
	) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["salaryMax"],
			message: "Max salary must be greater than or equal to min salary",
		});
	}
};

export const createApplicationSchema = z
	.object({
		title: z.string().min(1, "Job title is required"),
		company: z.string().min(1, "Company name is required"),
		sourceUrl: optionalUrl,
		rawDescription: z.string().min(10, "Job description is required"),
		notes: z.string().optional(),
		...compensationFields,
	})
	.superRefine(salaryRangeRefinement);

export const updateApplicationSchema = z
	.object({
		title: z.string().min(1).optional(),
		company: z.string().min(1).optional(),
		rawDescription: z.string().min(10).optional(),
		status: z
			.enum(["DRAFT", "ANALYZED", "TAILORED", "APPLIED", "REJECTED", "INTERVIEW", "OFFER"])
			.optional(),
		notes: z.string().optional(),
		tailoredCVEdited: z.string().optional(),
		coverLetter: z.string().optional(),
		appliedAt: z.string().datetime().optional().nullable(),
		...compensationFields,
	})
	.superRefine(salaryRangeRefinement);

export const bulkStatusUpdateSchema = z.object({
	ids: z.array(z.string().min(1)).min(1),
	status: z.enum(["DRAFT", "ANALYZED", "TAILORED", "APPLIED", "REJECTED", "INTERVIEW", "OFFER"]),
});

export const scrapeUrlSchema = z.object({
	url: z.string().url("Please enter a valid URL"),
});
