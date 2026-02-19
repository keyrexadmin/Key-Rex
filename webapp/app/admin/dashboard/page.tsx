'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/Card'
import AnalyticsChart from '@/components/AnalyticsChart'
import KeyRexButtonPreview from '@/components/KeyRexButtonPreview'

interface User {
  xpub: string
  siteId: string
  subscribed: boolean
  subscriptionTier: string
  allowedDomains: string[]
  freeDisclaimerAccepted: boolean
  integrationEnabled: boolean
  createdAt: number
}

interface SystemStats {
  totalUsers: number
  totalDomains: number
  totalLogins: number
  activeUsers: number
  recentLogins: number
  totalContactSubmissions: number
  unreadContacts: number
}

interface ContactSubmission {
  id: string
  name?: string
  email: string
  subject: string
  message: string
  urgent?: boolean
  timestamp: number
  status: 'unread' | 'read' | 'replied' | 'archived'
}

interface FeaturedWallet {
  id: string
  name: string
  logoUrl: string
  downloadUrl: string
  enabled: boolean
  priority: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'contacts' | 'wallets'>('overview')
  const [logoSrc, setLogoSrc] = useState('/images/paw2.png')
  
  // Data state
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [contacts, setContacts] = useState<ContactSubmission[]>([])
  const [wallets, setWallets] = useState<FeaturedWallet[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  
  // User detail state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDetail, setUserDetail] = useState<any>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  
  // Search/filter state
  const [userSearch, setUserSearch] = useState('')
  const [contactFilter, setContactFilter] = useState<'all' | 'unread' | 'read' | 'replied' | 'archived'>('all')
  
  // Wallet management state
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [editingWallet, setEditingWallet] = useState<FeaturedWallet | null>(null)
  const [walletForm, setWalletForm] = useState({
    name: '',
    logoUrl: '',
    downloadUrl: '',
    enabled: true,
    priority: 0,
  })

  // Set cache-busting parameter for logo only on client side
  useEffect(() => {
    setLogoSrc(`/images/paw2.png?t=${Date.now()}`)
  }, [])

  useEffect(() => {
    // Verify admin session
    const verifyAdmin = async () => {
      try {
        const res = await fetch('/api/admin/auth/verify', {
          credentials: 'include',
        })
        
        if (res.ok) {
          const data = await res.json()
          if (data.isAdmin) {
            setIsAdmin(true)
            loadData()
          } else {
            setIsAdmin(false)
            setTimeout(() => {
              router.push('/admin/login')
            }, 2000)
          }
        } else {
          setIsAdmin(false)
          setTimeout(() => {
            router.push('/admin/login')
          }, 2000)
        }
      } catch (err) {
        console.error('Error verifying admin:', err)
        setIsAdmin(false)
        setTimeout(() => {
          router.push('/admin/login')
        }, 2000)
      } finally {
        setLoading(false)
      }
    }
    
    verifyAdmin()
  }, [router])

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Load stats
      const statsRes = await fetch('/api/admin/stats', { credentials: 'include' })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      // Load users
      const usersRes = await fetch('/api/admin/users', { credentials: 'include' })
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      // Load contacts
      const contactsRes = await fetch('/api/admin/contacts', { credentials: 'include' })
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        console.log('Admin dashboard: Loaded contacts - FULL RESPONSE:', JSON.stringify(contactsData, null, 2))
        console.log('Admin dashboard: Loaded contacts', {
          total: contactsData.total,
          unread: contactsData.unread,
          submissionsCount: contactsData.submissions?.length || 0,
          submissions: contactsData.submissions,
        })
        const submissions = contactsData.submissions || []
        console.log('Admin dashboard: Setting contacts state with', submissions.length, 'submissions')
        setContacts(submissions)
      } else {
        const errorText = await contactsRes.text().catch(() => 'Unable to read error')
        console.error('Admin dashboard: Failed to load contacts', {
          status: contactsRes.status,
          statusText: contactsRes.statusText,
          error: errorText,
        })
      }

