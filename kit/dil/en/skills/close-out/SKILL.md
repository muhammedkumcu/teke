---
name: close-out
description: The orchestrator closing a task whose report has come back from the code or design session. Verifies, has an independent eye look at it, writes the records, runs the lesson scan and maintenance, gives the user a short summary. Use when a task's report arrives. The argument is the task's name.
argument-hint: <task name>
---

Task: $ARGUMENTS

1. **Read the report:** "## Report" at the end of the brief. Check whether the skill list in the first line matches the brief and whether the target has shrunk. If it says `COMPACT NEEDED`, tell the user on the first line.
2. **Verify with your own eyes.** A report is not evidence.
   - Code: look at the diff (`git diff`, `git log`), run the test or the app yourself or see its output. If something the user will see changed, see it running.
   - Design: open the output and look. If the output is a published page or canvas, look at the published version too (open it in the browser); if you cannot open it, tell the user. Put it side by side with "The user's words" and "Benchmark examples".
3. **Independent eye.**
   - Code: `bug-hunter` on the changed files; `test-gaps` as well for work that changes behaviour.
   - Design: give the options to `critic` without saying who produced them; give the path of the brief and the location of the output (file path, page link, screenshots if any); ask it to score by looking at the image, not the source code. One general critique is not enough: call `critic` at least twice with separate angles, one angle per call (fit to the user's words and the benchmark example · legibility and small screens · originality and feeling · feasibility). If the output has text the user will read (a button, a card, a character's line, a description), have it looked at for language in a separate call: naturalness, fit for the audience, accuracy of the information given, repetition.
   - Do not run an agent for document-only or one-line work.
   - At a major turning point (before a release, the end of a section, a big new feature), a heavy review: a separate `bug-hunter` per area, `test-gaps`, and batch verification of the high-severity findings with `skeptic`. Write your proposal before starting this.
   - If there is a high-severity finding, the task does not close: have it fixed in the same session with `ADD:`. Tie medium and low findings to a task or postpone them with a reason.
4. **Check held work.** For each task in `STATUS.md` marked "waiting for: …", has what it was waiting for arrived with this report (or earlier)? If so, send that task in this turn (`handoff`); the other session still running, or this task going back for a correction round, is no obstacle. This step is not skipped even if the task does not close.
5. **Records.**
   - `STATUS.md`: bring "now / next", the "Waiting on you" list and the things left for later up to date (overwrite). A held task is written with what it is waiting for.
   - Waiting on you: write the questions you collected during this task, your suggestions that got no response, and any trial the user has to run into the list; remove what was answered. Everything you said you would "ask about later" in the conversation must either be in the list or have been asked.
   - One line at the very end of the brief: `CLOSED: <date> — <accepted | accepted with fixes | rejected>`.
   - If a new decision came up, into the decision log.
6. **Lesson scan:** read the user messages in the output of `node .claude/teke/araclar/ders-tara.js`. Corrections, objections, repeated requests and "that is not what I said" are lesson candidates. Write the ones not in the lesson log (one sentence for the rule, one for the reason). Then `node .claude/teke/araclar/ders-tara.js --mark`.
7. **Maintenance:** `node .claude/teke/araclar/bakim.js`. To move closed briefs to the archive, `--archive`; to move a stale section of a document, `--move` (look at what will move with `--dry-run` first). If it reports a bloated or stale record, fix it now; if it is big, add it to the upcoming tasks.
8. **Commit:** add only the record files you changed yourself, by name, and commit (do not use `git add -A`: another session's half-finished work may be there).
9. **Summary for the user** (short): what happened, how they can see it, what is next. Then the "Waiting on you" list, in two groups: blocking (work that will not start until the answer comes) and not blocking (with the assumption you are continuing on). If the list is empty, say so in one sentence. If you recorded a decision or a lesson, the "Recorded: …" line.
