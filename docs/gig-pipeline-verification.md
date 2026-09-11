# GIG Pipeline Verification

## Supported lifecycle

1. A company posts a GIG and sends an interview assignment to an applicant.
2. The student accepts the invitation and submits the assigned assessment.
3. The company reviews the assessment, then selects or rejects the student (or requests revision).
4. GIG work starts. Interview evidence and its review are archived separately from the live deliverable.
5. The student delivers the work. Delivery revisions return to delivery review, not interview review.
6. Company approval creates an entry awaiting external payment.
7. The company records an already-made external transfer, including amount, method, reference and date.
8. The submission becomes completed. Both company Payment and student Earning read that same payment record.

The platform does not hold money, release funds, or execute UPI withdrawals. Records are company-reported, not independently verified bank settlements. Legacy wallet balances are ignored, not converted into money or deleted. Old earning-write and withdrawal endpoints authenticate then return HTTP 410.

## Verification performed

- Server test suite, including controller-level lifecycle tests with mocked persistence and Mongoose documents.
- Interview review preservation at selection and work start.
- Delivery revision visibility in Active GIGs.
- Closed public listings retain invitations and completed history.
- Shared student/company payment records, ownership checks, approval prerequisite, identical-payment retries and duplicate references.
- Optimistic submission concurrency conflicts return HTTP 409.
- CSV row delimiters, quoted values and formula escaping.
- Client/server payment-date consistency at India/UTC day boundaries.
- Client lint and production build; backend syntax checks.
- Existing local backend readiness endpoint reported database connected.

## Before release

- Run the lifecycle against an isolated staging MongoDB database and real HTTP requests. The controller tests mock persistence and do not prove database index installation, write concurrency, or rollback behavior.
- Verify the unique TaskSubmission indexes on staging and production. Resolve historical duplicate assignments/references through an audited migration before building indexes; do not discard records automatically.
- Exercise two simultaneous reviews/submissions/payment requests in staging. Optimistic version checks protect individual submissions, but company activity updates and student-related side effects are separate writes, not a database transaction.
- Perform authenticated browser checks on desktop and mobile. Browser verification was attempted but the downloaded headless browser was incomplete and could not launch.
- Verify task-specific authoring and submission expectations with representative code, MCQ, written, mixed and live-project assignments. Final GIG delivery accepts a link or response independently of the interview question format; it is not an automated assessment/grading engine.
- Verify TrustScore completion awards separately. The old review-controller completion hook does not run when payment records complete a submission; do not advertise payment-triggered TrustScore awards until this is reconciled.
- Audit production dependencies and configure HTTPS, allowed origins, secrets, backups, monitoring and database access before deployment. A successful build and readiness response are not a security/deployment certification.

## Manual acceptance checklist

- Send a saved task without navigating away from GIG Management.
- Accept it as the intended student; refresh and reopen the task using its opportunity identity.
- Submit, review, select, start work, deliver, request a delivery revision, resubmit and approve.
- Check that Earning shows payment pending without a wallet or withdrawal button.
- Record an external payment once; retry the identical request and verify no duplicate.
- Check both ledgers and Completed GIGs; reopen the work to inspect feedback/payment reference.
- Close the public GIG and verify completed work is still accessible.
- Simulate a temporary API failure: the student should see Retry rather than losing their session.
