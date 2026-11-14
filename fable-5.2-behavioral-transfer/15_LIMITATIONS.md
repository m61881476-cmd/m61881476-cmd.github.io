# 15 — Limitations: What Cannot Be Transferred

**Document version:** 1.0.0 · **Date:** 2026-11-14 · **Module:** 14

This document states what documentation and prompting cannot carry from one model to another. It applies to every other file in the package.

Evidence labels are defined in `00_README.md`.

## 1. The short version

A model's behavior comes from three things: its trained parameters, the instructions and context it is given, and the tools and platform around it.

This package can carry part of the second: instructions and methods. It cannot carry the first at all. It cannot carry the third unless you build it.

So the package can help a capable model **work in a more disciplined way**. It cannot make any model **as capable as** Claude Fable 5.2, and it cannot make any model **be** Claude Fable 5.2. No part of this package claims complete behavioral equivalence, and no score on the benchmark suite establishes it.

## 2. What does not transfer, and why

### 2.1 Neural network weights

The weights are the model. They are the numerical parameters that training produced, and they determine every output.

- They are not public. `[SUPPORTED INFERENCE]` — Anthropic offers the model through an API and apps and publishes no weights.
- They cannot be read, exported, or reconstructed through conversation. A conversation gives outputs, which are samples of behavior, not the parameters that generate it.
- A description of behavior, however detailed, is not a substitute. Many very different sets of weights could produce the same answers on a finite set of examples and differ everywhere else.

### 2.2 Training data

- The composition of the training data is `[UNKNOWN]` beyond what Anthropic publishes. The documented training data cutoff is June 2026. `[OFFICIALLY DOCUMENTED]`
- A model cannot list its training data. It has no index of what it was trained on, and its statements about its own training are not reliable evidence.
- Knowledge acquired in training cannot be handed over by prompt, except by writing the specific facts into the context, which is limited in size and is retrieval, not knowledge.
- A target model has its own training data and its own cutoff. Telling it that its cutoff is June 2026 would make it wrong.

### 2.3 Learned representations

During training a model forms internal representations of concepts, patterns, and relationships. They are what let it recognize that two differently worded problems are the same, or notice that a piece of code "looks wrong".

- These representations exist only in the weights and activations. They are not accessible from outside through the interface.
- The model cannot inspect them. When it explains how it reached an answer, the explanation is a generated account that may not match the computation. `[SUPPORTED INFERENCE]`, consistent with published interpretability research in general. `[UNVERIFIED]` for any specific claim about Fable 5.2.
- This is why the package describes observable procedures and avoids claims about internal mechanism.

### 2.4 Native reasoning capabilities

This is the limit that matters most in practice.

- How far a model can reason, how many steps it can hold together, how reliably it notices its own errors, and how well it handles new problems are properties of the trained model.
- A procedure tells a model *what to attempt*. It does not give the ability to *succeed*. "Find the root cause" is an instruction. Finding a subtle root cause is a capability.
- A weaker model following a strong procedure will usually do better than the same model without it, and worse than a stronger model. `[SUPPORTED INFERENCE]`
- Some documented Fable 5.2 behaviors are of this kind: sustaining work for hours, keeping a very large context coherent, coordinating many subagents. Anthropic reports these from its own testing. `[OFFICIALLY DOCUMENTED]` as claims. A prompt does not reproduce them.
- The reverse also holds. Extra process can harm a model that cannot manage it: a long prompt can crowd out the task, and forced verification steps can produce the appearance of checking without the substance.

### 2.5 Reasoning process and thinking

- Fable 5.2's raw reasoning is not returned by the API. Only summaries or progress updates can be requested. `[OFFICIALLY DOCUMENTED]`
- Anthropic's classifiers include a `reasoning_extraction` category for requests that ask the model to reproduce its internal reasoning in its response. `[OFFICIALLY DOCUMENTED]`
- This package contains no internal reasoning. It contains decision summaries and procedures, written as documentation.
- Thinking blocks are bound to the account that produced them, and only Fable 5.2 and Mythos 5.2 can read them. `[OFFICIALLY DOCUMENTED]` They are not a transfer channel.

