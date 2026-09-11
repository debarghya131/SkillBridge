# Task and Assessment Operations

## Company Assignments

- Task Center saves templates and sends immutable assignment snapshots to applicants.
- Live-project/code tasks require a link; written/MCQ tasks require an answer; mixed tasks allow either.
- Written word limits and assignment validation are enforced on the server.
- Company review guides are private snapshots. Legacy combined answer/options fields are never exposed to students.
- Reviews are manual. There is no automatic MCQ grading, code execution, timed exam engine, or AI proctoring.
- Late interview submissions are accepted and flagged using the deadline's end of day in Asia/Kolkata.
- Interview history is separate from project delivery. Selection and kickoff continue in Project Workspace.

## Skill Hub Evidence Reviews

Students submit evidence through Skill Hub's assessment page. The server stores pending submissions, supports requested revisions, and exposes only the signed-in student's history. Pending submissions do not award skills or reputation. Client-reported completion events are rejected, and profile updates cannot set verification fields.

Reviewers use the private web workspace at `/reviewer`. There is no public reviewer registration route. Provision or rotate an account from `server/`, then deliver its credentials through the deployment's normal secret-sharing process:

```bash
npm run reviewers:create -- --name "Reviewer Name" --email reviewer@example.org --password "LONG_UNIQUE_PASSWORD"
```

The reviewer queue is blind: it excludes student name, college, location, photo, and TrustScore. A reviewer claims one pending submission, scores the five-part evidence rubric, and approves, rejects, or requests a revision. Approval requires at least 70/100. Claim ownership prevents a second reviewer from deciding the same pending submission. Review records retain evidence snapshots, rubric, feedback, reviewer identity, and review time. Students can see their score and feedback, but cannot access reviewer endpoints.

Approval and the resulting skill/TrustScore update commit in one MongoDB transaction. A replica set or MongoDB Atlas is required; standalone MongoDB cannot process approvals. Pending claims return to the available queue after `REVIEW_CLAIM_TTL_MINUTES` (240 minutes by default), and the original reviewer loses decision authority if another reviewer reclaims it. Restrict reviewer provisioning and database access and disable departed reviewer accounts. The legacy `assessments:review` command remains available for audited recovery work.

There is no automatic proof of skill, AI review, or instant verification. Previously stored demo verification data is not automatically deleted; audit historical records before deployment. Expired records lose their active badge on read. Legacy records without a review timestamp do not incur a new expiry penalty.

## Skill Hub Policy

| Event | TrustScore | Skill profile |
| --- | --- | --- |
| Add skill | 0 | Unverified, no assessed level percentage |
| Initial verification approved | +60 once per normalized skill name | Verified for 365 days |
| Next-level upgrade approved | +100 once per skill and target level | Beginner -> Intermediate -> Pro |
| Renewal approved | +50 once per previous expiry cycle | New 365-day validity starting on review day |
| Verified skill expires | -80 once per expiry cycle | Expired, no active verified badge |
| Challenge approved | Up to +80 per submission day across all challenges | Evidence and activity recorded |
| Practice approved | Up to +20 per submission day across all skills | Consecutive approved practice days recorded |
| Pending, rejected, revision requested | 0 | No new verification or level |

Dates and daily reward periods use Asia/Kolkata. The expiry day is inclusive; renewal opens 30 days before expiry. Daily rewards use the server-assigned original submission day, even when review happens later. Revisions retain that day and the assigned brief. Approval revalidates current eligibility. Streaks are derived from approved practice days, including reviews arriving out of order. Missing practice does not automatically deduct points or downgrade a skill.

The existing TrustScore is clamped to 0..1000. New accounts start at 0, with no seeded skills or projects. Existing scores are not reset: audit and reconcile historical demo scores separately with a backup and explicit approval. Account activity retains nominal event points even if the score hits its floor or ceiling.

Both browser-accessible event endpoints reject self-awarded points. Profile saves cannot overwrite Skill Hub records; adding skills uses an explicit Skill Hub save. Student profile and company talent badges use active verification, not a hard-coded skill-name list. A profile skill name alone is not verified proficiency. The gap report counts saved, browsable GIG skill requirements; it is not an external market-demand estimate or a hiring guarantee.

### Expiry Maintenance

Run from `server/` at least daily, ideally shortly after midnight Asia/Kolkata:

```bash
npm run skills:reconcile
```

This command updates expired verification and records each eligible penalty once. It reports write conflicts and exits nonzero so the scheduler can retry. Student profile, Skill Hub and TrustScore reads also reconcile expiry. Company badge rendering checks the current date even before the maintenance job runs; company ranking scores rely on the job for inactive students.

Do not truncate the stored TrustScore event list: those keys prevent replayed credit. Earlier releases retained only 250 entries; events already discarded by those releases cannot be reconstructed automatically. Before operating at a scale approaching MongoDB's document-size limit, migrate events into a uniquely indexed ledger collection in a transaction, retaining all deduplication keys. Back up both assessment and student records together.

## Release Checks

Run the isolated database integration test against a replica-set test server:

```bash
SKILLHUB_TEST_MONGO_URL='mongodb://your-test-replica-set' npm run test:skillhub:integration
```

Alternatively, `npm run test:skillhub:integration -- --use-configured-server` explicitly uses the configured server. Both options override the database name with a random `sbsh_` namespace, create only test data and drop that namespace afterward. The application's database is never selected. This tests real persistence, reviewer authentication, blind queue output, exclusive claims, rubric thresholds, revisions, profile synchronization, duplicate approval rejection and rollback after an injected persistence failure.

Assessment history includes open reviews and the most recent 100 finalized assessments. Each review retains its original evidence snapshot, feedback, reviewer and timestamp; revisions do not erase earlier review history.

- Provision the SkillAssessment model's indexes (including its partial unique pending-assessment index) through the deployment's normal index migration procedure. Do not drop existing indexes or real data.
- Exercise company creation/send/accept/submit/revision/review and Skill Hub submit/revise/approve against an isolated replica-set staging database with two student accounts.
- Confirm a student cannot view another student's evidence or company-private answer keys.
- Test approval rollback and retry with the actual deployment database. Unit tests use mocked persistence and do not prove transaction behavior on the target server.
- Drafts are scoped to a session and assignment in browser-tab storage, expire after seven days, and are not server backups.
- Assign review ownership, turnaround expectations, account deactivation, and abandoned-claim recovery to named operators.
