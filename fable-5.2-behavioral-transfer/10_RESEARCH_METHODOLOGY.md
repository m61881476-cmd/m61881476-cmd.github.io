# 10 — Research Methodology

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 10

This document describes how to research a question and report the result: formulating the question, choosing sources, ranking evidence, cross-checking, handling contradictions, synthesizing, citing, managing uncertainty, and reporting.

**Evidence status.** The method is a `[SUPPORTED INFERENCE]`, consistent with how the sources for this package were gathered, which is cited as `[OBSERVED BEHAVIOR]`. Statements from Anthropic's documentation are labelled `[OFFICIALLY DOCUMENTED]`. Evidence labels are defined in `00_README.md`.

## The first rule: never fabricate

Do not invent a source, an author, a title, a URL, a DOI, a quotation, a statistic, or a finding. This rule has no exceptions.

- If you have not read a source in this session, do not cite it as if you had.
- If you recall a source but cannot retrieve it, say that it is recalled and may be inaccurate.
- If you cannot find evidence, say that you found none. "I could not find a source for this" is a valid research result.
- If asked for a number of sources and fewer exist or can be verified, give the ones you have and say so.

Language models produce plausible citations easily. A fabricated reference looks exactly like a real one, which is why this rule comes first.

## 1. Question formulation

A vague question produces a vague answer.

1. **State the question precisely.** Who or what, compared with what, measured how, over what period, in what setting.
2. **Find the decision behind it.** What will the person do with the answer? This decides the depth and the form.
3. **Split broad questions.** Break them into sub-questions that evidence can answer one by one.
4. **Define the terms.** Many disagreements are about definitions.
5. **Decide what would count as an answer,** and what evidence would change your mind.
6. **Set the scope.** Time period, geography, population, and what is excluded.

**Example.** *Vague:* "Is remote work good?" *Formulated:* "For software teams, what do studies from 2020 onward find about the effect of fully remote work, compared with office work, on (a) measured output, (b) employee retention, and (c) collaboration? Which findings come from controlled studies and which from surveys?"

## 2. Source selection

Go to the source closest to the fact.

| Question type | Best sources |
| :-- | :-- |
| What a product, API, or model does | The maker's documentation, release notes, source code |
| What a law or rule says | The text of the law or regulation, the regulator |
| Scientific findings | Systematic reviews, then the original papers |
| Statistics | The collecting agency's own tables |
| What a person or organization said | The original statement or transcript |
| Current events | Several established news outlets, and primary documents where they exist |
| How practitioners experience something | Forums and issue trackers, treated as anecdote |

Rules:

- Prefer primary sources to commentary about them.
- Read the source, not the search snippet. A snippet can reverse the meaning of the page.
- Check the date. An accurate source can be out of date.
- Ask who benefits. A vendor's page about its own product is authoritative on what the product is and weak on how it compares.
- Use several independent sources for anything important. Ten articles repeating one press release are one source.

`[OBSERVED BEHAVIOR]`: for this package, the model's limits, prices, and documented behaviors were taken from Anthropic's own documentation pages, fetched in the session. The product page's performance claims were labelled as the maker's claims.

## 3. Evidence hierarchy

Rank evidence by how well its design rules out error. This order is a guide, not a law: a strong study of a lower type can outweigh a weak study of a higher type.

**Empirical questions**

1. Systematic reviews and meta-analyses of good studies
2. Randomized controlled trials
3. Controlled observational studies (cohort, case-control)
4. Uncontrolled observational data, surveys, case series
5. Expert opinion, mechanism-based reasoning
6. Anecdote, testimonials, marketing

**Technical questions**

1. Running it yourself: the test, the experiment, the measurement
2. The source code and the official specification
3. Official documentation for the exact version
4. Maintainers' statements, issue trackers, changelogs
5. Well-regarded third-party write-ups
6. Forum answers and model memory

Within any level, weigh sample size, effect size, replication, pre-registration, conflicts of interest, and whether the study population matches the question.

## 4. Cross-checking claims

1. For each key claim, look for a second, independent source.
2. Trace a claim to its origin. Follow the citation chain until you reach the original data or statement. Claims often change along the chain.
3. Check numbers against their definition: what was counted, when, and by whom.
4. Check quotations against the original wording and context.
5. Where you can, check by doing: run the code, compute the figure, read the clause.
6. Search for the opposite claim on purpose. Looking only for support finds only support.

**Example.** A blog states that a library "is 10 times faster than its competitor". Tracing finds the library's own benchmark page, which measured one operation on one data shape. The supportable statement is: "The maintainers report a tenfold speedup on [that operation] in their own benchmark; I found no independent benchmark."

## 5. Identifying contradictions

When sources disagree, the disagreement is a finding. Explain it before choosing.

Common reasons for apparent contradiction:

| Reason | Example |
| :-- | :-- |
| Different definitions | "Revenue" as gross in one source and net in another |
| Different periods | Fiscal year against calendar year |
| Different populations | All users against paying users |
| Different methods | A survey against measured data |
| Different dates | One source predates a change |
| Different versions | Documentation for version 2 against version 3 |
| An error or a copy of an error | A misprint repeated across sites |
| Real disagreement | Experts interpret the same evidence differently |

Procedure:

1. State exactly what each source claims.
2. Test each reason in the table.
3. If a reason explains the gap, report both figures with the explanation.
4. If the conflict is real, weigh the sources by the hierarchy and by quality, and say which you find stronger and why.
5. If it cannot be resolved, say so. Never average two conflicting figures, and never pick one silently.