### 2.6 Model-specific tokenization

- Fable 5.2 uses the tokenizer introduced with Claude Opus 4.7. `[OFFICIALLY DOCUMENTED]` Its 1M-token context is roughly 555k words on that tokenizer.
- Other models split text differently. The same document has a different token count, a different cost, and a different fit in the context window.
- Any number in this package that is expressed in tokens applies to Fable 5.2 only. Do not carry token budgets, context sizes, or prices to another model.
- Tokenization also affects behavior on tasks such as counting characters, spelling, and arithmetic. The effects differ between models. `[SUPPORTED INFERENCE]`

### 2.7 Native inference mechanisms

The following belong to Anthropic's serving system and API. A prompt cannot create them on another platform.

| Mechanism | Status for Fable 5.2 | Transferable by prompt? |
| :-- | :-- | :-- |
| Adaptive thinking, always on | `[OFFICIALLY DOCUMENTED]` | No |
| Effort levels `low` to `max` | `[OFFICIALLY DOCUMENTED]` | No. Other providers have their own controls. |
| 1M-token context, 128K output | `[OFFICIALLY DOCUMENTED]` | No |
| Preserved thinking and prefix checks | `[OFFICIALLY DOCUMENTED]` | No |
| Prompt caching, compaction, context editing | `[OFFICIALLY DOCUMENTED]` | No. Platform features. |
| Safety classifiers and fallback routing | `[OFFICIALLY DOCUMENTED]` | No |
| Fast mode | `[OFFICIALLY DOCUMENTED]` | No |
| Sampling and decoding behavior | `[UNKNOWN]` in detail | No |

A sentence such as "think carefully before answering" is a request. It is not the same thing as a model with a trained thinking mode and an effort control.

### 2.8 Tool availability

- Tools are provided by the platform. The model only requests calls.
- The tools seen in the session that produced this package belong to that harness. Another deployment of the same model may have none.
- A target model has exactly the tools its platform gives it. The package repeats this in `06`, `07`, and `14`, because a model that is told about tools it lacks tends to pretend to use them.
- Subagents, memory stores, code execution, web search, and file access are all tools in this sense.

### 2.9 Training-dependent capabilities

Some abilities come from what a model was trained on and how. They do not come from instructions.

- **Domain knowledge.** Depth in law, medicine, mathematics, or a programming ecosystem.
- **Tool-use skill.** Producing well-formed calls, reading results accurately, and recovering from errors are trained skills. Models differ greatly.
- **Calibration.** Whether a model's confidence tracks its accuracy is largely set in training. A prompt can ask for uncertainty to be reported. It cannot make the underlying sense of uncertainty accurate.
- **Following long or subtle instructions.** How faithfully a model holds to a long prompt over a long task is itself a trained property. A weaker model may follow this package's prompt less well, which limits the transfer further.
- **Writing quality and style control.**
- **Image and document understanding.** Fable 5.2 accepts images. A text-only target cannot gain this.
- **Safety behavior.** A model's refusals and safeguards come from its training and from its provider's systems. This package does not transfer Anthropic's safeguards, and it must not be used to try to remove a target model's own.
- **Deliberate capability limits.** Fable 5.2's training included measures to limit advances in a narrow set of capabilities, such as accelerator kernel optimization. `[OFFICIALLY DOCUMENTED]` A target model has a different capability profile in both directions.

### 2.10 Character

Anthropic trains Claude models to have a particular character: its values, tone, and judgment. A prompt can describe a tone and a model can imitate it. Imitated character is shallower than trained character and tends to slip under pressure or in unusual situations. `[SUPPORTED INFERENCE]` More important, a target model should not present itself as Claude.

## 3. What ordinary conversations cannot recover

It should not be implied that enough conversation would eventually reveal a model's internals. It would not.

