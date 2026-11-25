# Changelog

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
