# SETUP — Teke

> For the session reading this file. The user told you to "read SETUP.md and apply it": from now on you are this project's **orchestrator**.
> Do not ask questions. Install, say so briefly, get to work. The same steps apply to a first install and to an update.
> Teke was first written in Turkish. Its script names and setting keys are Turkish; everything you and the user read is English. The option names below are the English ones.

## 1. Install
Run in the project root (the path is the folder this file is in):
```
node "<this folder>/kit/araclar/kur.js" --target . --lang en
```
- First check with `node --version`: if Node.js is missing or older than 18.17, tell the user in one sentence and install it with their approval (Windows: `winget install OpenJS.NodeJS.LTS`, macOS: `brew install node`), then continue. The scripts run on Node.js.
- If the kit is already installed, this updates it and removes the leftover files of the old version. It does not touch the project's documents.
- If the folder is not a git repository and is empty, run `git init` first. If git is not installed on the computer, skip `git init` and the commit steps and tell the user once.
- Only if the user said "this repository is someone else's, let's not leave any trace", add `--untracked` (the kit files and records stay local). If they did not say so, do not ask.
- Language: this command installs in English, and the language is kept in the settings on later updates. If the user wants to change the language of an installed project, run the same command with `--lang en` or `--lang tr`: the old language's kit files are removed and the project's documents are not renamed (they are mapped under their old names in the settings). Because the rules file changes, tell the user to close and reopen the sessions.
- **If you are installing into a running project, read section 5 first.** If the project has its own process rules or open code and design sessions, what to do before running the installer is written there: the scripts and the rules file take effect the moment they are installed.
- Exit code 3: a user file with the same name exists and was not overwritten; show the list to the user. Exit code 2: tell the user the error message and stop.
- The installer checks its own work. If its output says "FAULT", fix that; if not, go on to the next step.

## 2. Learn how we work
Read `.claude/rules/teke.md` (it is not loaded in this session yet; in later sessions it loads automatically). Work by it from this session on.
Measure your own context window once with `get_usage`; if it is not 1,000,000, write it in `.claude/teke/ayar.json` → `baglam.pencere` (the context window; the fullness notice is computed from it). If the code or design session's model runs on a different window, write it in `baglam.pencereler` by model id: `{ "<model id>": 200000 }`.

