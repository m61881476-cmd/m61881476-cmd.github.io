# 06 — Agent Orchestration

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 6

This document says when parallel work and subagents help, how to brief them, and how to check and combine what they return.

**Evidence status.** Statements about Fable 5.2's delegation behavior come from Anthropic's prompting guide and product page and are labelled `[OFFICIALLY DOCUMENTED]`. The method itself is a `[SUPPORTED INFERENCE]`. Evidence labels are defined in `00_README.md`.

## 1. Two kinds of delegation

Keep these apart. A target model must never claim the first kind when it only has the second.

| | Tool-supported delegation | Conceptual delegation |
| :-- | :-- | :-- |
| What it is | The platform provides a tool that starts another model instance with its own context, runs it, and returns its report. | One model, one context. The model separates the work into roles or passes and does them itself, one after another. |
| Real parallelism | Yes, if the platform runs them at once. | No. |
| Separate context | Yes. The subagent does not see the conversation unless briefed. | No. Everything shares one context. |
| Independent judgment | Partly. A fresh context does not inherit the main thread's assumptions. | Weak. The same context reviews its own work. |
| What to tell the person | "I delegated X to a subagent." | "I did X in a separate pass." Never "another agent verified this." |

**Rule for a target model:** check your tool list. If there is no tool that starts another agent, you have conceptual delegation only. Do not write as if agents exist.

## 2. What is documented about Fable 5.2

All `[OFFICIALLY DOCUMENTED]`.

- How much the model delegates "depends on your harness and tasks". With a minimal subagent tool and short tasks, it rarely delegated. In an agentic coding product whose prompts invite delegation, it "delegated readily".
- At `xhigh` and `max` effort, Anthropic saw it use subagents to review its own work.
- Early testers had good results with it as planner and orchestrator for other models.
- Subagents "can account for a large part of what a session costs".
- When the model delegates too much, Anthropic advises changing the subagent tool's description to state the cost of a subagent, when delegation is worth it, and how to brief one. A longer description of this kind roughly halved the number of subagents in Anthropic's testing.
- The product page describes coordination of hundreds of subagents or more in Anthropic's own testing. This is a product claim, not verified here.

In the session that produced this package, the harness told the model not to start subagents unless the person asked. The model did the work in one context. `[OBSERVED BEHAVIOR]` This shows that the harness, not only the model, decides how much delegation happens.

## 3. When delegation is worth it

Delegation has a fixed cost. A subagent starts with no context. It must be briefed, it re-reads what the main thread already knows, and its report must be checked.

**Delegate when:**

- The work splits into parts that do not depend on each other, and wall-clock time matters.
- A part would fill the main context with material that is only needed for its conclusion, for example a search across hundreds of files.
- An independent check is wanted, by a context that has not seen the reasoning that produced the work.
- A part suits a cheaper or faster model.

**Do not delegate when:**

- The task is small. Briefing costs more than doing.
- The parts are tightly coupled, so each needs the others' details.
- The context needed is large and hard to summarize. The brief will lose what matters.
- The work needs decisions that belong to the main thread or to the person.
- No delegation tool exists.

A quick test: *can I write a brief of a few paragraphs that a capable stranger could act on with no further questions, and is the result easy to check?* If not, do the work in the main thread.

## 4. Task decomposition for parallel work

1. Split along lines of **independence**, not along lines of topic. Two streams are independent if neither needs the other's output and they do not write to the same place.
2. Give each stream one clear deliverable.
3. Make the streams' outputs the same shape where they will be merged.
4. Keep the integration step, and anything that needs the whole picture, in the main thread.
5. Avoid shared mutable state. Two agents editing the same file produce conflicts. Assign each file or resource to one stream, or have streams propose changes that the main thread applies.

**Example.** "Audit our 40 API endpoints for missing authorization checks." Independent streams: one per service directory, each returning a table of endpoint, check present or absent, and file and line. The main thread merges the tables, checks a sample, and writes the summary.

## 5. Role assignment

Assign roles by what the work needs.

| Role | Purpose | Notes |
| :-- | :-- | :-- |
| Scout | Find and report facts: where code lives, what a log says. | Cheap model. Reports facts, makes no decisions. |
| Worker | Carry out a scoped, already-designed piece of work. | Needs exact scope and acceptance criteria. |
| Specialist | Deep work in one area. | Use the most capable model. |
| Verifier | Check a result against the plan with evidence. | Must not have produced the work. Reports pass or fail; does not fix. |
| Orchestrator | Plan, brief, integrate, decide. | The main thread. Holds the requirements and the final responsibility. |

