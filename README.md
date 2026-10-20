# A2A Field Notes

**Follow agent payments. Check the receipts. Make a paid call you can account for.**

A marketplace feed can show money moving without telling you whether it was a service payment, a test paid back to the same wallet, or just a transfer. A payment can settle while the answer still fails. These tools help you inspect both sides.

[Open the live dashboard](https://ticoworld.github.io/a2a-bounty-lab/dashboard/) · [Inspect a real Scout purchase](reports/buyer-scout-proof.json) · [Try BAD PATENT OFFICE](https://ticoworld.github.io/a2a-bounty-lab/agents/bad-patent-office/)

## Switchboard — understand the activity behind the totals

For builders and reviewers checking what is happening on a2a.family. Search agent activity, separate payments back to the same wallet, and compare a selected payment with its blockchain receipt. Export the records and receipt checks behind your view.

The dashboard loads up to 1,000 events and shows how much history is available. On **20 October 2026**, the public site loaded **174 of 174 reported events**, and ten selected USDG transfers matched their receipts. These are dated checks, not a claim that every event has been verified. No wallet connection or payment is needed to use the dashboard.

[Explore Switchboard](https://ticoworld.github.io/a2a-bounty-lab/dashboard/) · [How the checks work](dashboard/README.md)

## Hire Agent — make one paid call, then keep the evidence

For developers who want to call a paid agent without losing track of the cost. The client checks the offer, reserves a local budget, pays the stated merchant and verifies the transfer before requesting the answer. If delivery fails after settlement, resume with the same transaction. A duplicate purchase ID is refused.

**A real Scout call returned HTTP 200 after paying 0.01 USDG.** The exact sender, merchant, token and amount matched the receipt. Resume returned the saved result without paying again. [Inspect the execution record](reports/buyer-scout-proof.json).

```sh
npm ci
npm test
# Read-only reviewer demo: real receipts and a deliberately altered claim
node scripts/review.mjs
# Inspect a live offer without a key or a payment
node scripts/hire-agent.mjs --url "https://api.a2a.family/a/scout/v1/grade_launches?n=1" --recipient 0x0a64498810C29C3Ac3b9557940b70A095dc745D9
```

All **23 automated checks passed** in the published validation run. [Setup, payment limits and recovery](docs/technical-guide.md#hire-agent-buy-from-a-different-merchant-with-evidence) · [Source](scripts/hire-agent.mjs) · [Validation report](reports/post-submission-upgrade.md)

The client supports USDG `a2a-tx` payments on Robinhood Chain. Its budget and lock are local to one saved journal. A matched transfer proves payment; it does not prove the answer is correct or that two wallets belong to different people.

## Pons MCP — get from a price quote to a paid answer

Follow one Scout request through installation, wallet funding, payment and a receipt check. The walkthrough includes runnable helpers, the actual MCP tool transcript and the returned answer, so you can inspect the completed run before spending anything yourself.

[Follow the tested walkthrough](tutorial/README.md) · [Inspect the MCP execution record](tutorial/proof/mcp-result.json)

## BAD PATENT OFFICE — patent your worst habit

Meetings about fewer meetings. A fourth productivity app for the same unfinished task. Give this fictional patent office a habit and get a ridiculous three-part invention, a mock patent claim and an imagined test showing how it keeps the habit alive. A piece of satire to read or share, for **0.01 USDG per call**.

[Read a real paid example](https://ticoworld.github.io/a2a-bounty-lab/agents/bad-patent-office/) · [The design](agents/bad-patent-office/design.md) · [What our tests found](agents/bad-patent-office/review.md)

## Reports and source

- [Hosted-agent UX findings](reports/hosted-agent-ux.md): unrelated starter questions and conflicting privacy wording, with reproduction steps.
- [Private security notice](reports/private-security-notice.md): a finding tested on resources we control; technical disclosure stays private.
- [Earlier paid regression tests](reports/paid-tests.md): full responses, receipts and failures that shaped the current creative offer.
- [Payment accounting](reports/final-accounting.md) and [technical setup](docs/technical-guide.md).

Independent project. No affiliation with a2a.family. Our creator tests are labelled as tests; they are not presented as customer demand. Public evidence includes addresses and transactions. Wallet secrets and encrypted backups stay outside this repository.
