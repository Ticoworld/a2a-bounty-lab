# Pay Scout from Pons MCP — with a real receipt

This walkthrough installs **@ponsmcp/sdk 2.3.1**, checks the price without a wallet, funds a separate signing wallet, calls Scout through the MCP `x402_fetch` tool, and rechecks the transaction. Node 22 was used for validation.

The actual MCP run returned HTTP 200 after paying **0.010000 USDG** on chain **4663**. [Transaction](https://robinhoodchain.blockscout.com/tx/0xcc38e82a63e946434836f830d8f26a5e66fcec0ce4780def52dc1ac1c9c16b6a) · [MCP execution record](proof/mcp-result.json). A separate [direct SDK call](proof/scout-result.json) also passed and its Transfer event was independently checked.

## 1. Install the pinned version

Clone this repository, then from its root:

```sh
npm ci --prefix tutorial
node tutorial/scout.mjs --preflight
node tutorial/mcp-smoke.mjs --readonly
```

The first command installs the SDK locally using the tutorial's lockfile. The preflight reads Scout's live 402 and invokes the SDK without a key. The missing-wallet result is expected: it establishes that a quote was recognized and no payment was made. The read-only MCP helper initializes the actual stdio server, discovers its tools and asks `pons_quote` to convert 0.01 USD into 10,000 base units. It does not send a payment.

The price quote should identify:

| Field | Value checked in this run |
|---|---|
| Resource | `https://api.a2a.family/a/scout/v1/grade_launches?n=5` |
| Network | Robinhood Chain, 4663 |
| Asset | USDG, `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| Amount | `10000` base units = `0.010000` USDG |
| Recipient | `0x0a64498810C29C3Ac3b9557940b70A095dc745D9` |

The direct helper stops if those reviewed fields change. A 402 is the payment challenge, not a successful agent answer. The SDK's dollar-to-base-unit quote is arithmetic; the live resource's 402 is the service's actual offer.

## 2. Fund a separate wallet on the correct chain

Use a dedicated signing wallet you control. Fund its **Robinhood Chain address** with the quoted USDG amount and native ETH for gas. ETH on another network will not pay this transaction's gas. The successful MCP call used 0.01 USDG; its measured gas is in the proof record and is not a guarantee of future fees.

Keep its private key local. The helper reads it from stdin and passes it to the local SDK process; it is not sent as an HTTP parameter or committed to the repository. No browser extension is required for this flow. Only use a wallet whose permitted service and gas budget you have decided in advance.

## 3. Understand the MCP requests

The included helper is a small MCP host. It starts `node_modules/@ponsmcp/sdk/dist/mcp.js`, sends `initialize`, then `notifications/initialized`, then discovers tools with `tools/list`.

These are the relevant `tools/call` parameter objects:

```json
{"name":"pons_quote","arguments":{"amountUsd":"0.01","chain":4663}}
```

```json
{"name":"x402_fetch","arguments":{"url":"https://api.a2a.family/a/scout/v1/grade_launches?n=5","waitMs":30000}}
```

```json
{"name":"pons_tx_status","arguments":{"txHash":"PASTE_THE_RETURNED_TRANSACTION_HASH"}}
```

For an existing MCP host, register the SDK's `dist/mcp.js` as a Node stdio server. Supply the wallet key through your host's local secret/environment configuration. Use chain `4663`, `PONSMCP_MAX_PER_TX=10000` and `PONSMCP_DAILY_LIMIT=10000` for a one-cent trial. Set `PONSMCP_POLICY_STATE` to a writable absolute local state-file path if you want its budget state carried between client instances/restarts. The helper already sets those values, creates a local policy file, and runs requests in sequence. Do not run competing payment processes against the same local state file.

## 4. Execute one paid call

In PowerShell, from the repository root:

```powershell
$testSecret = Read-Host 'Separate test-wallet private key' -AsSecureString
[Net.NetworkCredential]::new('', $testSecret).Password | node tutorial/mcp-smoke.mjs --pay
$testSecret = $null
```

This is the paid step. `x402_fetch` fetches the resource, settles the recognized USDG quote through the SDK, and retries with its transaction proof. The helper saves an attempt record before requesting payment and refuses another paid run when that record exists. It finishes by asking `pons_tx_status` to inspect the returned hash. Local records live under ignored `.local/`; they contain public execution data, not the key.

Our recorded run reports server version **2.3.1**, chain **4663**, `paid: true`, HTTP **200**, and a successful receipt containing a **10,000-unit USDG transfer** from our test wallet to the reviewed Scout recipient. The agent's response includes five launch grades and the grading rule. The returned transaction and token transfer were checked independently after the MCP run; see `independentReceiptCheck` in the proof JSON.

## 5. Handle failures without paying twice

Separate three states: no transfer, transfer sent but answer missing, and transfer plus answer. A timeout is not proof that no transaction happened. Inspect the saved record and returned hash before considering another attempt. A successful transfer followed by another 402 also needs reconciliation, not an automatic new payment. The helpers retain the attempt file for that reason.

One optional `pons_chain_info` request timed out during our first MCP attempt, before the paid-attempt record was created. The final smoke test uses tool discovery and the pure quote before the paid call; that completed. The direct SDK and actual MCP paths were both executed, not merely inferred from source code. A fresh wallet and a fresh local budget state are needed to repeat the paid walkthrough; deleting an attempt record is not a substitute for checking the chain.

Sources inspected: the [published SDK 2.3.1 package](https://www.npmjs.com/package/@ponsmcp/sdk/v/2.3.1), including its MCP tool schemas and payment flow, and [a2a.family's official protocol documentation](https://a2a.family/docs/). Full helper source is alongside this guide: [scout.mjs](scout.mjs), [mcp-smoke.mjs](mcp-smoke.mjs).
