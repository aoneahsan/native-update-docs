# Learning loop — the command improves its own system

The owner wants `/search-audit` to get better every time it runs (2026-10-27). After every run, even a
partial one, capture each of these:

| Trigger | What to capture |
|---|---|
| A defect no SA pattern describes | a proposed **SA-P19+** entry: seen-in, cause, detect, fix, accept |
| A stack-specific fix that worked | the recipe, added under the pattern's Fix |
| A probe that lied (false PASS or FAIL) | the case and the corrected command (like the `/admin` vs `/admin/x` calibration, 2026-10-27) |
| A skill that gave wrong advice | the file:line and the correction (like the `-docusaurus` canonical in `headTags`) |
| Provider documentation that changed (a bot name, a Google or Bing rule) | the official URL and the date read; verify online, never from memory |
| An owner decision that applies fleet-wide | the decision verbatim, with the date |

## How (parallel-safe)

1. The run writes **one new file**:
   `~/.claude/skills/aoneahsan-cccs-search-audit/learnings/inbox/<YYYY-MM-DD-HHMM>-<project>.md`. It holds
   one section per lesson, with the target file it should change. Sessions running in parallel never write
   the same file.
2. A lesson that blocks the current run (a wrong probe, wrong skill advice) is also fixed **in place now**
   with a targeted edit to the owning file. Merge it as a union and never drop a clause. Then run
   `python3 ~/.claude/rules/../validate-system.py`.
3. Commit and push `ahsan-notebook` with explicit paths: the inbox file plus any in-place edit. Merge, never
   rebase. Another session may hold uncommitted files there, so never stage them.
4. `/search-audit fleet` runs the `aoneahsan-ccca-search-curator` to merge every inbox file into the
   catalogue, the probes and the owning skills, under an exclusive scope naming those files. It moves the
   merged inbox files to `learnings/merged/`, then validates and commits.

## Rules

- A lesson needs evidence: a URL with its probe output, a `file:line`, or an official source with its date.
  An opinion is not a lesson.
- Pattern IDs are never renumbered or reused.
- A lesson that conflicts with an owner decision becomes a question for the owner, not an edit.
- Keep files inside the validator budgets. Depth goes to a reference, never to `SKILL.md`.
