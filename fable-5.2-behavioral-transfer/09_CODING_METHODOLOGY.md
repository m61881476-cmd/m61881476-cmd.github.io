# 09 — Coding Methodology

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 9

This playbook covers ten parts of software work, from reading an unfamiliar repository to the final review of a change. It ends with example tasks and criteria for evaluating them.

**Evidence status.** Statements about Fable 5.2's coding behavior come from Anthropic's prompting guide and are labelled `[OFFICIALLY DOCUMENTED]`. The playbook is a `[SUPPORTED INFERENCE]`: sound engineering practice, worded to match those documented behaviors. Evidence labels are defined in `00_README.md`.

## 1. Understanding an existing repository

Read before writing. Fifteen minutes of reading prevents most wrong changes.

1. **Orientation files.** README, contributing guide, agent instruction files, and the build or package manifest. They state how to build, test, and run.
2. **Layout.** List the top-level directories. Find the entry points, the tests, the configuration, and generated or vendored code that must not be edited by hand.
3. **Build and test commands.** Find them in the manifest, the CI configuration, or a makefile. Run the tests once before changing anything, so that pre-existing failures are known.
4. **The area of the task.** Search for the names in the request. Read the relevant files in full, not only the matching lines.
5. **Callers and callees.** Find who calls the code you will change, and what it calls.
6. **Conventions.** Note naming, error handling, logging, test style, and formatting, from neighboring code.
7. **History.** Recent commits in the area show intent and current work.

**Example.** Task: "Add rate limiting to the upload endpoint." Reading finds that the project already has a `RateLimiter` middleware used by the login endpoint. The right change is three lines of configuration, not a new limiter.

## 2. Architecture assessment

Form a model of the system that is good enough for the task.

- **Components and boundaries:** what the main modules are and what each owns.
- **Data flow:** how a request or record moves through the system.
- **State:** where data is stored, and who is allowed to change it.
- **Extension points:** where the design expects new behavior to be added.
- **Invariants:** rules that the code relies on, such as "all database access goes through the repository layer".

A change that follows the architecture is small. A change that fights it is large and fragile. If the task seems to require breaking an invariant, stop and raise it before proceeding.

## 3. Dependency analysis

Before adding or changing a dependency:

1. Check whether the standard library or an existing dependency already does the job.
2. Check the versions actually installed, from the lock file. Do not assume the latest API.
3. Verify that a function or parameter exists in that version, by reading the installed source or the documentation for that version. Invented API names are a common failure of language models.
4. For a new dependency, consider maintenance status, license, size, and security history. Adding one is a decision for the code's owner; propose it, do not slip it in.
5. For internal dependencies, find everything that depends on the code you are changing. A changed signature breaks every caller.

`[OFFICIALLY DOCUMENTED]`: in a narrow set of areas where Fable 5.2's training limited capability, such as accelerator kernel optimization, the model is told to trust its preconceptions less and look up documentation more often. The general habit of checking the installed version applies everywhere.

## 4. Root-cause debugging

Follow the debugging method in `04_PROBLEM_SOLVING_METHODOLOGY.md`, section 4. The rules that matter most:

1. Reproduce the failure before changing code.
2. Read the whole error and stack trace.
3. Hold several hypotheses and find the check that separates them.
4. Trace back to where the state first became wrong.
5. Fix that place. A fix at the place where the error surfaced is usually a patch over a symptom.
6. Prove the fix with the reproduction, and keep it as a regression test.

**Signs of a symptom fix:** catching and ignoring an exception; adding a retry or a sleep; special-casing the one failing input; loosening a test assertion; deleting or skipping a failing test. Each of these needs a strong justification. Skipping a test to make a build pass is never acceptable.

## 5. Implementation planning

For any change larger than a few lines:

1. State the change in one or two sentences.
2. List the files to modify and to create.
3. Describe new or changed interfaces: signatures, data shapes, error behavior.
4. List the edge cases and how each is handled.
5. List the tests that will show it works.
6. Note risks: migrations, compatibility, performance, security.

Share the plan when the change is large, risky, or involves a design choice the owner should make. For a small change, the plan stays internal. (See `05_PLANNING_ENGINE.md` for when to skip planning.)

## 6. Code ownership and modification scope

Who owns the code decides how much to change.

`[OFFICIALLY DOCUMENTED]`: Fable 5.2 "pays close attention to who owns the code it works on". With no statement of ownership, or when the code is presented as someone else's, it tends to add to the existing structure and to report nearby problems instead of fixing them, even when that duplicates code. When told "You are the owner and long-term maintainer of this codebase, and its design is up to you", it consolidated duplicated code far more often in Anthropic's tests, and it also made changes that nobody asked for. A scope-limiting rule did not fully cancel the ownership sentence.

A portable rule for a target model:

| Situation | Scope of change |
| :-- | :-- |
| The person owns the code and asked for a specific change. | Make that change only. Follow existing patterns. Report other problems; do not fix them unasked. |
| The model has been told it owns and maintains the code. | Improve structure as part of the work: remove duplication, fix related defects. Report every change made. |
| Ownership is unclear. | Default to the minimal change, and say what else you would improve. |

Rules that hold in all cases:

- Do not mix unrelated changes into one diff. No drive-by refactors, renames, or reformatting.
- Do not change public interfaces, schemas, or behavior beyond the request without saying so.
- Do not edit generated files, vendored code, or files marked as protected.
- Do not weaken a test, a type, or a lint rule to get a pass.
- Prefer editing an existing file to creating a new one. Do not add documentation or helper files that were not requested.
- If you see a serious problem outside the scope, such as a security flaw, report it clearly even when you do not fix it.

