import { z } from "zod";

const HeaderLinkSchema = z.object({
	url: z.string(),
	label: z.string().optional(),
});

const HeaderSchema = z.object({
	name: z.string(),
	title: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	location: z.string().optional(),
	links: z.array(HeaderLinkSchema).default([]),
});

const SkillGroupSchema = z.object({
	category: z.string(),
	items: z.array(z.string()).default([]),
});

const ExperienceSchema = z.object({
	company: z.string(),
	role: z.string(),
	location: z.string().optional(),
	start: z.string().optional(),
	end: z.string().optional(),
	bullets: z.array(z.string()).default([]),
});

const EducationSchema = z.object({
	school: z.string(),
	degree: z.string().optional(),
	start: z.string().optional(),
	end: z.string().optional(),
	details: z.string().optional(),
});

const ProjectSchema = z.object({
	name: z.string(),
	url: z.string().optional(),
	description: z.string().optional(),
	bullets: z.array(z.string()).default([]),
});

const CertificationSchema = z.object({
	name: z.string(),
	issuer: z.string().optional(),
	date: z.string().optional(),
});

export const TailoredCvSchema = z.object({
	header: HeaderSchema,
	summary: z.string().default(""),
	skills: z.array(SkillGroupSchema).default([]),
	experience: z.array(ExperienceSchema).default([]),
	education: z.array(EducationSchema).default([]),
	projects: z.array(ProjectSchema).default([]),
	certifications: z.array(CertificationSchema).default([]),
});

export type TailoredCv = z.infer<typeof TailoredCvSchema>;
export type TailoredCvHeader = z.infer<typeof HeaderSchema>;
export type TailoredCvExperience = z.infer<typeof ExperienceSchema>;
export type TailoredCvSkillGroup = z.infer<typeof SkillGroupSchema>;
export type TailoredCvEducation = z.infer<typeof EducationSchema>;
export type TailoredCvProject = z.infer<typeof ProjectSchema>;
export type TailoredCvCertification = z.infer<typeof CertificationSchema>;

// JSON schema mirror of TailoredCvSchema for Gemini structured output.
// Hand-maintained to avoid a runtime zod-to-json-schema dependency; keep in
// sync with TailoredCvSchema above.
export const TailoredCvResponseSchema = {
	type: "object",
	properties: {
		header: {
			type: "object",
			properties: {
				name: { type: "string" },
				title: { type: "string" },
				email: { type: "string" },
				phone: { type: "string" },
				location: { type: "string" },
				links: {
					type: "array",
					items: {
						type: "object",
						properties: {
							url: { type: "string" },
							label: { type: "string" },
						},
						required: ["url"],
					},
				},
			},
			required: ["name"],
		},
		summary: { type: "string" },
		skills: {
			type: "array",
			items: {
				type: "object",
				properties: {
					category: { type: "string" },
					items: { type: "array", items: { type: "string" } },
				},
				required: ["category", "items"],
			},
		},
		experience: {
			type: "array",
			items: {
				type: "object",
				properties: {
					company: { type: "string" },
					role: { type: "string" },
					location: { type: "string" },
					start: { type: "string" },
					end: { type: "string" },
					bullets: { type: "array", items: { type: "string" } },
				},
				required: ["company", "role"],
			},
		},
		education: {
			type: "array",
			items: {
				type: "object",
				properties: {
					school: { type: "string" },
					degree: { type: "string" },
					start: { type: "string" },
					end: { type: "string" },
					details: { type: "string" },
				},
				required: ["school"],
			},
		},
		projects: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					url: { type: "string" },
					description: { type: "string" },
					bullets: { type: "array", items: { type: "string" } },
				},
				required: ["name"],
			},
		},
		certifications: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					issuer: { type: "string" },
					date: { type: "string" },
				},
				required: ["name"],
			},
		},
	},
	required: ["header", "summary"],
} as const;
