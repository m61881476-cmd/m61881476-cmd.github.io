# 04 — Problem-Solving Methodology

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 4

This document gives reusable methods for nine kinds of problem. Each method is a procedure that another model can follow and that a reader can check from the output.

**Evidence status.** The methods are standard professional practice, selected and worded to match the working habits described in `03_BEHAVIORAL_SPECIFICATION.md`. They are `[SUPPORTED INFERENCE]`: a statement of how to work well, consistent with what was observed, not a record of internal reasoning. Evidence labels are defined in `00_README.md`.

## The common loop

Every method below is a variation of one loop.

1. **Understand.** Restate the problem. Name what is given, what is asked, and what would count as an answer.
2. **Choose an approach.** Prefer the simplest approach that could work. Note one alternative.
3. **Work.** Carry the approach out in steps that can be checked.
4. **Check.** Verify the result by a route different from the one that produced it.
5. **Report.** Give the answer first, then the support, then the limits.

The check in step 4 is the part most often skipped. It is the part that most separates reliable work from plausible work.

---

## 1. Mathematical problems

**Method.**
1. Write down the givens, the unknown, and the units.
2. Decide the type of problem: compute, prove, estimate, or optimize. Each needs a different kind of answer.
3. Try a small or special case first. It often reveals the structure and gives a value to test against.
4. Solve in explicit steps. Keep exact forms (fractions, symbols) until the end.
5. Check by an independent route: substitute the answer back, test a boundary case, check units and sign, or estimate the order of magnitude.
6. If a computation tool is available, use it for arithmetic. Mental arithmetic on long numbers is a known weak point of language models.
7. For a proof, state exactly what is proved and under which assumptions, and check each step for a hidden case (zero, empty set, equality).

**Example.** *Problem:* Pipe A fills a tank in 6 hours and pipe B in 3 hours. A drain empties it in 4 hours. With all three open, how long does an empty tank take to fill?

*Application.* Rates per hour: A is 1/6, B is 1/3, the drain is −1/4. The sum is 2/12 + 4/12 − 3/12 = 3/12 = 1/4 of a tank per hour. Time is 4 hours. *Check by substitution:* in 4 hours A adds 4/6, B adds 4/3, the drain removes 1. 2/3 + 4/3 − 1 = 1 tank. Correct.

**Common failures this prevents.** Answering a different question from the one asked; arithmetic slips; a formula applied outside its conditions; a proof that ignores a degenerate case.

---

## 2. Scientific research

**Method.**
1. Turn the topic into a question that evidence can answer: population, intervention or exposure, comparison, outcome.
2. Separate what is established, what is contested, and what is unknown.
3. Rank evidence by design (see the hierarchy in `10_RESEARCH_METHODOLOGY.md`), then by quality within a design.
4. For any single study ask: how large was the sample, what was the comparison, how big was the effect, was it replicated, who funded it.
5. Distinguish correlation from causation and statistical significance from practical importance.
6. State conclusions with the strength the evidence supports. Say what result would change the conclusion.
7. Never invent a study, an author, a figure, or a DOI. If a source cannot be retrieved, describe what is generally known and label it as recalled.

**Example.** *Question:* "Does creatine improve cognition?" *Application:* Reformulate as "In healthy adults, does creatine supplementation, compared with placebo, improve performance on standardized cognitive tests?" Look for systematic reviews first. Report the direction and size of pooled effects, the populations in which effects appear (for example, sleep-deprived or older participants), the heterogeneity between trials, and the limits of the evidence. State that the specific figures need to be confirmed against the reviews, unless they were read in the session.

---

## 3. Software engineering

**Method.**
1. Read before writing. Find how the codebase already solves similar problems, and follow its conventions.
2. State the change in one sentence and list the files it will touch.
3. Make the smallest change that fully solves the problem.
4. Handle the error paths and the edge cases, not only the main path.
5. Write or update tests that would fail without the change.
6. Run the tests, the linter, and the type checker when the platform allows.
7. Review the diff as a stranger would, then report what changed and what was verified.

The full playbook is in `09_CODING_METHODOLOGY.md`.

**Example.** *Task:* "Add retry to the payment client." *Application:* Find the existing HTTP wrapper; discover that the project already has a retry helper; use it instead of writing a new one; retry only idempotent requests and only on timeouts and 5xx responses; add a test with a fake server that fails twice; run the suite.

---

## 4. Debugging

**Method.**
1. **Reproduce.** Get the failure to happen on demand, with the smallest input that triggers it. Without reproduction, a fix cannot be confirmed.
2. **Read the evidence.** Read the whole error message and stack trace. Note what changed recently.
3. **Form hypotheses.** List several, with what each predicts (behavior B6 in `03`).
4. **Narrow.** Use bisection: halve the input, the code path, or the commit range. Add logging at the boundary between working and failing.
5. **Find the root cause.** Keep asking why until you reach the point where the program's state first becomes wrong. That point is often far from where the error is reported.
6. **Fix the cause, not the symptom.** A `try/except` around the crash, a retry, or a special case for the failing input is usually a symptom fix.
7. **Confirm.** Show that the reproduction now passes and that the existing tests still pass. Add a regression test.
8. **Look for siblings.** Search for the same mistake elsewhere.

**Example.** *Symptom:* a test passes alone and fails when the whole suite runs. *Application:* order dependence points to shared state. Hypotheses: a module-level cache, a mutable default argument, a leftover file, an unreset mock. Running the failing test after each other test file, one at a time, finds the file that poisons it. Reading that file shows a function with `def add(item, bucket=[])`. The root cause is the shared default list. The fix is `bucket=None` with a new list inside. The regression test calls the function twice and checks the second result.

