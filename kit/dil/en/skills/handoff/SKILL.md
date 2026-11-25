---
name: handoff
description: The orchestrator giving a task to the code or design session. Writes the brief, opens the session if there is none, and sends the brief by message. Use when a task is about to go to another session. The argument is the task's short name.
argument-hint: <task name>
---

Task: $ARGUMENTS

If document paths differ in this project, the paths in the "[teke]" summary at session start apply. If the session tools are not loaded, load them with a tool search first: `mcp__ccd_session__start_session`, `SendMessage`, `mcp__ccd_session_mgmt__get_usage`, `mcp__ccd_session_mgmt__get_session`, `mcp__ccd_session_mgmt__set_session_effort`, `mcp__ccd_session_mgmt__list_sessions`, `mcp__ccd_host__request_keep_awake`.

1. **Check decisions and words.** Find the decisions this task rests on in the decision log. If a matter has no decision yet, or a remark of the user's is unclear about what it refers to, STOP and ask the user first.
2. **Write the brief.** Copy `_TEMPLATE.md` in the handoff folder to `<task name>.md` and fill in the fields:
   - "The user's words": copy what they said about this task VERBATIM from the conversation; each remark is a separate line starting with `> `. Do not correct, summarise or polish; typos stay too. If the remark is not in this conversation but in a document or an earlier session, write `(source: <file>)` at the end of the quote. If there are no words at all, write "The user did not describe this task in words".
   - "My reading": your own inferences go here, separately. Do not write a reading that moves away from the example the user liked.
   - "Benchmark examples": earlier work that was liked and rejected, with paths. Not left empty for design work; if there is no example, write "none yet".
   - "Skills": the ones the task really needs; if none, "none". For code work `code-review` is the default (the session reviews its own diff before committing). Design: `artifact-design`, `artifact-diagramming`, `artifact-capabilities`, `dataviz` (do not send design work without these) · code review: `code-review` · simplification: `simplify` · security: `security-review` · running the app: `run` · documents: `docs`. The project can extend this list in `CLAUDE.md`.
   - **Do not dictate the route.** The brief says what is wanted, the benchmark and the limits; the session doing the work chooses how. In code work a step-by-step recipe is written only if the order really matters; do write the pitfalls you know.
   - **Do not dictate the solution in design work.** Give the purpose, the feeling wanted, the benchmark examples and the real constraints; leave the "how" to the design session. A mechanical recipe gives a bland result. Do not forbid a direction the user did not forbid. How many options to ask for is not a rule: if the user gave a number, that; if not, you decide by the task or leave it to the design session (one proposal is enough for a small fix; for a new screen or image it helps to see a few directions). If several options are asked for, they should really differ from each other (a colour swap of the same idea is not an option) and each should come as an image; if something is changing, its current state stands beside them for comparison. If the same screen or image was rejected twice, before opening a new round write down what the liked ones and the rejected ones have in common and criticise your own brief; bringing a new skin is not a solution.
   - "Session the report goes to": your own session id (`get_session` with `"self"`).
   - "Done means": by what evidence (command, test, image).
   - If the task is big, split it; each part is a separate brief.
3. **Session.** Look at `.claude/teke/oturumlar.json` (the sessions file).
   - If the role's session is recorded: before a big task, measure its fullness (`get_usage`); if it is above the compact threshold, first ask the user for `/compact` in that session. If the effort you chose for this task differs from the session's current effort, set it with `set_session_effort` before sending and update the value in the sessions file.
   - If not recorded, open it: `start_session`, `initiation: "user_asked"` (if the plan is approved), `context: "fresh"`, `use_worktree: false`, `name: "code"` or `"design"`, model from `ayar.json` → `roller` (the roles; `kod` is the code session, `tasarim` the design session; turn the model alias into the current full model id), effort the value you stated in the plan for this task (the one in the settings is only the opening value). The app does not open a session above your own model and effort, it lowers them silently: if the value you want is higher than yours, tell the user. The `background` field is required (at least 80 characters): a two-sentence description of the project and "this session is the project's persistent code (or design) session". `prompt` is the message in step 4. Write the returned id to the sessions file: `{ "code": { "id": "local_…", "model": "…", "effort": "…" } }`.
   - If it does not open (the app refused, or the folder is waiting for a trust prompt), tell the user in one line what to do: start the card, give the approval, or "open a session in this folder with this model and effort and paste these lines".
4. **Send** (`SendMessage`, `to`: the session id). If you opened the session in this turn, the message already went with `prompt`; do not send it again. The message is short, the content is in the file; the path is written relative to the project root:
   ```
   HANDOFF: docs/handoff/<task name>.md
   ROLE: code            (or: ROLE: design)
   Read this file from start to finish and carry it out. Session the report goes to: <your own session id>.
   ```
   A script looks for the "The user's words" quotes in the user's messages in your conversation; if it cannot find one, it rejects the message once and names that quote. Fix the quote.
5. **Watch.** After sending the task, start the silence watch in the background (run the command in the background): `node .claude/teke/araclar/nobet.js code --brief docs/handoff/<task name>.md` (`design` for design). If the session writes nothing for 13 minutes, or when a report is written, the script ends and wakes you; if it says "SILENT", check the session's state in the session list (it may also be waiting for a long command to finish). Do not start a watch while the session is waiting for the user to type `/compact`. For long work, ask for `request_keep_awake` so the computer does not sleep: sessions freeze on a sleeping computer. If the request is refused, do not retry; tell the user once. Start the watch with the same `--brief` in a correction round sent with `ADD:` as well.
6. **One line to the user:** what went, to which session, what happens when it is done.
7. **When the report arrives,** apply the `close-out` skill.