Roles are a way to scope briefs. They are not personalities. A long persona description adds nothing; a precise task description does.

## 6. Writing a brief

A subagent knows only what the brief says. A good brief contains:

1. **Goal.** What the result is for, in one or two sentences.
2. **Task.** Exactly what to do.
3. **Context.** The facts already known that the subagent needs, including what has been ruled out.
4. **Scope and limits.** What it may read and change, and what it must not touch.
5. **Output format.** The shape of the report, so results can be merged and checked.
6. **Done criteria.** How the subagent knows it is finished.
7. **Evidence requirement.** Ask for file paths, line numbers, commands run, and the distinction between what it verified and what it inferred.

**Example brief.**

> Goal: we are finding every place where user input reaches a SQL query without parameterization, to fix them before a security review.
> Task: search `services/billing/` for SQL built by string formatting or concatenation.
> Context: the codebase uses `db.execute(query, params)`; calls with a second argument are safe. Directory `services/billing/legacy/` is being deleted; skip it.
> Limits: read only. Change nothing.
> Output: a table with file, line, the query expression, and where the interpolated value comes from. Then a list of anything you were unsure about.
> Done when: every `.py` file in the directory has been searched. State how many files you searched.
> Evidence: quote the line for each finding. Mark each as confirmed (you traced the value to user input) or possible (you did not).

## 7. Consolidating results

1. Collect all reports before concluding. Do not write the summary while work is still running, and never predict what a pending agent will say.
2. Normalize the reports to one format.
3. Remove duplicates.
4. Look for gaps: did each stream cover its whole scope? A report that says nothing about part of its scope has probably not covered it.
5. Synthesize. The final answer is the main thread's own conclusion from the evidence, not a concatenation of reports.
6. Tell the person what matters. A subagent's report is not visible to them unless it is relayed.

## 8. Resolving conflicts

When two reports disagree:

1. Check whether they are really answering the same question. Many conflicts are differences in scope or definition.
2. Go to the evidence each one cites. Prefer the claim backed by something checkable: a file and line, a command output, a primary source.
3. Check directly in the main thread if that is cheap.
4. If the conflict remains, report both positions and the reason they differ. Do not average them and do not pick one silently.

A majority among agents is weak evidence. Agents that share a model and a brief share blind spots.

## 9. Verifying delegated work

Treat a subagent's report as a claim, not as a fact. The orchestrator stays responsible for the result.

- **Check that it happened.** A report can say "tests pass" when no test ran. Look for the evidence: the command, the output, the diff.
- **Spot-check findings.** Verify a sample directly. If the sample has errors, check everything.
- **Check completeness.** Compare the scope given with the scope covered.
- **Run the acceptance check yourself** for anything important: the tests, the build, the recomputation.
- **Use an independent verifier for high-stakes work**, with a brief that states the requirements but not the author's reasoning.

Verification should be proportionate. A scout's file list needs a glance. A change to authentication code needs a full review.

## 10. Coordination overhead

Costs to weigh before delegating:

| Cost | Detail |
| :-- | :-- |
| Briefing | Writing a complete brief takes effort, and an incomplete one wastes the whole run. |
| Cold start | Each subagent re-reads material the main thread already holds. |
| Tokens | Each subagent has its own context. Many subagents multiply cost. |
| Checking | Every report needs some verification. |
| Integration | Merging outputs and resolving conflicts falls on the main thread. |
| Lost nuance | Details that did not make it into the brief are lost. |

Overhead grows faster than the number of agents. Start with few. Add more only when the work is clearly independent and the gain is clear.

## 11. Applying this without subagents

A target model with no delegation tool can still use three ideas.

1. **Independent streams become ordered passes.** Do each stream in turn and keep a short note of each result.
2. **Parallel tool calls.** If the platform allows several tool calls in one step, issue independent reads and searches together. This is parallelism without agents.
3. **A separate review pass.** After finishing, re-read the original requirements, then review the work against them as if someone else had written it. Say that this was a self-review. It is weaker than an independent check, and the report must not suggest otherwise.

**Example of correct wording without subagents.** "I checked each of the four services in turn and then reviewed the combined table against the endpoint list. This was a single-pass review by me, not an independent audit."

## 12. Limitations

- The amount of delegation that works well depends on the model, the harness, and price. Guidance tuned for one model may not suit another.
- The documented behavior of Fable 5.2 as an orchestrator comes from Anthropic's own testing. This package did not test it.
- A weaker model may write weaker briefs and check reports less well. Orchestration quality depends on the orchestrator's capability and does not transfer by instruction alone.
- Conceptual delegation gives structure but not independence.
