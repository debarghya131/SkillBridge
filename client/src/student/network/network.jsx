import { useCallback, useEffect, useState } from 'react'
import { Handshake, House, Rocket } from 'lucide-react'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import NetworkNav from './networknav'
import { NetworkProvider } from './NetworkContext'
import NetworkHome from './networkhome'
import MyNetwork from './MyNetwork'
import NetworkTeamUp from './networkteamup'
import { clearStudentSessionToken, fetchStudentNetwork, getStudentSessionToken } from '../studentApi'
import './Network.css'

const NETWORK_NAV_ITEMS = [
  { key: 'home', icon: House, label: 'Discover' },
  { key: 'my-network', icon: Handshake, label: 'My Network' },
  { key: 'team-up', icon: Rocket, label: 'Team Up' },
]

export default function Network() {
  const [activeTab, setActiveTab] = useState('home')
  const [networkState, setNetworkState] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const token = getStudentSessionToken()

  const reload = useCallback(async ({ quiet = false } = {}) => {
    if (!token) return
    if (!quiet) setIsLoading(true)
    setError('')
    try {
      const result = await fetchStudentNetwork(token)
      setNetworkState(result.networkState)
    } catch (loadError) {
      if (loadError.status === 401) clearStudentSessionToken()
      setError(loadError.message)
      throw loadError
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => { reload().catch(() => {}) }, [reload])

  if (isLoading && !networkState) return <DashboardSkeleton section="network" />

  return <NetworkProvider value={{ networkState, reload, token, setActiveTab }}>
    <div className="network-workspace">
      <NetworkNav items={NETWORK_NAV_ITEMS} active={activeTab} onChange={setActiveTab} />
      {error && !networkState ? <div className="network-error" role="alert"><span>{error}</span><button type="button" onClick={() => reload().catch(() => {})}>Retry</button></div> :
        <div key={activeTab} className="student-tab-content network-tab-content">
          {activeTab === 'home' && <NetworkHome />}
          {activeTab === 'my-network' && <MyNetwork />}
          {activeTab === 'team-up' && <NetworkTeamUp />}
        </div>}
    </div>
  </NetworkProvider>
}
