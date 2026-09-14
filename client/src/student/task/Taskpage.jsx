import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CompanyTaskpage from './ComanyTaskpage'
import { getStudentSessionToken, recordStudentSkillHubEvent } from '../studentApi'
import { toast } from '../../ui/toast'

const INTEGRITY_GUIDELINES = [
  'Do not copy-paste answers, code, or project content from external sources.',
  'Do not switch tabs repeatedly or leave the task window during evaluation.',
  'Do not submit suspiciously fast answers after long idle time or no typing activity.',
  'Do not reuse duplicate answers or projects already submitted by others.',
  'AI can flag suspicious behavior and trigger extra viva or manual review.',
  'Cheating or suspicious activity can reduce your TrustScore and affect verification status.',
]

export default function Taskpage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const storedOpportunity = useMemo(() => {
    try {
      const raw = window.sessionStorage.getItem('skillbridge.student.companyTask')
      return raw ? JSON.parse(raw) : null
    } catch (error) {
      return null
    }
  }, [])
  const opportunity = state?.opportunity || storedOpportunity
  const isCompanyInterviewTask = Boolean(opportunity) && (state?.taskType === 'company-interview' || Boolean(storedOpportunity))
  const returnSection = state?.returnSection || (isCompanyInterviewTask ? 'gig' : 'skillhub')
  const returnToDashboard = () => navigate('/student/dashboard', { state: { activeSection: returnSection } })
  const [showIntegrityWarning, setShowIntegrityWarning] = useState(Boolean(state?.showIntegrityWarning))

  const skillName = state?.skillName || 'Skill'
  const category = state?.category || 'General'
  const level = state?.level || 65
  const mode = state?.mode || 'verify'
  const renewalStatus = state?.renewalStatus || 'unverified'
  const trustGain = state?.trustGain || 5
  const trustLoss = state?.trustLoss || 0
  const currentStage = state?.currentStage || 'Verified'
  const targetStage = state?.targetStage || 'Intermediate'
  const criteria = state?.criteria || []
  const taskType = state?.taskType || 'general'
  const challengeTitle = state?.challengeTitle || ''
  const challengeId = state?.challengeId
  const difficulty = state?.difficulty || 'Medium'
  const [isCompleting, setIsCompleting] = useState(false)

  const pageTitle = mode === 'upgrade'
    ? `Upgrade ${skillName} to ${targetStage}`
    : mode === 'reverify'
      ? `Re-Verify ${skillName}`
      : `Verify ${skillName}`
  const introCopy = mode === 'upgrade'
    ? `Complete the upgrade track to move your ${skillName} level from ${currentStage} to ${targetStage}.`
    : mode === 'reverify'
      ? 'Complete this short task to refresh your proof of skill and keep your profile credible.'
      : 'Complete this short task to earn a verified skill badge on your profile.'
  const impactCopy = mode === 'upgrade'
    ? `Finishing this upgrade track can raise your skill level and add +${trustGain} Trust to your profile.`
    : mode === 'reverify'
      ? renewalStatus === 'expired'
        ? `Finishing this task helps recover the ${trustLoss} Trust impact from the expired status.`
        : `Finishing this task can add +${trustGain} Trust to your profile.`
      : `Finishing this task can add +${trustGain} Trust to your profile.`

  const completeSkillTask = async () => {
    const sessionToken = getStudentSessionToken()
    if (!sessionToken) {
      returnToDashboard()
      return
    }

    const eventType = mode === 'challenge'
      ? 'challenge_completed'
      : mode === 'retain'
        ? 'retention_completed'
        : mode === 'reverify'
          ? 'reverify_completed'
          : mode === 'upgrade'
            ? 'upgrade_completed'
            : 'verify_completed'
    const targetStageValue = targetStage === 'Pro Mastery' ? 'Pro' : targetStage

    setIsCompleting(true)
    try {
      await recordStudentSkillHubEvent(sessionToken, {
        eventType,
        skillName,
        challengeId,
        targetStage: targetStageValue,
      })
      toast.success('Your Skill Hub progress has been saved.', { title: 'Task Completed' })
      returnToDashboard()
    } catch (error) {
      toast.error(error.message || 'The task could not be saved.', { title: 'Save Failed' })
    } finally {
      setIsCompleting(false)
    }
  }

  const tasks = mode === 'upgrade'
    ? criteria.map((item, index) => ({
        title: `Upgrade Step ${index + 1}`,
        detail: item,
      }))
    : [
        {
          title: `Build a mini ${skillName} task`,
          detail: mode === 'reverify'
            ? `Show a fresh practical example that proves your ${skillName} skill is still current.`
            : `Create a quick hands-on sample that demonstrates your core ${skillName} fundamentals.`,
        },
        {
          title: 'Upload proof of work',
          detail: 'Share a GitHub link, screenshot, or short note describing how you solved the task.',
        },
        {
          title: 'Submit for AI review',
          detail: 'Your output is checked instantly and your skill status is updated on completion.',
        },
      ]

  const dummyQuestions = mode === 'upgrade'
    ? [
        `Explain what changes you would make to improve your ${skillName} work from ${currentStage} level to ${targetStage} level.`,
        `Build a small ${skillName} solution that demonstrates at least 3 skills expected at ${targetStage} level.`,
        `Write a short note describing one tradeoff, one improvement, and one advanced technique used in your solution.`,
      ]
    : mode === 'reverify'
      ? [
          `Create a fresh mini task in ${skillName} and explain why it proves your skill is still current.`,
          `List the exact steps, tools, or concepts you used while solving this ${skillName} task.`,
          `Mention one mistake you found while working and how you corrected it before submission.`,
        ]
      : mode === 'retain'
        ? [
            taskType === 'mcq'
              ? `Answer 5 quick MCQs based on ${skillName} fundamentals and explain one correct answer in your own words.`
              : taskType === 'puzzle'
                ? `Solve one short ${skillName} puzzle and describe your reasoning step by step.`
                : taskType === 'describe'
                  ? `Read the given ${skillName} code snippet and explain what it does, line by line, in simple language.`
                  : `Write a short ${skillName} solution and explain the logic behind your implementation.`,
            `What is one common beginner mistake in ${skillName}, and how would you avoid it?`,
            `If this task was slightly harder, what would be your next improvement or optimization?`,
          ]
        : mode === 'challenge'
          ? [
              challengeTitle || `Complete this ${skillName} challenge`,
              taskType === 'mcq'
                ? `Pick the best answer for each question and justify your toughest choice in 2-3 lines.`
                : taskType === 'puzzle'
                  ? `Solve the puzzle using a clear step-by-step approach and explain why your answer is correct.`
                  : taskType === 'describe'
                    ? `Describe the code behavior, identify one potential issue, and suggest one improvement.`
                    : `Build or write the requested solution and explain your approach, assumptions, and final outcome.`,
              `Difficulty level: ${difficulty}. Mention how you would improve this submission if given 10 more minutes.`,
            ]
          : [
              `Create a mini ${skillName} task that demonstrates your core understanding of the topic.`,
              `Explain your approach, tools used, and why your solution is valid.`,
              `Add one improvement you would make if this were a real-world production task.`,
            ]

  useEffect(() => {
    setShowIntegrityWarning(Boolean(state?.showIntegrityWarning))
  }, [state?.showIntegrityWarning])

  useEffect(() => {
    if (!state?.opportunity) {
      return
    }

    try {
      window.sessionStorage.setItem('skillbridge.student.companyTask', JSON.stringify(state.opportunity))
    } catch (error) {
      // Ignore storage issues so the task page still works in restricted browsers.
    }
  }, [state?.opportunity])

  const integrityModal = showIntegrityWarning ? (
    <div className="responsive-modal-shell" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      zIndex: 1000,
    }}>
      <div className="responsive-modal-card" style={{
        width: '100%',
        maxWidth: 760,
        maxHeight: 'calc(100vh - 48px)',
        background: 'var(--white)',
        borderRadius: 18,
        border: '2px solid #FCA5A5',
        boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div className="responsive-modal-header" style={{
          background: 'linear-gradient(135deg, #7F1D1D, #B91C1C)',
          color: 'white',
          padding: '24px 28px',
          position: 'relative',
        }}>
          <button
            onClick={returnToDashboard}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.28)',
              background: 'rgba(255,255,255,0.12)',
              color: 'white',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close warning"
          >
            ×
          </button>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>
            Read Before Starting
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            AI Can Detect Cheating
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
            Suspicious activity can be detected during this task and may directly affect your TrustScore, skill verification, or company review outcome.
          </div>
        </div>

        <div className="responsive-modal-body" style={{ padding: '24px 28px 20px', overflowY: 'auto', flex: 1 }}>
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 18,
            color: '#991B1B',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.6,
          }}>
            Warning: AI monitors behavior like copy-paste, repeated tab switching, suspiciously fast submissions, and duplicate or low-authenticity answers.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {INTEGRITY_GUIDELINES.map(item => (
              <div key={item} style={{
                background: '#FFF5F5',
                border: '1px solid #FECACA',
                borderRadius: 10,
                padding: '12px 14px',
                color: '#B91C1C',
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.55,
              }}>
                {item}
              </div>
            ))}
          </div>

        </div>

        <div className="responsive-modal-body" style={{ paddingTop: 0, borderTop: '1px solid var(--border)', background: 'var(--white)' }}>
          <div className="responsive-stack" style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={returnToDashboard}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--white)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              onClick={() => setShowIntegrityWarning(false)}
              className="btn-primary"
              style={{ flex: 1.4, justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
            >
              I Read the Instructions
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  if (isCompanyInterviewTask) {
    return (
      <div className="taskpage-shell" style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
        <div className="taskpage-container" style={{ maxWidth: 980, margin: '0 auto' }}>
          <button
            className="taskpage-back-button"
            onClick={returnToDashboard}
            style={{
              marginBottom: 18,
              background: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Back to Dashboard
          </button>

          <CompanyTaskpage opportunity={opportunity} />
        </div>
        {integrityModal}
      </div>
    )
  }

  return (
    <div className="taskpage-shell" style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div className="taskpage-container" style={{ maxWidth: 980, margin: '0 auto' }}>
        <button
          className="taskpage-back-button"
          onClick={returnToDashboard}
          style={{
            marginBottom: 18,
            background: 'transparent',
            color: 'var(--muted)',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Back to Dashboard
        </button>

        <div className="taskpage-hero" style={{
          background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
          borderRadius: 16,
          padding: '28px 30px',
          color: 'white',
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Skill Task
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>{pageTitle}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', maxWidth: 720, marginBottom: 14 }}>
            {introCopy}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.14)' }}>
              {skillName}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.14)' }}>
              {category}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.14)' }}>
              Current level {level}%
            </span>
            {mode === 'upgrade' && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.14)' }}>
                {currentStage} to {targetStage}
              </span>
            )}
          </div>
        </div>

        <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.9fr', gap: 16 }}>
          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>Task Flow</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tasks.map((task, index) => (
                <div key={task.title} className="taskpage-flow-item" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontWeight: 800,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>{task.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{task.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 22, background: 'var(--bg)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                {mode === 'upgrade' ? 'Upgrade Proof' : 'What to Submit'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.7 }}>
                {mode === 'upgrade'
                  ? 'Submit links, solved challenge screenshots, project uploads, and your quiz or puzzle completion proof.'
                  : 'A GitHub link, a short note about your approach, and one screenshot or preview of the finished work.'}
              </div>
            </div>

            <div style={{ marginTop: 16, background: '#F8FAFF', borderRadius: 10, padding: '16px', border: '1px solid #DBEAFE' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Dummy Questions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dummyQuestions.map((question, index) => (
                  <div key={question} className="taskpage-question-item" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#DBEAFE',
                      color: '#1D4ED8',
                      fontWeight: 800,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.65 }}>{question}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Outcome</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 14 }}>
                {impactCopy}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, padding: '8px 10px', borderRadius: 8, background: '#D1FAE5', color: '#065F46' }}>
                  Estimated time: 20-30 min
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, padding: '8px 10px', borderRadius: 8, background: '#E0E7FF', color: '#3730A3' }}>
                  Review mode: Instant AI feedback
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Ready?</div>
              <button
                onClick={completeSkillTask}
                disabled={isCompleting}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '11px 16px', marginBottom: 10, opacity: isCompleting ? 0.65 : 1 }}
              >
                {isCompleting ? 'Saving...' : `Complete ${mode === 'upgrade' ? 'Upgrade Track' : mode === 'reverify' ? 'Re-Verification' : 'Verification'}`}
              </button>
              <button
                onClick={returnToDashboard}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  color: 'var(--text)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save for Later
              </button>
            </div>
          </div>
        </div>
      </div>
      {integrityModal}
    </div>
  )
}
