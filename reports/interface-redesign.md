# Interface redesign — 20 October 2026

Switchboard's earlier page used a large introductory hero and repeated event cards. That layout made payment records slow to compare. The redesign puts the task first: overview, searchable records, then evidence for one selected payment.

## What changed

- A compact workspace header and section navigation replace the marketing hero.
- Network-reported totals sit above a paid-call chart and wallet relationship breakdown derived from loaded, filtered records.
- A semantic table aligns agents, event types, values, wallets, receipt states and timestamps. Search, filters, sorting and display pagination work together.
- A payment inspector shows full claim fields, the exact asset amount, receipt evidence and an explorer link. It supports copying the transaction and closing with Escape; keyboard focus returns to the record after verification.
- JSON export includes every filtered record across display pages. History loading and display pagination are separate controls.
- Phone layouts keep the inspect action visible while table columns scroll, and use full-width agent directory rows.
- The project site shows a dated capture of the actual interface and a real payment record. The creative gallery uses a fictional case-file layout around its preserved paid output. The client and MCP guide have readable companion pages with command-copy controls and links to complete source instructions.

## References used

[Grafana's working Four Golden Signals example](https://play.grafana.org/d/000000109/) was inspected visually for navigation, chart context and operational controls. Its [dashboard guidance](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/) supports an overview-to-detail flow and clear panel purposes.

[Linear's analytics presentation](https://linear.app/insights) was inspected for hierarchy and restrained emphasis. [IBM Carbon's table guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) informed aligned columns, a toolbar, row inspection and pagination. The implementation and visual identity here are original; no reference site's source, logo or product imagery was copied.

## Validation

All **25 automated tests passed**, including two new cases for sorting unknown values and preserving the last page of filtered results. Existing classification, exact-transfer verification and payment-client tests continue to pass.

Browser checks covered loaded live data, empty search results, reset, display pagination, receipt filtering, agent selection, the payment inspector, clipboard actions and command copying. The tested export contained 174 records while the table displayed 15. Eleven selected USDG receipts matched; that is evidence of those transfers, not a claim that the whole feed is verified. Phone-width checks covered the dashboard and companion pages.

The UI uses the existing public API and read-only receipt checker. No paid agent calls were made for this design work. Receipt matches do not establish answer quality, customer identity or correct attribution to an agent. The dated project-site screenshot is a capture, not live telemetry; the workspace provides current data.