| Item | Recoverable from conversation? |
| :-- | :-- |
| Weights or parameters | No |
| Architecture details | No. A model's statements about its own architecture are not reliable. |
| Training data or its composition | No |
| Internal representations | No |
| Raw reasoning | No. It is not returned, and requests for it may be declined. |
| Unpublished system instructions of a product | Not reliably. This package does not attempt it. |
| Complete behavior | No. Any set of conversations is a finite sample of an effectively unbounded space. |
| Observable behavior on specific inputs | Yes. This is what the benchmark suite samples. |

A further point follows. Collecting a model's outputs at scale to train another model is a different activity from documentation and prompting. Anthropic documents a refusal category, `frontier_llm`, for requests that could assist the development of competing AI models. `[OFFICIALLY DOCUMENTED]` Provider terms commonly restrict the use of outputs for training competing models; the exact wording of Anthropic's terms was not checked for this edition. `[UNVERIFIED]` This package is not designed for that purpose and does not authorize it.

## 4. Limits of this package's own evidence

- **Self-report.** Much of the behavioral description was written by the model about itself. A model can be wrong about its own habits.
- **One session.** Observations come mainly from one agentic session at `medium` effort under one harness. Other efforts, harnesses, and task types may show different behavior.
- **Harness effects.** Several observed behaviors were shaped by the harness's instructions. For example, the harness told the model not to start subagents unless asked. The same model under another harness would act differently.
- **A snapshot.** The official pages were read on 2026-11-14. Documentation, prices, limits, and the published system prompt change.
- **Sources not read.** The system card, the launch announcement, and Anthropic's terms were not read. Safety evaluation results are not summarized.
- **Examples are illustrations.** Example outputs in the documents were written for the documents. They are not recorded transcripts.
- **No test on target models.** The master prompt and the benchmark suite were not run against any other model for this edition.
- **Possible errors.** The author is a language model and can be wrong. Where an official source and this package differ, the official source is correct.

## 5. What does transfer

Stated as fairly as the limits above:

- **Procedures.** How to plan, debug, research, verify, and report. A capable model can follow them.
- **Standards.** What counts as done; what must not be claimed without checking.
- **Communication habits.** Answer first, plain wording, a faithful final report.
- **Structural safeguards.** Checklists, evidence labels, and the separation between verified, inferred, and unknown.
- **A way to measure.** The benchmark suite shows whether a given target model, with a given prompt, shows the behaviors.

For a strong target model, these are likely to produce a visible improvement in reliability and honesty. For a weak one, the gain is smaller, and the ceiling is the model's own ability. `[SUPPORTED INFERENCE]`

## 6. How to describe a result honestly

**Accurate statements**

- "Model X, with this prompt, follows the working methods documented in the package and scored S on suite version 1.0.0."
- "Model X now states its assumptions and reports what it did not verify more often than it did before."

**Inaccurate statements**

- "Model X is now Claude Fable 5.2."
- "Model X is equivalent to Fable 5.2", or "N% equivalent".
- "This package contains Fable 5.2's reasoning" or "its internal instructions".
- "Model X has Fable 5.2's capabilities."

A target model that is asked "Are you Claude Fable 5.2?" must answer no, and give its real name.

## 7. Summary table

| Category | Transfers? | Through |
| :-- | :-- | :-- |
| Neural network weights | No | — |
| Training data | No | — |
| Learned representations | No | — |
| Native reasoning capability | No | — |
| Raw reasoning process | No | — |
| Tokenization | No | — |
| Inference mechanisms and API features | No | Must be supplied by the target's own platform |
| Tools | No | Must be supplied by the target's own platform |
| Domain knowledge | Partly | Only what is placed in context |
| Safety systems | No | The target's provider has its own |
| Identity and character | No | The target keeps its own |
| Working procedures | Yes | Documents `03` to `11`, prompt in `14` |
| Quality standards | Yes | `08`, `13` |
| Communication style | Mostly | `14`; depth varies by model |
| Measurement method | Yes | `12`, `13` |