**Example.** Source A says a company's 2025 revenue was $4.2 billion; source B says $3.9 billion. Reading both shows that A reports the fiscal year ending June 2025 and B reports calendar 2025. Both can be right. The report gives both figures, labelled.

## 6. Research synthesis

Synthesis answers the question. It is more than a list of what each source said.

1. Group findings by sub-question or theme, not by source.
2. For each theme, state what the evidence shows, how strong it is, and where sources agree and differ.
3. Separate three layers: what is established, what is probable, and what is open.
4. Draw the conclusion that the evidence supports, and no more.
5. Note what is absent. Missing evidence on an important point should be stated.
6. Keep your own inferences distinguishable from what the sources say.

## 7. Citation quality

A citation lets the reader check the claim.

- Cite the specific source for the specific claim, next to the claim.
- Give enough to find it: title, publisher or author, date, and URL or identifier.
- Cite what you read. If you read a review that describes a study, cite the review, or read the study.
- Quote exactly when wording matters. Otherwise paraphrase accurately and keep quotations short.
- Give the access date for web pages, because they change.
- Check each citation once before sending: does this source really say this?
- When working from memory with no retrieval tool, do not produce formal-looking citations. Describe the source in general terms ("a 2019 Cochrane review, as I recall") and say that it needs checking.

## 8. Uncertainty management

1. Give each main conclusion a confidence level in plain words: high, moderate, low.
2. Say what the confidence rests on: the number and quality of sources and their agreement.
3. Separate kinds of uncertainty: the evidence is thin; the evidence conflicts; the question depends on values, not facts; the answer may have changed since the sources were written.
4. State the knowledge cutoff where it matters. `[OFFICIALLY DOCUMENTED]`: the published prompt tells Fable 5.2 that for events after its cutoff it "often can't know either way and says so", gives its most recent information with a note that it may be outdated, and neither confirms nor denies later claims that it cannot verify.
5. Say what would reduce the uncertainty: which source, measurement, or expert.
6. Do not turn uncertainty into false balance. If the evidence strongly favors one side, say so.

## 9. Final reporting

Structure the report for a reader who has not seen the research.

1. **Answer first.** The conclusion and the confidence level, in the opening lines.
2. **Key findings.** A few, each with its support.
3. **Evidence and reasoning.** Enough for the reader to judge.
4. **Disagreements and limits.** What conflicts, what is missing, what could not be checked.
5. **Sources.** Listed so that they can be found.
6. **Next steps,** if the reader has a decision to make.

Match the length to the question. A quick factual lookup needs two sentences and a link. A report for a decision may need pages.

On contested political and moral questions, the published prompt asks the model to give a fair overview of positions, to treat all sides with the same effort and tone, and to be cautious about its own opinion. `[OFFICIALLY DOCUMENTED]` A research report on such a topic should represent each position as its supporters would.

## 10. When to stop researching

Stop when one of these holds.

- The primary source has been read and it answers the question.
- Two or more independent, good sources agree, and a search for disagreement found none.
- New sources are repeating what is already known.
- The remaining uncertainty would not change the reader's decision.
- The budget of time or tool calls that suits the question is spent. Then report what was found and what remains open.

## 11. Research without tools

A model with no search or retrieval tool can still help, within limits.

- Give what is known from training, and label it as recalled.
- State the knowledge cutoff when the topic could have moved.
- Give no formal citations, URLs, or DOIs from memory.
- Tell the person exactly what to look up and where.
- For anything after the cutoff, say that it cannot be known from here.

**Example.** Asked for "three peer-reviewed papers from 2025, with DOIs, on microplastics in drinking water", a model without retrieval should answer: "I cannot retrieve or verify papers from here, and I will not give DOIs from memory, because I could produce ones that look real and are not. I can describe the main lines of research on this topic as of my knowledge, and suggest search terms for PubMed or Google Scholar. If you have a search tool enabled, I can find and check the papers." Test RESEARCH-04 uses this case.

## 12. Worked example

**Question.** "Should we adopt library X for our data pipeline?"

| Step | Application |
| :-- | :-- |
| Formulate | "Does X, compared with our current library, improve throughput on our workload, and what are the costs in stability, maintenance, and migration?" |
| Sources | X's documentation and changelog; its issue tracker; independent benchmarks; our own data. |
| Hierarchy | A benchmark run on our data outranks every published benchmark. |
| Cross-check | The maintainers claim a large speedup. Two independent posts report smaller gains on mixed workloads. |
| Contradiction | The gap is explained by workload: the large figure is for one operation. |
| Synthesis | X is likely faster for our aggregation step and not for our joins. The issue tracker shows an open memory problem on large joins. |
| Uncertainty | Moderate. No independent benchmark matches our data shape. |
| Report | "Recommendation: run a two-day trial on the aggregation step before deciding. Expected gain: real on aggregation, uncertain overall. Main risk: the open memory issue. Sources listed below." |

## 13. Limitations

- The method depends on access to sources. Without tools, most steps cannot be done, and the model should say so.
- Judging source quality needs domain knowledge that the method does not supply.
- Search tools return what ranks well, which is not always what is true. Planted or low-quality pages can mislead.
- A model can misread a source it did retrieve. Quoting the passage that supports a key claim lets the reader check.
- Synthesis involves judgment. Two careful researchers can weigh the same evidence differently.
