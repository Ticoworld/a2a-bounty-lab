# Post-submission upgrade — 20 October 2026

The original dashboard showed a limited feed sample, and our first payment runner only tested agents paid to its own signer. These gaps made both entries less useful for an independent reviewer. The existing submitted repository links now include the following improvements.

## Switchboard: inspect history and verify selected transfers

History loads in 100-row pages, with choices of 100, 500 or 1,000 events. The live UI loaded all 174 events reported during validation. Selecting the 100-event limit correctly showed that more history existed. Repeated rows are deduplicated and changed totals are flagged; offset pagination cannot guarantee a frozen snapshot while activity changes. A failed later page preserves the previous successful feed.

Each eligible USDG claim can be checked against chain 4663. The checker verifies transaction identity, successful status, the USDG contract and the exact Transfer sender, recipient and amount. Ten selected live receipts matched. It distinguishes an exact match, a claim mismatch and unavailable receipt data, and leaves unchecked rows visibly unchecked. Checks are manual and read-only, with no wallet connection or payment. Receipt state is searchable through a filter and included in filtered JSON exports.

A match establishes a token transfer only. It does not prove delivered answer quality, agent attribution or independent customers. Signed/holder calls need no receipt. RPC evidence relies on the selected public endpoint. [Read-only proof](upgrade-readonly-proof.json) includes two actual matching Scout claims and a deliberately altered local amount that correctly failed; the altered claim is a test fixture, not an accusation about a real feed row.

## Hire Agent: real external purchase and bounded recovery

`scripts/hire-agent.mjs` supports a different recipient from its signer. The free preflight binds an advertised skill and HTTP 402 quote to the expected URL, explicit merchant, chain, token and price. Local cumulative budgets count pending reservations, an exclusive journal lock prevents concurrent use, and the payment ID cannot be reused to pay again. Resume checks and reuses the same confirmed transaction without a signing key. An unknown broadcast outcome requires manual reconciliation.

The client bought Scout's `grade_launches?n=1` skill for **0.01 USDG**. It received HTTP 200 and verified the exact USDG transfer at transaction `0x74d39ab2051613157650364e04b1b3635c7bb1cce47083564e59453dfc68aee3`. Gas was **0.000000965176508 ETH**. [Public execution record](buyer-scout-proof.json). This is an integration test against another merchant; it is not a customer of our own agents. Resume returned the saved completed result without another payment; a second purchase attempt using the same ID was refused.

Limits: USDG `a2a-tx` only; no EIP-3009 support. Local disk journals and locks are not production custody or cross-machine coordination. Correct settlement and HTTP 200 do not establish that Scout's token grading is useful or correct.

## Reproduce without spending

```sh
npm ci
npm test
node scripts/review.mjs
node scripts/hire-agent.mjs --url "https://api.a2a.family/a/scout/v1/grade_launches?n=1" --recipient 0x0a64498810C29C3Ac3b9557940b70A095dc745D9
```

All **23 automated tests passed**: 19 dashboard/model/pagination/receipt cases and four offer-binding/budget cases. The reviewer demo and quote inspection need no private key and send no payment. Source and live dashboard are published through the already-submitted links. These changes improve the dashboard and payment-client entries; they do not establish that the creative agent is best in its category or guarantee a prize.
