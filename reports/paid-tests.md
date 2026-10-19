# Ten paid calls, and what they actually established

19 October 2026 · Robinhood Chain, 4663 · USDG contract `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`.

The regression harness fetched a 402 quote, checked its resource, token, amount and recipient, sent 10,000 USDG base units, verified the matching Transfer event in a successful receipt, and retried the resource with an `X-PAYMENT` transaction proof. Ten requests returned HTTP 200 with generated answers. The service reported `google/gemini-2.5-flash-lite` in each answer. That model identifier is the service's statement, not independently inspected infrastructure.

Every transfer was from the creator's test wallet to the same wallet. These are paid protocol executions and self-funded quality tests. They are not evidence of ten independent customers. The 0.10 USDG aggregate quoted amount circulated back to that wallet; gas consumed was **0.000007416920742 ETH**, within the authorized 0.00005 ETH gas cap. The test round's 0.10 USDG cumulative quote budget is exhausted. No further paid requests are part of this test round.

| Test | Result | Full record |
|---|---|---|
| ONE RULE WORLD / v1 / weight | Failed: invented question-mass currency; receipt priced at 50 units, offered purchase at 3 | [baseline-1.json](quality/baseline-1.json) |
| ONE RULE WORLD / v1 / clocks | Failed: 12 allocated tokens vs three people with 3 each; added effects beyond stopped clocks | [baseline-2.json](quality/baseline-2.json) |
| ONE RULE WORLD / v2 / weight | Failed: books and a person's accumulating weight substituted for the unanswered question's mass | [v2-1.json](quality/v2-1.json) |
| ONE RULE WORLD / v2 / clocks | Failed: different kinds of owned watches treated as a workaround for a rule affecting all owned clocks | [v2-2.json](quality/v2-2.json) |
| ONE RULE WORLD / v3 / weight | Failed: claimed a change of ownership stops an unanswered question gaining weight | [v3-1.json](quality/v3-1.json) |
| ONE RULE WORLD / v3 / clocks | Failed: submitting a form substituted for speaking the trigger word | [v3-2.json](quality/v3-2.json) |
| SCOPE GOBLIN / v1 / startup | Weak: generic jokes, expansive proposal and requirement questions in place of named hidden labor | [goblin-1.json](quality/goblin-1.json) |
| SCOPE GOBLIN / v2 / akara | Failed constraint retention: omitted the Friday deadline from the proposed work order | [goblin-v2-akara.json](quality/goblin-v2-akara.json) |
| SCOPE GOBLIN / v2 / bounded summary | Passed the bounded-task sanity check; close to a supplied calibration example, so not evidence of unseen generalization | [goblin-v2-bounded.json](quality/goblin-v2-bounded.json) |
| SCOPE GOBLIN / v3 / wedding | Partial: correctly asked for personal inputs rather than inventing a life story; repeated a prohibited generic meal joke and failed to carry the stated deadline from its header into the work order | [goblin-v3-wedding.json](quality/goblin-v3-wedding.json) |

The integration works. The prompt concepts have not passed the competitive-quality gate. No continuation or independent-user test was completed, and these records do not support a reliability or winning-probability claim. The record hashes distinguish the tested prompt versions; current prompts may differ. Earlier outputs must not be presented as current outputs without that context.

One full payment proof:

- Agent: SCOPE GOBLIN, skill `ask`.
- Transaction: [0xd983e84d…6d4b56](https://robinhoodchain.blockscout.com/tx/0xd983e84deded51c5ddf096aec77a0e293f687bd716f22ec8e8485056b16d4b56).
- Amount: 0.010000 USDG.
- Sender and recipient: `0x68B59e4d27b2A717194fB74d697831494108baf9`.
- The raw [test record](quality/goblin-v3-wedding.json) contains the verified receipt block, gas, response status, answer, duration and prompt hash. It contains no private key.

## Reproduction

The runner is in [scripts/hire-and-check.cjs](../scripts/hire-and-check.cjs). Install its exact dependency with `npm ci`, use a separately funded creator wallet, register an agent paid to that address, and review the local profile. A private key is read from stdin only. Do not pass keys as command-line arguments, put them in these public profiles, or reuse the public creator address with a key you do not control.

Do not run payments in parallel. A process interruption around broadcast needs manual chain reconciliation; do not clear a failed record and blindly pay again. The local budget file is an execution aid, not a tamper-proof custody policy.
