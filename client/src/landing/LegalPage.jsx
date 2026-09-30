import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import './LegalPage.css'

const CONTACT = 'debarghyabandyopadhyay191@gmail.com'

function ContactLink() {
  return <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
}

function PrivacyContent() {
  return (
    <>
      <p className="sb-legal-lead">
        This policy explains the personal information SkillBridge uses to run its student,
        organization, reviewer, and administrator workspaces. Demo examples are read-only
        previews; they are not your account records.
      </p>
      <section>
        <h2>Information we collect</h2>
        <p>When you register or use SkillBridge, we may store:</p>
        <ul>
          <li>Account and contact details, such as your name, email address or phone number, and a protected password hash.</li>
          <li>Student profile details, skills, projects, links, uploaded media, location, and activity you choose to provide.</li>
          <li>Organization details, business verification information, opportunities, applications, tasks, and payment records entered by users.</li>
          <li>Assessment submissions, reviewer decisions, TrustScore history, network connections, and related workspace activity.</li>
          <li>Technical information needed to operate and protect the service, such as session tokens, request logs, and an aggregate landing-page view count.</li>
        </ul>
        <p>New identity and business-verification references are stored as keyed fingerprints where supported. Older records may contain information collected under earlier versions of the service.</p>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>We use this information to create and secure accounts, display profiles and opportunities, support applications and project work, review evidence, calculate TrustScore, maintain payment histories, respond to requests, and diagnose or prevent misuse.</p>
      </section>
      <section>
        <h2>Who can see it</h2>
        <p>Profile, portfolio, opportunity, and work information can be visible to other SkillBridge users as part of the features you use. Reviewers and administrators can access information needed for assessments and platform operations. Do not put information in a public-facing profile that you do not want others to see.</p>
        <p>We use hosting and database providers to operate SkillBridge. Information may be processed by those providers as needed to deliver the service. SkillBridge does not process payments: organizations record payments made outside the platform.</p>
      </section>
      <section>
        <h2>Storage, security, and deletion</h2>
        <p>We keep account and activity records while needed to operate the service and its review history. Passwords are stored as hashes, and sessions use authentication tokens. No online system can guarantee absolute security.</p>
        <p>Account-deletion features remove the account and related records covered by that workflow. Other users' independent records, operational logs, or backups may take longer to clear or may need to be kept where required. To ask about access, correction, or deletion, contact us using the address below.</p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>We may update this policy as the service changes. The date at the top shows the current version. For privacy questions or requests, email <ContactLink />.</p>
      </section>
    </>
  )
}

function TermsContent() {
  return (
    <>
      <p className="sb-legal-lead">
        These terms apply when you create an account or use the SkillBridge workspaces.
        SkillBridge connects students and organizations through profiles, reviewed evidence,
        opportunities, and project workflows.
      </p>
      <section>
        <h2>Accounts and accurate information</h2>
        <p>Provide information you are authorized to share, keep it reasonably accurate, and protect your sign-in credentials. You are responsible for activity through your account. If you cannot legally agree to these terms yourself, do not create an account without the authorization you need.</p>
      </section>
      <section>
        <h2>Profiles, evidence, and reviews</h2>
        <p>Only submit work, identity details, and business information that you have the right to use. Do not impersonate another person or organization, fabricate evidence, or manipulate reviews. A self-declared skill is not verified by itself: verification depends on a published skill standard and reviewer-approved assessment. TrustScore reflects the platform's scoring rules and does not guarantee skill, hiring, or project outcomes.</p>
      </section>
      <section>
        <h2>Demo examples</h2>
        <p>Clearly marked demo profiles and GIGs are read-only illustrations. They are separate from real accounts and do not change your TrustScore, applications, or payment totals. You cannot apply to a demo GIG or use a demo profile as a real hiring record.</p>
      </section>
      <section>
        <h2>Opportunities and payments</h2>
        <p>Organizations and students are responsible for their own hiring decisions, project terms, delivery, and communications. SkillBridge does not guarantee an opportunity, a selection, or a successful project. Payments happen outside SkillBridge; the platform records payment information reported by users and does not hold funds or process withdrawals. Verify payment arrangements directly with the other party.</p>
      </section>
      <section>
        <h2>Acceptable use and availability</h2>
        <p>Do not use the service to harass others, post unlawful or misleading content, access another account without permission, or disrupt the platform. We may restrict accounts or remove content when needed to protect users or the service. Features may change or be unavailable during maintenance or outages.</p>
      </section>
      <section>
        <h2>Privacy, changes, and contact</h2>
        <p>Read our <Link to="/privacy">Privacy Policy</Link> for information about data handling. We may update these terms as SkillBridge changes and will show the current version on this page. Questions can be sent to <ContactLink />.</p>
      </section>
    </>
  )
}

export default function LegalPage({ kind }) {
  const isPrivacy = kind === 'privacy'
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service'

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} | SkillBridge`
    return () => { document.title = previousTitle }
  }, [title])

  return (
    <div className="sb-legal-page">
      <a className="sb-legal-skip" href="#legal-content">Skip to content</a>
      <header className="sb-legal-header">
        <div className="sb-legal-wrap">
          <SkillBridgeBrand linkTo="/" className="sb-legal-brand" />
          <Link to="/">Back to home</Link>
        </div>
      </header>
      <main id="legal-content" className="sb-legal-wrap sb-legal-main" tabIndex={-1}>
        <p className="sb-legal-eyebrow">SKILLBRIDGE / LEGAL</p>
        <h1>{title}</h1>
        <p className="sb-legal-updated">Last updated: 30 September 2026</p>
        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      </main>
      <footer className="sb-legal-footer">
        <div className="sb-legal-wrap">
          <span>© SkillBridge</span>
          <nav aria-label="Legal pages">
            <Link to="/privacy" aria-current={isPrivacy ? 'page' : undefined}>Privacy Policy</Link>
            <Link to="/terms" aria-current={!isPrivacy ? 'page' : undefined}>Terms of Service</Link>
            <Link to="/">Home</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