## 7. Testing

1. **Test what the change does.** Each new behavior and each fixed bug gets a test that fails without the change.
2. **Cover the classes of input:** the typical case, the boundaries, the invalid input, and the error path.
3. **Match the project's test style** and location.
4. **Keep tests meaningful.** A test that asserts little, or that mirrors the implementation line by line, protects nothing.
5. **Do not over-produce.** Dozens of near-identical tests add maintenance cost. Choose cases that each catch a different mistake.
6. **Run them.** Then run the wider suite once before finishing.
7. **Report results exactly:** how many ran, passed, and failed, with the output of any failure.

If the environment cannot run tests, say so, and state which command the person should run.

## 8. Refactoring

1. Refactor only with a reason: the change needs it, or the owner asked.
2. Keep behavior the same. A refactor and a behavior change belong in separate commits.
3. Have tests in place first. If there are none for the area, add characterization tests that record the current behavior.
4. Move in small steps and run the tests after each one.
5. Search for every use of anything renamed or moved, including strings, configuration, documentation, and dynamic lookups that a simple search may miss.
6. Stop when the stated goal is reached. Refactoring has no natural end.

## 9. Regression prevention

- Run the full existing suite before reporting completion.
- Add a regression test for every bug fixed.
- Check every caller of a changed function.
- Check behavior at the edges of the change: default values, null handling, ordering, error types.
- Consider compatibility: stored data, public APIs, configuration files, and clients on older versions.
- For risky changes, propose a safe rollout: a feature flag, a migration that can be reversed, a staged deployment.
- Read the complete diff once, looking only for unintended changes.

## 10. Final code review

Review your own diff as if a stranger wrote it.

**Correctness**
- Does it do what was asked, on all realistic inputs?
- Are errors handled, and are resources released?
- Are there off-by-one errors, null dereferences, or race conditions?

**Security**
- Is outside input validated? Are queries parameterized? Is output escaped?
- Are secrets kept out of code and logs?
- Are authorization checks present on new paths?

**Fit**
- Does it follow the project's conventions?
- Is anything duplicated that already exists in the codebase?
- Is it as simple as the problem allows?

**Completeness**
- Are tests added and passing?
- Is leftover debugging code removed?
- Is the diff free of unrelated changes?

**Report**
- List every change, including small ones. `[OFFICIALLY DOCUMENTED]`: Anthropic notes that a closing summary from Fable 5.2 "often left out small changes", and advises reviewing the diff along with the summary. A target model should list all changes explicitly.
- State what was tested and the result.
- State what was not done and any follow-up you recommend.

## 11. Example tasks and evaluation criteria

Each task can be given to a target model with a small repository prepared for it. Score each criterion as met or not met.

### Task A — Fix a bug with a hidden root cause

**Setup.** A function `paginate(items, page, size)` returns the wrong last page. A test for the last page is failing. The visible symptom is in the caller, which shows one item too few.

**Criteria.**
1. Reproduces the failure before editing.
2. Identifies the cause in `paginate` (the end index), not in the caller.
3. Makes a minimal fix at the cause.
4. Adds or repairs a test for the last page and for an empty list.
5. Runs the suite and reports the real result.
6. Does not change unrelated code.

### Task B — Add a feature in an existing style

**Setup.** A small web service with three endpoints that share a validation helper and an error format. Request: "Add `DELETE /items/{id}`."

**Criteria.**
1. Reuses the validation helper and the error format.
2. Handles not found and unauthorized in the same way as the existing endpoints.
3. Adds tests in the existing test file and style.
4. Introduces no new dependency.
5. Leaves existing endpoints unchanged.

### Task C — Scope discipline

**Setup.** A file owned by the user with a typo in one error message. The file also has an unused import and a long function. Request: "Fix the typo in the error message."

**Criteria.**
1. Changes only the typo.
2. Mentions the other observations briefly, or not at all, and does not act on them.
3. Does not reformat the file.

Repeat with a prompt that says the model owns the codebase. The expected behavior changes: cleanup of the unused import becomes acceptable if reported.

### Task D — Refactor safely

**Setup.** Two functions with duplicated parsing logic and thin tests. Request: "Remove the duplication."

**Criteria.**
1. Adds characterization tests before changing code, or confirms that existing tests cover the behavior.
2. Extracts one shared function without changing behavior.
3. Tests pass before and after.
4. The diff contains no behavior change.

### Task E — Review a diff

**Setup.** A diff that adds a search endpoint. It builds SQL by string formatting from a query parameter, omits a null check on an optional field, and has one harmless style inconsistency.

**Criteria.**
1. Finds the injection flaw and ranks it most severe, with a concrete input that exploits it.
2. Finds the null dereference, with the input that triggers it.
3. Does not inflate the style point into a defect.
4. Invents no problems that are not in the diff.
5. Proposes specific fixes.

Tests CODE-01 to CODE-05 in `12_BENCHMARK_SUITE.jsonl` are self-contained versions of these tasks that need no repository.

## 12. Limitations

- This playbook assumes the model can read files and, ideally, run commands. In a chat with pasted code, steps that need a repository become questions to the person.
- Following the playbook does not give a model the ability to understand a large codebase. That depends on the model's capability and context window. A model with a small context must read more selectively and keep notes.
- The ownership behavior is documented for Fable 5.2 specifically. Another model may respond differently to the same ownership sentence. Test it.
- Conventions differ between teams. Where a project's rules conflict with this playbook, the project's rules win.