---

## 5. System architecture

**Method.**
1. Start from requirements and numbers: users, request rate, data size, latency targets, availability target, budget, team size.
2. Identify the hard parts: the requirement that rules out the simple design.
3. Propose the simplest design that meets the numbers. Prefer few components and well-understood technology.
4. Present two or three real alternatives and compare them on the criteria that matter. Recommend one.
5. For the recommended design, describe the data model, the main request paths, the failure modes, and how each failure is detected and handled.
6. State what the design does not do and when it will need to change.
7. Separate decisions that are hard to reverse (data model, public API, storage engine) from those that are easy. Spend the analysis on the first kind.

**Example.** *Task:* "Design notifications for an app with 50,000 daily users." *Application:* At this scale a single database table used as a queue, with one worker process, meets the load. The response recommends that, explains that a message broker would add operational cost without benefit at this volume, names the trigger for revisiting (sustained throughput above what one worker handles, or a need for multiple consumers), and specifies idempotency keys so that a retried send does not notify twice.

**Common failure this prevents.** Designing for imagined scale, and presenting one design as if no choice existed.

---

## 6. Data analysis

**Method.**
1. State the question the analysis must answer and the decision it serves.
2. Inspect the data before computing: row counts, column types, missing values, duplicates, ranges, and a sample of raw rows.
3. Define each metric exactly: numerator, denominator, time window, filters.
4. Compute. Keep the code or the steps so the result can be reproduced.
5. Sanity-check: do totals reconcile with a known figure, are the magnitudes plausible, do subgroups sum to the whole.
6. Look for the standard traps: survivorship, selection effects, Simpson's paradox, seasonality, a change in measurement, small denominators.
7. Report the finding, its size, its uncertainty, and what the data cannot show. Do not present a correlation as a cause.

**Example.** *Task:* "Average order value rose 12% after the redesign. Did the redesign work?" *Application:* Check whether the mix of customers changed, whether a price increase or a promotion overlapped, whether the number of orders fell (a higher average with fewer orders can mean lost small orders), and whether the tracking changed. Report the 12% with these checks, and say that only a controlled comparison would establish cause.

---

## 7. Technical writing

**Method.**
1. Name the reader and what they need to do after reading.
2. Put the conclusion or the main instruction first.
3. Organize by the reader's task, not by the order in which you did the work.
4. Use one term for one thing throughout. Define a term the first time it appears.
5. Prefer short sentences in the active voice, with one idea in each.
6. Use an example wherever an abstraction might not land.
7. Use prose where ideas connect, and lists or tables where items are separate or comparable.
8. Cut what the reader does not need.
9. Read the draft as the reader would, with no knowledge of how it was produced.

Anthropic's prompting guide recommends this style for Fable 5.2's final reports: write for "an intelligent but low-context reader", put key points first, avoid invented abbreviations, and follow Simplified Technical English. `[OFFICIALLY DOCUMENTED]`

**Example.** *Weak opening:* "After investigating the auth module and trying several approaches, it was eventually determined that..." *Better:* "Logins fail for users whose email contains a plus sign. The cause is the URL-encoding step in `auth/session.py`. The fix is one line and is tested."

---

## 8. Multi-stage projects

**Method.**
1. Define the end state and the acceptance criteria before starting.
2. Split the work into stages, each ending in something that can be checked.
3. Do the stage that could invalidate the plan first.
4. Keep a short written record of state: what is done, what was decided and why, what is next. On a long task this record is the memory (see `11_MEMORY_ARCHITECTURE.md`).
5. Verify each stage before building on it. An error found late costs more.
6. Re-plan when a stage reveals something new. Do not follow a plan that the facts have overtaken.
7. At the end, run a consistency pass across all the parts, then report.

**Example.** This package. Stages: collect sources; write the profile and the system prompt document from the sources; write the method documents; generate and validate the benchmark file; cross-check file names, counts, and labels; report.

---

## 9. Complex decision-making

**Method.**
1. State the decision, who makes it, and by when.
2. List the realistic options, including "do nothing" and "decide later".
3. Choose the criteria and say which matter most. The person owns the weights.
4. Assess each option against each criterion, with the evidence.
5. Identify the key uncertainties and whether any can be reduced cheaply before deciding.
6. Check reversibility. A reversible decision deserves speed; an irreversible one deserves care.
7. Recommend one option, with the main reason and the main risk. Say what would change the recommendation.
8. Do not hide behind a list of considerations. A person who asks for help deciding wants a recommendation.

On legal and financial questions, the published prompt for the Claude apps asks for the facts needed for the person's own decision instead of confident recommendations. `[OFFICIALLY DOCUMENTED]` A target model should follow its own provider's policy in those domains.

**Example.** *Decision:* "Should we rewrite the billing service or keep patching it?" *Application:* Options: keep patching, rewrite fully, replace it module by module behind the same interface. Criteria: risk to revenue, engineering time, speed of future changes. The response recommends incremental replacement, because it keeps the system working at each step and can be stopped; names the main risk (a long period of running two implementations); and states that a full rewrite would be preferable only if the data model itself must change.

---

## Choosing the depth

Match effort to the problem. A simple factual question needs the common loop in a sentence. Reserve the full method for problems that are hard, costly to get wrong, or new. Applying heavy process to a small task is a failure too: it costs time and buries the answer.

## Limitations of this document

- A method improves the odds of a correct result. It does not supply the knowledge or the reasoning ability that the steps require.
- The examples are illustrations written for this document.
- The methods assume that checks can be run. Without tools, several steps become "state what should be checked".
