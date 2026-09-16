import { Link } from 'react-router-dom'
import './SkillBridgeBrand.css'

export default function SkillBridgeBrand({
  className = '',
  linkTo,
  size = 'default',
}) {
  const classes = `skillbridge-brand skillbridge-brand-${size} ${className}`.trim()
  const content = (
    <>
      <img src="/skillbridge-mark.svg" alt="" aria-hidden="true" />
      <span className="skillbridge-wordmark">
        <span>Skill</span><span>Bridge</span>
      </span>
    </>
  )

  if (linkTo) {
    return <Link to={linkTo} className={classes} aria-label="SkillBridge home">{content}</Link>
  }

  return <div className={classes} aria-label="SkillBridge">{content}</div>
}
