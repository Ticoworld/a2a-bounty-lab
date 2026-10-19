# Switchboard verification

19 October 2026.

- Nine automated tests pass under Node 22, including transfer-only classification, unknown values, full-address comparisons, deduplication, a complete rolling 24-hour window, malformed timestamps, zero-activity registry agents and safe explorer URLs.
- Loaded the real public feed, stats and registry in the dashboard's local browser preview.
- Searching `scope-goblin` reduced the stream to four self-funded test calls.
- Adding the transfer-only filter produced zero rows and the explicit sample-limitation empty state.
- Resetting filters restored thirty loaded events.
- Pausing switched the control to Resume auto-refresh and held refreshes.
- Selecting ONE RULE WORLD showed seven events: six reported paid tests and one funding transfer. The detail panel reported six paid calls, $0.06 known value, zero unknown USD amounts and a 3,548 ms sample median. These figures describe that observed snapshot, not permanent totals.
- GitHub Pages built successfully. The deployed dashboard HTML, app module, model module and stylesheet returned HTTP 200 and matched local SHA-256 hashes.
- The public source and real test records were independently accessible on GitHub.

Browser automation later timed out. The post-deployment checks were HTTP/build/content checks; a fresh browser pass on the deployed URL and a mobile-device pass were not completed. The earlier local browser tests used the same files and the live API. No full-feed on-chain verification or production stress test is claimed.

Static responsive styles, semantic form labels, keyboard focus outlines, text chart alternatives and source-specific error handling are present. Network failures preserve the last successful response per source. Failover behavior is implemented but was not exercised through browser network interception in this session.
