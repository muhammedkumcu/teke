# BRIEF — <task name>

> Copy this file into the same folder as `<task name>.md` and fill it in. The session doing the work does not see the conversation: what is not written here does not exist for it.

- Role: <code | design>
- Model and effort: <model; the effort chosen for this task and one sentence on why>
- Session the report goes to: <the orchestrator's session id>

## The user's words (verbatim; each one a quote line)
> <what the user said about this task, copied from the conversation>

## My reading (the orchestrator's inference; not the user's words)
<short>

## Purpose
<one or two sentences: what the user will see when this task is done>

## Benchmark examples
<earlier work that was liked and rejected, with paths; or "none yet">

## Decisions it rests on
<numbers in the decision log, or "none">

## Read
<the rules file, the status file and the files specific to the task; with paths>

## Skills
<skills to load, or "none">

## To do
<what is wanted, the real constraints and the known pitfalls. Do not dictate the route: a step-by-step recipe only if the order really matters. For design work also: the feeling wanted, how many options were asked for>

## Do not touch
<out of scope; or "none">

## Done means
<by what evidence: command, test, image>

## Stopping point
<where to stop and write the report; if a step needs approval, do not run it, write it in the report with the full command>

---

## For the session doing the work (the same in every brief)
1. Read this file and the "Read" list from start to finish; load what is in the "Skills" field.
2. **Step 0 (before starting on code or drawing):** read the relevant place. If the brief and the real state disagree, or a decision not in the brief is needed, do not silently pick one; report the difference to the orchestrator in a `QUESTION:` message.
3. Do the work. Do not ask the user questions; if there is a problem, send the orchestrator a `QUESTION:` message and carry on with the part that does not depend on the answer while you wait. The record documents (status, decisions, lessons) are written by the orchestrator; if the project's law file has you write one of them, that applies.
4. In code work: run the tests, review your own diff with `code-review` before committing, make the code commit (add only the files you changed yourself, by name). In design work: produce options, do not touch application code.
5. Write your report at the end of this file under the heading "## Report":
   - first line: the skills loaded;
   - what was done (short); if a target was given, reached / asked for;
   - evidence: a summary of command output, the number of tests, the commit, the image or page path;
   - what you are unsure about; the steps that need approval and are not yours to run (with the full command). A command stays only here, in the report.
6. Read back that the report was really written to the file (the write may have failed). Then send the orchestrator a short message (`SendMessage` tool, `to`: the "Session the report goes to" id above): first line `REPORT: <task name> done | partly | stuck`, then at most three lines. If your context has passed the compact threshold, write `COMPACT NEEDED`. Then stop.
7. Leave no runnable command or code block in your last chat message: the app adds a "Run" button to it, and the user runs it thinking it is their job. Write the remaining step in the report as "next task"; the orchestrator says who will do it.
