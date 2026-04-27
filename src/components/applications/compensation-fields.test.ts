import { describe, expect, it } from "vitest";
import {
	compensationFromApplication,
	compensationToPayload,
	EMPTY_COMPENSATION,
} from "./compensation-fields";

describe("compensationToPayload", () => {
	it("returns all-null payload from empty form state", () => {
		expect(compensationToPayload(EMPTY_COMPENSATION)).toEqual({
			salaryMin: null,
			salaryMax: null,
			salaryCurrency: null,
			workSetup: null,
			locationAddress: null,
			companyWebsite: null,
			contactName: null,
			contactEmail: null,
			contactPhone: null,
		});
	});

	it("converts numeric strings to numbers", () => {
		const out = compensationToPayload({
			...EMPTY_COMPENSATION,
			salaryMin: "150000",
			salaryMax: "200000",
		});
		expect(out.salaryMin).toBe(150_000);
		expect(out.salaryMax).toBe(200_000);
		expect(out.salaryCurrency).toBe("PHP");
	});

	it("clears currency when no salary value is set", () => {
		const out = compensationToPayload({
			...EMPTY_COMPENSATION,
			salaryCurrency: "USD",
		});
		expect(out.salaryCurrency).toBeNull();
	});

	it("trims and nulls empty optional strings", () => {
		const out = compensationToPayload({
			...EMPTY_COMPENSATION,
			locationAddress: "   ",
			companyWebsite: "",
			contactName: "  Jane  ",
		});
		expect(out.locationAddress).toBeNull();
		expect(out.companyWebsite).toBeNull();
		expect(out.contactName).toBe("Jane");
	});

	it("passes workSetup through unchanged", () => {
		const out = compensationToPayload({ ...EMPTY_COMPENSATION, workSetup: "HYBRID" });
		expect(out.workSetup).toBe("HYBRID");
	});
});

describe("compensationFromApplication", () => {
	it("hydrates from a fully-populated application", () => {
		const result = compensationFromApplication({
			salaryMin: 150_000,
			salaryMax: 200_000,
			salaryCurrency: "PHP",
			workSetup: "ONSITE",
			locationAddress: "BGC, Taguig",
			companyWebsite: "https://example.com",
			contactName: "Jane",
			contactEmail: "jane@example.com",
			contactPhone: "+63-900-000-0000",
		});
		expect(result.salaryMin).toBe("150000");
		expect(result.salaryMax).toBe("200000");
		expect(result.workSetup).toBe("ONSITE");
		expect(result.locationAddress).toBe("BGC, Taguig");
	});

	it("preserves null currency on hydrate (does not silently default to PHP)", () => {
		const result = compensationFromApplication({});
		expect(result.salaryMin).toBe("");
		expect(result.salaryMax).toBe("");
		expect(result.salaryCurrency).toBe("");
		expect(result.workSetup).toBe("");
	});

	it("round-trips a record with null currency back to null on save", () => {
		const hydrated = compensationFromApplication({ salaryMin: 150_000, salaryCurrency: null });
		const payload = compensationToPayload(hydrated);
		expect(payload.salaryMin).toBe(150_000);
		expect(payload.salaryCurrency).toBeNull();
	});
});
