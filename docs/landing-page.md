# Landing Page

The homepage tells the PS-05 story: student ability and proof of work connect to opportunities from startups and MSMEs.

## Product Evidence

| Area | Current implementation | Landing-page treatment |
| --- | --- | --- |
| Skill verification | SkillAssessment records, reviewer claims, rubric decisions, revisions, and review history | Human review and evidence, with no AI-proctoring claims |
| Reputation | Student skill state and TrustScore event ledger | Approved outcomes build a visible record; profile claims alone do not award points |
| Discovery | Company talent filters and student GIG matching by skills | Relevant profiles and opportunities, without hiring guarantees |
| Work | TaskSubmission links interview, selection, delivery, and review | One journey from application to completed work |
| Payment | Company-reported external payment records | Earnings history, with no wallet, escrow, or withdrawal claims |
| Collaboration | NetworkConnection and TeamPost records | Peer connections and Team-Up |

The former landing page contained unsupported user totals, match rates, a fictional profile, and obsolete payment descriptions. These have been removed. The current code does not establish AI proctoring, automatic hiring, independently verified payments, or production adoption statistics.

## Components and Assets

- LandingNav: account links, responsive navigation, existing site-view registration.
- Hero and OpportunityGap: product identity, audience, and merit-first positioning.
- HowItWorks: student/organization selector and four interactive stages.
- ProofOfWork: responsive reviewer overview and review explanation.
- Features and Footer: actual capabilities, FAQs, signup links, and contact links.
- LandingPage.css: styles scoped to the homepage, fixed type sizes, reduced-motion handling.

The hero shows Skill Hub with an empty preview account. The proof-of-work section shows the reviewer interface with a clearly labeled illustrative assessment. These JPEGs were captured from the current frontend using intercepted API responses; no real account data, submitted review decisions, or fabricated customer outcomes are shown. Recapture when the corresponding interfaces change.

No runtime dependencies were added. React, React Router, and Lucide supply the interactive components. Motion consists of one short entrance and control-state transitions.

## Verification

- Production build passes.
- Landing component lint passes.
- Browser checks cover widths 320, 375, 390, 414, 480, 768, 1024, 1280, 1440, 1920, and 2560.
- No horizontal overflow, missing image assets, or browser JavaScript errors during the checked flows.
- Student/company CTA destinations, login/reviewer routes, and unauthenticated dashboard redirects checked.
- Journey selection, step selection, FAQ expansion, mobile menu dismissal, in-page anchors, and reduced motion checked.
- Desktop and mobile screenshots inspected.

Authenticated backend journeys and external deployment were not exercised by this landing-page change. Homepage presentation is ready for review; this verification is not a production audit of the entire platform.
