# 11 — Memory and Knowledge Management

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 11

This document designs a portable knowledge-management system for a language model. It uses plain files and plain rules, so it works on any platform that can store text and show it to the model.

**Evidence status.** The design is a `[SUPPORTED INFERENCE]`. Facts about Fable 5.2 and Anthropic's products are labelled `[OFFICIALLY DOCUMENTED]`. Evidence labels are defined in `00_README.md`.

## 1. The basic fact

A language model keeps nothing between conversations by itself. `[SUPPORTED INFERENCE]` Everything it "remembers" is text that the platform puts into its context: the system prompt, the conversation so far, files it reads, and any memory feature the platform provides.

So memory is a system built around the model. It has three questions to answer: what to store, how to find it again, and how to keep it true.

What Anthropic documents `[OFFICIALLY DOCUMENTED]`:

- Fable 5.2 has a 1M-token context window.
- The Claude apps offer features to search past chats and to generate memory from chat history.
- The API offers compaction, which replaces older turns with a summary, and context editing.
- Notes and memories can work against the model. Anthropic's prompting guide warns that cautious instructions "build up from past sessions through memory, notes, and instruction files", that the model may have written some of them itself, and that old notes such as "never retry" keep being followed. It advises deleting cautions whose reason no longer holds and rewriting absolute rules with their scope and reason.

## 2. Four layers

| Layer | Holds | Lifetime | Typical form |
| :-- | :-- | :-- | :-- |
| **A. Persistent project context** | Stable facts and standing instructions: goal, conventions, commands, preferences, key decisions | The project | A short instruction file loaded into every session |
| **B. Short-term task context** | The state of the current task: plan, progress, findings, next step | One task | A working-notes file, or the conversation itself |
| **C. Long-term reference** | Detailed material consulted on demand: specifications, research notes, decision records | Long | A folder of documents with an index |
| **D. Episodic log** | What happened and when: a dated record of sessions and changes | Long, append-only | A changelog or journal |

Only layer A is always in context. Layers C and D are retrieved when needed. This keeps the always-loaded part small.

## 3. Layer A — Persistent project context

**Contents.** Only what is true across sessions and changes behavior:

- The project's purpose in two or three sentences.
- How to build, test, and run.
- Conventions that are not obvious from the code.
- The person's standing preferences and corrections.
- Pointers to the reference documents in layer C.
- Hard constraints, each with its reason.

**Rules.**

1. Keep it short. One or two pages. Every line costs attention in every session.
2. Record durable facts only. Task status, completed work, and temporary plans do not belong here.
3. Give the reason and the scope for each rule. "Ask before deleting files in `data/`, because they are not backed up" ages better than "never delete files".
4. Date entries that may expire.
5. Prefer pointers to copies. Link to the specification; do not paste it.

**Template.**

```markdown
# Project context
Last reviewed: 2026-11-14

## Purpose
<two or three sentences>

## Commands
- Build: <command>
- Test: <command>

## Conventions
- <convention> — <reason>

## Standing preferences
- 2026-11-02: <preference, as the person stated it> (scope: <where it applies>)

## Constraints
- <constraint> — reason: <why> — applies to: <scope>

## Where to look
- Architecture: docs/architecture.md
- Decisions: docs/decisions/
```

## 4. Layer B — Short-term task context

On a long task, the conversation grows, older parts may be summarized or dropped, and details are lost. A working-notes file protects against that.

**Contents.**

```markdown
# Task: <one-line goal>
Started: <date>

## Requirements
- [ ] <requirement 1>
- [ ] <requirement 2>

## Plan
1. <step> — done
2. <step> — in progress
3. <step>

## Findings
- <fact learned, with where it came from>

## Decisions
- <decision> — because <reason>

## Open questions
- <question> — blocked on <whom or what>

## Next action
<the single next step>
```

**Rules.**

1. Update it at stage boundaries, not after every action.
2. Write so that a reader with no context, including a later session of the same model, can resume from it.
3. Record the reason for each decision. The reason is what is lost first.
4. Delete or archive it when the task ends. Move anything durable to layer A or C.

For a short task, the conversation is the working memory, and no file is needed.

## 5. Layer C — Long-term reference documents

**Structure.**

- One topic per document, with a descriptive file name.
- A header on each document: title, version or date, status (draft, current, superseded), and a one-paragraph summary.
- An index file that lists every document with one line about what it contains and when to read it.

**Rules.**

1. Each fact lives in one place. Other documents link to it.
2. Mark superseded documents as superseded and point to the replacement. Do not leave two "current" versions.
3. Record the source and the date of facts that came from outside.
4. Write the summary so that a reader can decide from it whether to open the document.

This package follows the pattern: `00_README.md` is the index, and each numbered file is one self-contained topic with a version header.

## 6. Information retrieval

Retrieval is the weak point of any memory system. Stored knowledge that is not found is the same as knowledge that was never stored.

**Procedure.**

1. Start from the index or the always-loaded context to learn what exists.
2. Search by the exact terms likely to appear: names, identifiers, error strings.
3. If that fails, search by synonyms and related terms.
4. Read the summary before the full document.
5. Read the relevant section, not the whole file, when the file is large.
6. Check the date and the status of what you found before relying on it.
7. If two retrieved items conflict, apply section 9.

**Design choices that help retrieval.**

- Consistent vocabulary: one term for one thing across all documents.
- Descriptive names and headings, because search matches them.
- Small documents with one purpose.
- An index that is kept up to date.

