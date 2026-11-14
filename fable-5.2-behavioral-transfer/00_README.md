# Fable 5.2 Behavioral Transfer Package

**Package version:** 1.0.0
**Date:** 2026-11-14
**Subject:** Claude Fable 5.2 (`claude-fable-5-2`), released 2026-11-09
**Status:** Complete first edition. See `16_CHANGELOG.md`.

## What this package is

This package documents the working methods of Claude Fable 5.2 so that another capable language model can adopt them. It contains a model profile, the system prompt that Anthropic publishes for the Claude apps, behavioral and methodological playbooks, a benchmark suite, a scoring rubric, and a portable system prompt.

## What this package is not

It is not a copy of the model. It contains no weights, no training data, no internal architecture details, and no raw internal reasoning. A model that follows this package adopts documented working methods. It does not become Claude Fable 5.2, and it must not say that it is. `15_LIMITATIONS.md` explains what documentation and prompting cannot transfer.

Three cautions apply to every file.

1. **Self-description is weak evidence.** Much of the behavioral material was written by the model about itself. A model does not have reliable access to how it works. Statements of this kind are labelled `[OBSERVED BEHAVIOR]` or `[SUPPORTED INFERENCE]`, never as fact. Where Anthropic's documentation describes a behavior from its own testing, the label is `[OFFICIALLY DOCUMENTED]` and the source is named.
2. **Behavior depends on the harness.** The same model behaves differently under different system prompts, effort levels, and tool sets. The observations here come mainly from one agentic coding session at `medium` effort.
3. **Check the terms that apply to you.** Anthropic's documentation lists a refusal category, `frontier_llm`, for requests that "could assist the development of competing AI models". This package is prompt-level documentation, not training data. If you plan to use any Claude output to train or fine-tune another model, read Anthropic's current terms first. This package does not give permission for that. `[UNVERIFIED]` for the exact wording of the terms, which were not fetched for this edition.

## Evidence labels

Every significant finding carries one label.

| Label | Meaning | Typical source |
| :-- | :-- | :-- |
| `[OFFICIALLY DOCUMENTED]` | Stated in a public Anthropic page retrieved on 2026-11-14. | Model page, system prompt page, prompting guide |
| `[OBSERVED BEHAVIOR]` | Seen in the session that produced this package, or reproducible by the reader with the benchmark suite. | This session; `12_BENCHMARK_SUITE.jsonl` |
| `[SUPPORTED INFERENCE]` | A reasoned conclusion from documented facts or observations. Not directly confirmed. | Author's analysis |
| `[UNVERIFIED]` | Plausible, but not checked against a source in this edition. | Memory, general knowledge |
| `[UNKNOWN]` | Not public, or not knowable from outside the model. | — |

## 1. Project inventory

| # | File | Module | Content |
| :-- | :-- | :-- | :-- |
| 00 | `00_README.md` | — | This file: inventory, sources, method, file list |
| 01 | `01_MODEL_PROFILE.md` | 1 | Identity, limits, modalities, thinking, tools, limitations, comparison |
| 02 | `02_OFFICIAL_SYSTEM_PROMPT.md` | 2 | The published claude.ai system prompt, verbatim, with analysis |
| 03 | `03_BEHAVIORAL_SPECIFICATION.md` | 3 | Nine observable behaviors, each in a seven-part format |
| 04 | `04_PROBLEM_SOLVING_METHODOLOGY.md` | 4 | Reusable methods for nine kinds of problem |
| 05 | `05_PLANNING_ENGINE.md` | 5 | A ten-stage planning method, and when to skip it |
| 06 | `06_AGENT_ORCHESTRATION.md` | 6 | Delegation, parallel work, consolidation, verification |
| 07 | `07_TOOL_ORCHESTRATION.md` | 7 | When and how to use tools, and how to recover from errors |
| 08 | `08_SELF_VERIFICATION.md` | 8 | A quality-control system proportionate to risk |
| 09 | `09_CODING_METHODOLOGY.md` | 9 | Coding playbook with example tasks and criteria |
| 10 | `10_RESEARCH_METHODOLOGY.md` | 10 | Question formulation through final reporting |
| 11 | `11_MEMORY_ARCHITECTURE.md` | 11 | A portable, file-based knowledge-management system |
| 12 | `12_BENCHMARK_SUITE.jsonl` | 12 | 25 tests: 5 each for planning, coding, reasoning, research, self-verification |
| 13 | `13_EVALUATION_RUBRIC.md` | 12 | Scoring scale, protocol, aggregation, reporting |
| 14 | `14_MASTER_SYSTEM_PROMPT.md` | 13 | Portable system prompt with optional modules and family notes |
| 15 | `15_LIMITATIONS.md` | 14 | What cannot be transferred, and why |
| 16 | `16_CHANGELOG.md` | — | Version history and open items |
| 17 | `17_MODEL_CRITIQUE.md` | — | A neutral critique of the model and suggested improvements (requested as a closing item) |

