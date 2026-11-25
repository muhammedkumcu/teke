---
name: compact-prep
description: The preparation before a session's context fills up. Writes the KEEP file and passes on the compact request. Use when a "[teke context]" line reports the compact threshold, or before starting a big task.
---

1. Bring half-finished work to a safe stopping point (leave no half-finished edit).
2. If you are the orchestrator: run the lesson scan with `node .claude/teke/araclar/ders-tara.js` (the steps are in the lesson scan item of the `close-out` skill) and update `STATUS.md`. Every question asked in the conversation and not answered, every pending approval and every suggestion of yours that got no response goes into the "Waiting on you" section: after a compact the conversation is shortened, and a question that is not in the list is lost.
3. Write `KEEP-<role>.md` in the handoff folder FROM SCRATCH (role: `orchestrator`, `code` or `design`). Dated, short, only context that is NOT in the files:
   - decisions made but not yet in a document, with their reasons,
   - the exact place of the half-finished work and the ONE next step,
   - target numbers and remarks the user gave (verbatim),
   - mistakes made in this session and the user's corrections,
   - if you are the code or design session: the `QUESTION:` messages you sent to the orchestrator and are still waiting on (with the question text),
   - if you are the design session: the liked and rejected examples, with reasons,
   - the loaded skills.
   What is already written in the documents is not repeated.
4. Ask:
   - If you are the orchestrator, the FIRST line of your reply: "Type `/compact` in this session, then type `continue`." Do not ask the user to copy any other text.
   - If you are the code or design session: write your report and say `COMPACT NEEDED` in a `REPORT: <name> partly` message to the orchestrator; stop.
5. After the compact: read the "[teke]" summary added to the context automatically and the KEEP content, reload the skills written in the brief; if you are the orchestrator, show the user the "Waiting on you" list in two groups (if you are the code or design session, send the orchestrator your unanswered question again); continue from the one step where you left off.
