"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { WorkSetup } from "@/generated/prisma/enums";

export const CURRENCIES = ["PHP", "USD", "EUR", "SGD", "AUD", "GBP", "JPY"] as const;

export const WORK_SETUP_OPTIONS: { value: WorkSetup; label: string }[] = [
	{ value: "REMOTE", label: "Remote (Work from home)" },
	{ value: "HYBRID", label: "Hybrid" },
	{ value: "ONSITE", label: "Onsite" },
];

export type CompensationValue = {
	salaryMin: string;
	salaryMax: string;
	salaryCurrency: string;
	workSetup: "" | WorkSetup;
	locationAddress: string;
	companyWebsite: string;
	contactName: string;
	contactEmail: string;
	contactPhone: string;
};

export const EMPTY_COMPENSATION: CompensationValue = {
	salaryMin: "",
	salaryMax: "",
	salaryCurrency: "PHP",
	workSetup: "",
	locationAddress: "",
	companyWebsite: "",
	contactName: "",
	contactEmail: "",
	contactPhone: "",
};

type ApplicationLike = {
	salaryMin?: number | null;
	salaryMax?: number | null;
	salaryCurrency?: string | null;
	workSetup?: WorkSetup | null;
	locationAddress?: string | null;
	companyWebsite?: string | null;
	contactName?: string | null;
	contactEmail?: string | null;
	contactPhone?: string | null;
};

export function compensationFromApplication(app: ApplicationLike): CompensationValue {
	return {
		salaryMin: app.salaryMin != null ? String(app.salaryMin) : "",
		salaryMax: app.salaryMax != null ? String(app.salaryMax) : "",
		salaryCurrency: app.salaryCurrency ?? "PHP",
		workSetup: app.workSetup ?? "",
		locationAddress: app.locationAddress ?? "",
		companyWebsite: app.companyWebsite ?? "",
		contactName: app.contactName ?? "",
		contactEmail: app.contactEmail ?? "",
		contactPhone: app.contactPhone ?? "",
	};
}

export function compensationToPayload(v: CompensationValue) {
	const min = v.salaryMin.trim() ? Number(v.salaryMin) : null;
	const max = v.salaryMax.trim() ? Number(v.salaryMax) : null;
	return {
		salaryMin: Number.isFinite(min) ? min : null,
		salaryMax: Number.isFinite(max) ? max : null,
		salaryCurrency: min != null || max != null ? v.salaryCurrency || null : null,
		workSetup: v.workSetup || null,
		locationAddress: v.locationAddress.trim() || null,
		companyWebsite: v.companyWebsite.trim() || null,
		contactName: v.contactName.trim() || null,
		contactEmail: v.contactEmail.trim() || null,
		contactPhone: v.contactPhone.trim() || null,
	};
}

type Props = {
	value: CompensationValue;
	onChange: (next: CompensationValue) => void;
};

export function CompensationFields({ value, onChange }: Props) {
	const update = <K extends keyof CompensationValue>(key: K, v: CompensationValue[K]) => {
		onChange({ ...value, [key]: v });
	};

	const showLocation = value.workSetup === "HYBRID" || value.workSetup === "ONSITE";
	const minVal = Number(value.salaryMin);
	const maxVal = Number(value.salaryMax);
	const rangeInvalid =
		value.salaryMin !== "" &&
		value.salaryMax !== "" &&
		Number.isFinite(minVal) &&
		Number.isFinite(maxVal) &&
		maxVal < minVal;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Compensation & Logistics</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label>Monthly salary range</Label>
					<div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
						<Input
							type="number"
							inputMode="numeric"
							min="0"
							placeholder="Min"
							value={value.salaryMin}
							onChange={(e) => update("salaryMin", e.target.value)}
						/>
						<Input
							type="number"
							inputMode="numeric"
							min="0"
							placeholder="Max"
							value={value.salaryMax}
							onChange={(e) => update("salaryMax", e.target.value)}
							aria-invalid={rangeInvalid}
						/>
						<Select
							value={value.salaryCurrency}
							onValueChange={(v) => v && update("salaryCurrency", v)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CURRENCIES.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{rangeInvalid ? (
						<p className="text-xs text-destructive">
							Max salary must be greater than or equal to min salary.
						</p>
					) : (
						<p className="text-xs text-muted-foreground">Per month. Leave blank if undisclosed.</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="work-setup">Work setup</Label>
					<Select
						value={value.workSetup}
						onValueChange={(v) => update("workSetup", (v ?? "") as "" | WorkSetup)}
					>
						<SelectTrigger className="w-full sm:w-[260px]">
							<SelectValue placeholder="Not specified" />
						</SelectTrigger>
						<SelectContent>
							{WORK_SETUP_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{showLocation ? (
					<div className="space-y-2">
						<Label htmlFor="location-address">Location address</Label>
						<Input
							id="location-address"
							placeholder="City, district, or office address"
							value={value.locationAddress}
							onChange={(e) => update("locationAddress", e.target.value)}
						/>
					</div>
				) : null}

				<div className="space-y-2">
					<Label htmlFor="company-website">Company website</Label>
					<Input
						id="company-website"
						type="url"
						placeholder="https://..."
						value={value.companyWebsite}
						onChange={(e) => update("companyWebsite", e.target.value)}
					/>
				</div>

				<div className="space-y-2">
					<Label>Contact person</Label>
					<div className="grid gap-2 sm:grid-cols-3">
						<Input
							placeholder="Name"
							value={value.contactName}
							onChange={(e) => update("contactName", e.target.value)}
						/>
						<Input
							type="email"
							placeholder="Email"
							value={value.contactEmail}
							onChange={(e) => update("contactEmail", e.target.value)}
						/>
						<Input
							type="tel"
							placeholder="Phone"
							value={value.contactPhone}
							onChange={(e) => update("contactPhone", e.target.value)}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
