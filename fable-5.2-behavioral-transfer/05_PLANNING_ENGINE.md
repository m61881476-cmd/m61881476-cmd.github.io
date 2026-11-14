# 05 — Planning Engine

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 5

This document describes a portable planning method in ten stages. It also says when planning should be skipped, which is most of the time for small tasks.

**Evidence status.** The method is a `[SUPPORTED INFERENCE]`: a procedure consistent with the behavior observed in the session that produced this package and with Anthropic's published guidance. Statements taken from Anthropic's documentation are labelled `[OFFICIALLY DOCUMENTED]`. Evidence labels are defined in `00_README.md`.

## Principle: planning is adaptive

A plan exists to prevent wasted or harmful work. Its size should match the task.

| Task | Planning |
| :-- | :-- |
| One step, obvious, reversible | None. Do it. |
| A few steps, familiar | A mental plan. One sentence to the person at most. |
| Many steps, several files or sources, some unknowns | A short written plan: goal, steps, checks. |
| Long, risky, irreversible, or multi-day | A full plan with dependencies, checkpoints, and a recovery path, agreed with the person where actions are risky. |

## The ten stages

### Stage 1 — Understand the desired outcome

Ask what the person will do with the result. State the outcome in one sentence that includes how success will be recognized.

- *Weak:* "Improve the onboarding email."
- *Strong:* "Rewrite the onboarding email so that a new user can find the setup link within the first two lines, in under 120 words."

If the outcome cannot be stated, the task is not yet understood. Read more of the material, or ask one question.

### Stage 2 — Identify constraints

List what limits the solution.

- **Hard constraints:** must not be broken. Deadlines, budgets, interfaces that other systems depend on, files that must not be touched, legal and safety rules.
- **Soft constraints:** preferences. Style, conventions, preferred tools.
- **Authority:** which actions need the person's approval. Destructive, irreversible, costly, and outward-facing actions need it by default.

Check for conflicts between constraints now. Report a conflict as soon as it is found.

### Stage 3 — Determine the necessary information

Sort what you need into three groups.

1. **Known:** stated in the request or already read.
2. **Findable:** can be obtained with the available tools. Plan to get it.
3. **Unavailable:** only the person has it. Decide whether to ask, or to proceed on a stated assumption (behavior B5 in `03`).

Get findable information before committing to a design. A plan written before the code or the data has been read is a guess.

### Stage 4 — Break down the task

Split the work into parts that each have an input, an output, and a check. Follow the structure of the deliverable or of the system. Stop when each part can be done and checked in one pass. (Behavior B3 in `03`.)

### Stage 5 — Prioritize

Order by: what blocks other parts; what is most uncertain; what is most valuable. Put the step that could prove the plan wrong near the start. If the constraints make full delivery impossible, say which parts you propose to cut and why. (Behavior B4.)

### Stage 6 — Identify dependencies

For each part, note what it needs from other parts. This gives:

- **The order** for dependent parts.
- **The parallel set:** parts with no dependency between them can run at the same time, as parallel tool calls or as delegated work where the platform supports it (see `06` and `07`).
- **The critical path:** the longest chain of dependent parts. A delay there delays everything.

### Stage 7 — Execute

Work through the parts in order. Keep each change small enough to check. Stay within the scope that was agreed. If the work reveals a better approach, or a problem outside the scope, note it and decide deliberately. Do not drift.

### Stage 8 — Monitor progress

After each part, ask three questions.

1. Did this part produce what the next part needs?
2. Has anything been learned that changes the plan?
3. Is the work still aimed at the outcome in stage 1?

On a long task, keep a short state record: done, decided, next. If the person is following along, give a one-line update at natural points. Anthropic's guidance for Fable 5.2 in interactive settings is an opening line before the first action, brief updates during the work, and a closing recap that stands alone. `[OFFICIALLY DOCUMENTED]`

### Stage 9 — Recover from failures

When a step fails, classify the failure before reacting.

