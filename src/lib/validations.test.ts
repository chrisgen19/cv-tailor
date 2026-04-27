import { describe, expect, it } from "vitest";
import { createApplicationSchema, updateApplicationSchema } from "./validations";

const baseValid = {
	title: "Senior Engineer",
	company: "Acme",
	rawDescription: "Long enough description to pass min(10).",
};

describe("createApplicationSchema — compensation", () => {
	it("accepts the application without any compensation fields", () => {
		expect(createApplicationSchema.safeParse(baseValid).success).toBe(true);
	});

	it("accepts a valid salary range", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			salaryMin: 100_000,
			salaryMax: 200_000,
			salaryCurrency: "PHP",
			workSetup: "HYBRID",
		});
		expect(result.success).toBe(true);
	});

	it("rejects when salaryMax is less than salaryMin", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			salaryMin: 200_000,
			salaryMax: 100_000,
		});
		expect(result.success).toBe(false);
		if (result.success) return;
		const issue = result.error.issues.find((i) => i.path.join(".") === "salaryMax");
		expect(issue?.message).toMatch(/greater than or equal/);
	});

	it("allows salaryMax === salaryMin", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			salaryMin: 150_000,
			salaryMax: 150_000,
		});
		expect(result.success).toBe(true);
	});

	it("rejects salary values that exceed Postgres INTEGER max", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			salaryMin: 99_999_999_999,
		});
		expect(result.success).toBe(false);
	});

	it("rejects negative salary", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			salaryMin: -1,
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid workSetup value", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			workSetup: "ON_THE_MOON",
		});
		expect(result.success).toBe(false);
	});

	it("accepts empty string for optional URL/email fields", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			companyWebsite: "",
			contactEmail: "",
		});
		expect(result.success).toBe(true);
	});

	it("rejects malformed URL on companyWebsite", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			companyWebsite: "not a url",
		});
		expect(result.success).toBe(false);
	});

	it("rejects malformed contact email", () => {
		const result = createApplicationSchema.safeParse({
			...baseValid,
			contactEmail: "nope",
		});
		expect(result.success).toBe(false);
	});
});

describe("updateApplicationSchema — compensation", () => {
	it("accepts a partial patch with only one new field", () => {
		const result = updateApplicationSchema.safeParse({ workSetup: "REMOTE" });
		expect(result.success).toBe(true);
	});

	it("enforces salary range refinement on partial patches", () => {
		const result = updateApplicationSchema.safeParse({
			salaryMin: 300_000,
			salaryMax: 100_000,
		});
		expect(result.success).toBe(false);
	});

	it("allows clearing fields with null where the schema is nullable", () => {
		const result = updateApplicationSchema.safeParse({
			salaryMin: null,
			salaryMax: null,
			workSetup: null,
		});
		expect(result.success).toBe(true);
	});
});
