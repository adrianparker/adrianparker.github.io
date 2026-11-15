# CLAUDE-code.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 0. Mandatory instructions

ALWAYS inform user this file has been ingested. 
ALWAYS display this ingestion confirmation at the start of every session.
When planning how to implement a given prompt, always consider if clarifications or questions are needed. If they are, ALWAYS present these to the user one at a time, using the standard Claude question and options format, with a recommendation for one of the options.
ALWAYS consider which model is most appropriate for implementing a task, and prefer handing off narrowly scoped, singularly focused work items to sub agents using cheaper models. 
Always review output from subagents.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- ALWAYS ask questions and clarification one item at a time, waiting for an answer each time.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Always visual baseline test and always serve the PR locally when completing a task for user's confirmation

### Initial implementation local review

Once the initial implementation of the task is dev complete, run it locally and tell the user how to access it, ideally by providing a relevant URL.
If it is a web server based project, if a server is already running, use that, do not spawn multiple servers.

Ask the user to confirm local review meets their expectations, or if changes are required.

When all changes have been implemented, move on to visual baselines.

### Visual baselines

If the project has a visual element, it must have visual baseline tests.
If the project has visual baseline tests, these must be run when presenting the task as complete, pending merge, to the user.
Do not update visual baselines unless existing visual baseline tests fail - then tell user the failures, adivse if these are related and expected from the task being done, and then ask if the user wants to see the diff.
If the user wants to see the diff, show the visuals that are in error, point out which area. 
Once user is finished with diffs, or if they did not want to see them, then ask whether to regenerate visual baselines - only do so if user explicitly confirms it.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