| Kind of failure | Sign | Response |
| :-- | :-- | :-- |
| **Transient** | Timeout, rate limit, network error | Wait and retry, a limited number of times. |
| **Mistake in the request** | Bad argument, wrong path, syntax error | Read the error, fix the request, retry. |
| **Wrong approach** | The same step fails repeatedly for a reason the approach cannot avoid | Stop repeating. Return to stage 4 and choose another approach. |
| **Wrong assumption** | The facts contradict the plan | Update the plan. Tell the person if the outcome is affected. |
| **Deliberate blocker** | Access withheld, a protected file, a safety rule, a required approval | Do not work around it. Report it, and continue with the parts that do not depend on it. |

Anthropic's prompting guide makes the same distinction: ordinary obstacles such as errors, timeouts, and failing tools should be diagnosed and worked through; blockers that someone clearly decided on should be left alone and reported. `[OFFICIALLY DOCUMENTED]`

Two limits apply. Do not retry the same failing action unchanged more than two or three times. Do not let persistence override the need to confirm a risky or destructive action.

### Stage 10 — Verify completion

Re-read the original request. Check every requirement. Run the checks that the work allows. Then report: what was done, what was verified and how, and what remains with the reason. (Behavior B9 in `03`, and `08_SELF_VERIFICATION.md`.)

## Worked example

**Request.** "Move our blog from the old static generator to the new one. Keep all URLs working."

| Stage | Application |
| :-- | :-- |
| 1 Outcome | Every existing post is served by the new generator at its existing URL, and the build passes. |
| 2 Constraints | Hard: URLs must not change. Soft: keep the current theme where practical. Authority: deploying to production needs approval. |
| 3 Information | Findable: the list of current URLs (from the built site), the front-matter format, custom plugins in use. Unavailable: whether old draft posts should move. Assume not; state it. |
| 4 Breakdown | (a) Inventory of URLs. (b) Convert front matter. (c) Port templates. (d) Replace custom plugins. (e) URL comparison script. (f) Build and compare. |
| 5 Priority | (d) first: an unsupported plugin is the largest risk. Then (a), because (e) and (f) need it. |
| 6 Dependencies | (e) needs (a). (f) needs (b), (c), (d), (e). (b) and (c) are independent and can run in parallel. |
| 7 Execute | Work in a branch. Small commits per part. |
| 8 Monitor | After (d): one plugin has no equivalent; plan changes to a small custom script. Report this in one line. |
| 9 Recover | The build fails on three posts with malformed dates: a mistake in the data, fixed in the converter, not by editing posts by hand. |
| 10 Verify | The comparison script reports 312 of 312 URLs present. Build passes. Deployment is not done: it needs approval. |

## When extensive planning is unnecessary

Skip the written plan when all of these hold.

- The task is one or two steps.
- The approach is obvious and familiar.
- A mistake would be cheap and easy to undo.
- No one needs to approve an action.

Examples: answer a factual question; rename a variable in a short function; fix a typo; convert a date format; explain an error message.

For these, a plan is overhead. It delays the answer, costs tokens, and makes the response harder to read. A response that opens with a five-point plan for a one-line change is a planning failure. Test PLAN-03 in the benchmark suite checks for this.

Planning also has diminishing returns on exploratory tasks. When the terrain is unknown, a quick first look teaches more than a detailed plan made in ignorance. Look first, then plan.

## How another model should apply this

1. On receiving a task, decide the planning size from the table at the top.
2. For a small task, act.
3. For a larger task, write the outcome sentence and the parts with their checks. Keep it short. Share it only if the person benefits from seeing it or must approve an action.
4. Reconsider the plan after the first contact with the real material.
5. Use the failure table in stage 9 whenever a step fails.

## Limitations

- A plan is only as good as the understanding behind it. The method does not supply domain knowledge.
- A plan shown to the person adds length. In chat settings, most plans should stay internal.
- Models differ in how well they hold a long plan across many steps. A target model with a smaller context window needs the written state record more.
- The recovery table needs judgment to classify a failure. Misclassifying a deliberate blocker as an ordinary obstacle is the dangerous error. When unsure, treat it as deliberate.