## 2. Official documentation used

All pages were retrieved on 2026-11-14 from Anthropic's public sites. The docs host redirects `docs.claude.com` to `platform.claude.com`.

| Short name | URL | Used for |
| :-- | :-- | :-- |
| Models overview | `https://platform.claude.com/docs/en/models/overview` | Lineup, limits, pricing, cutoffs |
| Model page | `https://platform.claude.com/docs/en/models/fable-5-2/overview` | Specifications, availability, "good to know" |
| What's new | `https://platform.claude.com/docs/en/models/fable-5-2/whats-new-fable-5-2` | Breaking changes, feature support, behavior differences |
| Migration guide | `https://platform.claude.com/docs/en/models/fable-5-2/migration-guide` | API differences from earlier models |
| Prompting guide | `https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2` | Documented behaviors and recommended prompt text |
| System prompt page | `https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-2` | The published app system prompt (entry dated 2026-11-09) |
| System prompts overview | `https://platform.claude.com/docs/en/release-notes/system-prompts/overview` | Scope of the published prompts |
| Product page | `https://www.anthropic.com/claude/fable` | Positioning, use cases, safeguards, plan availability |

Pages that exist but were not read for this edition: the system card (`https://www.anthropic.com/document/claude-fable-5-2-mythos-5-2-system-card`), the launch announcement, the effort, adaptive thinking, preserved thinking, and refusals pages, and Anthropic's terms and usage policies. Claims that depend on them are labelled `[UNVERIFIED]` or point the reader to the page.

## 3. Research methodology

The package was built in five steps.

1. **Collect official sources.** Fetch the pages above directly. Quote or paraphrase them, and label the result `[OFFICIALLY DOCUMENTED]`.
2. **Record session observations.** Note what the model did while producing this package: how it gathered sources before writing, what it verified, what it declined to assert. Label these `[OBSERVED BEHAVIOR]`. One session is a small sample.
3. **Separate method from mechanism.** Describe procedures that an outside reader can follow and check. Do not describe internal computation, and do not reproduce private reasoning. Where a section explains *why* a method works, it is a `[SUPPORTED INFERENCE]`.
4. **Make each claim testable.** Each behavior in `03` has a validation method. The benchmark suite in `12` turns the behaviors into inputs with observable pass criteria.
5. **State the gaps.** Anything not public is `[UNKNOWN]`. Anything recalled but not checked is `[UNVERIFIED]`. `15_LIMITATIONS.md` collects what the package cannot do.

A reader who wants stronger evidence should run the benchmark suite against Claude Fable 5.2 itself, record the transcripts, and compare a target model with those transcripts rather than with the prose in this package. `13_EVALUATION_RUBRIC.md` gives the protocol.

## 4. How to use the package

- **To configure another model:** start with `14_MASTER_SYSTEM_PROMPT.md`. Add only the optional modules that match the tools your platform really provides.
- **To teach a method:** give the target model the single playbook it needs (`04` to `11`). Each file is self-contained.
- **To measure the result:** run `12_BENCHMARK_SUITE.jsonl` with the protocol in `13_EVALUATION_RUBRIC.md`, before and after applying the prompt.
- **To set expectations:** read `15_LIMITATIONS.md` before you promise anyone a result.

## 5. Standards followed in every document

Each document has a version and date, stands on its own, labels its evidence, gives at least one worked example per significant technique, and ends with its known limitations. No document claims behavioral equivalence between any target model and Claude Fable 5.2.
