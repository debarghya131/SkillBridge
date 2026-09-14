export default function StudentSidebar({
  navItems,
  active,
  onSelect,
  onLogout,
  isOpen,
  onClose,
}) {
  const profileItem = navItems.find(item => item.key === 'profile')
  const primaryNavItems = navItems.filter(item => item.key !== 'profile')

  const renderNavItem = item => (
    <button
      key={item.key}
      type="button"
      onClick={() => {
        onSelect(item.key)
        onClose?.()
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 10, border: 'none',
        background: active === item.key ? 'var(--primary-light)' : 'transparent',
        color: active === item.key ? 'var(--primary)' : 'var(--muted)',
        fontWeight: active === item.key ? 700 : 500,
        fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'all 0.15s',
        boxShadow: active === item.key ? 'inset 3px 0 0 var(--primary)' : 'inset 0 0 0 transparent',
      }}
      onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = 'var(--bg)' }}
      onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, background: active === item.key ? 'rgba(79,70,229,0.1)' : 'var(--bg)',
        fontSize: 15, flexShrink: 0,
      }}>{item.icon}</span>
      {item.label}
    </button>
  )

  return (
    <aside className={`dashboard-sidebar${isOpen ? ' is-open' : ''}`} style={{
      width: 220, background: 'var(--white)',
      borderRight: '1px solid var(--border)',
      padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', gap: 5,
      position: 'sticky', top: 52, height: 'calc(100vh - 52px)', overflowY: 'auto',
    }}>
      <div style={{ padding: '2px 14px 12px', color: 'var(--muted)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Student workspace
      </div>
      {primaryNavItems.map(renderNavItem)}
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: 'var(--border)', margin: '12px 8px 8px' }} />
      {profileItem && renderNavItem(profileItem)}
      <button
        type="button"
        onClick={() => {
          onClose?.()
          onLogout()
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', borderRadius: 10, border: 'none',
          background: 'transparent', color: '#EF4444',
          fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#FEF2F2', fontSize: 15 }}>🚪</span>
        Logout
      </button>
    </aside>
  )
}