      // Load wallets
      const walletsRes = await fetch('/api/admin/wallets', { credentials: 'include' })
      if (walletsRes.ok) {
        const walletsData = await walletsRes.json()
        setWallets(walletsData.wallets || [])
      }
    } catch (err) {
      console.error('Error loading admin data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const loadAnalytics = async () => {
    setLoadingAnalytics(true)
    try {
      const res = await fetch('/api/admin/analytics', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error('Error loading analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const loadUserDetail = async (xpub: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(xpub)}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUserDetail(data)
      }
    } catch (err) {
      console.error('Error loading user detail:', err)
    }
  }

  const handleUserClick = async (user: User) => {
    setSelectedUser(user)
    setShowUserModal(true)
    await loadUserDetail(user.xpub)
  }

  const handleExport = (type: 'users' | 'contacts' | 'analytics') => {
    let data: any
    let filename: string
    
    switch (type) {
      case 'users':
        data = users
        filename = `bitpass-users-${new Date().toISOString().split('T')[0]}.json`
        break
      case 'contacts':
        data = contacts
        filename = `bitpass-contacts-${new Date().toISOString().split('T')[0]}.json`
        break
      case 'analytics':
        data = analytics
        filename = `bitpass-analytics-${new Date().toISOString().split('T')[0]}.json`
        break
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingWallet) {
        // Update existing wallet
        const res = await fetch('/api/admin/wallets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: editingWallet.id, ...walletForm }),
        })
        if (res.ok) {
          await loadData()
          // Force preview refresh by triggering a page event
          window.dispatchEvent(new Event('bitpass-wallet-updated'))
          setShowWalletModal(false)
          setEditingWallet(null)
          setWalletForm({ name: '', logoUrl: '', downloadUrl: '', enabled: true, priority: 0 })
        }
      } else {
        // Add new wallet
        const res = await fetch('/api/admin/wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(walletForm),
        })
        if (res.ok) {
          await loadData()
          // Force preview refresh by triggering a page event
          window.dispatchEvent(new Event('bitpass-wallet-updated'))
          setShowWalletModal(false)
          setWalletForm({ name: '', logoUrl: '', downloadUrl: '', enabled: true, priority: 0 })
        }
      }
    } catch (err) {
      console.error('Error saving wallet:', err)
    }
  }

  const handleDeleteWallet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return
    try {
      const res = await fetch(`/api/admin/wallets?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        await loadData()
        // Force preview refresh by triggering a page event
        window.dispatchEvent(new Event('bitpass-wallet-updated'))
      }
    } catch (err) {
      console.error('Error deleting wallet:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics()
    } else if (activeTab === 'contacts') {
      // Reload contacts when switching to contacts tab
      loadData()
    }
  }, [activeTab])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/admin/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  const handleUpdateContactStatus = async (id: string, status: ContactSubmission['status']) => {
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        loadData() // Reload data
      }
    } catch (err) {
      console.error('Error updating contact status:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="text-center">
          <p className="text-white text-lg mb-4">Unauthorized access</p>
          <p className="text-white/60">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'users' as const, label: 'Users' },
    { id: 'analytics' as const, label: 'Analytics' },
    { id: 'contacts' as const, label: 'Contact Submissions' },
    { id: 'wallets' as const, label: 'Wallet Partnerships' },
  ]

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Subtle T-Rex scale pattern overlay - matching main site */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg%3E%3Cpath d='M0 15 L15 0 M15 30 L30 15 M30 45 L45 30 M45 60 L60 45 M60 75 L75 60 M75 90 L90 75 M90 100 L100 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M0 30 L15 15 M15 45 L30 30 M30 60 L45 45 M45 75 L60 60 M60 90 L75 75 M75 100 L90 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 0 L30 15 M30 15 L45 30 M45 30 L60 45 M60 45 L75 60 M75 60 L90 75 M90 75 L100 90' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 15 L30 30 M30 30 L45 45 M45 45 L60 60 M60 60 L75 75 M75 75 L90 90 M90 90 L100 100' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '100px 100px',
        backgroundPosition: '0 0',
        opacity: 0.16,
      }} />
      
      {/* Enhanced radial glow accents - matching main site */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-orange-500/12 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-500/12 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Header */}
      <header className="border-b border-orange-500/20 backdrop-blur-sm sticky top-0 z-50" style={{ backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="flex-shrink-0 h-full flex items-center">
                <img 
                  src={logoSrc} 
                  alt="Key-Rex" 
                  className="transform hover:scale-110 transition-transform object-contain"
                  style={{ 
                    display: 'block',
                    width: 'auto',
                    height: '4.53rem' // Reduced to 85% of 5.33rem
                  }}
                  onError={(e) => {
                    // Fallback if image fails to load
                    console.error('Logo image failed to load:', logoSrc)
                    e.currentTarget.src = '/images/paw2.png'
                  }}
                />
              </div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-orange-500/20 backdrop-blur-sm sticky top-16 z-40" style={{ backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-orange-500 text-orange-400'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="text-center text-white/60">Loading data...</div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">System Overview</h2>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <div className="text-white/60 text-sm mb-1">Total Users</div>
                    <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                  </Card>
                  <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <div className="text-white/60 text-sm mb-1">Total Domains</div>
                    <div className="text-3xl font-bold text-white">{stats.totalDomains}</div>
                  </Card>
                  <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <div className="text-white/60 text-sm mb-1">Total Logins</div>
                    <div className="text-3xl font-bold text-white">{stats.totalLogins.toLocaleString()}</div>
                  </Card>
                  <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <div className="text-white/60 text-sm mb-1">Active Users (30d)</div>
                    <div className="text-3xl font-bold text-white">{stats.activeUsers}</div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <div className="text-white/60 text-sm mb-1">Contact Submissions</div>
                    <div className="text-3xl font-bold text-white mb-2">{stats.totalContactSubmissions}</div>
                    {stats.unreadContacts > 0 && (
                      <div className="text-orange-400 text-sm">
                        {stats.unreadContacts} unread
                      </div>
                    )}
                  </Card>
                  <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <div className="text-white/60 text-sm mb-1">Featured Wallets</div>
                    <div className="text-3xl font-bold text-white">{wallets.filter(w => w.enabled).length}</div>
                  </Card>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-white">Users</h2>
                  <div className="flex items-center gap-4">
                    <div className="text-white/60 text-sm">Total: {users.length}</div>
                    <button
                      onClick={() => handleExport('users')}
                      className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors"
                    >
                      Export
                    </button>
                  </div>
                </div>
                
                {/* Search */}
                <Card className="p-4 bg-dark-200/90 border-2 border-orange-500/30">
                  <input
                    type="text"
                    placeholder="Search by xpub or Site ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-dark-900/50 border border-dark-700 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-orange-500"
                  />
                </Card>
                
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="text-left py-3 px-4 text-white/80 text-sm font-medium">xpub</th>
                          <th className="text-left py-3 px-4 text-white/80 text-sm font-medium">Site ID</th>
                          <th className="text-left py-3 px-4 text-white/80 text-sm font-medium">Domains</th>
                          <th className="text-left py-3 px-4 text-white/80 text-sm font-medium">Created</th>
                          <th className="text-left py-3 px-4 text-white/80 text-sm font-medium">Status</th>
                          <th className="text-left py-3 px-4 text-white/80 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users
                          .filter(user => 
                            !userSearch || 
                            user.xpub.toLowerCase().includes(userSearch.toLowerCase()) ||
                            user.siteId.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map((user) => (
                          <tr key={user.xpub} className="border-b border-dark-800 hover:bg-dark-800/50 cursor-pointer" onClick={() => handleUserClick(user)}>
                            <td className="py-3 px-4 text-white/90 text-sm font-mono">{user.xpub.substring(0, 20)}...</td>
                            <td className="py-3 px-4 text-white/90 text-sm font-mono">{user.siteId}</td>
                            <td className="py-3 px-4 text-white/90 text-sm">{user.allowedDomains.length}</td>
                            <td className="py-3 px-4 text-white/90 text-sm">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs ${
                                user.integrationEnabled 
                                  ? 'bg-orange-500/20 text-orange-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {user.integrationEnabled ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUserClick(user)
                                }}
                                className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-sm transition-colors"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {users.filter(user => 
                      !userSearch || 
                      user.xpub.toLowerCase().includes(userSearch.toLowerCase()) ||
                      user.siteId.toLowerCase().includes(userSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-8 text-white/60">No users found</div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Aggregate Analytics</h2>
                  <button
                    onClick={() => handleExport('analytics')}
                    className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors"
                  >
                    Export Data
                  </button>
                </div>
                
                {loadingAnalytics ? (
                  <div className="text-center text-white/60 py-8">Loading analytics...</div>
                ) : analytics ? (
                  <>
                    {/* Daily Logins Chart */}
                    <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                      <h3 className="text-lg font-semibold text-white mb-4">Daily Logins (Last 30 Days)</h3>
                      <AnalyticsChart
                        data={analytics.dailyData.map((d: any) => ({
                          date: d.date.split('-').slice(1).join('/'),
                          logins: d.logins,
                          uniqueUsers: d.uniqueUsers,
                        }))}
                        type="line"
                      />
                    </Card>
                    
                    {/* Wallet Breakdown */}
                    {analytics.walletBreakdown && analytics.walletBreakdown.length > 0 && (
                      <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                        <h3 className="text-lg font-semibold text-white mb-4">Wallet Usage</h3>
                        <div className="space-y-2">
                          {analytics.walletBreakdown.slice(0, 10).map((wallet: any) => (
                            <div key={wallet.wallet} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                              <div>
                                <div className="text-white font-medium">{wallet.wallet || 'Unknown'}</div>
                                <div className="text-white/60 text-sm">{wallet.uniqueUsers} unique users</div>
                              </div>
                              <div className="text-orange-400 font-semibold">{wallet.logins.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                    
                    {/* Browser Breakdown */}
                    {analytics.browserBreakdown && analytics.browserBreakdown.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                          <h3 className="text-lg font-semibold text-white mb-4">Browser Usage</h3>
                          <div className="space-y-2">
                            {analytics.browserBreakdown.slice(0, 5).map((browser: any) => (
                              <div key={browser.browser} className="flex items-center justify-between p-2 bg-dark-800/50 rounded">
                                <span className="text-white/80 text-sm">{browser.browser || 'Unknown'}</span>
                                <span className="text-orange-400 font-semibold">{browser.logins}</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                        
                        <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                          <h3 className="text-lg font-semibold text-white mb-4">Device Types</h3>
                          <div className="space-y-2">
                            {analytics.deviceTypeBreakdown.slice(0, 5).map((device: any) => (
                              <div key={device.deviceType} className="flex items-center justify-between p-2 bg-dark-800/50 rounded">
                                <span className="text-white/80 text-sm capitalize">{device.deviceType || 'Unknown'}</span>
                                <span className="text-orange-400 font-semibold">{device.logins}</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                    <p className="text-white/60">No analytics data available yet.</p>
                  </Card>
                )}
              </div>
            )}

            {/* Contact Submissions Tab */}
            {activeTab === 'contacts' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-white">Contact Submissions</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-white/60 text-sm">
                      Total: {contacts.length} | Unread: {contacts.filter(c => c.status === 'unread').length}
                    </div>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm transition-colors"
                      title="Refresh submissions"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => handleExport('contacts')}
                      className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors"
                    >
                      Export
                    </button>
                  </div>
                </div>
                
                {/* Development Note */}
                {process.env.NODE_ENV === 'development' && (
                  <Card className="p-4 bg-yellow-500/10 border border-yellow-500/30">
                    <div className="text-xs text-yellow-400 space-y-1">
                      <p><strong>⚠️ Development Mode Notice:</strong></p>
                      <p>Contact submissions are stored in-memory and will be cleared if the server restarts or modules reload. In production, this will use persistent storage.</p>
                      <p>If submissions disappear, the server likely restarted. Try submitting a new message and checking immediately.</p>
                    </div>
                  </Card>
                )}
                
                {/* Filter */}
                <Card className="p-4 bg-dark-200/90 border-2 border-orange-500/30">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <span className="text-white/80 text-sm">Filter:</span>
                    {(['all', 'unread', 'read', 'replied', 'archived'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setContactFilter(status)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          contactFilter === status
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-dark-700 text-white/60 hover:bg-dark-600'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </Card>
                
                <div className="space-y-4">
                  {contacts.length === 0 ? (
                    <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                      <div className="text-center text-white/60">
                        <p className="mb-2">No contact submissions yet</p>
                        <p className="text-xs text-white/500">Submissions will appear here once someone submits the contact form.</p>
                        <p className="text-xs text-white/500 mt-2">Note: In-memory storage is cleared when the server restarts.</p>
                      </div>
                    </Card>
                  ) : (
                    contacts
                      .filter(contact => contactFilter === 'all' || contact.status === contactFilter)
                      .map((contact) => (
                    <Card key={contact.id} className="p-6" variant={contact.status === 'unread' ? 'highlight' : 'default'}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-white">{contact.subject}</h3>
                            {contact.urgent && (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">URGENT</span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded ${
                              contact.status === 'unread' ? 'bg-orange-500/20 text-orange-400' :
                              contact.status === 'read' ? 'bg-orange-500/20 text-orange-400' :
                              contact.status === 'replied' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-dark-700 text-white/60'
                            }`}>
                              {contact.status}
                            </span>
                          </div>
                          <div className="text-white/80 text-sm mb-2">
                            <strong>From:</strong> {contact.name || 'Anonymous'} ({contact.email})
                          </div>
                          <div className="text-white/80 text-sm mb-2">
                            <strong>Date:</strong> {new Date(contact.timestamp).toLocaleString()}
                          </div>
                          <p className="text-white/90 mt-3 whitespace-pre-wrap">{contact.message}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {contact.status !== 'read' && (
                          <button
                            onClick={() => handleUpdateContactStatus(contact.id, 'read')}
                            className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-sm transition-colors"
                          >
                            Mark as Read
                          </button>
                        )}
                        {contact.status !== 'replied' && (
                          <button
                            onClick={() => handleUpdateContactStatus(contact.id, 'replied')}
                            className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-sm transition-colors"
                          >
                            Mark as Replied
                          </button>
                        )}
                        {contact.status !== 'archived' && (
                          <button
                            onClick={() => handleUpdateContactStatus(contact.id, 'archived')}
                            className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white/80 rounded text-sm transition-colors"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </Card>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Wallet Partnerships Tab */}
            {activeTab === 'wallets' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Featured Wallets</h2>
                  <button
                    onClick={() => {
                      setEditingWallet(null)
                      setWalletForm({ name: '', logoUrl: '', downloadUrl: '', enabled: true, priority: 0 })
                      setShowWalletModal(true)
                    }}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Add Wallet
                  </button>
                </div>
                
                {/* Manage Wallets */}
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Manage Wallets</h3>
                  <div className="space-y-4">
                    {wallets.map((wallet) => (
                      <div key={wallet.id} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-dark-800/50 rounded-lg">
                        <div className="flex items-center gap-4">
                          {wallet.logoUrl && (
                            <img src={wallet.logoUrl} alt={wallet.name} className="w-12 h-12 object-contain" />
                          )}
                          <div>
                            <h3 className="text-white font-semibold">{wallet.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded text-xs ${
                                wallet.enabled ? 'bg-orange-500/20 text-orange-400' : 'bg-dark-700 text-white/60'
                              }`}>
                                {wallet.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <span className="text-white/60 text-xs">Priority: {wallet.priority}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingWallet(wallet)
                              setWalletForm({
                                name: wallet.name,
                                logoUrl: wallet.logoUrl,
                                downloadUrl: wallet.downloadUrl,
                                enabled: wallet.enabled,
                                priority: wallet.priority,
                              })
                              setShowWalletModal(true)
                            }}
                            className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteWallet(wallet.id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {wallets.length === 0 && (
                      <div className="text-center py-8 text-white/60">No featured wallets yet</div>
                    )}
                  </div>
                </Card>
                
                {/* Live Preview */}
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
                  <p className="text-white/60 text-sm mb-4">
                    This is how the authentication button and featured wallets appear on client websites. Changes to wallets will automatically update here.
                  </p>
                  <div className="flex justify-center">
                    <KeyRexButtonPreview showInCard={true} />
                  </div>
                </Card>
              </div>
            )}
            
            {/* User Detail Modal */}
            {showUserModal && selectedUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(26, 26, 26, 0.70)' }}>
                <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl shadow-2xl border border-orange-500/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-dark-700 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">User Details</h2>
                    <button
                      onClick={() => {
                        setShowUserModal(false)
                        setSelectedUser(null)
                        setUserDetail(null)
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    {userDetail ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Card className="p-4 bg-dark-200/90 border-2 border-orange-500/30">
                            <div className="text-white/60 text-sm mb-1">xpub</div>
                            <div className="text-white font-mono text-sm break-all">{userDetail.user.xpub}</div>
                          </Card>
                          <Card className="p-4 bg-dark-200/90 border-2 border-orange-500/30">
                            <div className="text-white/60 text-sm mb-1">Site ID</div>
                            <div className="text-white font-mono text-sm">{userDetail.user.siteId}</div>
                          </Card>
                          <Card className="p-4 bg-dark-200/90 border-2 border-orange-500/30">
                            <div className="text-white/60 text-sm mb-1">Total Logins</div>
                            <div className="text-white text-2xl font-bold">{userDetail.stats.allTime.toLocaleString()}</div>
                          </Card>
                          <Card className="p-4 bg-dark-200/90 border-2 border-orange-500/30">
                            <div className="text-white/60 text-sm mb-1">Unique Users</div>
                            <div className="text-white text-2xl font-bold">{userDetail.stats.uniqueUsers}</div>
                          </Card>
                        </div>
                        
                        {userDetail.dailyData && userDetail.dailyData.length > 0 && (
                          <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                            <h3 className="text-lg font-semibold text-white mb-4">Login Activity (Last 30 Days)</h3>
                            <AnalyticsChart
                              data={userDetail.dailyData.map((d: any) => ({
                                date: d.date.split('-').slice(1).join('/'),
                                logins: d.logins,
                                uniqueUsers: d.uniqueUsers,
                              }))}
                              type="line"
                            />
                          </Card>
                        )}
                        
                        {userDetail.user.allowedDomains && userDetail.user.allowedDomains.length > 0 && (
                          <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                            <h3 className="text-lg font-semibold text-white mb-4">Domains</h3>
                            <div className="space-y-2">
                              {userDetail.user.allowedDomains.map((domain: string) => (
                                <div key={domain} className="p-2 bg-dark-800/50 rounded text-white/90">{domain}</div>
                              ))}
                            </div>
                          </Card>
                        )}
                        
                        {userDetail.activityLogs && userDetail.activityLogs.length > 0 && (
                          <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {userDetail.activityLogs.map((log: any) => (
                                <div key={log.id} className="p-3 bg-dark-800/50 rounded text-sm">
                                  <div className="text-white/80">{log.description}</div>
                                  <div className="text-white/60 text-xs mt-1">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-white/60 py-8">Loading user details...</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Wallet Form Modal */}
            {showWalletModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(26, 26, 26, 0.70)' }}>
                <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl shadow-2xl border border-orange-500/20 max-w-2xl w-full">
                  <div className="p-6 border-b border-dark-700 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">
                      {editingWallet ? 'Edit Wallet' : 'Add Wallet'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowWalletModal(false)
                        setEditingWallet(null)
                        setWalletForm({ name: '', logoUrl: '', downloadUrl: '', enabled: true, priority: 0 })
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleWalletSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Wallet Name</label>
                      <input
                        type="text"
                        value={walletForm.name}
                        onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })}
                        required
                        className="w-full bg-dark-900/50 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Logo URL</label>
                      <input
                        type="url"
                        value={walletForm.logoUrl}
                        onChange={(e) => setWalletForm({ ...walletForm, logoUrl: e.target.value })}
                        required
                        className="w-full bg-dark-900/50 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Download URL</label>
                      <input
                        type="url"
                        value={walletForm.downloadUrl}
                        onChange={(e) => setWalletForm({ ...walletForm, downloadUrl: e.target.value })}
                        required
                        className="w-full bg-dark-900/50 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Priority</label>
                        <input
                          type="number"
                          value={walletForm.priority}
                          onChange={(e) => setWalletForm({ ...walletForm, priority: parseInt(e.target.value) || 0 })}
                          className="w-full bg-dark-900/50 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="flex items-center pt-8">
                        <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={walletForm.enabled}
                            onChange={(e) => setWalletForm({ ...walletForm, enabled: e.target.checked })}
                            className="w-4 h-4 rounded border-dark-700 bg-dark-900 text-orange-500 focus:ring-orange-500"
                          />
                          Enabled
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                      >
                        {editingWallet ? 'Update' : 'Add'} Wallet
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWalletModal(false)
                          setEditingWallet(null)
                          setWalletForm({ name: '', logoUrl: '', downloadUrl: '', enabled: true, priority: 0 })
                        }}
                        className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
