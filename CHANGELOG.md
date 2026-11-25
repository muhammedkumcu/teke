# Changelog

## 2.3.1 — installing into a running project
Closes the gaps that showed up when installing into long-running projects with open sessions.
- **Roles are recorded, not guessed.** When the first message of a session opened before the kit was installed cannot be seen, the role is no longer guessed and stored: the session is told its role is not recorded and which command records it. The new tool `rol.js` lists the sessions and sets a role. A session whose first message came from another session counts as the code session; a message whose first line is `ROLE:` corrects a wrongly inferred role. Neither a report arriving from another session nor `HANDOFF:` and `ROLE:` lines inside a message the user types to the orchestrator can change the orchestrator's role.
- **Approval list.** The deploy patterns catch a deploy from a subfolder (`pnpm -C … deploy`), with `pages`, and with `npx wrangler@…`; a dry run (`--dry-run`) is not asked about. New default item: changing live settings (`wrangler secret put`, rollback). On update, patterns that are still the kit's old defaults are renewed; patterns the user wrote are kept.
- **Who runs it.** Any pattern can carry `"kimde": "code"`: the approval card opens in that session and the command is refused in the other. For projects where the code session deploys.
- **False refusals.** `git push` or a deploy word inside a commit message body (heredoc, here-string) is not treated as a command; a body given to any other command is checked as before. A command passed in quotes to `eval` or `Invoke-Expression` is checked too. The co-author check refuses only a real `Co-Authored-By: Name <address>` line.
- **The health check** reports `package.json` scripts that run a deploy command inside them but are not caught by the approval list; the installer shows this in its output.
- **Stale status document.** The opening summary says how many days have passed and how many commits were made since the status document was last updated.
- **Lessons load section by section.** In a long, sectioned lessons file the last lessons of every section are taken; before, only the start and the end of the file were loaded.
- **The quote check** reads the session transcript from the end and stops once the quotes are found; it works on transcripts of hundreds of MB. If time runs out it no longer skips silently; it says so.
- The role line sent to the code and design sessions is softer: the orchestrator writes the record documents, and if the project's law file has that session write one, that applies.
- Because the rules file also enters the context of helpers, a line addressed to helpers was added at its top.
- Section 5 of `SETUP.md` was rewritten: what to do before and right after the installer in a running project.

## 2.3.0 — first public release
- The setup: one orchestrator, one persistent code session, one persistent design session. The orchestrator does not produce; tasks go to the same sessions by message.
- An install that asks no questions; the same command installs and updates. The installer checks its own work.
- One rules file, three skills (`handoff`, `close-out`, `compact-prep`), five helpers.
- Scripts: loading where you left off and the lessons at session start and after a compact · measuring context fullness from the session transcript · verifying the user's words in a brief · checking helper models (each call in a workflow separately; for an agent called by its definition name, the model in that definition is what counts) · the approval list · the silence watch (13 minutes) · the lesson scan · document maintenance.
- The orchestrator chooses the effort for every task and says so in the plan; the value in the settings is only the opening value. With Ultracode on, workflows are set up without asking.
- A held task is written with what it is waiting for and is checked every time a report arrives.
- Everything expected from the user (questions, decisions, approvals, trials) lives in one list, the "Waiting on you" section of `STATUS.md`. A blocking item is asked right away, a non-blocking one in a batch when the task closes. When the user says "continue", a script puts the list in front of the orchestrator.
- When asking for a compact in a session whose previous task is closed and whose next task is unrelated, the `/clear` option is mentioned too; the user decides.
- Two languages: Turkish and English. The scripts are shared; the rules, skills, helpers and templates are under `kit/dil/<language>/`, and the English script messages are in `kit/dil/en/dil.json`. The language is chosen at first install (`--lang`), kept in the settings, and can be changed later. The English install uses `SETUP.md`.
- The path of the kit source on the computer is kept in `yerel.json`, which does not go into the repository; personal defaults go in `kit/ayarlar/kisisel.json`. Saying "Update Teke" is enough.
- The forbidden-model list for helpers is empty and the co-author ban for commits is off by default; both are set in the settings.

Earlier versions (1.0.0 – 2.2.0) were used only during development, in Turkish. A project installed with one of them is moved over automatically on update: the old `.claude/orkestra/` folder becomes `.claude/teke/`, and settings and session ids are kept.
