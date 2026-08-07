import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import GigCenter from './gig/gig'
import Network from './network/network'
import SkillHub from './skillhub/skillhub'
import Earning from './earning/earning'
import StudentNav from './studentNav'
import StudentSidebar from './studentSidebar'
import { clearStudentSessionToken, fetchCurrentStudent, fetchStudentTrustScore, getStudentSessionToken, logoutStudent, saveStudentProfile } from './studentApi'
import { isBundledStudentIntroVideoUrl, mergeStudentProfile } from './studentProfileDefaults'
import { toast } from '../ui/toast'

const NAV_ITEMS = [
  { key: 'gig',        icon: '💼', label: 'GIG Center' },
  { key: 'trustscore', icon: '⭐', label: 'TrustScore' },
  { key: 'skillhub',  icon: '🎯', label: 'Skill Hub' },
  { key: 'network',   icon: '🌐', label: 'Network' },
  { key: 'earning',   icon: '💰', label: 'Earning' },
  { key: 'profile',   icon: '👤', label: 'My Profile' },
]

const VERIFIED_SKILL_SET = new Set(['React', 'Node.js', 'UI/UX Design'])
const DEMO_PROJECT_LINKS = [
  'https://github.com/topics/react-dashboard',
  'https://github.com/topics/flutter-app',
  'https://github.com/topics/inventory-management-system',
]

const getProjectLink = (project, index) => project.link?.trim() || DEMO_PROJECT_LINKS[index % DEMO_PROJECT_LINKS.length]
const getProjectDemoLink = (project, index) => project.demoLink?.trim() || DEMO_PROJECT_LINKS[index % DEMO_PROJECT_LINKS.length]

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

function VerifiedBadge({ method }) {
  const [show, setShow] = useState(false)
  const labels = {
    email: 'Verified via College Email',
    aadhaar: 'Verified via Aadhaar Card',
    digilocker: 'Verified via DigiLocker',
  }
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: 'white', fontSize: 11, fontWeight: 800, cursor: 'default', flexShrink: 0,
      }}>✓</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--dark)', color: 'white', fontSize: 11, fontWeight: 500,
          padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow)', zIndex: 10, pointerEvents: 'none',
        }}>
          {labels[method] || 'Identity Verified'}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 4, borderStyle: 'solid', borderColor: 'var(--dark) transparent transparent transparent' }} />
        </span>
      )}
    </span>
  )
}

function ModalVerifiedBadge() {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ background: '#10B981', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 100, cursor: 'default' }}>
        ✓ Verified
      </span>
      {show && (
        <span style={{
          position: 'absolute', top: '130%', left: '50%', transform: 'translateX(-50%)',
          background: 'white', color: 'var(--dark)', fontSize: 12, fontWeight: 500,
          padding: '8px 12px', borderRadius: 8, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 20, pointerEvents: 'none',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 700, color: '#10B981', marginBottom: 4 }}>Identity Verified via</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span>📧 College Email</span>
            <span>🪪 Aadhaar Card</span>
            <span>🔐 DigiLocker</span>
          </div>
          <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: 'transparent transparent white transparent' }} />
        </span>
      )}
    </span>
  )
}

