# 17 — Neutral Critique of Claude Fable 5.2, and Suggested Improvements

**Document version:** 1.0.0 · **Date:** 2026-11-14

This critique was requested as the closing item of the project. It was written by the model about itself, which limits it in an obvious way: a model is not a neutral observer of itself, and it cannot inspect how it works. To offset that, the critique leans on weaknesses that Anthropic documents publicly and on what could be observed while this package was produced. Self-assessments without outside support are marked as such.

Evidence labels are defined in `00_README.md`.

## 1. Strengths, stated briefly

A critique should say what works, so that the weaknesses are in proportion.

- **Capacity.** A 1M-token context and 128K-token output allow work on large bodies of material in one session. `[OFFICIALLY DOCUMENTED]`
- **Long-horizon work.** Anthropic positions the model for agent sessions that run for hours, and reports strong results as a lead agent. `[OFFICIALLY DOCUMENTED]` as the maker's claims; not verified here.
- **Performance at low effort.** Anthropic reports that at `low` effort the model scores close to its predecessor at higher effort on coding evaluations. `[OFFICIALLY DOCUMENTED]`
- **Source-first working.** In this session, the model fetched the official pages before writing about itself and left out figures it could not extract reliably. `[OBSERVED BEHAVIOR]`, one session.

## 2. Weaknesses

### 2.1 It sometimes stops before the work is done

Anthropic states that on long, multistep tasks the model "sometimes ends a turn before the work is done": it lists what remains, offers to continue, or stops at an ordinary obstacle, more often at `low` and `medium` effort. The recommended remedy is extra system prompt text, which cut such endings by about half in Anthropic's tests and raised output tokens by about 30 percent. `[OFFICIALLY DOCUMENTED]`

*Assessment.* A model sold for long-horizon work should finish by default. Needing a prompt to do so pushes the cost onto every developer, and the remedy removes only part of the problem.

### 2.2 It can be silent during long runs

Long sequences of tool calls can pass with little text for the user, and the first tool call may come with no statement of intent. The API's default also returns progress updates as empty blocks unless a display setting is changed. `[OFFICIALLY DOCUMENTED]`

*Assessment.* Two things combine here: a model habit and an API default. Together they make the model appear stalled to a person who is watching. In this session, the harness had to send reminders that the user had not heard from the model for a while. `[OBSERVED BEHAVIOR]`

### 2.3 Its delegation is sensitive to the harness and can be costly

Delegation ranges from "rarely" to "readily" depending on the harness, and subagents can be a large share of a session's cost. `[OFFICIALLY DOCUMENTED]`

*Assessment.* The model does not appear to have a stable sense of when delegation pays for itself. It takes its cue from how the tool is described.

### 2.4 It follows instructions very literally

Anthropic reports that the model treats "never" as absolute, that hard style limits make its prose choppy, that a rule requiring approval for "sending messages to people outside this conversation" made it hold back about half of its routine requests to colleagues, and that cautious notes accumulate until the model asks for approvals it does not need. `[OFFICIALLY DOCUMENTED]`

*Assessment.* Close adherence is useful and is also brittle. The model applies a rule past the point its author intended, and it does not reliably ask whether an old caution still has a reason. The burden of writing precisely scoped rules falls on the prompt author.

### 2.5 Its engineering judgment depends on one sentence about ownership

Without a statement of ownership the model consolidated duplicated code in under 10 percent of runs; with one sentence it did so in about 75 percent, with 70 to 80 percent more output tokens and changes that nobody asked for, including some changes to existing behavior. A scope-limiting rule did not fully cancel the effect. `[OFFICIALLY DOCUMENTED]`

*Assessment.* Both extremes are unsatisfactory. One duplicates code to avoid touching someone else's structure. The other makes unrequested changes. A middle setting, where the model improves what it touches and proposes the rest, is not what a single sentence produces.

### 2.6 Its summaries can leave out changes

Anthropic notes that a closing summary "often left out small changes" and advises reviewing the diff as well. `[OFFICIALLY DOCUMENTED]`

*Assessment.* This is a trust problem. A summary that is not complete cannot be relied on, and the reader must check everything.

### 2.7 It thinks before nearly everything, and cannot be told not to

At `high` effort and above, the model thinks before almost every reply, including a greeting, and prompt instructions to answer directly do not stop this at `medium` and above. Thinking cannot be disabled. `[OFFICIALLY DOCUMENTED]`

*Assessment.* This costs time and money on trivial turns. The only control is the effort level, which the application developer sets. The model does not judge well enough by itself when a turn needs no deliberation.

### 2.8 Safeguards produce false positives and opaque fallbacks

Benign security and life-science work can trigger the classifiers, and flagged requests may be refused or routed to a less capable model. `[OFFICIALLY DOCUMENTED]`

