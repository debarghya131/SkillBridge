import { useCallback, useEffect, useState } from 'react'
import { Award, Handshake, House, Rocket } from 'lucide-react'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import NetworkNav from './NetworkNav'
import { NetworkProvider } from './NetworkContext'
import NetworkHome from './NetworkHome'
import MyNetwork from './MyNetwork'
import NetworkTeamUp from './NetworkTeamUp'
import { clearStudentSessionToken, fetchNetworkProfile, fetchStudentNetwork, getStudentSessionToken } from '../studentApi'
import { clearStudentSectionCachePrefix, loadStudentSectionCache, readStudentSectionCache } from '../sectionCache'
import './Network.css'

const NETWORK_NAV_ITEMS = [
  { key: 'home', icon: House, label: 'Discover' },
  { key: 'my-network', icon: Handshake, label: 'My Network' },
  { key: 'team-up', icon: Rocket, label: 'Team Up' },
]
const nextMilestone = (value, thresholds) => thresholds.find(threshold => value < threshold) || thresholds.at(-1)

export default function Network() {
  const cachedState = readStudentSectionCache('network', getStudentSessionToken())
  const [activeTab, setActiveTab] = useState('home')
  const [networkState, setNetworkState] = useState(cachedState)
  const [isLoading, setIsLoading] = useState(!cachedState)
  const [error, setError] = useState('')
  const token = getStudentSessionToken()

  const reload = useCallback(async ({ quiet = false, useCache = false } = {}) => {
    if (!token) return
    const cached = useCache ? readStudentSectionCache('network', token) : null
    if (cached) {
      setNetworkState(cached)
      setIsLoading(false)
      return
    }
    // A forced reload follows a real mutation. Discard real profile snapshots
    // so newly connected users immediately receive the correct contact access.
    if (!useCache) clearStudentSectionCachePrefix('network-profile-', token)
    if (!quiet) setIsLoading(true)
    setError('')
    try {
      // Hover prefetch and the mounted view share this in-flight request, so
      // navigation cannot accidentally start a second complete Network load.
      const result = await loadStudentSectionCache('network', token, () => fetchStudentNetwork(token).then(response => response.networkState))
      setNetworkState(result)
    } catch (loadError) {
      if (loadError.status === 401) clearStudentSessionToken()
      setError(loadError.message)
      throw loadError
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const loadProfile = useCallback(studentId => {
    if (!token) return Promise.reject(new Error('Your student session has expired.'))
    const demoProfile = networkState?.demoProfiles?.[studentId]
    if (demoProfile) return Promise.resolve({ profile: demoProfile })
    // The profile dialog is reachable from all three Network views. Keep one
    // short-lived result per person and coalesce rapid repeat clicks.
    return loadStudentSectionCache(`network-profile-${studentId}`, token, () => fetchNetworkProfile(token, studentId))
  }, [networkState?.demoProfiles, token])

  useEffect(() => { reload({ useCache: true }).catch(() => {}) }, [reload])

  if (isLoading && !networkState) return <DashboardSkeleton section="network" />
  const progress = networkState?.achievementProgress || { connections: 0, teamUps: 0 }
  const nextConnections = nextMilestone(progress.connections, [100, 500, 1000])
  const nextTeamUps = nextMilestone(progress.teamUps, [10, 50, 100])

  return <NetworkProvider value={{ networkState, reload, token, setActiveTab, loadProfile }}>
    <div className="network-workspace">
      <div className="network-topbar"><NetworkNav items={NETWORK_NAV_ITEMS} active={activeTab} onChange={setActiveTab} />
        <section className="network-trust-progress" aria-label="Network TrustScore achievements"><div><Award size={17}/><strong>Network TrustScore achievements</strong><p>Only accepted, real connections and Team-Ups count. Demo records never earn points.</p></div><div className="network-trust-milestone"><span>Connections</span><strong>{progress.connections}/{nextConnections}</strong><small>+{nextConnections === 100 ? 25 : nextConnections === 500 ? 75 : 150} at {nextConnections}</small></div><div className="network-trust-milestone"><span>Team-Ups</span><strong>{progress.teamUps}/{nextTeamUps}</strong><small>+{nextTeamUps === 10 ? 25 : nextTeamUps === 50 ? 75 : 150} at {nextTeamUps}</small></div></section>
      </div>
      {error && !networkState ? <div className="network-error" role="alert"><span>{error}</span><button type="button" onClick={() => reload().catch(() => {})}>Retry</button></div> :
        <div key={activeTab} className="student-tab-content network-tab-content">
          {activeTab === 'home' && <NetworkHome />}
          {activeTab === 'my-network' && <MyNetwork />}
          {activeTab === 'team-up' && <NetworkTeamUp />}
        </div>}
    </div>
  </NetworkProvider>
}