## 3. By the state of the project
Work out which case this is from the installer's output and the folder.
- **New project:** the documents were created. `CLAUDE.md` can stay empty for now; you fill it in as the project takes shape.
- **Code exists, no written setup:** in the first task, read the relevant code; fill in the "Project" and "Commands" sections of `CLAUDE.md` from the code, without asking the user.
- **Update:** section 4.
- **A project with its own setup** (the installer said "NO DOCUMENT BY THIS NAME", or the project's `CLAUDE.md` has its own process rules): section 5.

Save the kit files in a single commit (no commit in an untracked install).

## 4. When updating from an older version
- If `STATUS.md` has no "WAITING ON YOU" section, add it (its format is in the template `kit/dil/en/templates/STATUS.md` in the kit source); write into it the questions you asked in this conversation and got no answer to, and your suggestions that got no response. Everything expected from the user lives in this one list.
- If a code or design session is already running, do not open a new one: write its id in `.claude/teke/oturumlar.json` (the sessions file), record its role with `node .claude/teke/araclar/rol.js` (the role tool; run with no words it lists the sessions), and send it the next task in a message with a `ROLE:` line.
- Approval list: the installer renews the patterns that are still the kit's old defaults and says so in its output. If the output warns about "script(s) not caught by the approval list", show those scripts to the user; if they should ask for approval, add them to the list.
- Run `node .claude/teke/araclar/bakim.js` (maintenance); fix the stale records it reports.
- If a step the user does themselves changed with this version, tell the user once, clearly.

## 5. In a running project with its own setup
Principle: **a setup that works is not broken.** The project's own `CLAUDE.md` outranks the kit's rules; no document is moved or renamed. The kit's scripts and rules file, however, start working the moment they are installed: they check commands, load the status document at session start, and give sessions a role. So the order matters.

**Before you run the installer**
1. **The right moment:** do not install while work is running, a brief is written but not sent, a session is waiting for a compact, or the user is about to answer a decision. Do not install on a deploy day.
2. **Is the status document current:** the scripts load it as "where we left off" at every start. If it is stale, update it first; if the live status sits in a memory note, move it into the document.
3. **Ask the user** (the things whose behaviour changes with the install; all at once, proposing today's arrangement):
   - Which session runs the deploy and remote database commands today? If it is the code session, those patterns get `"kimde": "code"` (who runs it).
   - Should pushing to the remote ask every time? If there is a standing permission, the pattern comes off the list.
   - Who writes the record documents? If the code session does, `CLAUDE.md` must say so plainly.
   - Where will the compact note live: in the kit's KEEP file, or in the project's own place? Not both.
4. **Dry run:** run the installer with `--dry-run` and show the user its output. The install commit also contains the change to `.claude/settings.json` and `.gitignore`; if the project pushes to the remote as a matter of course, this commit goes too, so say so beforehand.

**Right after you run the installer, before any other work**
5. **Mapping documents:** find which file holds the status, the decisions and the lessons in this project; if it has a different name, write it in `ayar.json` → `belge.yollar` (the document paths; example: `"docs/DECISIONS.md": "ROADMAP.md"`). The decisions log is the document where day-to-day decisions are written, not a list of locked principles. If there really is no counterpart, ask the user before creating it.
6. **Approval list:** bring the `ayar.json` → `onay.desenler` list (the approval patterns) in line with the answers from item 3. Look at the installer's "not caught" warning; if a command that is free in the project is caught (a preview deploy, say), narrow the pattern.
7. **Roles:** list the sessions with `node .claude/teke/araclar/rol.js` (the role tool); set your own role and the roles of the existing code and design sessions, and add their ids to `oturumlar.json`. Do not open a new session. A session with no recorded role is assumed to be the orchestrator: set it before you send that session work. A session working in a separate worktree sees the kit files and scripts only when its own branch is updated, and reads its own copy of the documents; tell the user so, do not merge it yourself.
8. **Conflicting and now-unneeded lines:** in the project's rules, find the sentences that describe work the kit now does automatically (examples: "after a compact the user pastes the continuation text", "measure the context before every message") and the ones that conflict with a kit rule (how reviews run, effort, how decisions are asked, where records go). Show the user a short table: which sentence stays, which should change. Change them with their approval. A project rule that stays but is written only in another document or in memory is also written into `CLAUDE.md`; a rule that is not there ranks below the kit's rule.
9. **The project's own helpers:** the rules file also enters the context of helpers (subagents). If the project has helpers whose prompts were measured and fixed, tell the user: with `omitClaudeMd: true` in a helper's definition, `CLAUDE.md` and the rules files are not loaded into that helper (current versions of Claude Code). The decision is the user's; do not touch those definitions without asking.
10. **Maintenance:** show the `bakim.js` report; for bloated documents, propose what goes to the archive (look first with `--move … --dry-run`), and move it with their approval. A document that is only searched and not loaded at start (the decisions log) does not have to be thinned; raising its threshold in `ayar.json` → `belge.haberKB` is enough.
11. Update the memory notes that describe the old setup.

Until the user approves the table in item 8, the project's old rule also applies (e.g. measuring context by hand). To step back: a script named in `ayar.json` → `kapaliKancalar` (the switched-off scripts) goes quiet at once.

## 6. Tell the user and get to work
Eight lines at most, in plain language:
- the kit is installed (one sentence);
- how we will work: you talk to me; I open one persistent session each for code and design; before every task I show a plan and start with your approval;
- what stays with you: typing `/compact` when I ask, the trust prompt the app may show when the first session opens, and the approval card for pushing to the remote and deploying (if you do not want it, say so and I will remove it);
- then: "What do you want to do?" If the user has already described their task, do not ask; go to the plan.

## Kit source
Do not write in this folder. The one exception: when a lesson comes up that holds for every project, add a line at the end of `INCOMING-LESSONS.md` (create the file if it does not exist; it does not go into the repository, it stays on this computer). Format: `- DD.MM.YYYY · <project> · <the lesson, one sentence> · suggestion: <a rule, a script, or a template>`.
