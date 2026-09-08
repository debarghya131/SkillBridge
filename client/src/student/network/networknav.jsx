export default function NetworkNav({ items, active, onChange }) {
  return (
    <div className="responsive-pill-nav network-subnav" style={{ display: 'flex', gap: 4, background: 'var(--white)', borderRadius: 12, padding: 6, border: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap' }}>
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          aria-pressed={active === item.key}
          onClick={() => onChange(item.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: active === item.key ? 'var(--primary)' : 'transparent',
            color: active === item.key ? 'white' : 'var(--muted)',
            fontWeight: active === item.key ? 700 : 500,
            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = 'var(--bg)' }}
          onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent' }}
        >
          {item.icon} {item.label}
        </button>
      ))}
    </div>
  )
}
