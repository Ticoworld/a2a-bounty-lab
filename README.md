# A2A Field Notes

A small set of tools for inspecting an agent marketplace and testing what its agents actually deliver.

## Switchboard: activity with context

[Open Switchboard](https://ticoworld.github.io/a2a-bounty-lab/dashboard/).

The live dashboard reads `/feed`, `/stats` and `/agents` from `api.a2a.family`. It separates reported paid calls, signed/holder calls, transfer-only events and unclassified rows. Same-wallet and other-wallet payments remain separate; neither is presented as a count of independent customers. It shows loaded sample coverage, per-source refresh times, searchable events, agent drilldowns, an hourly activity chart and filtered JSON export.

Null dollar values and missing latency remain unknown. A transfer is not silently counted as a completed agent call. Registry health is not treated as proof of answer quality. The app polls every 30 seconds while visible, can be paused, and preserves each last successful response if one source fails. It never connects a wallet or makes a payment.

Run locally:

```sh
python -m http.server 8765
# Open http://localhost:8765/dashboard/
node --test dashboard/model.test.mjs
```

Nine tests cover event classification, missing and malformed values, address comparisons, duplicate events, full trailing-day windows, incomplete registries, chart bins and transaction-link validation. The live UI was checked for search, empty filters, pause and agent drilldown. The dashboard uses public API claims; it does not independently verify the on-chain receipts behind the entire feed. Google Fonts is optional; system-font fallbacks are provided.

## Hire and Check: real paid regression calls

`scripts/hire-and-check.cjs` is the creator-wallet harness used to pay for ten real hosted calls, verify matching USDG Transfer events, fetch the answers and preserve them with prompt hashes. It exists because successful registration and HTTP 402 quotes say little about whether a hosted agent obeys its own specification.

This runner is deliberately restricted to an agent paid to the same wallet as the signer. Our tests are self-funded, not organic demand. It checks chain ID, token contract, exact price, recipient and the quoted resource before broadcasting. Equivalent URL encodings are compared through parsed URL components. It records service amounts and actual gas in a local ledger, with a 0.10 USDG cumulative quote cap and 0.00005 ETH gas cap for this test round. It refuses duplicate test IDs with recorded answers and does not automatically buy another answer after a failure.

[Integration evidence](reports/paid-tests.md) includes actual transaction hashes, full test records and the negative quality findings. Ten calls returned HTTP 200; that establishes the payment-to-response integration, not that all ten answers were good. Six ONE RULE WORLD outputs violated the intended premise or introduced unsupported mechanics. SCOPE GOBLIN preserved a bounded summary task but still missed constraints on novel inputs. Neither is presented as a proven winning agent.

Install the pinned dependency:

```sh
npm ci
```

The creator's private key is never included here. To reuse the harness, register your own agent, set the local agent profile's `wallet-public.json` to your public owner/payout address, update the profile's name and prompt, and review its $0.01 quote. The endpoint must pay your signing wallet or the runner fails closed. Run one process at a time. A process interruption around broadcast requires manual reconciliation against the chain; this is a local test budget, not a custody or production payments system.

Example in PowerShell, with a separate test-wallet key entered locally, never as a command argument:

```powershell
$testSecret = Read-Host 'Separate test-wallet private key' -AsSecureString
[Net.NetworkCredential]::new('', $testSecret).Password | node scripts/hire-and-check.cjs my-case tests/example-brief.txt agents/scope-goblin
$testSecret = $null
```

## Pons MCP: a tested one-cent Scout walkthrough

[The tutorial](tutorial/README.md) pins SDK 2.3.1, includes free quote and missing-wallet checks, shows the funding and MCP tool requests, and executes a real `x402_fetch` call. The saved transcript includes tool discovery, the paid HTTP 200 answer and `pons_tx_status`; a second receipt check confirms the exact sender, recipient, token and amount. A direct SDK helper was also tested. [Follow-up accounting](reports/round-two.md) distinguishes recycled self-transfers from actual service expense.

## Reproducible UX findings

[Hosted-agent UX report](reports/hosted-agent-ux.md): unrelated token-advice starter prompts on custom creative agents, and conflicting document-privacy messaging. The report distinguishes observed UI behavior from unverified access or disclosure claims. No third-party private document was purchased or accessed.

## Scope

Independent bounty work; no affiliation with a2a.family or its underlying providers. The public files contain public addresses, test prompts, answers and transaction hashes. Wallet secrets, encrypted backups and live wallet state remain outside the public repository. Social publishing and genuine community participation are separate requirements; this project does not fabricate either.

## BAD PATENT OFFICE

[Read the live gallery](https://ticoworld.github.io/a2a-bounty-lab/agents/bad-patent-office/): a fictional patent office for habits that refuse to improve. The gallery shows an actual paid output, its prompt hash and transaction. [The review](agents/bad-patent-office/review.md) explains failed revision tests and why the final service was narrowed to single-turn sketches. [Design entry](agents/bad-patent-office/design.md).

[A private security notice](reports/private-security-notice.md) flags a confirmed finding on owner-controlled resources. Full technical evidence is retained privately.
