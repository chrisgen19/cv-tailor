/**
 * Gemini model evaluation harness for tailorCV (issue #12).
 *
 * Iterates each candidate model × CV fixture × JD fixture, calling tailorCV
 * with a deterministic synthesized MatchAnalysis. Captures latency, token
 * usage, word count vs. budget, and automated keyword coverage. Writes a CSV
 * to docs/evals/<UTC-date>/results.csv plus a per-run JSON dump for manual
 * truthfulness review.
 *
 * Usage:
 *   pnpm dlx tsx scripts/eval-tailor.ts
 *   pnpm dlx tsx scripts/eval-tailor.ts --models gemini-2.5-pro,gemini-2.5-flash
 *   pnpm dlx tsx scripts/eval-tailor.ts --cv cv-01-senior-fullstack --jd jd-01-react-lead
 *
 * Flags:
 *   --models <csv>   Comma-separated model IDs (default: all 3 candidates)
 *   --cv <id>        Restrict to one CV fixture
 *   --jd <id>        Restrict to one JD fixture
 *   --skip-critique  Skip the self-critique pass (faster/cheaper, lower quality)
 *   --out <dir>      Output directory (default: docs/evals/<UTC-date>)
 *
 * Requires GEMINI_API_KEY in env (loaded from .env.local via dotenv).
 *
 * NOTE: This script is dev-only and not wired to a pnpm script — running it
 * makes real Gemini API calls and incurs cost. Review fixture count before
 * launching: 5 CVs × 5 JDs × 3 models = 75 calls (×2 if critique enabled).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { tailorCV } from "../src/lib/gemini";
import type { MatchAnalysis } from "../src/lib/gemini";
import type { TailoredCv } from "../src/lib/cv-schema";
import { CV_FIXTURES, JD_FIXTURES } from "./eval-fixtures";
import type { CvFixture, JdFixture } from "./eval-fixtures";

const DEFAULT_CANDIDATES = [
	"gemini-2.5-pro",
	"gemini-2.5-flash",
	"gemini-3.1-pro-preview",
];

interface CliArgs {
	models: string[];
	cv?: string;
	jd?: string;
	skipCritique: boolean;
	outDir: string;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		models: DEFAULT_CANDIDATES,
		skipCritique: false,
		outDir: defaultOutDir(),
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--models") args.models = (argv[++i] ?? "").split(",").filter(Boolean);
		else if (a === "--cv") args.cv = argv[++i];
		else if (a === "--jd") args.jd = argv[++i];
		else if (a === "--skip-critique") args.skipCritique = true;
		else if (a === "--out") args.outDir = argv[++i] ?? args.outDir;
	}
	return args;
}

function defaultOutDir(): string {
	const date = new Date().toISOString().slice(0, 10);
	return join("docs", "evals", date);
}

function synthesizeMatchAnalysis(jd: JdFixture, cvText: string): MatchAnalysis {
	const lower = cvText.toLowerCase();
	const matched: MatchAnalysis["matchedSkills"] = [];
	const missing: MatchAnalysis["missingSkills"] = [];
	for (const skill of jd.hardSkills) {
		if (lower.includes(skill.toLowerCase())) {
			matched.push({ skill, evidence: `mentioned in CV`, relevance: "high" });
		} else {
			missing.push({ skill, importance: "required", suggestion: `add evidence of ${skill}` });
		}
	}
	return {
		matchScore: Math.round((matched.length / jd.hardSkills.length) * 100),
		summary: `Synthetic match analysis for eval — ${matched.length}/${jd.hardSkills.length} hard skills present.`,
		matchedSkills: matched,
		missingSkills: missing,
		recommendations: [
			"Mirror JD hard skills using JD phrasing where evidenced in CV.",
			"Quantify impact on most relevant role.",
			"Reorder experience for JD relevance.",
		],
	};
}

function flattenTailoredText(cv: TailoredCv): string {
	const parts: string[] = [];
	if (cv.summary) parts.push(cv.summary);
	for (const exp of cv.experience ?? []) parts.push(...(exp.bullets ?? []));
	for (const proj of cv.projects ?? []) parts.push(...(proj.bullets ?? []));
	for (const sg of cv.skills ?? []) parts.push(...(sg.items ?? []));
	return parts.join(" ");
}

function wordCount(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

function keywordCoverage(text: string, hardSkills: string[]): number {
	const lower = text.toLowerCase();
	const hit = hardSkills.filter((s) => lower.includes(s.toLowerCase())).length;
	return hardSkills.length === 0 ? 0 : hit / hardSkills.length;
}

interface RunResult {
	model: string;
	cvId: string;
	jdId: string;
	ok: boolean;
	error?: string;
	latencyMs?: number;
	totalWords?: number;
	withinBudget?: boolean;
	keywordCoverage?: number;
	tailored?: TailoredCv;
}

async function runOne(model: string, cv: CvFixture, jd: JdFixture, skipCritique: boolean): Promise<RunResult> {
	process.env.GEMINI_MODEL = model;
	const matchAnalysis = synthesizeMatchAnalysis(jd, cv.text);
	const start = Date.now();
	try {
		const tailored = await tailorCV({
			cvText: cv.text,
			jobDescription: jd.text,
			matchAnalysis,
			skipCritique,
		});
		const latencyMs = Date.now() - start;
		const flat = flattenTailoredText(tailored);
		const totalWords = wordCount(flat);
		// 550-word single-page budget; harness flags 950 (two-page) as also-passing.
		const withinBudget = totalWords <= 950;
		return {
			model,
			cvId: cv.id,
			jdId: jd.id,
			ok: true,
			latencyMs,
			totalWords,
			withinBudget,
			keywordCoverage: keywordCoverage(flat, jd.hardSkills),
			tailored,
		};
	} catch (err) {
		return {
			model,
			cvId: cv.id,
			jdId: jd.id,
			ok: false,
			error: err instanceof Error ? err.message : String(err),
			latencyMs: Date.now() - start,
		};
	}
}

function toCsvRow(values: (string | number | boolean | undefined)[]): string {
	return values
		.map((v) => {
			if (v === undefined) return "";
			const s = String(v);
			return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
		})
		.join(",");
}

async function main() {
	if (!process.env.GEMINI_API_KEY) {
		console.error("GEMINI_API_KEY not set in env. Aborting.");
		process.exit(1);
	}
	const args = parseArgs(process.argv.slice(2));
	const cvs = args.cv ? CV_FIXTURES.filter((c) => c.id === args.cv) : CV_FIXTURES;
	const jds = args.jd ? JD_FIXTURES.filter((j) => j.id === args.jd) : JD_FIXTURES;
	if (cvs.length === 0 || jds.length === 0) {
		console.error("No fixtures matched the supplied --cv / --jd filters.");
		process.exit(1);
	}

	const total = args.models.length * cvs.length * jds.length;
	console.log(
		`[eval] ${args.models.length} models × ${cvs.length} CVs × ${jds.length} JDs = ${total} runs`,
	);
	console.log(`[eval] models: ${args.models.join(", ")}`);
	console.log(`[eval] critique: ${args.skipCritique ? "skipped" : "enabled"}`);
	console.log(`[eval] output: ${args.outDir}`);

	await mkdir(args.outDir, { recursive: true });

	const results: RunResult[] = [];
	let i = 0;
	for (const model of args.models) {
		for (const cv of cvs) {
			for (const jd of jds) {
				i++;
				console.log(`[eval] (${i}/${total}) model=${model} cv=${cv.id} jd=${jd.id}`);
				const r = await runOne(model, cv, jd, args.skipCritique);
				results.push(r);
				console.log(
					r.ok
						? `  ok latency=${r.latencyMs}ms words=${r.totalWords} coverage=${(r.keywordCoverage! * 100).toFixed(0)}%`
						: `  FAIL ${r.error}`,
				);
			}
		}
	}

	const header = [
		"model",
		"cv_id",
		"jd_id",
		"ok",
		"latency_ms",
		"total_words",
		"within_budget",
		"keyword_coverage",
		"error",
	];
	const rows = results.map((r) =>
		toCsvRow([
			r.model,
			r.cvId,
			r.jdId,
			r.ok,
			r.latencyMs,
			r.totalWords,
			r.withinBudget,
			r.keywordCoverage !== undefined ? r.keywordCoverage.toFixed(4) : undefined,
			r.error,
		]),
	);
	const csvPath = join(args.outDir, "results.csv");
	await writeFile(csvPath, [header.join(","), ...rows].join("\n"), "utf8");

	// Per-run JSON dumps for manual truthfulness review.
	const dumpsDir = join(args.outDir, "runs");
	await mkdir(dumpsDir, { recursive: true });
	for (const r of results) {
		const file = join(dumpsDir, `${r.model}__${r.cvId}__${r.jdId}.json`);
		await writeFile(file, JSON.stringify(r, null, 2), "utf8");
	}

	console.log(`\n[eval] wrote ${results.length} rows to ${csvPath}`);
	console.log(`[eval] per-run JSON in ${dumpsDir}`);
	console.log(`[eval] next: manually score truthfulness in results.csv (add a column)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