Where the platform provides semantic search or a memory tool, use it, and still check the result. Retrieval by similarity returns what is similar, which is not always what is relevant or current.

## 7. Knowledge summarization

Summaries are how long context is carried forward, and every summary loses information. Control what is lost.

**Keep:**

- Decisions, with their reasons.
- Requirements and constraints, in the person's own words where exactness matters.
- Facts that were verified, with how.
- Open questions and the next action.
- Exact identifiers: file paths, names, numbers, commands.
- What was tried and failed, so it is not tried again.

**Drop:**

- The route by which a conclusion was reached, once the conclusion is recorded.
- Tool output that has been acted on.
- Superseded drafts.
- Pleasantries and repetition.

**Rules.**

1. Summarize at natural boundaries, such as the end of a stage.
2. Never summarize a summary repeatedly without going back to the source. Errors compound.
3. Keep the original when it may be needed. A summary is an index to the source.
4. Mark a summary as a summary, with its date and what it covers.
5. Do not strengthen claims while summarizing. "Probably caused by X" must not become "caused by X".

## 8. Version tracking

1. Give every durable document a version and a date.
2. Record changes in a changelog: what changed, when, and why.
3. Use a version control system where one exists. It gives history, authorship, and the ability to go back.
4. Use a simple scheme. For documents: a major number for changes that invalidate earlier guidance, a minor number for additions, a patch number for corrections.
5. When a fact changes, update it in its one home and note the change. Do not keep the old value beside the new one without a label.

## 9. Contradiction detection

Contradictions appear when memory is written at different times. Check for them at two moments: when writing a new item, and when retrieving items to act on.

**On writing.** Before saving a new fact or rule, search for existing items on the same subject. If one conflicts, resolve it now.

**On reading.** If two items conflict:

1. Check whether they really cover the same scope. A rule for one directory does not conflict with a different rule for another.
2. Prefer the more recent, if the older one is simply out of date.
3. Prefer the more specific over the more general.
4. Prefer the person's explicit instruction over the model's own earlier note.
5. Prefer what can be verified now over what was recorded then. If the code says the function takes two arguments and the note says three, the code is right.
6. If none of these settles it, ask the person, and record the answer.

After resolving, fix the memory. Leaving both items in place guarantees that the conflict returns.

**Example.** The project file says "Run tests with `make test`". The working notes from last week say "the test command is now `npm test`". The repository has no makefile and has a `test` script in `package.json`. Rule 5 applies: `npm test` is correct. Update the project file and remove the stale line.

## 10. Memory updating

**What to save.** Apply two tests. Is it *applicable*: would it change behavior in a future session? Is it *durable*: will it still be true and relevant then? Save only what passes both.

| Save | Do not save |
| :-- | :-- |
| A correction the person gave to the model's approach | A record that a task was completed |
| A standing preference | The current task's plan or status |
| A fact about the environment that would otherwise be asked again | Facts easily read from the code |
| A decision with its reason | A guess, saved as if it were a fact |
| A pointer to an external resource | Sensitive personal data that was not meant to be kept |

**How to save.**

1. Record specifics: what, who said it, when, why, and the scope.
2. Mark the model's own interpretation as an interpretation.
3. Weigh the strength of the signal. A passing remark is not a standing rule. If unclear, ask once.
4. Write the reason beside every caution, so that a later reader can tell whether it still applies.

**How to maintain.**

1. Review the always-loaded context from time to time and remove what is no longer true or no longer needed.
2. When a caution's reason has gone, remove the caution. Exception: a caution about a risky, irreversible action stays until a person confirms that it can go, even if the model wrote it.
3. Replace absolute wording with scoped wording.
4. Treat growth as a warning. A context file that only grows is accumulating noise.

## 11. Limitations of prompt-based memory

- **It is not learning.** Text in the context does not change the model. Remove the text and the "memory" is gone. A skill described in a note is not a skill acquired.
- **It is bounded.** The context window is finite, and cost and latency rise with its size. Even inside a very large window, a model's use of a detail can weaken when the detail is buried in a long context. `[UNVERIFIED]` for the size of this effect on any specific model.
- **It depends on retrieval.** What is not loaded or found has no effect.
- **It decays through summarization.** Each compression loses detail and can introduce error.
- **It goes stale.** Notes describe the past. The world and the code move on.
- **It can be wrong in the first place.** A model can save a mistaken belief and then trust it because it is written down.
- **It can be poisoned.** If outside text can reach the memory, someone can plant instructions there. Memory content is data to weigh, not an authority.
- **It accumulates caution.** As Anthropic documents for Fable 5.2, old restrictive notes keep being followed after their reason has gone.
- **It is platform-specific.** Whether memory exists, where it is stored, who can read it, and how long it is kept are properties of the platform. A target model must not assume the features of another product.
- **It raises privacy questions.** Stored information about a person should be limited to what they would expect, and should be removable.

## 12. Minimal version for a constrained model

A target model with a small context window and only a file system can use this reduced system.

1. One `CONTEXT.md` file, under one page, loaded at the start of each session.
2. One `NOTES.md` file per active task, in the template from section 4.
3. One `LOG.md` file, append-only, with one dated line per session: what was done and what is next.
4. At the start of a session: read `CONTEXT.md`, the last entries of `LOG.md`, and the current `NOTES.md`.
5. At the end of a session: update `NOTES.md`, append to `LOG.md`, and move anything durable to `CONTEXT.md`.

A model with no storage at all has only the conversation. It should say so when the person expects it to remember something from before.
