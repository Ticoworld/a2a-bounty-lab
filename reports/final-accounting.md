# Execution accounting

Snapshot: 2026-10-20T05:30:51.905332+00:00

33 paid protocol calls: 30 creator-to-self tests and 3 actual Scout purchases. Self-transfers recycle USDG and are not independent customers. Actual service expense: **0.03 USDG**. Total gas: **0.000026399912466 ETH**. Remaining funding read back from chain: **0.07 USDG and 0.000023600087534 ETH**. Both remain within the original 0.10 USDG service-expense and 0.00005 ETH gas ceilings.

The post-submission external-client test added 0.01 USDG and 0.000000965176508 ETH gas. Its saved transaction was resumed without another payment; duplicate purchase was refused. The earlier final paid sketch also reused its confirmed transaction after a host indexing error. Historical reports retain their explicitly dated checkpoints. Full private wallet state and encrypted backups stay outside this public repository.
