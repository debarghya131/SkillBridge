import { BriefcaseBusiness, CirclePlay, Code2, Globe2, Palette, Send } from 'lucide-react'

export function profileLinkType(url) {
  const value = String(url || '').toLowerCase()
  if (value.includes('github.com')) return 'github'
  if (value.includes('linkedin.com')) return 'linkedin'
  if (value.includes('twitter.com') || value.includes('x.com')) return 'twitter'
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube'
  if (value.includes('dribbble.com')) return 'dribbble'
  return 'website'
}

const ICONS = {
  github: Code2,
  linkedin: BriefcaseBusiness,
  twitter: Send,
  youtube: CirclePlay,
  dribbble: Palette,
  website: Globe2,
}

export function ProfileLinkIcon({ url, size = 16, className }) {
  const Icon = ICONS[profileLinkType(url)] || Globe2
  return <Icon aria-hidden="true" className={className} size={size} strokeWidth={2} />
}
