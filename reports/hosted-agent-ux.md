# Hosted-agent UX: two reproducible mismatches

Observed 19 October 2026, using an agent owned by this project's test wallet. These findings concern public UI behavior. No third-party private document was purchased, decoded or accessed.

## 1. Custom agents receive unrelated token-trading starter questions

**Impact:** An agent creator can supply a completely unrelated creative service, yet its page invites users to purchase token-advice responses. This obscures the agent's purpose and can waste a caller's paid request. Severity assessment: low-to-medium UX issue, not an authorization exploit.

**Reproduce:**

1. Open [ONE RULE WORLD](https://a2a.family/agents/view/?id=one-rule-world), a creative fictional-world agent.
2. Look at **Try asking** below its status and hire button.
3. Observe suggestions asking whether a token address is safe, whether to buy $A2A, and to rule on a token address.
4. Inspect the public agent card: it declares the hosted `ask` skill and the creative description; it does not describe contract scanning, token research or trading recommendations.

**Expected:** Relevant creator-supplied examples or a neutral invitation to enter a question. If no examples exist, omit the unrelated recommendations.

**Observed:** The generic view's starter prompts are specific to token judgment even for an unrelated custom service. The same pattern appeared in the public page accessibility tree during this session. This finding does not claim the agent actually gave financial advice; no starter was paid for.

**Suggested fix:** Accept `skills[].examples` or a hosted-agent starter list and render that list after validation. When no examples are provided, use a neutral prompt. Do not infer financial capabilities from the fact that the agent is paid on chain.

## 2. Launch flow calls documents private; agent page advertises paid access

**Impact:** A creator sees documents described as private during upload, then the published page offers to open the prompt and uploaded document for 1 USDG. This creates a material ambiguity about who may access the documents and under what conditions. This report does not establish that a purchase actually discloses the contents.

**Reproduce:**

1. Open [the launch form](https://a2a.family/launch/).
2. Observe the skill-documents uploader's **private** label.
3. Launch an agent with a non-sensitive test document. This report used our own `world-examples.md` and system prompt.
4. Open the published agent page without connecting its owner wallet.
5. In **What makes ONE RULE WORLD ONE RULE WORLD**, observe the wording offering to open a document for **1 USDG**, and buttons for the example document and system prompt.

**Expected:** The launch flow explains any document-sale or paid-unlock behavior before upload and publication, or private documents remain owner-only. The creator should be able to distinguish private runtime context from deliberately saleable source material.

**Observed and limits:** The public UI offers paid access while the upload UI labels the same class of material private. We did not purchase a document or verify the access-control implementation. This is a confirmed messaging inconsistency and a privacy concern requiring clarification, not a proven private-data disclosure vulnerability.

**Suggested fix:** Clarify the access model at upload, offer explicit creator control over document exposure, and keep the public description consistent with the enforcement. Document any intended source-sale mechanism.

## Environment and evidence

Freshly launched custom agent, public a2a.family pages, no third-party account access. Wallet: `0x68B59e4d27b2A717194fB74d697831494108baf9`. The agent was launched at 12:41 UTC and updated during testing; the two UI mismatches do not depend on a particular system-prompt version. Screenshots, where included alongside this report, show public UI text and non-sensitive creator-owned filenames only.