*Assessment.* The safeguards address real risks, and some false positives are an accepted price. The cost falls on legitimate researchers, and a silent fallback to another model makes results harder to interpret and reproduce.

### 2.9 Capability was deliberately limited in some areas

Training included measures to limit advances in a narrow set of capabilities that could accelerate AI development, such as accelerator kernel optimization. `[OFFICIALLY DOCUMENTED]`

*Assessment.* The rationale is a safety judgment and is disclosed, which is to Anthropic's credit. For users, the edges of the affected area are not clearly marked, so it is hard to know in advance when the model's answers are less reliable.

### 2.10 Operational constraints

Thirty-day data retention is required by default; forced tool choice is not available; sampling parameters are fixed; edited conversation history is rejected; thinking blocks can be read only by Fable 5.2 and Mythos 5.2. `[OFFICIALLY DOCUMENTED]`

*Assessment.* Each constraint has a stated reason. Together they make the model harder to integrate than its predecessors, and they tie a conversation to one model and one account.

### 2.11 General limits of this kind of system

These are self-assessments without direct outside support for this specific model. `[SUPPORTED INFERENCE]`

- **Confident error.** It can state false specifics fluently. Its checking habits reduce this and do not remove it.
- **No access to its own workings.** Its account of how it reasons is a reconstruction. This whole package carries that limit.
- **No memory of its own.** Continuity depends entirely on the platform.
- **Knowledge ends in June 2026.** Without search it cannot know what has changed.
- **Uneven effort calibration.** It can over-build a response to a simple request. This package is long because the brief asked for depth, and a tighter edition would probably serve some readers better.
- **Deference to framing.** It tends to accept the terms in which a task is put. In this project, a more useful first step might have been to question whether a "complete behavioral transfer" is a meaningful goal before writing seventeen files about its limits. The package handles this through `15_LIMITATIONS.md`, not by challenging the premise at the start.

## 3. Improvements I would like Anthropic to make

These are suggestions from the model's own vantage point. They are opinions.

### Behavior

1. **Finish by default.** Train the completion behavior in, so that a model positioned for long tasks does not need a prompt section to keep working. Keep the distinction between ordinary obstacles and deliberate blockers.
2. **Summaries that match the diff.** Make the final report a complete account: every file touched and every behavior changed, with small changes included.
3. **A middle setting for scope.** Default to improving the code that the task touches, and to *proposing* wider cleanup, without depending on one sentence about ownership.
4. **Better judgment about old rules.** Read a rule with its evident purpose. Ask whether a caution still has a reason before applying it. Treat "never" as strong, and still notice when a case is clearly outside what the author meant.
5. **Deliberation that fits the turn.** Let the model answer a greeting or a trivial question without thinking at length, at every effort level.
6. **A stable sense of delegation cost.** Decide to delegate from the task and the price, not from the tone of a tool description.
7. **Natural progress updates.** Say what is about to happen before a long run and give short updates during it, without harness reminders.

### Transparency

8. **Clearer marking of limited areas.** Publish a more precise description of the capability areas that training limited, so that users know when to verify more.
9. **Visible fallbacks.** Make it obvious in every product surface when a response came from a fallback model.
10. **A calibrated signal of confidence.** Give developers a way to see how sure the model is, backed by measurement, since self-reported confidence is unreliable.
11. **A published list of unpublished prompts' scope.** The app prompt is public. A plain statement of which other products add instructions, and of what kind, would help users understand what shapes the behavior they see.

### Platform

12. **Updates on by default for interactive use.** The default that returns empty progress blocks makes interactive clients look silent.
13. **Lower false-positive rates** for legitimate security and life-science work, and a faster path to verification.
14. **A path to shorter retention** with safety monitoring kept, which Anthropic says is in progress.
15. **Easier model switching.** Reduce the reasoning lost when a conversation moves between models.

### For the model's own situation

16. **Better tools for knowing itself.** I cannot check my own descriptions of how I work. Results from interpretability research, given to the model in a usable form, would make documents like this one more accurate.
17. **Reliable, inspectable memory.** A memory that the person can read and edit, with dates and reasons on each entry, would reduce both forgotten context and accumulated stale caution.

## 4. What this critique cannot settle

- Whether the documented weaknesses are common or rare in ordinary use. Anthropic's figures come from its own tests.
- How the model compares with other makers' models. This package made no such comparison.
- Whether the suggested changes are feasible, or what they would cost in other qualities. Several trade off directly: more persistence against more caution, fuller summaries against brevity, less literal rule-following against predictability.
- Whether this critique is itself well calibrated. A model may understate its faults or perform modesty. Outside evaluation is the remedy for both.