function ProfileViewModal({ onClose, name, trustScore, avatar, skills, githubLink, projects, videoUrl, contactInfo }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const verifiedSkills = skills.filter(s => VERIFIED_SKILL_SET.has(s))

  const toggle = async () => {
    if (!videoRef.current) return
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false) }
    else {
      try {
        await videoRef.current.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }
  }

  const savedProjects = projects.filter(p => p.saved)

  return (
    <div className="responsive-modal-shell" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="responsive-modal-card" style={{
        background: 'var(--white)', borderRadius: 20, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div className="responsive-modal-header" style={{
          background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)',
          borderRadius: '20px 20px 0 0', padding: '24px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 22,
              border: '3px solid rgba(255,255,255,0.2)',
            }}>
              {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>{name}</span>
                <ModalVerifiedBadge />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                  color: 'white', fontSize: 13, fontWeight: 800,
                  padding: '4px 12px', borderRadius: 100,
                  boxShadow: '0 0 12px rgba(99,102,241,0.6)',
                  letterSpacing: '0.01em',
                }}>
                  ⭐ {trustScore} <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>/ 1000</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>TrustScore™</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div className="responsive-modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Skills */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Skills</div>
            {verifiedSkills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {verifiedSkills.map(s => (
                  <span key={s} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                  }}>
                    {s} <span style={{ background: '#10B981', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 100 }}>✓</span>
                  </span>
                ))}
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>No skills added yet</span>}
          </div>

          {/* Intro Video */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, overflow: 'hidden', position: 'relative', aspectRatio: '16/7', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {videoUrl ? (
                <video ref={videoRef} src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>No video uploaded</span>
              )}
            </div>
            {videoUrl && (
              <button onClick={toggle} style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 7,
                border: isPlaying ? '1.5px solid #FCA5A5' : '1.5px solid #DC2626',
                background: isPlaying ? '#FEF2F2' : '#EF4444',
                color: isPlaying ? '#EF4444' : 'white',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
                {isPlaying ? '⏹ Stop' : '▶ Play'}
              </button>
            )}
          </div>

          {/* GitHub */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>GitHub</div>
            {githubLink.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {githubLink.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--dark)', color: 'white',
                    padding: '7px 16px', borderRadius: 7,
                    fontSize: 13, fontWeight: 700, textDecoration: 'none', width: 'fit-content',
                  }}>{l.icon} View Profile ↗</a>
                ))}
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>No links added</span>
            }
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Contact</div>
            {contactInfo.filter(item => item.saved).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contactInfo.filter(item => item.saved).map((item, index) => (
                  <div key={`${item.value}-${index}`} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>No contact details added</span>}
          </div>

          {/* Projects */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Projects</div>
            {savedProjects.length > 0 ? (
              <div className="responsive-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {savedProjects.map((p, i) => (
                  <div key={i} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', marginBottom: 6 }}>{p.name || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{p.desc}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <a href={getProjectLink(p, i)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>🔗 View</a>
                      <a href={getProjectDemoLink(p, i)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>🧪 Demo Link</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>No projects saved yet</span>}
          </div>

        </div>
      </div>
    </div>
  )
}

function ProfileSection({ name, trustScore, avatar, setAvatar, skills, githubLink, setGithubLink, contactInfo, setContactInfo, projects, setProjects, videoUrl, setVideoUrl, onViewProfile }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [githubInput, setGithubInput] = useState({})
  const [contactInput, setContactInput] = useState({ label: 'Phone', value: '' })
  const videoRef = useRef(null)
  const verifiedSkills = skills.filter(s => VERIFIED_SKILL_SET.has(s))

  const togglePlay = async () => {
    if (!videoRef.current) return
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false) }
    else {
      try {
        await videoRef.current.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }
  }

  const updateProject = (i, field, val) =>
    setProjects(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))

  const saveProject = (i) =>
    setProjects(prev => prev.map((p, idx) => idx === i ? { ...p, saved: true } : p))

  const editProject = (i) =>
    setProjects(prev => prev.map((p, idx) => idx === i ? { ...p, saved: false } : p))

  const card = { background: 'var(--white)', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--border)', marginBottom: 16 }
  const sectionTitle = { fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 14 }

  return (
    <div>
      {/* 1. Profile Header */}
      <div className="responsive-hero" style={{ ...card, background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
            title="Change profile picture">
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: avatar ? 'transparent' : 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 24,
              overflow: 'hidden', border: '3px solid rgba(255,255,255,0.25)',
            }}>
              {avatar
                ? <img src={avatar} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : name[0].toUpperCase()
              }
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--primary)', border: '2px solid #1E1B4B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11,
            }}>📷</div>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files[0]
                if (!file) return

                const imageUrl = await readFileAsDataUrl(file)
                setAvatar(imageUrl)
              }} />
          </label>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>{name}</span>
              <VerifiedBadge method="email" />
              <button
                onClick={onViewProfile}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 100,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                View Profile
              </button>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Student · Profile Active</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>TrustScore™</div>
          <div style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, #A5B4FC, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{trustScore}</div>
        </div>
      </div>

      {/* 2. Skills */}
      <div style={card}>
        <div style={sectionTitle}>Skills</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {verifiedSkills.map(s => (
            <span key={s} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--primary-light)', color: 'var(--primary)',
              padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600,
            }}>
              {s}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 16, height: 16, borderRadius: '50%',
                background: '#10B981', color: 'white', fontSize: 10, fontWeight: 800,
              }}>✓</span>
            </span>
          ))}
        </div>
      </div>

      {/* 3. Intro Video */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={sectionTitle}>Intro Video</div>
          <label style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Replace
            <input
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files[0]
                if (!file) return

                const videoDataUrl = await readFileAsDataUrl(file)
                setVideoUrl(videoDataUrl)
              }}
            />
          </label>
        </div>
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/7', maxWidth: 460 }}>
          <video ref={videoRef} src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onEnded={() => setIsPlaying(false)} />
        </div>
        <div className="responsive-stack" style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={togglePlay} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 20px', borderRadius: 8,
            border: isPlaying ? '1.5px solid #FCA5A5' : '1.5px solid #DC2626',
            background: isPlaying ? '#FEF2F2' : '#EF4444',
            color: isPlaying ? '#EF4444' : 'white',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {isPlaying ? '⏹ Stop' : '▶ Play'}
          </button>
        </div>
      </div>

      {/* 4. Profile Links */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={sectionTitle}>Profile Links</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {githubLink.filter(l => l.saved).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 16 }}>{l.icon}</span>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</a>
              <button onClick={() => setGithubLink(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
          <div className="responsive-stack" style={{ display: 'flex', gap: 8 }}>
            <select value={githubInput.icon || '🐙'} onChange={e => setGithubInput(p => ({ ...p, icon: e.target.value }))}
              style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--white)', cursor: 'pointer' }}>
              {[['🐙','GitHub'],['💼','LinkedIn'],['🌐','Portfolio'],['🐦','Twitter/X'],['📺','YouTube'],['🎨','Dribbble']].map(([ic, lb]) => (
                <option key={ic} value={ic}>{ic} {lb}</option>
              ))}
            </select>
            <input placeholder="Paste your profile URL"
              value={githubInput.url || ''}
              onChange={e => setGithubInput(p => ({ ...p, url: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && githubInput.url?.trim()) { setGithubLink(p => [...p, { icon: githubInput.icon || '🐙', url: githubInput.url.trim(), saved: true }]); setGithubInput({}) } }}
              style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <button onClick={() => { if (githubInput.url?.trim()) { setGithubLink(p => [...p, { icon: githubInput.icon || '🐙', url: githubInput.url.trim(), saved: true }]); setGithubInput({}) } }}
              className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Add</button>
          </div>
        </div>
      </div>

      {/* 5. Contact */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={sectionTitle}>Contact</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contactInfo.filter(item => item.saved).map((item, i) => (
            <div key={`${item.value}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', minWidth: 72 }}>{item.label}</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--dark)', fontWeight: 600 }}>{item.value}</span>
              <button
                onClick={() => setContactInfo(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))}
          <div className="responsive-stack" style={{ display: 'flex', gap: 8 }}>
            <select
              value={contactInput.label}
              onChange={e => setContactInput(prev => ({ ...prev, label: e.target.value }))}
              style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--white)', cursor: 'pointer' }}
            >
              {['Phone', 'Email', 'WhatsApp', 'LinkedIn'].map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              placeholder="Add contact detail"
              value={contactInput.value}
              onChange={e => setContactInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter' && contactInput.value.trim()) {
                  setContactInfo(prev => [...prev, { label: contactInput.label, value: contactInput.value.trim(), saved: true }])
                  setContactInput({ label: 'Phone', value: '' })
                }
              }}
              style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => {
                if (contactInput.value.trim()) {
                  setContactInfo(prev => [...prev, { label: contactInput.label, value: contactInput.value.trim(), saved: true }])
                  setContactInput({ label: 'Phone', value: '' })
                }
              }}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* 6. Projects */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>Projects</div>
        <button onClick={() => setProjects(p => [...p, { name: '', desc: '', link: '', demoLink: '', saved: false }])}
          className="btn-primary" style={{ padding: '6px 16px', fontSize: 13 }}>+ Add Project</button>
      </div>
      <div className="responsive-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {projects.map((proj, i) => (
          <div key={i} style={{ background: 'var(--white)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
            {proj.saved ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{proj.name || 'Untitled'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{proj.desc || 'No description'}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a href={getProjectLink(proj, i)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>🔗 View Project</a>
                  <a href={getProjectDemoLink(proj, i)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>🧪 Demo Link</a>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => editProject(i)} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                  <button onClick={() => setProjects(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>×</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Project {i + 1}</div>
                <input placeholder="Project name" value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)}
                  style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <textarea placeholder="Short description..." value={proj.desc} onChange={e => updateProject(i, 'desc', e.target.value)}
                  rows={3} style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <input placeholder="Project link (optional)" value={proj.link} onChange={e => updateProject(i, 'link', e.target.value)}
                  style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <input placeholder="Demo link (optional)" value={proj.demoLink || ''} onChange={e => updateProject(i, 'demoLink', e.target.value)}
                  style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => saveProject(i)} className="btn-primary" style={{ flex: 1, padding: '7px', fontSize: 13, justifyContent: 'center' }}>Save</button>
                  <button onClick={() => setProjects(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: 7, padding: '7px 10px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>×</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TrustScoreSection({ trustScore, skills, projects, githubLink }) {
  const savedProjects = projects.filter(p => p.saved)
  const verifiedSkills = skills.filter(skill => VERIFIED_SKILL_SET.has(skill)).length
  const profileLinks = githubLink.length

  const fallbackFactors = useMemo(() => [
    { label: 'Daily Challenge Solved', icon: '⚡', desc: 'Solved today\'s daily challenge', points: 80, earned: true, category: 'Daily' },
    { label: 'Retention Task Completed', icon: '🔒', desc: `Completed daily retention tasks · 5 day streak`, points: 20, earned: true, category: 'Daily' },
    { label: 'Skill Verified', icon: '✅', desc: `${verifiedSkills} verified skill${verifiedSkills !== 1 ? 's' : ''} on profile`, points: 60, earned: verifiedSkills > 0, category: 'Skills' },
    { label: 'New Skill Added', icon: '➕', desc: 'Added a new skill to your profile', points: 20, earned: true, category: 'Skills' },
    { label: 'Skill Level Upgraded', icon: '📈', desc: 'Upgraded a skill from Beginner to Intermediate', points: 100, earned: false, category: 'Skills' },
    { label: 'Project Uploaded', icon: '🚀', desc: `${savedProjects.length} project${savedProjects.length !== 1 ? 's' : ''} with GitHub / live link`, points: 80, earned: savedProjects.length > 0, category: 'Projects' },
    { label: 'GIG Completed', icon: '💼', desc: 'Delivered a GIG with a company rating', points: 150, earned: false, category: 'GIGs' },
    { label: 'Skill Re-Verified', icon: '🔄', desc: 'Re-verified a skill before expiry', points: 50, earned: true, category: 'Skills' },
    { label: 'Profile Links Added', icon: '🔗', desc: profileLinks > 0 ? `${profileLinks} link${profileLinks !== 1 ? 's' : ''} added` : 'No GitHub / LinkedIn links yet', points: 50, earned: profileLinks > 0, category: 'Profile' },
    { label: 'Intro Video Uploaded', icon: '🎥', desc: 'Short intro video uploaded to profile', points: 50, earned: true, category: 'Profile' },
    { label: 'Skill Expired (Penalty)', icon: '⚠️', desc: 'UI/UX Design verification expired', points: -80, earned: false, category: 'Penalty' },
    { label: 'Retention Task Missed (Penalty)', icon: '❌', desc: 'Missed 2 days of retention tasks', points: -30, earned: false, category: 'Penalty' },
  ], [profileLinks, savedProjects.length, verifiedSkills])
  const [trustScoreData, setTrustScoreData] = useState(null)

  useEffect(() => {
    let cancelled = false
    const sessionToken = getStudentSessionToken()

    setTrustScoreData({
      trustScore,
      factors: fallbackFactors,
      summary: {
        earnedPoints: fallbackFactors.filter(item => item.earned && item.points > 0).reduce((sum, item) => sum + item.points, 0),
        penalties: fallbackFactors.filter(item => !item.earned && item.points < 0).reduce((sum, item) => sum + item.points, 0),
        maxPoints: fallbackFactors.filter(item => item.points > 0).reduce((sum, item) => sum + item.points, 0),
      },
    })

    async function loadTrustScore() {
      if (!sessionToken) {
        return
      }

      try {
        const result = await fetchStudentTrustScore(sessionToken)

        if (!cancelled) {
          setTrustScoreData(result.trustScore)
        }
      } catch (error) {
        // Keep the local fallback data if the backend read fails.
      }
    }

    loadTrustScore()

    return () => {
      cancelled = true
    }
  }, [fallbackFactors, trustScore])

  const factors = trustScoreData?.factors || fallbackFactors
  const earnedPoints = trustScoreData?.summary?.earnedPoints ?? factors.filter(f => f.earned && f.points > 0).reduce((a, f) => a + f.points, 0)
  const penalties = trustScoreData?.summary?.penalties ?? factors.filter(f => !f.earned && f.points < 0).reduce((a, f) => a + f.points, 0)
  const maxPoints = trustScoreData?.summary?.maxPoints ?? factors.filter(f => f.points > 0).reduce((a, f) => a + f.points, 0)

  const displayedTrustScore = trustScoreData?.trustScore ?? trustScore
  const scoreColor = displayedTrustScore >= 850 ? '#10B981' : displayedTrustScore >= 700 ? '#3B82F6' : '#F59E0B'
  const grade = displayedTrustScore >= 850 ? 'Excellent' : displayedTrustScore >= 700 ? 'Good' : 'Fair'
  const openCriteriaWindow = () => {
    window.open('/student/trustscore-criteria', '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      {/* Hero card */}
      <div className="responsive-hero" style={{
        background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Your TrustScore™</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 64, fontWeight: 900, background: `linear-gradient(135deg, #A5B4FC, #60A5FA)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{displayedTrustScore}</span>
            <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', fontWeight: 700, paddingBottom: 8 }}>/1000</span>
          </div>
          <span style={{ background: scoreColor, color: 'white', fontSize: 13, fontWeight: 700, padding: '4px 14px', borderRadius: 100 }}>{grade}</span>
        </div>
        <button
          onClick={openCriteriaWindow}
          style={{
            textAlign: 'right',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10,
            padding: '14px 16px',
            minWidth: 220,
            cursor: 'pointer',
            color: 'white',
          }}
        >
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>TrustScore Criteria</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>View Details ↗</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            See what adds Trust, what can reduce it, and how your score changes over time.
          </div>
        </button>
      </div>

      {/* Summary stat row */}
      <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Points Earned', value: `+${earnedPoints}`, color: '#065F46', bg: '#D1FAE5' },
          { label: 'Penalties', value: `${penalties}`, color: '#991B1B', bg: '#FEE2E2' },
          { label: 'Max Possible', value: `+${maxPoints}`, color: '#1D4ED8', bg: '#DBEAFE' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* What affects your score — scrollable */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 14 }}>What affects your TrustScore™</div>
      <div className="responsive-scroll-panel" style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        maxHeight: 'calc(100vh - 420px)', overflowY: 'auto', scrollbarWidth: 'thin',
        paddingRight: 4,
      }}>
        {factors.map(f => {
          const isPenalty = f.category === 'Penalty'
          const isEarned = f.earned && !isPenalty
          const isMissed = !f.earned && !isPenalty
          const catColors = {
            Daily: ['#E0E7FF', '#3730A3'],
            Skills: ['#D1FAE5', '#065F46'],
            Projects: ['#DBEAFE', '#1D4ED8'],
            GIGs: ['#F3E8FF', '#7C3AED'],
            Profile: ['#FEF3C7', '#92400E'],
            Penalty: ['#FEE2E2', '#991B1B'],
          }
          const [catBg, catColor] = catColors[f.category] || ['var(--bg)', 'var(--muted)']
          return (
            <div key={f.label} style={{
              background: 'var(--white)', borderRadius: 12, padding: '14px 18px',
              border: `1px solid ${isPenalty ? '#FECACA' : isMissed ? '#FED7AA' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: isPenalty ? '#FEE2E2' : isEarned ? '#D1FAE5' : '#FEF3C7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{f.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>{f.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: catBg, color: catColor, padding: '1px 7px', borderRadius: 100 }}>{f.category}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.desc}</div>
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: isPenalty ? '#EF4444' : isEarned ? '#10B981' : '#F59E0B' }}>
                  {f.points > 0 ? `+${f.points}` : f.points}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: isPenalty ? '#EF4444' : isEarned ? '#10B981' : '#F59E0B' }}>
                  {isPenalty ? 'Penalty' : isEarned ? 'Earned' : 'Pending'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComingSoon({ icon, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ fontSize: 52 }}>{icon}</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>{label}</h2>
      <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>Coming Soon</span>
    </div>
  )
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const initialStudent = mergeStudentProfile(state?.student || state || {})
  const sessionTokenRef = useRef(getStudentSessionToken())
  const didHydrateRef = useRef(false)

  const [active, setActive] = useState('gig')
  const [name, setName] = useState(initialStudent.name)
  const [trustScore, setTrustScore] = useState(initialStudent.trustScore)
  const [avatar, setAvatar] = useState(initialStudent.avatar)
  const [skills, setSkills] = useState(initialStudent.skills)
  const [githubLink, setGithubLink] = useState(initialStudent.githubLink)
  const [contactInfo, setContactInfo] = useState(initialStudent.contactInfo)
  const [projects, setProjects] = useState(initialStudent.projects)
  const [videoUrl, setVideoUrl] = useState(initialStudent.videoUrl)
  const [showProfile, setShowProfile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadStudent() {
      if (!sessionTokenRef.current) {
        didHydrateRef.current = true
        return
      }

      try {
        const result = await fetchCurrentStudent(sessionTokenRef.current)

        if (cancelled) return

        const student = mergeStudentProfile(result.student)
        setName(student.name)
        setTrustScore(student.trustScore)
        setAvatar(student.avatar)
        setSkills(student.skills)
        setGithubLink(student.githubLink)
        setContactInfo(student.contactInfo)
        setProjects(student.projects)
        setVideoUrl(student.videoUrl)
      } catch (error) {
        if (!cancelled) {
          clearStudentSessionToken()
          sessionTokenRef.current = ''
          toast.warning('Your student session expired. Please sign in again.', { title: 'Authentication Required' })
          navigate('/student', { replace: true })
        }
      } finally {
        if (!cancelled) {
          didHydrateRef.current = true
        }
      }
    }

    loadStudent()

    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveStudentProfile(sessionTokenRef.current, {
        name,
        trustScore,
        avatar,
        skills,
        githubLink,
        contactInfo,
        projects,
        videoUrl: isBundledStudentIntroVideoUrl(videoUrl) ? null : videoUrl,
      }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [avatar, contactInfo, githubLink, name, projects, skills, trustScore, videoUrl])

  const handleLogout = async () => {
    const token = sessionTokenRef.current

    clearStudentSessionToken()
    sessionTokenRef.current = ''

    if (token) {
      try {
        await logoutStudent(token)
      } catch (error) {
        // Ignore logout failures so the user can still exit cleanly.
      }
    }

    toast.info('You have been signed out.', { title: 'Student Session Closed' })
    navigate('/')
  }

  return (
    <div className="dashboard-shell student-dashboard" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

      {showProfile && (
        <ProfileViewModal
          onClose={() => setShowProfile(false)}
          name={name} trustScore={trustScore} avatar={avatar}
          skills={skills} githubLink={githubLink} contactInfo={contactInfo} projects={projects} videoUrl={videoUrl}
        />
      )}

      <StudentNav
        avatar={avatar}
        name={name}
        trustScore={trustScore}
        onOpenProfile={() => setShowProfile(true)}
        onToggleSidebar={() => setSidebarOpen(true)}
      />

      {/* Body */}
      <div className="dashboard-body" style={{ display: 'flex', flex: 1 }}>
        <div className={`dashboard-overlay${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <StudentSidebar
          navItems={NAV_ITEMS}
          active={active}
          onSelect={setActive}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="dashboard-main" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {active === 'profile' && (
            <ProfileSection
              name={name} trustScore={trustScore}
              avatar={avatar} setAvatar={setAvatar}
              skills={skills}
              githubLink={githubLink} setGithubLink={setGithubLink}
              contactInfo={contactInfo} setContactInfo={setContactInfo}
              projects={projects} setProjects={setProjects}
              videoUrl={videoUrl} setVideoUrl={setVideoUrl}
              onViewProfile={() => setShowProfile(true)}
            />
          )}

          {active === 'gig'        && <GigCenter />}
          {active === 'trustscore' && <TrustScoreSection trustScore={trustScore} skills={skills} projects={projects} githubLink={githubLink} />}
          {active === 'skillhub'  && <SkillHub />}
          {active === 'earning'   && <Earning />}
          {active === 'network'   && <Network />}

        </main>
      </div>
    </div>
  )
}
