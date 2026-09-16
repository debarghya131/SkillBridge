export default function SectionTabs({ options, value, onChange, label }) {
  return <nav className="company-section-tabs" aria-label={label}>
    {options.map(option => <button type="button" key={option} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}
  </nav>
}
