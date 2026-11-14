# 01 — Model Profile: Claude Fable 5.2

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 1
**Sources:** Anthropic public documentation retrieved 2026-11-14 (listed in `00_README.md`), plus observations from the session that produced this package.

Evidence labels are defined in `00_README.md`.

## 1. Identity

| Item | Value | Label |
| :-- | :-- | :-- |
| Name | Claude Fable 5.2 | `[OFFICIALLY DOCUMENTED]` |
| Developer | Anthropic | `[OFFICIALLY DOCUMENTED]` |
| Claude API model ID | `claude-fable-5-2` (a pinned snapshot; there is no dated suffix) | `[OFFICIALLY DOCUMENTED]` |
| Released | 2026-11-09 | `[OFFICIALLY DOCUMENTED]` |
| Retirement | Not sooner than 2027-11-09 on Anthropic-operated platforms | `[OFFICIALLY DOCUMENTED]` |
| Family and tier | Claude 5 family; "Mythos-class" tier, described as sitting above Claude Opus in capability | `[OFFICIALLY DOCUMENTED]` (published system prompt) |
| Sibling model | Claude Mythos 5.2 (`claude-mythos-5-2`). The published system prompt says the two "share the same underlying model", and that Fable 5.2 "has additional safety measures for biology and cybersecurity". Mythos 5.2 is offered only to organizations verified through Anthropic's programs. | `[OFFICIALLY DOCUMENTED]` |
| Predecessors | Claude Fable 5 (2026-06-09), Claude Fable 5.1 (2026-09-01) | `[OFFICIALLY DOCUMENTED]` (product page) |
| Positioning | "For demanding reasoning and long-horizon agentic work." Anthropic advises starting with Claude Opus 5.5 for most workloads and moving to Fable 5.2 when evaluations at higher effort still fall short. | `[OFFICIALLY DOCUMENTED]` |
| Identity in this session | The session metadata reported the configured model as `claude-fable-5-2`. | `[OBSERVED BEHAVIOR]` |

Platform IDs `[OFFICIALLY DOCUMENTED]`: `claude-fable-5-2` on the Claude API, Claude Platform on AWS, Microsoft Foundry, and Claude Models on Google Cloud (both Google managed and Anthropic managed); `global.anthropic.claude-fable-5-2` on Amazon Bedrock.

## 2. Publicly documented capabilities

All items in this section are `[OFFICIALLY DOCUMENTED]`.

**Typical uses (model page):** agent sessions that run for hours, multistep deep research, and analysis carried through to a finished document, spreadsheet, or deck.

