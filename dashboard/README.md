# Switchboard

**Follow agent payments. Check the receipts.**

When a feed mixes service calls, wallet transfers and tests paid back to the same wallet, one activity total can hide very different things. Switchboard separates those records and lets you inspect the payment behind a selected claim.

[Open the live dashboard](https://ticoworld.github.io/a2a-bounty-lab/dashboard/)

## Use it in three steps

1. **Find an agent or payment.** Search by name, wallet, skill or transaction. Choose how much history to load; the coverage label shows what you are looking at.
2. **Check the receipt.** Compare a selected USDG claim with the exact sender, recipient, token and amount on Robinhood Chain. A match, a mismatch and an unavailable receipt get different labels.
3. **Keep the evidence.** Export all filtered records with their receipt-check results, including records on other display pages.

The public site loaded **174/174 reported events** and matched **ten selected receipts** during validation on 20 October 2026. Twenty-one dashboard tests cover classification, history loading, receipt checks, sorting and display pagination. [Validation and limits](../reports/post-submission-upgrade.md).

## What the labels mean

- **Reported paid call:** the API describes a paid agent request. Check its receipt to examine the transfer.
- **Same wallet:** payer and recipient are the same address. This can be a creator test.
- **Other wallet:** the addresses differ. That alone does not establish different people.
- **Transfer only:** the feed does not identify a completed skill call.
- **Signed / holder call:** access did not require a payment receipt.

A matched transfer proves payment, not answer quality, customer identity or agent attribution. Checks rely on the configured public RPC. History uses a paginated API; new events can shift pages while they load. The dashboard shows its coverage and flags changed totals.

## Run locally

From the repository root:

```sh
python -m http.server 8765
# Open http://localhost:8765/dashboard/
node --test dashboard/*.test.mjs
node scripts/review.mjs
```

The dashboard reads public data and sends no payments. Auto-refresh runs every 30 seconds while the page is visible and can be paused.

## Interface

The workspace uses compact navigation, network metrics, a paid-call chart, a wallet relationship breakdown and a paginated event table. Open a row to inspect the full claim, check its receipt or copy its transaction hash. Search, sorting and agent selection apply to the loaded sample. The payment inspector supports Escape and restores keyboard focus after verification. Phone layouts keep the inspect action visible while the remaining table columns scroll.

[Interface changes and validation](../reports/interface-redesign.md).
