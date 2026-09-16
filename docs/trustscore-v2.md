# TrustScore v2

## Scope

The score is a measure of reviewed evidence, not identity assurance, personal worth,
passion, or a guarantee of future performance. No credit is awarded for profile
uploads, connections, invites, joining teams, or self-reported achievements.
Collaborative work can earn credit through reviewed Skill Hub evidence or GIGs.

## Calculation

Preserve all ledger records. Ignore unreviewed profile credits and unknown positive
event types when calculating the current score. Deduplicate ledger keys.
Known events use server-owned point definitions, not stored point amounts. Unknown
penalties, contradictory type/reference fields, future timestamps and invalid or
future daily-practice references cannot affect the score. Skill names are
deduplicated case-insensitively for tier eligibility. Activity and lifetime totals
use the same normalized ledger. Raw records remain intact for investigation.

Lifetime positive base-credit caps: practice 500; skills 1500; completed GIGs 1500;
review quality 500; practice milestones 200. The first 500 eligible base points
count at 100%, the next 500 at 40%, the next 1000 at 20%, and the next 1000 at 10%.
Thus 3000 eligible base points are required for 1000 before evidence gates and penalties.

Evidence ceilings:

- 500 until two skills are actively verified.
- 700 until one active Pro skill, two completed GIGs, and 30 approved practice days.
- 899 until two active Pro skills, five completed GIGs, 90 approved practice days,
  and ten high-quality reviewed assessments.
- 1000 when all gates are met.

Deduct active penalties after applying the ceiling; floor at zero. Dated penalties
affect the score for 90 days. Undated legacy penalties remain counted. Skill expiry
also removes that skill from active evidence eligibility.

## New Workflow Events

- `assessment_quality`: +25 once per assessment approved by an assigned reviewer
  with a complete rubric scoring at least 90%.
- `practice_milestone`: +25 for each 30 distinct approved retention days, through 240 days.
- `assessment_below_standard`: -10 for a rejection by an assigned reviewer with a
  complete rubric below 40%. Deduplicated across skills per original submission day.

These events run inside the existing review transaction. Pending reviews, requested
revisions, peer reports, missed logins and broken streaks do not create penalties.

## Compatibility and Limits

Existing event history is not rewritten. Existing scores may decrease under v2.
Student reads reconcile the stored score; public profiles and company talent
results calculate from the current policy rather than trusting old cached scores.
Company search applies its minimum score after calculation. Network discovery
still selects its candidate pool using stored-score order before public rendering;
historical candidates are reconciled as their account is read.

Historical assessments are not retrospectively awarded quality bonuses without
a new authoritative review event. Company payment records are not bank verification.
There is no misconduct adjudication, appeal, or penalty reversal workflow yet;
therefore fraud allegations and negative peer ratings do not automatically penalize.

Tests cover caps, tier boundaries, active verification expiry, duplicate events,
transactional reviewer credit and penalties, and penalty recovery.

## Deployment and Operations

- Run `npm test` and `npm run check` from `server` before deploying.
- Reviewer approval and payment completion require MongoDB transaction support
  (a replica set or sharded cluster). Do not replace transactions with partial writes.
- Student saves changing reputation or verified skills use optimistic concurrency.
  A stale save returns HTTP 409; refresh and retry the original operation. Do not
  retry by posting a TrustScore event: the public event-write endpoint returns 403.
- Run `npm run trustscore:reconcile` for a read-only audit. After reviewing the
  changes and backing up the database, `npm run trustscore:reconcile -- --apply`
  refreshes cached scores. Add `--student-id <id>` to scope either command.
  Reconciliation loads verified skills as well as the ledger so tier gates remain
  accurate. Schedule reconciliation daily for cached ranking freshness; no scheduler
  is installed automatically by this change.
- New ledger entries record the policy version and require a nonempty evidence
  reference. Retry keys remain stable for the same assessment, day or submission.
- The embedded ledger is not cryptographically tamper-proof and grows with account
  history. Before high-volume deployment, migrate to an indexed event collection
  with a unique student/event/reference constraint and an audited correction flow.
- Legacy undated events remain supported; malformed timestamps are exposed as null.
  Audit these records against original assessments before claiming verified history.
- This policy does not prove payment settlement or detect reviewer/company collusion.
  Payment-provider verification, abuse review and appeals remain launch requirements
  for making stronger financial or fraud-resistance claims.