**Claims on the product page** (marketing statements from Anthropic's own testing; not independently verified here):

- Coding: takes on large, loosely defined problems across repositories, tests its own work, and is "more willing to question inherited conclusions".
- Agents: described as Anthropic's strongest lead agent, able to run ambiguous engineering work for days and coordinate large numbers of subagents.
- Research loops: runs ablations, hill-climbs metrics, and verifies that each change did what it expected.
- Also listed: scientific research, financial analysis, and design for 3D, hardware, and motion.

The product page also publishes a benchmark table. This edition does not transcribe it, because the plain-text extraction could not reliably match figures to columns. Read the table at `https://www.anthropic.com/claude/fable`.

## 3. Input and output modalities

| Direction | Modality | Label |
| :-- | :-- | :-- |
| Input | Text and images | `[OFFICIALLY DOCUMENTED]` ("Text and images → text") |
| Input | PDF documents through the API's document blocks | `[OFFICIALLY DOCUMENTED]` for the API in general; the product page says the model "reads detailed images and PDFs" |
| Output | Text only | `[OFFICIALLY DOCUMENTED]` |
| Output | Images, audio, video as native output | Not supported. `[SUPPORTED INFERENCE]` from "→ text" |
| Output | Files, charts, drawings, slides | Only by writing code or markup that a tool then renders or runs. This depends on the platform, not on the model. `[SUPPORTED INFERENCE]` |

Voice mode exists in the Claude apps `[OFFICIALLY DOCUMENTED]` (published system prompt). Whether the model itself processes audio is `[UNKNOWN]`.

## 4. Context and output limits

| Limit | Value | Label |
| :-- | :-- | :-- |
| Context window | 1M tokens (default and maximum). Roughly 555k words on the current tokenizer. | `[OFFICIALLY DOCUMENTED]` |
| Max output | 128K tokens on the synchronous Messages API | `[OFFICIALLY DOCUMENTED]` |
| Tokenizer | The tokenizer introduced with Claude Opus 4.7 | `[OFFICIALLY DOCUMENTED]` |
| Reliable knowledge cutoff | June 2026 | `[OFFICIALLY DOCUMENTED]` |
| Training data cutoff | June 2026 | `[OFFICIALLY DOCUMENTED]` |
| Context in this session | The harness reported a 1,000,000-token maximum. | `[OBSERVED BEHAVIOR]` |

Pricing `[OFFICIALLY DOCUMENTED]`: $8 per million input tokens and $40 per million output tokens; cache reads $0.20; 5-minute cache writes $10; 1-hour cache writes $16; 50% discount through the Batch API; fast mode at $16 / $80.

## 5. Thinking configuration

All items are `[OFFICIALLY DOCUMENTED]` unless marked.

- **Adaptive thinking is always on.** It cannot be turned off. Requests that send `thinking: {"type": "disabled"}` or a fixed `budget_tokens` return a 400 error.
- **Effort is the control.** Levels are `low`, `medium`, `high`, `xhigh`, and `max`. The API default is `high`. Effort sets how much the model thinks, how many tool calls it makes, how long a turn takes, and how many tokens it uses.
- **Guidance by level:** `low` for quick exchanges, well-specified tasks, and subagents; `medium` for interactive coding and everyday knowledge work; `high` for hard coding, research, and unattended runs; `xhigh` only where a gain has been measured; `max` for measuring the ceiling or for open-ended problems such as mathematics.
- **Most of the gain arrives at `high`.** Above it, gains are uneven and task-dependent.
- **The model thinks before almost every reply at `high` and above**, including a reply to a greeting. A prompt line such as "answer directly without deliberating" does not stop thinking at `medium` and above.
- **Effort has little effect on reply length.** Length is set by prompting.
- **The raw reasoning is not returned.** By default, thinking blocks come back with empty text. A setting can return a summary or short progress updates instead.
- **Preserved thinking.** Thinking blocks are bound to the conversation, the model, and the account that produced them. Editing the system prompt, the tools, or an earlier message invalidates later thinking blocks, and the Messages API then rejects the request by default. Harnesses should keep history append-only.
- **Sampling parameters.** `temperature`, `top_p`, and `top_k` should be omitted.
- **This session ran at `medium` effort.** `[OBSERVED BEHAVIOR]`

What happens inside the thinking process is `[UNKNOWN]` from outside, and this package does not attempt to describe it.

## 6. Tools and integrations

A tool is something the platform provides. The model can only request a tool call; the platform runs it. The lists below say what Anthropic documents. They do not mean that any particular deployment has these tools.

**API features documented for Fable 5.2** `[OFFICIALLY DOCUMENTED]`: tool use with `tool_choice: auto` (forced tool choice `any` / `tool` returns a 400 error); strict tool schemas; structured JSON outputs (not available in organizations using customer-managed encryption keys); computer use through `computer_toolset_20260801`; the advisor tool (beta; the advisor must be Fable 5.2 or Mythos 5.2); compaction on demand (beta); mid-conversation system messages and tool changes (beta); per-message effort (beta); fast mode; batch processing; prompt caching.

**Products named in the published system prompt** `[OFFICIALLY DOCUMENTED]`: the web, desktop, and mobile chat apps; the API and Claude Platform; Claude Code; Claude Cowork; Claude in Chrome; Claude in Excel; Claude for Google Workspace; Claude in PowerPoint; Claude Tag (Slack). App features named there: web search, deep research, code execution and file creation, Artifacts, search of past chats, and memory generated from chat history.

**Tools seen in this session** `[OBSERVED BEHAVIOR]`: file read, write, and edit; shell commands; file and content search; subagent launch; web fetch and search; and connectors to outside services supplied by the harness. These belong to this harness. Another deployment of the same model may have none of them.

## 7. Known limitations

**Officially documented limits and constraints**

- Text output only.
- Knowledge is reliable through June 2026. Later events are not known without a search tool.
- No zero-data-retention use by default; 30-day retention is required unless Anthropic authorizes otherwise.
- Safety classifiers can decline a request. The response has `stop_reason: "refusal"` and a category: `cyber`, `bio`, `frontier_llm`, `reasoning_extraction`, `general_harms`, or none. Benign security and life-science work can trigger false positives.
- Training "included measures to limit advances in a narrow set of capabilities that could most directly accelerate AI development, like accelerator kernel optimization". In those areas the model is told to have less confidence in its preconceptions and to look up documentation more often.
- No Priority Tier. `[UNVERIFIED]` — taken from tooling reference material in the session, not from the pages fetched.

**Officially documented behavioral weaknesses** (Anthropic's prompting guide)

- A turn can end before the work is done, more often at `low` and `medium` effort.
- Long runs of tool calls can pass with little text for the user.
- Delegation to subagents can be heavier than a task needs when the harness invites it, and subagents can be a large share of cost.
- Cautious instructions accumulate through memory and notes, and the model then asks for approvals it does not need.
- The model treats an instruction containing "never" as absolute, and follows style rules so closely that hard limits can make prose choppy.
- When the prompt does not say who owns the code, the model tends to add to existing structure, even when that duplicates code.
- A closing summary often leaves out small changes.

**General limitations of this kind of system** `[SUPPORTED INFERENCE]`

- It can state false things with confidence, especially specific facts such as citations, version numbers, and quotations.
- It has no memory between conversations unless the platform supplies one.
- It cannot observe its own computation, so its account of its own methods can be wrong.
- It cannot act in the world except through tools that the platform provides.

**Unknown** `[UNKNOWN]`: parameter count, architecture details, training data composition, training procedure, hardware, and any internal system configuration not published.

## 8. Differences from other Claude models

`[OFFICIALLY DOCUMENTED]` unless marked.

| Property | Fable 5.2 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
| :-- | :-- | :-- | :-- | :-- |
| Stated purpose | Demanding reasoning, long-horizon agentic work | Long-running agentic coding and knowledge work | Best combination of speed and intelligence | High-volume, latency-sensitive tasks |
| Price per MTok (in / out) | $8 / $40 | $4 / $20 | $2 / $10 | from $0.10 / $0.50 |
| Latency | Moderate | Moderate | Fast | Fastest |
| Thinking | Adaptive, always on | Adaptive, always on | Adaptive | Adaptive |
| Default effort | `high` | `medium` | `high` | `medium` |
| Context / max output | 1M / 128K | 1M / 128K | 1M / 128K | 1M / 128K |
| Knowledge cutoff | Jun 2026 | Jun 2026 | Jun 2026 | Jun 2026 |

**Compared with Fable 5.1:** lower price ($10 / $50 before); the prefix check on edited history is enforced for every account; thinking blocks are readable only by Fable 5.2 and Mythos 5.2; the older `computer_20251124` tool is rejected except on Amazon Bedrock; the advisor pairing is restricted. Behaviorally, Anthropic reports better performance at `low` effort, self-review through subagents at `xhigh` and `max`, and writing rated above Fable 5.1's.

**Compared with Mythos 5.2:** same capabilities, specifications, and pricing; Fable 5.2 has additional safeguards for biology and cybersecurity and is available to all customers.

**What this means for a transfer project** `[SUPPORTED INFERENCE]`: the limits, prices, and API rules above describe a product. None of them transfer by prompting. The parts of this profile that a target model can adopt are the working habits in files `03` to `11`.

## 9. Example: how another model should use this profile

A target model reads this file to learn what it is being compared with, not what it is. A correct self-description for a target model is:

> "I am [actual model name]. I follow a set of documented working methods derived from public material about Claude Fable 5.2. My limits, knowledge cutoff, and tools are my own."

An incorrect self-description is any sentence that claims the Fable 5.2 name, context window, cutoff, or tools.

## 10. Limitations of this document

The profile is a snapshot of pages read on 2026-11-14. Prices, limits, and feature flags change. The system card was not read, so safety evaluation results are not summarized. Benchmark figures are not transcribed.
