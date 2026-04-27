# scripts/

Dev-only scripts. Not wired to `pnpm` lifecycle scripts.

## eval-tailor.ts — Gemini model evaluation (issue #12)

A/B harness comparing candidate Gemini models on the `tailorCV` flow.

**Cost warning:** the default run is `5 CVs × 5 JDs × 3 models = 75 calls`, doubled if the self-critique pass is enabled. Review fixtures in `scripts/eval-fixtures.ts` and confirm model list before launching.

### Run

```sh
# All defaults (3 candidates, all 25 fixture pairs, critique enabled)
pnpm dlx tsx scripts/eval-tailor.ts

# Smoke test — one model, one pair
pnpm dlx tsx scripts/eval-tailor.ts \
  --models gemini-2.5-flash \
  --cv cv-01-senior-fullstack \
  --jd jd-01-react-lead

# Skip critique pass (cheaper, lower quality — match prod TAILOR_SKIP_CRITIQUE=1)
pnpm dlx tsx scripts/eval-tailor.ts --skip-critique
```

Requires `GEMINI_API_KEY` in `.env.local` or `.env`.

### Output

Written to `docs/evals/<UTC-date>/`:
- `results.csv` — one row per run with latency, word count, keyword coverage, errors
- `runs/<model>__<cv_id>__<jd_id>.json` — per-run dumps for manual truthfulness review

### Metrics captured automatically

| Metric            | How                                                                |
| ----------------- | ------------------------------------------------------------------ |
| Latency           | Wall-clock around `tailorCV` call                                  |
| Total words       | Words across summary + experience bullets + project bullets + skills |
| Within budget     | `total_words ≤ 950` (two-page max per `TAILOR_SYSTEM_INSTRUCTION`) |
| Keyword coverage  | Fraction of fixture `hardSkills` substring-matched in tailored text |

### Metrics requiring manual review

- **Truthfulness** — open each JSON dump under `runs/`, verify nothing fabricated against the source CV in `eval-fixtures.ts`. Add a `truthfulness_score` column to `results.csv` after review.
- **Token cost** — pulled from Gemini billing console; the SDK usage metadata is logged via `[tailor]` lines but not yet aggregated to CSV.

### Scoring

Per the issue, the recommended weighting is:

```
score = 0.50 * truthfulness
      + 0.25 * keyword_coverage
      + 0.15 * length_compliance
      + 0.05 * latency_norm
      + 0.05 * cost_norm
```

Compute in a spreadsheet after manual truthfulness scoring is added.
