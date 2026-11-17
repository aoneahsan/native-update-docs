# Run records — where a run writes and in what shape

**One shared folder, kept forever:** `~/Documents/01-code/production-projects/search-audit-owner-handoff/`.
- It is tracked in the private workspace repo `code-folder-root` (un-ignored 2026-10-27).
- The owner hands the whole folder to the GSC agent (the "dot agent"), which retests from it.

```text
search-audit-owner-handoff/
  README.md                         # router
  gsc-audit-<date>/                 # each original audit from the GSC agent, verbatim, never edited
  reports-for-dot-agent/
    README.md                       # index: every report + current state per record ID (fleet mode refreshes)
    00-session-reports/             # system-build and fleet sessions
    projects/<project>/
      <YYYY-MM-DD-HHMM>-search-audit-report.md
      STATUS.json                   # latest state; rewritten by each run of THIS project only
      RESUME.md                     # only while a run is unfinished
      evidence/<YYYY-MM-DD-HHMM>/   # raw probe output (small text only; no HTML dumps over ~200 KB)
    FLEET-CONFIRMATION-<date>.md
```

🔴 **Parallel sessions:** a run writes only inside its own `projects/<project>/`. The index and the fleet
confirmation are written by `fleet` mode alone, so 3–4 simultaneous runs never touch the same file. Commit
by explicit path.

`<project>` is the production root's name without `-root`/`-project-root` (`lifewell`, `vcpeai`, `ztools`).

## Report contract (detailed, self-contained: the GSC agent reads nothing else)

1. **Header:** project, run ID, mode, commits audited and deployed, origins, surfaces (NA with reason).
2. **Summary table:** SA-P01…P18 + AI-01…09 → PASS/FAIL/NA/BLOCKED before → after.
3. **Original records.** One block per record ID from the baseline:
   - observed (theirs);
   - reproduced (ours, with the date);
   - cause (`file:line` or "hypothesis");
   - fix (commit, files);
   - deployed (commit, bundle hash, time);
   - live result (probe output);
   - state;
   - **retest for the GSC agent:** the exact command plus the acceptance criterion.
4. **New findings** that are not in the baseline, in the same block shape, with new IDs
   `SA-<PROJECT>-NNN`.
5. **AEO results:** robots matrix, `llms.txt` quality, consistency table (AI-05).
6. **Owner console tasks** added (copied from `MANUAL-TASKS.md`).
7. **Still open,** with the reason and the next step. **Lessons sent to the learning inbox.**

## States (from the GSC agent's lifecycle, extended)

`observed → reproduced → fixed → verified-local → live-verified → google-pending → google-confirmed`

Side states: `not-reproduced` (with evidence), `owner-task`, `owner-decision`, `NA`, `still-open`,
`regressed`.

🔴 Only the GSC agent or the owner's console evidence moves a record to `google-confirmed`.

## `STATUS.json`

```json
{
  "project": "lifewell",
  "lastRun": "2026-10-28-1030",
  "report": "2026-10-28-1030-search-audit-report.md",
  "deployedCommit": { "app": "abc1234", "docs": "def5678" },
  "patterns": { "SA-P01": "PASS", "SA-P11": "FAIL", "AI-04": "PASS" },
  "records": [
    { "id": "BEM-SEARCH-LIFEWELL-001", "state": "live-verified", "fix": "docs@def5678", "retest": "curl -sI https://lifewell-docs.aoneahsan.com/img/social-card.png" }
  ],
  "newFindings": [],
  "ownerTasks": ["GSC validate fix: lifewell-docs og image"],
  "open": [],
  "complete": false
}
```

`complete: true` only when every applicable pattern is PASS or NA, every record is `live-verified` or
later (or `owner-task` with the row written), and nothing is `still-open`.
