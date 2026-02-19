'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/Layout'
import EmbedCode from '@/components/EmbedCode'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { isTestDomain, validateDomain } from '@/lib/utils'
import { useToast } from '@/components/ToastContainer'
import Tooltip from '@/components/Tooltip'
import HelpIcon from '@/components/HelpIcon'
import ActivityLogComponent from '@/components/ActivityLog'
import AnalyticsChart from '@/components/AnalyticsChart'
import DomainTester from '@/components/DomainTester'

// Domain Manager Component
interface DomainWithStatus {
  domain: string
  verified: boolean
  status: 'pending' | 'verified' | 'failed' | 'expired'
  verificationToken?: string
  errorMessage?: string
}

function DomainManager({ user, setUser, onNavigateToTab }: { user: User; setUser: (user: User) => void; onNavigateToTab?: (tab: string) => void }) {
  const toast = useToast()
  const [domains, setDomains] = useState<string[]>(user.allowedDomains || [])
  const [domainsWithStatus, setDomainsWithStatus] = useState<DomainWithStatus[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingDomain, setEditingDomain] = useState<string | null>(null)
  const [editDomainValue, setEditDomainValue] = useState('')
  const [showingVerificationInstructions, setShowingVerificationInstructions] = useState<string | null>(null)

  useEffect(() => {
    loadDomains()
  }, [user])

  const loadDomains = async () => {
    try {
      const res = await fetch('/api/domains', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains || [])
        // Update domains with verification status if available
        if (data.domainsWithStatus) {
          setDomainsWithStatus(data.domainsWithStatus)
        } else {
          // Fallback: create status array from domains (all pending)
          setDomainsWithStatus((data.domains || []).map((domain: string) => ({
            domain,
            verified: isTestDomain(domain), // Test domains are auto-verified
            status: isTestDomain(domain) ? 'verified' : 'pending'
          })))
        }
      }
    } catch (err) {
      console.error('Failed to load domains:', err)
    }
  }

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a domain')
      toast.showError('Please enter a domain name')
      return
    }

    // Domain validation
    const validation = validateDomain(newDomain.trim())
    if (!validation.valid) {
      const errorMsg = validation.error || 'Please enter a valid domain (e.g. login.yoursite.com or yoursite.com)'
      setError(errorMsg)
      toast.showError(errorMsg)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain: newDomain.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains || [])
        setNewDomain('')
        // Update user in parent
        setUser({ ...user, allowedDomains: data.domains || [] })
        
        // Handle verification status
        if (data.status === 'pending') {
          // Reload domains to get verification status
          await loadDomains()
          toast.showSuccess(`Domain "${newDomain.trim()}" added! Please verify ownership.`)
          setShowingVerificationInstructions(data.domain)
        } else if (data.verified || data.status === 'verified') {
          // Test domain or already verified
          await loadDomains()
          toast.showSuccess(`Domain "${newDomain.trim()}" added and verified!`)
        } else {
          await loadDomains()
          toast.showSuccess(`Domain "${newDomain.trim()}" added successfully!`)
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMsg = errorData.error || 'Failed to add domain'
        setError(errorMsg)
        toast.showError(errorMsg + '. Check the Troubleshooting tab for help.')
      }
    } catch (err) {
      const errorMsg = 'Failed to add domain. Please check your connection and try again.'
      setError(errorMsg)
      toast.showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDomain = async (domain: string) => {
    if (domains.length <= 1) {
      const errorMsg = 'Cannot remove the last domain. Please edit it instead or add a new domain first.'
      setError(errorMsg)
      toast.showWarning(errorMsg)
      return
    }

    if (!confirm(`Are you sure you want to remove "${domain}"? This will prevent logins from this domain.`)) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/domains?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains || [])
        // Update user in parent
        setUser({ ...user, allowedDomains: data.domains || [] })
        await loadDomains() // Reload to update verification status
        toast.showSuccess(`Domain "${domain}" removed successfully`)
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMsg = errorData.error || 'Failed to remove domain'
        setError(errorMsg)
        toast.showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'Failed to remove domain. Please check your connection and try again.'
      setError(errorMsg)
      toast.showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleStartEditDomain = (domain: string) => {
    setEditingDomain(domain)
    setEditDomainValue(domain)
    setError('')
  }

  const handleCancelEditDomain = () => {
    setEditingDomain(null)
    setEditDomainValue('')
    setError('')
  }

  const handleUpdateDomain = async (oldDomain: string) => {
    if (!editDomainValue.trim()) {
      const errorMsg = 'Please enter a domain'
      setError(errorMsg)
      toast.showError(errorMsg)
      return
    }

    // Domain validation (allows test domains)
    const validation = validateDomain(editDomainValue.trim())
    if (!validation.valid) {
      const errorMsg = validation.error || 'Please enter a valid domain (e.g. login.yoursite.com or yoursite.com)'
      setError(errorMsg)
      toast.showError(errorMsg)
      return
    }

    // If domain hasn't changed, just cancel
    if (editDomainValue.trim() === oldDomain) {
      handleCancelEditDomain()
      return
    }

    setLoading(true)
    setError('')
    try {
      // For users with multiple domains, we can update by removing old and adding new
      // Or we could add a PUT endpoint for updating a specific domain
      // For now, let's use the single domain approach: PUT to update the single domain
      // But for users with multiple domains, we need to remove old and add new
      
      if (domains.length === 1) {
        // Single domain - use PUT endpoint
        const res = await fetch('/api/domains', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ domain: editDomainValue.trim() }),
        })

        if (res.ok) {
          const data = await res.json()
          setDomains(data.domains)
          setEditingDomain(null)
          setEditDomainValue('')
          // Update user in parent
          setUser({ ...user, allowedDomains: data.domains })
          toast.showSuccess(`Domain updated to "${editDomainValue.trim()}"`)
        } else {
          const errorData = await res.json().catch(() => ({}))
          const errorMsg = errorData.error || 'Failed to update domain'
          setError(errorMsg)
          toast.showError(errorMsg)
        }
      } else {
        // Multiple domains - remove old, add new
        // First remove the old domain
        const deleteRes = await fetch(`/api/domains?domain=${encodeURIComponent(oldDomain)}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!deleteRes.ok) {
          const errorData = await deleteRes.json().catch(() => ({}))
          const errorMsg = errorData.error || 'Failed to remove old domain'
          setError(errorMsg)
          toast.showError(errorMsg)
          setLoading(false)
          return
        }

        // Then add the new domain
        const addRes = await fetch('/api/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ domain: editDomainValue.trim() }),
        })

        if (addRes.ok) {
          const data = await addRes.json()
          setDomains(data.domains)
          setEditingDomain(null)
          setEditDomainValue('')
          // Update user in parent
          setUser({ ...user, allowedDomains: data.domains })
          toast.showSuccess(`Domain updated from "${oldDomain}" to "${editDomainValue.trim()}"`)
        } else {
          const errorData = await addRes.json().catch(() => ({}))
          const errorMsg = errorData.error || 'Failed to add new domain'
          setError(errorMsg)
          toast.showError(errorMsg)
          // Try to restore the old domain
          await fetch('/api/domains', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ domain: oldDomain }),
          })
        }
      }
    } catch (err) {
      const errorMsg = 'Failed to update domain. Please check your connection and try again.'
      setError(errorMsg)
      toast.showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Handle domain verification
  const handleVerifyDomain = async (domain: string) => {
    setVerifyingDomain(domain)
    setError('')
    try {
      const res = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain }),
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.verified) {
          toast.showSuccess(`Domain "${domain}" verified successfully!`)
          await loadDomains() // Reload to update status
        } else {
          toast.showError(data.error || 'Verification failed. Please check your DNS settings.')
          await loadDomains() // Reload to get updated error message
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.showError(errorData.error || 'Verification failed')
      }
    } catch (err) {
      toast.showError('Failed to verify domain. Please try again.')
    } finally {
      setVerifyingDomain(null)
    }
  }
  
  // Get domain status
  const getDomainStatus = (domain: string): DomainWithStatus | undefined => {
    return domainsWithStatus.find(d => d.domain === domain)
  }
  
  // Check if any domains are test domains
  const hasTestDomains = domains.some(domain => isTestDomain(domain))
  
  // Check if any domains need verification
  const hasUnverifiedDomains = domainsWithStatus.some(d => !d.verified && !isTestDomain(d.domain))

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border-2 border-red-500/50 text-red-200 p-4 rounded-lg text-sm">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold mb-1">Error: {error}</p>
              <p className="text-red-100 text-xs mb-2">
                Need help? Check the <button onClick={() => onNavigateToTab?.('troubleshooting')} className="underline hover:text-red-100 font-medium">Troubleshooting</button> tab for solutions.
              </p>
              {error.includes('domain') && (
                <div className="bg-red-900/40 rounded p-2 mt-2 text-xs">
                  <p className="font-semibold mb-1">Domain Format Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-100">
                    <li>Use format: <code className="bg-red-900/60 px-1 rounded">example.com</code> or <code className="bg-red-900/60 px-1 rounded">login.yoursite.com</code></li>
                    <li>Don't include <code className="bg-red-900/60 px-1 rounded">http://</code> or <code className="bg-red-900/60 px-1 rounded">https://</code></li>
                    <li>Don't include paths like <code className="bg-red-900/60 px-1 rounded">/login</code></li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {hasUnverifiedDomains && (
        <div className="bg-orange-500/10 border-2 border-orange-500/30 text-orange-200 p-4 rounded-lg text-sm">
          <p className="font-semibold mb-2">⚠️ Domain Verification Required</p>
          <p className="mb-2">Some domains need verification before they can be used. Please verify domain ownership by adding a DNS TXT record.</p>
        </div>
      )}
      
      {hasTestDomains && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-200 p-3 rounded-lg text-sm">
          <p className="font-semibold mb-1">⚠️ Test Domain Detected</p>
          <p>You have test domains configured. These are for testing only and should not be used in production.</p>
        </div>
      )}
      
      <div className="space-y-2">
        {domains.length > 0 ? (
          <div className="space-y-2">
            {domains.map((domain, idx) => {
              const domainStatus = getDomainStatus(domain)
              const isVerified = domainStatus?.verified || isTestDomain(domain)
              const isPending = domainStatus?.status === 'pending' && !isTestDomain(domain)
              const showInstructions = showingVerificationInstructions === domain
              
              return (
              <div key={idx} className="bg-dark-800/70 border-2 border-orange-500/30 p-3 rounded-lg space-y-3">
                {editingDomain === domain ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editDomainValue}
                      onChange={(e) => setEditDomainValue(e.target.value)}
                      placeholder="example.com or login.yoursite.com"
                      className="w-full px-4 py-3 border-2 border-orange-500/40 rounded-lg text-base text-white bg-dark-900/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateDomain(domain)}
                      disabled={loading}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateDomain(domain)}
                        disabled={loading}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditDomain}
                        disabled={loading}
                        className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-lg text-sm transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-mono text-sm">{domain}</span>
                        {isTestDomain(domain) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            TEST DOMAIN
                          </span>
                        )}
                        {isVerified && !isTestDomain(domain) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            ✓ VERIFIED
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            PENDING VERIFICATION
                          </span>
                        )}
                        {domainStatus?.status === 'failed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                            VERIFICATION FAILED
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {isPending && (
                          <button
                            onClick={() => handleVerifyDomain(domain)}
                            disabled={loading || verifyingDomain === domain}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-1.5 px-3 rounded text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {verifyingDomain === domain ? (
                              <>
                                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Verifying...
                              </>
                            ) : (
                              'Verify'
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEditDomain(domain)}
                          disabled={loading}
                          className="text-orange-400 hover:text-orange-300 font-medium text-sm disabled:opacity-50 transition-colors"
                        >
                          Edit
                        </button>
                        {domains.length > 1 && (
                          <button
                            onClick={() => handleRemoveDomain(domain)}
                            disabled={loading}
                            className="text-red-400 hover:text-red-300 font-medium text-sm disabled:opacity-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Verification Instructions */}
                    {(isPending || showInstructions) && domainStatus?.verificationToken && (
                      <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4 text-sm">
                        <p className="font-semibold text-orange-200 mb-2">Verify Domain Ownership</p>
                        <p className="text-white/80 mb-3">Add the following DNS TXT record to verify domain ownership:</p>
                        <div className="bg-dark-900/80 border border-orange-500/20 rounded p-3 mb-3">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-orange-400 font-mono text-xs">Type:</span>
                            <span className="text-white font-mono text-xs">TXT</span>
                          </div>
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-orange-400 font-mono text-xs">Name:</span>
                            <span className="text-white font-mono text-xs">{domain}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-orange-400 font-mono text-xs">Value:</span>
                            <code className="text-white font-mono text-xs break-all">{domainStatus.verificationToken}</code>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-yellow-400">💡</span>
                          <p className="text-white/70 text-xs">
                            DNS changes may take 5-10 minutes to propagate. After adding the record, click "Verify" to check.
                          </p>
                        </div>
                        {domainStatus.errorMessage && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-3">
                            <p className="text-red-300 text-xs font-semibold mb-1">Last Error:</p>
                            <p className="text-red-200 text-xs">{domainStatus.errorMessage}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDomain(domain)}
                            disabled={loading || verifyingDomain === domain}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-1.5 px-4 rounded text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {verifyingDomain === domain ? (
                              <>
                                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Verifying...
                              </>
                            ) : (
                              '✓ Verify Domain'
                            )}
                          </button>
                          <button
                            onClick={() => setShowingVerificationInstructions(null)}
                            className="text-white/60 hover:text-white/80 text-xs"
                          >
                            Hide Instructions
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )})}
          </div>
        ) : (
          <div className="bg-dark-800/50 border-2 border-dark-700/50 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-lg font-semibold text-white mb-2">No Domains Added Yet</h3>
            <p className="text-white/80 text-base mb-4 leading-relaxed">
              Add your first domain to start accepting Lightning wallet logins on your website.
            </p>
            <p className="text-white/60 text-xs">
              Enter your domain below (e.g., <code className="bg-dark-900/50 px-1 rounded">example.com</code> or <code className="bg-dark-900/50 px-1 rounded">login.yoursite.com</code>)
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com or login.yoursite.com"
          className="flex-1 px-4 py-3 border-2 border-orange-500/40 rounded-lg text-base text-white bg-dark-900/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
          aria-label="Add new domain"
          onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
        />
        <button
          onClick={handleAddDomain}
          disabled={loading || !newDomain.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Adding...
            </>
          ) : (
            'Add Domain'
          )}
        </button>
      </div>
    </div>
  )
}

// Removed: ButtonTextCustomizer and EnterprisePlanDetails components - all users are now free users

interface User {
  xpub: string
  siteId: string
  subscribed: boolean
  subscriptionTier?: 'free' // All users are free users
  allowedDomains?: string[]
  freeDisclaimerAccepted?: boolean
  freeDisclaimerAcceptedAt?: number
  freeDisclaimerAcceptedIp?: string
  integrationEnabled?: boolean // If false, authentication is disabled for all domains
  createdAt: number
}

interface UsageStats {
  currentMonth: number
  yearToDate: number
  allTime: number
  dailyData?: Array<{ date: string; count: number; uniqueUsers: number }>
  last30Days?: Array<{ date: string; count: number; uniqueUsers: number }>
  domainBreakdown?: Array<{ domain: string; totalLogins: number; uniqueUsers: number }>
  todayHourly?: Array<{ hour: number; count: number }>
  last7DaysHourly?: Array<{ hour: number; count: number }>
  loginHistory?: Array<{ date: string; count: number; uniqueUsers: number }>
  walletBreakdown?: Array<{ wallet: string; totalLogins: number; uniqueUsers: number }>
  newUsers?: number
  returningUsers?: number
  newUserPercentage?: number
  returningUserPercentage?: number
  dayOfWeekBreakdown?: Array<{ day: string; dayNumber: number; totalLogins: number; uniqueUsers: number }>
  browserBreakdown?: Array<{ browser: string; totalLogins: number; uniqueUsers: number }>
  deviceBreakdown?: Array<{ deviceType: string; totalLogins: number; uniqueUsers: number }>
  wowGrowth?: number
  momGrowth?: number
  lastWeekLogins?: number
  thisWeekLogins?: number
  lastMonthLogins?: number
  thisMonthLogins?: number
  sevenDayRetention?: number
  thirtyDayRetention?: number
  sevenDayRetentionUsers?: number
  thirtyDayRetentionUsers?: number
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [domainsStatus, setDomainsStatus] = useState<DomainWithStatus[]>([])
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'login-code' | 'domains' | 'analytics' | 'documentation' | 'troubleshooting' | 'settings'>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Removed: Disclaimer modal - disclaimer is now only shown in OnboardingWizard Step 4
  
  // Load domains with verification status
  useEffect(() => {
    const loadDomainsStatus = async () => {
      try {
        const res = await fetch('/api/domains', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (data.domainsWithStatus) {
            setDomainsStatus(data.domainsWithStatus)
          } else if (data.domains) {
            // Fallback: create status array
            setDomainsStatus(data.domains.map((domain: string) => ({
              domain,
              verified: isTestDomain(domain),
              status: isTestDomain(domain) ? 'verified' : 'pending'
            })))
          }
        }
      } catch (err) {
        console.error('Failed to load domains status:', err)
      }
    }
    
    if (user) {
      loadDomainsStatus()
    }
  }, [user])
  
  // Check if user has at least one verified domain
  const hasVerifiedDomain = domainsStatus.some(d => d.verified || isTestDomain(d.domain))

  const loadUser = useCallback(async (forceRefresh = false): Promise<User | null> => {
    try {
      // Retry a few times in case cookie is still being set
      // Add cache-busting timestamp when upgrading to ensure fresh data
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : ''
      
      let res = await fetch(`/api/user${cacheBuster}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      let retries = 3
      
      while (!res.ok && retries > 0) {
        // Only retry if it's not a 401 (authentication error)
        if (res.status === 401) {
          break // Don't retry authentication errors
        }
        console.log('User API failed, retrying...', res.status, res.statusText)
        const errorText = await res.text().catch(() => '')
        console.log('Error response:', errorText)
        await new Promise(resolve => setTimeout(resolve, 500))
        res = await fetch(`/api/user${cacheBuster}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        retries--
      }
      
      if (res.ok) {
        const data = await res.json()
        console.log('=== User loaded successfully ===')
        console.log('Full user data:', JSON.stringify(data, null, 2))
        console.log('Subscribed:', data.subscribed)
        console.log('Subscription tier:', data.subscriptionTier)
        // Removed: Enterprise feature logging - all users are now free users
        
        // CRITICAL: Check if user has completed the wizard (disclaimer accepted)
        // If not, redirect to home page to complete onboarding
        if (!data.freeDisclaimerAccepted) {
          console.log('User has not completed wizard - redirecting to home page with wizard=true')
          // Redirect to home page and open wizard
          router.push('/?wizard=true')
          return null
        }
        
        // All users are free users - no tier verification needed
        
        // Auto-subscribe users if not already subscribed (all users are free users)
        if (!data.subscribed) {
          console.log('Auto-subscribing user (all users are free users)')
          // Auto-subscribe locally - user can add domain later if needed
          const autoSubscribedUser = { ...data, subscribed: true, subscriptionTier: 'free' }
          setUser(autoSubscribedUser)
          
          // Persist the subscription in the background if user has a domain
          // If no domain, they can add one later and it will work fine
          if (data.allowedDomains && data.allowedDomains.length > 0) {
            fetch('/api/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ 
                tier: 'free',
                domain: data.allowedDomains[0]
              }),
            }).catch(err => console.error('Background auto-subscribe failed:', err))
          }
          
          console.log('User auto-subscribed')
          return autoSubscribedUser
        }
        
        setUser(data)
        console.log('User state updated in React')
        return data // Return the loaded data
      } else {
        let errorText = 'No error message'
        try {
          errorText = await res.text()
        } catch (e) {
          console.error('Failed to read error text:', e)
        }
        
        console.error('Failed to load user after retries:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
          headers: Object.fromEntries(res.headers.entries()),
        })
        
        // Check if cookie exists in browser
        console.log('Browser cookies:', document.cookie)
        console.log('All cookies:', document.cookie.split(';').map(c => c.trim()))
        
        // If 401, cookie might not be set - redirect to home page with wizard
        if (res.status === 401) {
          // Silently redirect - don't log errors for expected unauthenticated access
          console.log('User not authenticated - redirecting to home page with wizard=true')
          router.push('/?wizard=true')
          return null
        } else if (res.status === 404) {
          console.error('User not found in storage - storage may have been reset')
          // Storage was reset (in-memory storage limitation)
          // This means the user's subscription data was lost
          // Show a clear message and allow them to re-authenticate
          setLoading(false)
          setUser(null)
          // Don't redirect - show the storage reset message instead
          return null
        } else {
          console.log('Failed to load user - redirecting to home page with wizard=true')
          router.push('/?wizard=true')
          return null
        }
      }
      return null // Fallback return
    } catch (error) {
      console.error('Failed to load user:', error)
      router.push('/?wizard=true')
      return null
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadUser()
    loadUsage()
  }, [loadUser])

  // Removed: Disclaimer modal - disclaimer is now only shown in OnboardingWizard Step 4
  // All users must accept the disclaimer during onboarding before accessing the dashboard

  const loadUsage = async () => {
    try {
      console.log('Loading usage statistics...')
      const res = await fetch('/api/usage', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Usage statistics loaded:', data)
        setUsage(data)
      } else if (res.status === 401) {
        // User not authenticated - don't log errors, just set defaults
        setUsage({
          currentMonth: 0,
          yearToDate: 0,
          allTime: 0,
        })
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to load usage:', res.status, errorData)
        // Set default stats if API fails
        setUsage({
          currentMonth: 0,
          yearToDate: 0,
          allTime: 0,
        })
      }
    } catch (error) {
      console.error('Failed to load usage:', error)
      // Set default stats on error
      setUsage({
        currentMonth: 0,
        yearToDate: 0,
        allTime: 0,
      })
    }
  }

  // Removed: handleAcceptDisclaimer - disclaimer is now only handled in OnboardingWizard Step 4



  // Removed: handleDowngradeToFree and handleUnsubscribe - all users are now free users

  const handleLogout = useCallback(async () => {
    try {
      // Delete the session cookie by calling logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      // Redirect to home
      router.push('/')
    } catch (error) {
      console.error('Failed to logout:', error)
      // Still redirect even if logout fails
      router.push('/')
    }
  }, [router])

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (!user) return // Don't start timer until user is loaded
    
    const AUTO_LOGOUT_TIME = 10 * 60 * 1000 // 10 minutes in milliseconds
    let logoutTimer: NodeJS.Timeout | null = null
    
    const resetTimer = () => {
      // Clear existing timer
      if (logoutTimer) {
        clearTimeout(logoutTimer)
      }
      
      // Set new timer for 10 minutes from now
      logoutTimer = setTimeout(() => {
        console.log('Auto-logout: 10 minutes of inactivity reached')
        handleLogout()
      }, AUTO_LOGOUT_TIME)
    }
    
    // Start the timer when user is loaded
    resetTimer()
    
    // Reset timer on user activity (mouse movement, clicks, keyboard)
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const handleActivity = () => {
      resetTimer()
    }
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity)
    })
    
    // Cleanup on unmount
    return () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer)
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [user, handleLogout]) // Re-run when user changes


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600">
        <div className="text-xl text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    // User not found - likely due to storage reset (in-memory storage limitation)
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 border-4 border-orange-300">
            <h1 className="text-3xl font-bold text-black mb-4">Storage Reset Detected</h1>
            <p className="text-white/70 mb-6">
              Your session data was lost due to a server restart (this is expected with in-memory storage during development).
              Your domain settings need to be restored.
            </p>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-orange-800 font-semibold mb-2">What happened?</p>
              <p className="text-orange-700 text-sm">
                The development server uses in-memory storage that resets when the server restarts.
                In production, this won't happen as we'll use persistent storage (database).
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Sign In Again
              </button>
              <button
                onClick={() => loadUser(true)}
                className="bg-dark-700 hover:bg-dark-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout showNav={true}>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Dashboard
            </h1>
                <p className="text-white/90 text-lg leading-relaxed">Manage your Key-Rex integration</p>
          </div>

          {/* Tab Navigation */}
          {user && (() => {
            // All users are now free users - simplified tab structure
            const tabs = [
              { id: 'overview' as const, label: 'Overview', alwaysVisible: true },
              { id: 'login-code' as const, label: 'My Integration Code', alwaysVisible: true },
              { id: 'domains' as const, label: 'Domains', alwaysVisible: true }, // Domains are free for all users
              { id: 'analytics' as const, label: 'Analytics', alwaysVisible: true }, // Analytics visible for all users
              { id: 'documentation' as const, label: 'Documentation', alwaysVisible: true },
              { id: 'troubleshooting' as const, label: 'Troubleshooting', alwaysVisible: true },
              { id: 'settings' as const, label: 'Settings', alwaysVisible: true },
            ]
            
            return (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:block sticky top-16 z-40 mb-6 border-b border-orange-500/20 bg-dark-900/95 backdrop-blur-sm pt-4 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 font-semibold text-base rounded-t-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-b-2 border-orange-400 shadow-lg'
                            : 'text-white/80 hover:text-orange-400 hover:bg-dark-800/70'
                        }`}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        aria-label={`${tab.label} tab`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden sticky top-16 z-40 mb-6 border-b border-orange-500/20 bg-dark-900/95 backdrop-blur-sm">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between text-white font-semibold"
                  >
                    <span>{tabs.find(t => t.id === activeTab)?.label || 'Menu'}</span>
                    <span className="text-2xl">{mobileMenuOpen ? '✕' : '☰'}</span>
                  </button>
                  {mobileMenuOpen && (
                    <div className="bg-dark-900 border-t border-orange-500/20">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id)
                            setMobileMenuOpen(false)
                          }}
                          className={`w-full px-4 py-3 text-left font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] ${
                            activeTab === tab.id
                              ? 'bg-orange-500/30 text-orange-400 border-l-4 border-orange-500 shadow-sm'
                              : 'text-white/80 hover:text-orange-400 hover:bg-dark-800/70'
                          }`}
                          aria-current={activeTab === tab.id ? 'page' : undefined}
                          aria-label={`${tab.label} tab`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* Main Content Container */}
          <div className="space-y-6">
          
          {/* First-Time User Guidance Banner */}
          {user && (!user.allowedDomains || user.allowedDomains.length === 0) && (
            <Card className="p-6 bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-2 border-orange-400/50">
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">🚀</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Getting Started with Key-Rex</h3>
                  <p className="text-white/80 mb-4">
                    Follow these steps to add Lightning wallet authentication to your website:
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                      <span className="text-white/80 text-base leading-relaxed">Add your domain in the <strong className="text-white">"Domains"</strong> tab and verify it</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-dark-700 text-white/80 text-xs font-bold flex items-center justify-center">2</span>
                      <span className="text-white/80 text-base leading-relaxed">Copy your integration code from the <strong className="text-white">"My Integration Code"</strong> tab (only available after domain verification)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-dark-700 text-white/80 text-xs font-bold flex items-center justify-center">3</span>
                      <span className="text-white/80 text-base leading-relaxed">Paste the code on your website and test the integration</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('domains')}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                      Add Domain
                    </button>
                    <button
                      onClick={() => setActiveTab('login-code')}
                      className="bg-dark-700 hover:bg-dark-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                      Get Integration Code
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {/* Removed: Authentication disabled warning - no downgrades anymore */}
          {/* Removed: Authentication disabled warning - no downgrades anymore */}
          
          {/* Removed: Disclaimer Modal - disclaimer is now only shown in OnboardingWizard Step 4 */}

          {/* TAB: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Account Information */}
              {user && (
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">Account Information</h3>
                      <HelpIcon content="Your account information includes your xpub (extended public key) and Site ID. These are used for authentication and integration." />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-sm text-white/80">Your unique identifier (for technical reference):</p>
                      <Tooltip content="xpub (extended public key) is a cryptographic identifier derived from your Lightning wallet's public key. It's used to identify you securely without exposing private keys.">
                        <HelpIcon content="xpub (extended public key) is a cryptographic identifier derived from your Lightning wallet's public key. It's used to identify you securely without exposing private keys." />
                      </Tooltip>
                    </div>
                    <p className="font-mono text-sm bg-dark-900/80 border-2 border-orange-500/40 text-white p-3 rounded break-all">
                      {user.xpub}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs text-white/80">Site ID:</p>
                      <Tooltip content="Your Site ID is a unique identifier used in your integration code. It links your website's authentication button to your Key-Rex account.">
                        <span className="text-xs text-orange-400 font-mono">{user.siteId}</span>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              )}

              {/* Integration Status Card */}
              <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-white">Integration Status</h2>
                  <div className={`px-4 py-2 rounded-lg font-semibold ${
                    user?.integrationEnabled !== false
                      ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/30'
                      : 'bg-red-500/20 text-red-400 border-2 border-red-500/30'
                  }`}>
                    {user?.integrationEnabled !== false ? '✓ Active' : '✗ Disabled'}
                  </div>
                </div>
                <p className="text-white/80 mb-4">
                  {user?.integrationEnabled !== false ? (
                    'Your authentication button is active and working on all configured domains.'
                  ) : (
                    'Authentication is currently disabled. Users cannot sign in until you re-enable it.'
                  )}
                </p>
                <button
                  onClick={() => setActiveTab('login-code')}
                  className="text-orange-400 hover:text-orange-300 font-medium text-sm underline"
                >
                  Manage Integration Settings →
                </button>
              </Card>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Domains Card */}
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">Domains</h3>
                    <HelpIcon content="Domains are the websites where your Key-Rex authentication button will work. Add all domains (including subdomains) where you plan to use the integration." />
                  </div>
                  <div className="text-3xl font-bold text-orange-400 mb-1">
                    {user?.allowedDomains?.length || 0}
                  </div>
                  <p className="text-sm text-white/80">
                    {user?.allowedDomains?.length === 0
                      ? 'No domains configured'
                      : user?.allowedDomains?.length === 1
                      ? 'Domain configured'
                      : 'Domains configured'}
                  </p>
                  <button
                    onClick={() => setActiveTab('domains')}
                    className="mt-3 text-orange-400 hover:text-orange-300 font-medium text-sm underline"
                  >
                    Manage Domains →
                  </button>
                </Card>

                {/* Usage Stats Card */}
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">This Month</h3>
                    <HelpIcon content="Number of unique users who authenticated on your website this month using Key-Rex." />
                  </div>
                  <div className="text-3xl font-bold text-orange-400 mb-1">
                    {usage?.currentMonth || 0}
                  </div>
                  <p className="text-sm text-white/80">Unique logins</p>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="mt-3 text-orange-400 hover:text-orange-300 font-medium text-sm underline"
                  >
                    View Analytics →
                  </button>
                </Card>

                {/* All-Time Stats Card */}
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">All Time</h3>
                    <HelpIcon content="Total number of unique users who have ever authenticated on your website using Key-Rex." />
                  </div>
                  <div className="text-3xl font-bold text-orange-400 mb-1">
                    {usage?.allTime || 0}
                  </div>
                  <p className="text-sm text-white/80">Total logins</p>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="mt-3 text-orange-400 hover:text-orange-300 font-medium text-sm underline"
                  >
                    View Analytics →
                  </button>
                </Card>
              </div>

              {/* Warnings & Issues */}
              {user && (
                <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Status & Warnings</h3>
                  <div className="space-y-3">
                    {user.integrationEnabled === false && (
                      <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div className="flex-1">
                            <p className="font-semibold text-red-400 mb-1">Integration Disabled</p>
                            <p className="text-sm text-white/80">
                              Authentication is currently disabled. Users cannot sign in until you enable it.
                            </p>
                            <button
                              onClick={() => setActiveTab('login-code')}
                              className="mt-2 text-red-400 hover:text-red-300 font-medium text-sm underline"
                            >
                              Enable Integration →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {(!user.allowedDomains || user.allowedDomains.length === 0) && (
                      <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">📝</span>
                          <div className="flex-1">
                            <p className="font-semibold text-yellow-400 mb-1">No Domains Configured</p>
                            <p className="text-sm text-white/80">
                              Add at least one domain to enable authentication on your website.
                            </p>
                            <button
                              onClick={() => setActiveTab('domains')}
                              className="mt-2 text-yellow-400 hover:text-yellow-300 font-medium text-sm underline"
                            >
                              Add Domain →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {user.allowedDomains && user.allowedDomains.length > 0 && user.integrationEnabled !== false && (
                      <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">✓</span>
                          <div className="flex-1">
                            <p className="font-semibold text-orange-400 mb-1">All Systems Operational</p>
                            <p className="text-sm text-white/80">
                              Your integration is active and ready to accept authentications.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Quick Actions */}
              <Card className="p-6 bg-dark-200/90 border-2 border-orange-500/30">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTab('login-code')}
                    className="bg-dark-800/70 hover:bg-dark-700/70 border-2 border-orange-500/30 hover:border-orange-500/50 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-semibold text-white text-sm">Copy Code</div>
                    <div className="text-xs text-white/60 mt-1">Get integration code</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('domains')}
                    className="bg-dark-800/70 hover:bg-dark-700/70 border-2 border-orange-500/30 hover:border-orange-500/50 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="text-2xl mb-2">🌐</div>
                    <div className="font-semibold text-white text-sm">Manage Domains</div>
                    <div className="text-xs text-white/60 mt-1">Add or edit domains</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="bg-dark-800/70 hover:bg-dark-700/70 border-2 border-orange-500/30 hover:border-orange-500/50 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-semibold text-white text-sm">View Analytics</div>
                    <div className="text-xs text-white/60 mt-1">See usage statistics</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('troubleshooting')}
                    className="bg-dark-800/70 hover:bg-dark-700/70 border-2 border-orange-500/30 hover:border-orange-500/50 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="text-2xl mb-2">🔧</div>
                    <div className="font-semibold text-white text-sm">Troubleshoot</div>
                    <div className="text-xs text-white/60 mt-1">Get help & support</div>
                  </button>
                </div>
              </Card>

              {/* Activity Log */}
              {user && <ActivityLogComponent xpub={user.xpub} limit={10} />}
            </div>
          )}

          {/* TAB: My Integration Code */}
          {activeTab === 'login-code' && (
            <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-semibold text-white">Add Key-Rex to Your Website</h2>
                <HelpIcon content="Copy the integration code below and paste it into your website's HTML. The code includes your unique Site ID and should automatically load the authentication button." />
              </div>
              <p className="text-white/80 mb-4">
                Copy and paste the code below into your website to enable Bitcoin Lightning login for your users.
              </p>
              
              {/* Integration Toggle */}
              <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">Integration Status</h3>
                      <HelpIcon content="Toggle this switch to enable or disable authentication across all your domains. When disabled, users cannot sign in even if the button is visible on your website." />
                    </div>
                    <p className="text-sm text-white/80">
                      {user?.integrationEnabled !== false ? (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          <span>Active — Authentication is enabled on all your domains</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span>Disabled — Authentication is turned off on all your domains</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={user?.integrationEnabled !== false}
                      onChange={async (e) => {
                        const newValue = e.target.checked
                        if (!newValue) {
                          // Confirmation when disabling
                          const confirmed = window.confirm(
                            'Are you sure you want to disable authentication?\n\n' +
                            'This will turn off the authentication button on ALL your domains. ' +
                            'Users will not be able to sign in until you re-enable it.\n\n' +
                            'Continue?'
                          )
                          if (!confirmed) {
                            return
                          }
                        }
                        
                        try {
                          const res = await fetch('/api/integration/toggle', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ enabled: newValue }),
                          })
                          
                          if (res.ok) {
                            const data = await res.json()
                            setUser({ ...user!, integrationEnabled: data.integrationEnabled })
                            toast.showSuccess(
                              data.integrationEnabled 
                                ? 'Integration enabled — Authentication is now active on all your domains'
                                : 'Integration disabled — Authentication is now turned off on all your domains'
                            )
                          } else {
                            const errorData = await res.json().catch(() => ({}))
                            toast.showError('Failed to update integration status: ' + (errorData.error || 'Unknown error'))
                          }
                        } catch (error) {
                          console.error('Error toggling integration:', error)
                          toast.showError('Failed to update integration status. Please check your connection and try again.')
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-dark-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
              
              {/* Check if user has verified domains */}
              {!hasVerifiedDomain && user?.allowedDomains && user.allowedDomains.length > 0 && (
                <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="font-semibold text-orange-400 mb-2">Domain Verification Required</p>
                      <p className="text-sm text-white/80 mb-3">
                        Please verify at least one domain before using the integration code. Unverified domains cannot be used for authentication.
                      </p>
                      <button
                        onClick={() => setActiveTab('domains')}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                      >
                        Verify Domain →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {hasVerifiedDomain ? (
                <EmbedCode 
                  key={`embed-${user?.siteId || 'no-site'}`}
                  siteId={user.siteId} 
                  hasCustomStyling={false}
                />
              ) : (
                <div className="bg-dark-800/50 border-2 border-dark-700/50 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Domain Verification Required</h3>
                  <p className="text-white/80 text-base mb-4 leading-relaxed">
                    Please verify at least one domain in the <strong className="text-white">Domains</strong> tab before using the integration code.
                  </p>
                  <button
                    onClick={() => setActiveTab('domains')}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    Go to Domains →
                  </button>
                </div>
              )}

              {/* Backend Requirements Notice - Moved to bottom */}
              <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-6 mt-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-orange-300 mb-3">Important: Backend Integration Required</h3>
                    <p className="text-sm text-orange-200 mb-3">
                      After a user successfully authenticates, you'll receive their <code className="bg-orange-600/30 px-1.5 py-0.5 rounded text-orange-100 font-mono text-xs">xpub</code> (extended public key) in the <code className="bg-orange-600/30 px-1.5 py-0.5 rounded text-orange-100 font-mono text-xs">KeyRex.onSuccess()</code> callback. You <strong className="text-orange-100">should handle this on your backend</strong> to create user sessions and manage authentication state.
                    </p>
                    <div className="bg-orange-600/20 rounded-lg p-4 border border-orange-500/30 mb-3">
                      <p className="text-sm font-semibold text-orange-200 mb-2">What you need to do:</p>
                      <ol className="text-sm text-orange-200 space-y-1.5 list-decimal list-inside ml-2">
                        <li>Register a <code className="bg-orange-600/30 px-1.5 py-0.5 rounded text-orange-100 font-mono text-xs">KeyRex.onSuccess()</code> callback in your website's JavaScript</li>
                        <li>Send the received <code className="bg-orange-600/30 px-1.5 py-0.5 rounded text-orange-100 font-mono text-xs">xpub</code> to your backend server</li>
                        <li>Create a user session on your backend (store the xpub, generate a session token/cookie)</li>
                        <li>Return the session to your frontend to complete the login flow</li>
                      </ol>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-xs text-yellow-200">
                        <strong className="text-yellow-100">Static Sites:</strong> If you're using a static site (GitHub Pages, Netlify, Vercel static, etc.), you'll need to set up a serverless function or backend service to handle the authentication callback. See the <button onClick={() => setActiveTab('documentation')} className="text-yellow-100 hover:text-yellow-50 underline font-semibold">Documentation</button> tab for examples.
                      </p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => setActiveTab('documentation')}
                        className="text-sm text-orange-300 hover:text-orange-200 font-medium underline flex items-center gap-1"
                      >
                        View Backend Integration Examples →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB: Troubleshooting */}
          {activeTab === 'troubleshooting' && (
            <div className="flex gap-6">
              {/* Quick Navigation Pane - Sticky Left Sidebar */}
              <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-[136px] z-30">
                  <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Navigation</h3>
                    <nav className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Quick Tools</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#integration-checker" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('integration-checker')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Integration Checker
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#domain-tester" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('domain-tester')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Domain Tester
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#status-overview" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('status-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Status Overview
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Setup & Verification</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#setup-checklist" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('setup-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Setup Checklist
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#code-examples" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('code-examples')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Code Examples
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#test-domains" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('test-domains')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Test Domains
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Problem Solving</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#common-issues" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('common-issues')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Common Issues
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#quick-fixes" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('quick-fixes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Quick Fixes
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#error-messages" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('error-messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Error Messages
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#backend-troubleshooting" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('backend-troubleshooting')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Backend Integration
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#common-mistakes" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('common-mistakes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Common Mistakes
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#debugging-guide" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('debugging-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Debugging Guide
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#still-not-working" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('still-not-working')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Still Not Working?
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#auto-initialization" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('auto-initialization')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Auto-Initialization
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#popup-blocking" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('popup-blocking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Popup Blocking
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#mobile-desktop-behavior" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('mobile-desktop-behavior')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Mobile vs Desktop
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Advanced Topics</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#url-parameter-cleanup" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('url-parameter-cleanup')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              URL Parameter Cleanup
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#cookie-xpub-retrieval" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('cookie-xpub-retrieval')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Cookie xpub Retrieval
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#skeleton-loading" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('skeleton-loading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Skeleton Loading
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#default-config-fallback" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('default-config-fallback')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Default Config Fallback
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Reference</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#compatibility" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('compatibility')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Browser & Wallets
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#network-cors" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('network-cors')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Network & CORS
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#advanced" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('advanced')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Advanced
                            </a>
                          </li>
                        </ul>
                      </div>
                    </nav>
                  </div>
                </div>
              </div>

              {/* Main Content - Right Side */}
              <div className="flex-1 min-w-0">
                <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                  <h2 className="text-2xl font-semibold text-white mb-4">Troubleshooting</h2>
                  <p className="text-white/80 mb-6">
                    Having issues with your Key-Rex integration? Use the guides below to diagnose and fix common problems.
                  </p>

              {/* Integration Checker */}
              <div id="integration-checker" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Integration Checker</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Run diagnostics to check your dashboard configuration and website integration status.
                </p>
                
                <button
                  onClick={async () => {
                    // Dashboard Configuration Checks
                    const dashboardChecks = [
                      { name: 'Domain configured', check: () => user?.allowedDomains && user.allowedDomains.length > 0 },
                      { name: 'Integration enabled', check: () => user?.integrationEnabled !== false },
                      { name: 'Site ID valid', check: () => user?.siteId && user.siteId.length > 0 },
                      { name: 'User authenticated', check: () => !!user },
                    ]
                    
                    const dashboardResults = dashboardChecks.map(c => ({
                      name: c.name,
                      passed: c.check(),
                    }))
                    
                    const dashboardAllPassed = dashboardResults.every(r => r.passed)
                    const dashboardMessage = dashboardResults.map(r => 
                      `${r.passed ? '✓' : '✗'} ${r.name}`
                    ).join('\n')
                    
                    // Website Integration Checks (manual verification needed)
                    const websiteChecks = [
                      { name: 'Code pasted on website', check: false, note: 'You need to verify this on your website' },
                      { name: 'Script loads successfully', check: false, note: 'Check browser Network tab (F12)' },
                      { name: 'Button appears on page', check: false, note: 'Check your website visually' },
                      { name: 'No JavaScript errors', check: false, note: 'Check browser Console tab (F12)' },
                    ]
                    
                    const websiteMessage = websiteChecks.map(c => 
                      `? ${c.name} - ${c.note}`
                    ).join('\n')
                    
                    // Advanced Diagnostic Checks (if on website page)
                    let advancedChecks = ''
                    if (typeof window !== 'undefined') {
                      const urlParams = new URLSearchParams(window.location.search)
                      const xpubInUrl = urlParams.get('xpub')
                      const cookies = document.cookie.split(';')
                      const hasKeyRexCookies = cookies.some(c => c.trim().startsWith('keyrex_'))
                      const keyRexExists = typeof (window as any).KeyRex !== 'undefined'
                      const buttonExists = document.getElementById('keyrex-button') !== null
                      
                      advancedChecks = `\n---\n\nADVANCED DIAGNOSTICS (Current Page):\n`
                      advancedChecks += `${xpubInUrl ? '⚠️' : '✓'} xpub in URL params: ${xpubInUrl ? 'Found (should be cleaned up)' : 'None (normal)'}\n`
                      advancedChecks += `${hasKeyRexCookies ? '⚠️' : '✓'} Key-Rex cookies: ${hasKeyRexCookies ? 'Found (check if cleanup needed)' : 'None (normal)'}\n`
                      advancedChecks += `${keyRexExists ? '✓' : '✗'} Key-Rex object loaded: ${keyRexExists ? 'Yes' : 'No'}\n`
                      advancedChecks += `${buttonExists ? '✓' : '✗'} Button element exists: ${buttonExists ? 'Yes' : 'No'}\n`
                      
                      if (keyRexExists && (window as any).KeyRex.init) {
                        advancedChecks += `✓ KeyRex.init() available: Yes\n`
                      }
                    } else {
                      advancedChecks = `\n---\n\nADVANCED DIAGNOSTICS:\n⚠️ Run this check on your website page (not dashboard) for full diagnostics\n`
                    }
                    
                    const fullMessage = `DASHBOARD CONFIGURATION:\n${dashboardMessage}\n\n${dashboardAllPassed ? '✓ All dashboard checks passed!' : '✗ Some dashboard checks failed!'}\n\n---\n\nWEBSITE INTEGRATION:\n${websiteMessage}\n\n⚠️ Website checks must be verified on your actual website.${advancedChecks}\n\n${dashboardAllPassed ? 'Your dashboard is configured correctly. Make sure you\'ve pasted the integration code on your website and verify the website checks above.' : 'Fix the dashboard issues first, then verify website integration.'}`
                    
                    alert(fullMessage)
                  }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg mb-4"
                >
                  Test My Integration
                </button>
                
                <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700 mb-4">
                  <p className="text-sm text-white/80 mb-2">
                    <strong>Dashboard Configuration Checks:</strong>
                  </p>
                  <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2 mb-3">
                    <li>Domain is configured in your dashboard</li>
                    <li>Integration is enabled (not turned off)</li>
                    <li>Site ID is valid</li>
                    <li>You're properly authenticated</li>
                  </ul>
                  <p className="text-sm text-white/80 mb-2">
                    <strong>Website Integration Checks:</strong>
                  </p>
                  <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                    <li>Code is pasted on your website</li>
                    <li>Script loads successfully</li>
                    <li>Button appears on page</li>
                    <li>No JavaScript errors in console</li>
                  </ul>
                  <p className="text-xs text-white/60 mt-3">
                    <strong>Note:</strong> Dashboard checks are automated. Website checks must be verified manually on your actual website. Advanced diagnostics only work when the checker is run on a page with Key-Rex integrated. Use the "Setup Verification Checklist" below to verify website integration step-by-step.
                  </p>
                </div>
              </div>

              {/* Domain Integration Tester */}
              {user && (
                <div id="domain-tester" className="mb-6 scroll-mt-24">
                  <DomainTester
                    userSiteId={user.siteId}
                    userDomains={user.allowedDomains || []}
                    integrationEnabled={user.integrationEnabled !== false}
                  />
                </div>
              )}

              {/* Integration Status Overview - Moved up for better UX */}
              <div id="status-overview" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Integration Status Overview</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Quick visual overview of your integration status.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Dashboard Status */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-white mb-3">Dashboard Configuration</h4>
                    <div className="space-y-2">
                      {[
                        { 
                          label: 'Domain Configured', 
                          status: user?.allowedDomains && user.allowedDomains.length > 0,
                          icon: user?.allowedDomains && user.allowedDomains.length > 0 ? '🟢' : '🔴'
                        },
                        { 
                          label: 'Integration Enabled', 
                          status: user?.integrationEnabled !== false,
                          icon: user?.integrationEnabled !== false ? '🟢' : '🔴'
                        },
                        { 
                          label: 'Site ID Valid', 
                          status: !!user?.siteId,
                          icon: user?.siteId ? '🟢' : '🔴'
                        },
                        { 
                          label: 'User Authenticated', 
                          status: !!user,
                          icon: user ? '🟢' : '🔴'
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-dark-800/50 rounded">
                          <span className="text-sm text-white/80">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{item.icon}</span>
                            <span className={`text-xs font-medium ${item.status ? 'text-orange-400' : 'text-red-400'}`}>
                              {item.status ? 'OK' : 'Issue'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overall Status */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-white mb-3">Overall Status</h4>
                    {(() => {
                      const allDashboardChecks = [
                        user?.allowedDomains && user.allowedDomains.length > 0,
                        user?.integrationEnabled !== false,
                        !!user?.siteId,
                        !!user,
                      ]
                      const allPassed = allDashboardChecks.every(check => check)
                      const somePassed = allDashboardChecks.some(check => check)
                      
                      return (
                        <div className="text-center py-4">
                          {allPassed ? (
                            <>
                              <div className="text-6xl mb-3">🟢</div>
                              <p className="text-lg font-semibold text-orange-400 mb-2">All Systems Operational</p>
                              <p className="text-sm text-white/80">Dashboard configuration is correct. Verify website integration using the checklist below.</p>
                            </>
                          ) : somePassed ? (
                            <>
                              <div className="text-6xl mb-3">🟡</div>
                              <p className="text-lg font-semibold text-yellow-400 mb-2">Partial Configuration</p>
                              <p className="text-sm text-white/80">Some dashboard settings need attention. Review the status indicators above.</p>
                            </>
                          ) : (
                            <>
                              <div className="text-6xl mb-3">🔴</div>
                              <p className="text-lg font-semibold text-red-400 mb-2">Configuration Issues</p>
                              <p className="text-sm text-white/80">Dashboard configuration needs to be completed. Follow the setup steps.</p>
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <h4 className="text-base font-semibold text-orange-300 mb-2">Status Legend</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🟢</span>
                      <span className="text-orange-200">OK - Working correctly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🟡</span>
                      <span className="text-orange-200">Warning - Needs attention</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔴</span>
                      <span className="text-orange-200">Issue - Action required</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Setup Verification Checklist */}
              <div id="setup-checklist" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Setup Verification Checklist</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Use this checklist to verify your integration is set up correctly. Check off each step as you complete it.
                </p>
                
                <div className="space-y-3">
                  {[
                    { id: 1, text: 'Domain added in dashboard (Domains tab) and verified' },
                    { id: 2, text: 'Integration code copied from dashboard' },
                    { id: 3, text: 'Code pasted on your website' },
                    { id: 4, text: 'Script loads successfully (check Network tab in browser dev tools)' },
                    { id: 5, text: 'Button appears on your webpage' },
                    { id: 6, text: 'Button is clickable (not disabled or hidden)' },
                    { id: 7, text: 'Wallet prompt appears when clicking button' },
                    { id: 8, text: 'Authentication completes successfully' },
                  ].map((step) => {
                    const isCompleted = (() => {
                      if (step.id === 1) return user?.allowedDomains && user.allowedDomains.length > 0
                      // For other steps, we can't automatically verify, so they're manual
                      return false
                    })()
                    
                    return (
                      <div key={step.id} className="flex items-start gap-3 bg-dark-900/50 rounded-lg p-3 border border-dark-700">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          readOnly
                          className="mt-1 w-5 h-5 text-orange-500 border-dark-600 rounded focus:ring-orange-500 bg-dark-800"
                        />
                        <label className="flex-1 text-white/80 text-sm cursor-pointer">
                          <span className="font-semibold text-white mr-2">{step.id}.</span>
                          {step.text}
                          {step.id === 1 && isCompleted && (
                            <span className="ml-2 text-orange-400 text-xs">✓ Verified</span>
                          )}
                        </label>
                      </div>
                    )
                  })}
                </div>
                
                <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <p className="text-sm text-orange-200">
                    <strong>Tip:</strong> If any step is unchecked, refer to the "Common Issues & Solutions" section below for help.
                  </p>
                </div>
              </div>

              {/* Code Integration Examples - Moved up for better flow */}
              <div id="code-examples" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Code Integration Examples</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  See correct code placement and common mistakes to avoid.
                </p>
                
                <div className="space-y-6">
                  {/* Correct Example */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-orange-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-orange-400 font-bold text-lg">✓</span>
                      <h4 className="text-lg font-semibold text-orange-400">Correct Placement</h4>
                    </div>
                    <div className="bg-dark-950 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<body>
  <!-- Your website content -->
  
  <!-- Place Key-Rex script before closing </body> tag -->
  <script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
  <!-- Note: KeyRex.init() is optional - script auto-initializes when DOM is ready -->
  <script>KeyRex.init();</script>
</body>`}
                      </pre>
                    </div>
                    <p className="text-sm text-white/80 mt-3">
                      <strong>Key points:</strong> Script is in <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code>, includes both script tags. <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> is optional - the script automatically initializes when the DOM is ready, but including it explicitly doesn't hurt.
                    </p>
                  </div>

                  {/* Common Mistakes */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-red-400 font-bold text-lg">✗</span>
                      <h4 className="text-lg font-semibold text-red-400">Common Mistakes</h4>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">❌ Placing script in &lt;head&gt;</p>
                        <div className="bg-dark-950 rounded-lg p-3 overflow-x-auto">
                          <pre className="text-sm text-white/60 font-mono whitespace-pre-wrap break-words">
{`<head>
  <script src="..."></script>  <!-- WRONG -->
</head>`}
                          </pre>
                        </div>
                        <p className="text-xs text-white/60 mt-1">Script should be in <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code>, not <code className="bg-dark-800 px-1 rounded">&lt;head&gt;</code></p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">❌ Forgetting KeyRex.init() (Usually OK, but recommended)</p>
                        <div className="bg-dark-950 rounded-lg p-3 overflow-x-auto">
                          <pre className="text-sm text-white/60 font-mono whitespace-pre-wrap break-words">
{`<script src="..."></script>
<!-- Missing: <script>KeyRex.init();</script> -->`}
                          </pre>
                        </div>
                        <p className="text-xs text-white/60 mt-1">Note: The script auto-initializes, but including <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> is recommended for explicit control and compatibility with some frameworks.</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">❌ Using wrong siteId</p>
                        <div className="bg-dark-950 rounded-lg p-3 overflow-x-auto">
                          <pre className="text-sm text-white/60 font-mono whitespace-pre-wrap break-words">
{`<script src="...?siteId=WRONG_ID"></script>  <!-- WRONG -->`}
                          </pre>
                        </div>
                        <p className="text-xs text-white/60 mt-1">Always copy the exact code from your dashboard</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">❌ Multiple script tags</p>
                        <div className="bg-dark-950 rounded-lg p-3 overflow-x-auto">
                          <pre className="text-sm text-white/60 font-mono whitespace-pre-wrap break-words">
{`<script src="..."></script>
<script src="..."></script>  <!-- Duplicate! -->`}
                          </pre>
                        </div>
                        <p className="text-xs text-white/60 mt-1">Only include the script once per page</p>
                      </div>
                    </div>
                  </div>

                  {/* Copy-Paste Ready Code */}
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <h4 className="text-base font-semibold text-orange-300 mb-2">📋 Copy-Paste Ready Code</h4>
                    <p className="text-sm text-orange-200 mb-3">
                      Copy this template and replace <code className="bg-dark-800 px-1 rounded">YOUR_SITE_ID</code> with your actual Site ID from the "My Integration Code" tab:
                    </p>
                    <div className="bg-dark-950 rounded-lg p-4 overflow-x-auto mb-3">
                      <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<!-- Key-Rex Integration Code -->
<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
<!-- Note: KeyRex.init() is optional - script auto-initializes when DOM is ready -->
<script>KeyRex.init();</script>`}
                      </pre>
                    </div>
                    <button
                      onClick={() => {
                        const code = `<!-- Key-Rex Integration Code -->\n<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}"></script>\n<script>KeyRex.init();</script>`
                        navigator.clipboard.writeText(code)
                        toast.showSuccess('✓ Code copied to clipboard! Paste it on your website.')
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
                    >
                      Copy Code Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Domains & Development - Moved up for better flow */}
              <div id="test-domains" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Test Domains & Development</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding how test domains work and how to use them for local development.
                </p>

                <div className="space-y-6">
                  {/* What Are Test Domains */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">What Are Test Domains?</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        Test domains are automatically recognized and verified by Key-Rex for local development. They work whether or not you add them to your dashboard—you can add them if you want, but they'll work automatically even if you don't.
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Automatically allowed test domains:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><code className="bg-dark-800 px-1 rounded">localhost</code> - Standard local development domain</li>
                          <li><code className="bg-dark-800 px-1 rounded">127.0.0.1</code> - Localhost IP address</li>
                          <li><code className="bg-dark-800 px-1 rounded">test.example.com</code> - Test subdomains (any subdomain with "test")</li>
                          <li><code className="bg-dark-800 px-1 rounded">staging.example.com</code> - Staging subdomains (any subdomain with "staging")</li>
                        </ul>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Automatic:</strong> These domains work immediately without adding them to your dashboard. Perfect for local development and testing.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Using Test Domains */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Using Test Domains for Development</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Local development setup:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Start your local development server (e.g., <code className="bg-dark-800 px-1 rounded">npm run dev</code>, <code className="bg-dark-800 px-1 rounded">python -m http.server</code>)</li>
                          <li>Access your site at <code className="bg-dark-800 px-1 rounded">http://localhost:3000</code> or <code className="bg-dark-800 px-1 rounded">http://127.0.0.1:3000</code></li>
                          <li>Add Key-Rex integration code to your local HTML file</li>
                          <li>Test authentication - it will work without adding the domain to dashboard</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Test subdomain setup:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Use <code className="bg-dark-800 px-1 rounded">test.yourdomain.com</code> or <code className="bg-dark-800 px-1 rounded">staging.yourdomain.com</code></li>
                          <li>These work automatically without adding to dashboard</li>
                          <li>Perfect for testing on a staging server</li>
                        </ul>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-yellow-200">
                          <strong>Important:</strong> Test domains are for development only. For production, you must add your actual production domain to the dashboard and verify it via DNS TXT record.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting Test Domains */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting Test Domains</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">"Domain not authorized" on localhost:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Verify you're using <code className="bg-dark-800 px-1 rounded">localhost</code> or <code className="bg-dark-800 px-1 rounded">127.0.0.1</code> (not a custom domain)</li>
                          <li>Check if you're using HTTPS - test domains work with HTTP</li>
                          <li>Ensure integration is enabled in dashboard</li>
                          <li>Check browser console for specific error message</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Test domain not recognized:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Verify domain contains "test" or "staging" as subdomain</li>
                          <li>Check exact domain format (e.g., <code className="bg-dark-800 px-1 rounded">test.example.com</code>, not <code className="bg-dark-800 px-1 rounded">example-test.com</code>)</li>
                          <li>If needed, add the domain manually to dashboard (test domains can also be added manually)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Production domain not working:</p>
                        <p>Remember: Test domains are auto-allowed, but production domains must be added to your dashboard and verified. If your production domain isn't working:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Go to "Domains" tab in dashboard</li>
                          <li>Add your production domain (e.g., <code className="bg-dark-800 px-1 rounded">example.com</code>)</li>
                          <li>Verify domain ownership by adding the DNS TXT record shown in the dashboard</li>
                          <li>Click "Verify" after adding the DNS record (wait 5-10 minutes for DNS propagation)</li>
                          <li>Add both www and non-www versions if you use both (each requires separate verification)</li>
                          <li>Verify domain matches exactly as it appears in browser address bar</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Common Issues & Solutions */}
              <div id="common-issues" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Common Issues & Solutions</h3>
                
                <div className="space-y-6">
                  {/* Issue 1: Button Not Showing */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-lg font-semibold text-orange-400 mb-3">Button Not Showing Up</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Things to Check:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Domain is added and verified in your dashboard (Domains tab)</li>
                          <li>Integration code is pasted correctly on your website</li>
                          <li>No JavaScript errors in browser console (press F12 to check)</li>
                          <li>Script loads successfully (check Network tab in browser dev tools)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Solution:</p>
                        <p>Verify the script tag is placed in the <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code> section or just before the closing <code className="bg-dark-800 px-1 rounded">&lt;/body&gt;</code> tag. The script should not be in the <code className="bg-dark-800 px-1 rounded">&lt;head&gt;</code> section.</p>
                      </div>
                    </div>
                  </div>

                  {/* Issue 2: Authentication Not Working */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-lg font-semibold text-orange-400 mb-3">Authentication Not Working</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Things to Check:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Domain matches exactly (including www vs non-www)</li>
                          <li>User has a compatible Lightning wallet installed</li>
                          <li>Wallet supports LNURL-auth protocol</li>
                          <li>Browser console shows no errors (press F12 to check)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Solution:</p>
                        <p>Try a different Lightning wallet. Use any wallet that supports LNURL-auth (browser extensions or mobile apps). Make sure your domain is added and verified in the Domains tab.</p>
                      </div>
                    </div>
                  </div>

                  {/* Issue 3: Domain Not Authorized */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-lg font-semibold text-orange-400 mb-3">"This domain is not verified" or "This domain is not authorized" Error</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">What This Means:</p>
                        <p>The domain where you're trying to use Key-Rex authentication is not verified, or it's not in your allowed domains list. Production domains must be verified via DNS TXT record before authentication works.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Things to Check:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Domain is added and verified in your dashboard (Domains tab)</li>
                          <li>Domain matches exactly (case-insensitive, but subdomains matter)</li>
                          <li>No trailing slashes or paths in the domain</li>
                          <li>Both www and non-www versions are added and verified if you use both</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Solution:</p>
                        <p>Go to the <strong>Domains</strong> tab, add your domain if it's not listed, and verify it by adding the DNS TXT record shown in the dashboard. After adding the DNS record, wait 5-10 minutes for propagation, then click "Verify". If you use both <code className="bg-dark-800 px-1 rounded">www.example.com</code> and <code className="bg-dark-800 px-1 rounded">example.com</code>, add and verify both separately. Test domains (localhost, *.test, staging.*) work automatically without verification.</p>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2 mt-2">
                        <p className="text-xs text-orange-200">
                          <strong>Note:</strong> Test domains like <code className="bg-orange-600/30 px-1 rounded">localhost</code> and <code className="bg-orange-600/30 px-1 rounded">127.0.0.1</code> are automatically allowed for development and don't need to be added to your domains list.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Issue 4: Integration Disabled */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-lg font-semibold text-orange-400 mb-3">"Key-Rex authentication is currently disabled" Error</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">What This Means:</p>
                        <p>The integration toggle in your dashboard is turned off, which disables authentication on all your domains. Users will see the message: <code className="bg-dark-800 px-1 rounded">"Key-Rex authentication is currently disabled. Please contact the website owner."</code></p>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Solution:</p>
                        <p>Go to the <strong>My Integration Code</strong> tab and toggle the "Integration Status" switch to <strong>ON</strong> (green/active). This will re-enable authentication on all your domains.</p>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mt-2">
                        <p className="text-xs text-yellow-200">
                          <strong>Console Message:</strong> You may also see <code className="bg-yellow-600/30 px-1 rounded">"Integration is disabled"</code> in the browser console (F12). This is the same issue - enable integration in your dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Fixes Section - Moved right after Common Issues */}
              <div id="quick-fixes" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Quick Fixes</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Still not working? Try these quick fixes before diving deeper.
                </p>
                
                <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700 mb-4">
                  <h4 className="text-base font-semibold text-white mb-3">Try These Steps:</h4>
                  <div className="space-y-3">
                    {[
                      {
                        step: 'Clear browser cache',
                        description: 'Old cached files might be interfering. Clear your browser cache and reload the page.',
                        action: 'Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac) to clear cache',
                      },
                      {
                        step: 'Try incognito/private mode',
                        description: 'Extensions or cached data might be causing issues. Test in a private/incognito window.',
                        action: 'Open a new incognito/private window and test your integration',
                      },
                      {
                        step: 'Try a different browser',
                        description: 'Browser-specific issues can occur. Test in Chrome, Firefox, Safari, or Edge.',
                        action: 'Install and test in a different browser',
                      },
                      {
                        step: 'Check for JavaScript errors',
                        description: 'Open browser developer tools (F12) and check the Console tab for errors.',
                        action: 'Press F12, go to Console tab, look for red error messages',
                      },
                      {
                        step: 'Verify domain spelling',
                        description: 'Domain must match exactly as added in your dashboard (including www vs non-www).',
                        action: 'Double-check domain spelling in Domains tab matches your website URL',
                      },
                      {
                        step: 'Check integration is enabled',
                        description: 'Make sure the integration toggle is ON in the "My Integration Code" tab.',
                        action: 'Go to "My Integration Code" tab, verify Integration Status is Active (green)',
                      },
                    ].map((fix, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-dark-800/50 rounded-lg p-3 border border-dark-700">
                        <div className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-orange-400 font-bold text-xs">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-semibold text-white mb-1">{fix.step}</h5>
                          <p className="text-xs text-white/80 mb-2">{fix.description}</p>
                          <p className="text-xs text-white/60 italic">{fix.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <h4 className="text-base font-semibold text-orange-300 mb-2">Still Need Help?</h4>
                  <p className="text-sm text-orange-200 mb-3">
                    If none of these solutions work, review the sections above for more detailed guidance:
                  </p>
                  <ul className="text-sm text-orange-100 space-y-1 list-disc list-inside ml-2">
                    <li>Check the "Common Issues & Solutions" section for specific problems</li>
                    <li>Review the "Error Messages Reference" if you're seeing error messages</li>
                    <li>Use the "Setup Verification Checklist" to ensure all steps are completed</li>
                    <li>Run the "Integration Checker" to verify your configuration</li>
                  </ul>
                </div>
              </div>

              {/* Auto-Initialization Behavior */}
              <div id="auto-initialization" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Auto-Initialization Behavior</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding how Key-Rex automatically initializes and when manual initialization is needed.
                </p>

                <div className="space-y-6">
                  {/* How Auto-Init Works */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">How Auto-Initialization Works</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        The Key-Rex embed script automatically calls <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> when the DOM is ready. This means you typically don't need to call <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> manually.
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Auto-initialization sequence:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Script loads and creates <code className="bg-dark-800 px-1 rounded">window.KeyRex</code> object</li>
                          <li>Script checks if DOM is already ready (<code className="bg-dark-800 px-1 rounded">document.readyState</code>)</li>
                          <li>If DOM is ready: calls <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> immediately</li>
                          <li>If DOM is loading: waits for <code className="bg-dark-800 px-1 rounded">DOMContentLoaded</code> event, then calls <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code></li>
                          <li>Button and wallets are rendered automatically</li>
                        </ol>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Key Point:</strong> The <code className="bg-orange-600/30 px-1 rounded">KeyRex.init()</code> call in your integration code is optional. The script will work without it, but including it doesn't hurt and can be useful for explicit control.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* When Manual Init is Needed */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">When Manual Initialization is Needed</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        In most cases, auto-initialization works perfectly. However, you may need manual initialization in these scenarios:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong className="text-white">Delayed Loading:</strong> If you load the script dynamically after page load, you may want to call <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> after the script loads</li>
                        <li><strong className="text-white">Framework Integration:</strong> In React/Vue/Next.js, if the script loads before your component mounts, you may need to call <code className="bg-dark-800 px-1 rounded">init()</code> in a <code className="bg-dark-800 px-1 rounded">useEffect</code> or <code className="bg-dark-800 px-1 rounded">onMounted</code> hook</li>
                        <li><strong className="text-white">Conditional Rendering:</strong> If you only want to show Key-Rex on certain pages or after user actions, call <code className="bg-dark-800 px-1 rounded">init()</code> when needed</li>
                        <li><strong className="text-white">Multiple Initializations:</strong> If you need to re-initialize after DOM changes, you can call <code className="bg-dark-800 px-1 rounded">init()</code> again (it's safe to call multiple times)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Troubleshooting Auto-Init */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting Auto-Initialization</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Button doesn't appear automatically:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Check browser console (F12) for errors</li>
                          <li>Verify script loaded successfully (Network tab)</li>
                          <li>Check if <code className="bg-dark-800 px-1 rounded">window.KeyRex</code> exists: <code className="bg-dark-800 px-1 rounded">console.log(window.KeyRex)</code></li>
                          <li>Try calling <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> manually in console</li>
                          <li>Verify domain is added and integration is enabled</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Button appears twice:</p>
                        <p>This happens if you call <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> manually AND auto-init runs. Solution: Remove the manual <code className="bg-dark-800 px-1 rounded">init()</code> call, or ensure it only runs once.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Button appears before container is ready:</p>
                        <p>If you're using <code className="bg-dark-800 px-1 rounded">id="keyrex-container"</code>, make sure the container element exists in the DOM before the script loads. Otherwise, the button will be appended to <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code>.</p>
                      </div>
                    </div>
                  </div>

                  {/* Code Examples */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Code Examples</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">✓ Auto-initialization (recommended):</p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<!-- Script auto-initializes when DOM is ready -->
<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
<!-- Note: KeyRex.init() is optional - script auto-initializes -->
<!-- Including it explicitly is recommended for compatibility -->
<script>KeyRex.init();</script>`}
                          </pre>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Manual initialization (when needed):</p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Load script dynamically
const script = document.createElement('script');
script.src = 'https://yourdomain.com/embed?siteId=YOUR_SITE_ID';
script.onload = function() {
  // Script is loaded, but init() may have already run (auto-init)
  // Call init() again if needed (safe to call multiple times)
  if (window.KeyRex) {
    KeyRex.init();
  }
};
document.body.appendChild(script);`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Popup Blocking & Fallback */}
              <div id="popup-blocking" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Popup Blocking & Fallback</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding how Key-Rex handles popup blockers and automatically falls back to redirect mode.
                </p>

                <div className="space-y-6">
                  {/* How Popup Blocking Works */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">How Popup Blocking Detection Works</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        On desktop, Key-Rex attempts to open a popup window for QR code authentication. If the browser blocks the popup, Key-Rex automatically detects this and falls back to a full-page redirect (same as mobile flow).
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Detection process:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Script calls <code className="bg-dark-800 px-1 rounded">window.open()</code> to create popup</li>
                          <li>If popup is blocked, <code className="bg-dark-800 px-1 rounded">window.open()</code> returns <code className="bg-dark-800 px-1 rounded">null</code></li>
                          <li>Script detects <code className="bg-dark-800 px-1 rounded">null</code> return value</li>
                          <li>Automatically switches to full-page redirect mode</li>
                          <li>Stores challenge in cookie for cross-domain support</li>
                          <li>Redirects to QR page, then back to your site with xpub in URL</li>
                        </ol>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Automatic:</strong> This fallback happens automatically - no action needed from you. Users with popup blockers will experience the same redirect flow as mobile users.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* User Experience Differences */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">User Experience Differences</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Popup Mode (Desktop, no blocker):</p>
                        <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                          <li>Popup window opens (600x800px, centered)</li>
                          <li>Main page stays visible in background</li>
                          <li>User scans QR code in popup</li>
                          <li>Popup closes automatically after authentication</li>
                          <li>No page reload - seamless experience</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Redirect Mode (Mobile or popup blocked):</p>
                        <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                          <li>Entire page redirects to QR code page</li>
                          <li>User scans QR code on full page</li>
                          <li>Page redirects back to your site with xpub in URL</li>
                          <li>URL parameter is automatically cleaned up</li>
                          <li>Page may briefly reload (but URL is cleaned)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting Popup Blocking */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting Popup Blocking</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">How to test popup blocking:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Enable popup blocker in your browser settings</li>
                          <li>Click the Key-Rex button on your website</li>
                          <li>You should see a full-page redirect (not a popup)</li>
                          <li>Authentication should still work normally</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Popup opens but closes immediately:</p>
                        <p>This might indicate a JavaScript error in the popup. Check the browser console (F12) in the popup window for errors. Also verify your domain is added and integration is enabled.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Redirect happens but xpub not received:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Check browser console for errors</li>
                          <li>Verify cookies are enabled in browser</li>
                          <li>Check if URL contains <code className="bg-dark-800 px-1 rounded">?xpub=...</code> parameter</li>
                          <li>Ensure <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code> callback is set up</li>
                        </ul>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-yellow-200">
                          <strong>Browser-Specific:</strong> Some browsers (especially Safari) are more aggressive with popup blocking. The automatic fallback ensures authentication works regardless of browser settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile vs Desktop Behavior */}
              <div id="mobile-desktop-behavior" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Mobile vs Desktop Behavior</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding the differences between mobile and desktop authentication flows and how to test both.
                </p>

                <div className="space-y-6">
                  {/* Desktop Behavior */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Desktop Behavior</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Authentication Flow:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>User clicks Key-Rex button</li>
                          <li>Script checks for WebLN browser extension</li>
                          <li>If WebLN available: Direct authentication in browser</li>
                          <li>If no WebLN: Popup window opens with QR code (or redirect if popup blocked)</li>
                          <li>User scans QR with mobile wallet or approves in extension</li>
                          <li>xpub delivered via postMessage (popup) or URL params (redirect)</li>
                          <li>Button and page remain visible (popup mode) or page redirects (redirect mode)</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Key Features:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>WebLN extensions work seamlessly</li>
                          <li>Popup maintains page context (better UX)</li>
                          <li>postMessage communication between popup and main window</li>
                          <li>Automatic fallback to redirect if popup is blocked</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Behavior */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Mobile Behavior</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Authentication Flow:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>User clicks Key-Rex button</li>
                          <li>Script detects mobile device</li>
                          <li>Full-page redirect to QR code page (more reliable on mobile)</li>
                          <li>User scans QR code with another device or switches to wallet app</li>
                          <li>Wallet authenticates and calls Key-Rex callback</li>
                          <li>QR page detects authentication via polling</li>
                          <li>Page redirects back to your site with xpub in URL: <code className="bg-dark-800 px-1 rounded">?xpub=...</code></li>
                          <li>Key-Rex script detects xpub in URL and calls <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code></li>
                          <li>URL parameter is automatically cleaned up</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Key Features:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Full-page redirect (more reliable than popups on mobile)</li>
                          <li>WebLN may not be available (depends on mobile browser)</li>
                          <li>xpub delivered via URL parameters</li>
                          <li>Better for users scanning QR codes with separate device</li>
                          <li>Works even if cookies are restricted</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Testing Both Environments */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Testing Both Environments</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Desktop Testing:</p>
                        <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                          <li>Test with a WebLN extension - should authenticate directly</li>
                          <li>Test without WebLN - should open popup with QR code</li>
                          <li>Test with popup blocker enabled - should fallback to redirect</li>
                          <li>Test with different browsers (Chrome, Firefox, Safari, Edge)</li>
                          <li>Verify postMessage communication works (check console)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Mobile Testing:</p>
                        <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                          <li>Test on actual mobile device (iOS Safari, Android Chrome)</li>
                          <li>Test QR code scanning with separate device</li>
                          <li>Test with different mobile wallets</li>
                          <li>Verify URL parameter cleanup (xpub should be removed from URL)</li>
                          <li>Test in mobile browser's private/incognito mode</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Cross-Device Testing:</p>
                        <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                          <li>Open QR code on desktop, scan with mobile wallet</li>
                          <li>Verify authentication completes successfully</li>
                          <li>Check that xpub is received correctly</li>
                        </ul>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Tip:</strong> Use browser DevTools device emulation to test mobile behavior, but always test on real devices for production verification.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Common Mobile Issues */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Common Mobile Issues</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-1">"xpub not received after redirect"</p>
                        <p>Check if URL contains <code className="bg-dark-800 px-1 rounded">?xpub=...</code> parameter. If not, verify cookies are enabled and domain is added correctly.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">"QR code doesn't appear on mobile"</p>
                        <p>Verify mobile device detection is working. Check browser console for errors. Ensure script loads successfully on mobile.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">"Authentication works but page doesn't redirect back"</p>
                        <p>Check if <code className="bg-dark-800 px-1 rounded">returnUrl</code> parameter is correctly set. Verify cookies are enabled for cross-domain redirects.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Messages Reference */}
              <div id="error-messages" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Error Messages Reference</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Quick reference guide for common error messages and how to fix them.
                </p>
                
                <div className="space-y-4">
                  {[
                    {
                      error: '"Invalid siteId"',
                      meaning: 'Site ID not found or invalid',
                      solution: 'Re-copy your integration code from the "My Integration Code" tab. Make sure you\'re using the correct code for your account.',
                    },
                    {
                      error: '"This domain is not authorized — add it in your dashboard"',
                      meaning: 'The domain where the button is embedded is not in your allowed domains list',
                      solution: 'Go to the "Domains" tab, add your domain, and verify it by adding the DNS TXT record shown. Make sure the domain matches exactly (including www vs non-www). Note: Test domains like localhost and 127.0.0.1 are automatically allowed for development and don\'t require verification.',
                    },
                    {
                      error: '"Key-Rex authentication is currently disabled. Please contact the website owner."',
                      meaning: 'The integration toggle in your dashboard is turned off, which disables authentication on all domains',
                      solution: 'Go to the "My Integration Code" tab and toggle the "Integration Status" switch to ON (green/active). This will re-enable authentication on all your domains.',
                    },
                    {
                      error: '"Integration is disabled"',
                      meaning: 'Same as above - the integration toggle is turned off (this is the console error message)',
                      solution: 'Go to the "My Integration Code" tab and toggle the "Integration Status" switch to ON (green/active).',
                    },
                    {
                      error: '"Failed to load configuration"',
                      meaning: 'Unable to connect to Key-Rex servers or load your integration configuration',
                      solution: 'Check your internet connection and try again. If the problem persists, check if Key-Rex servers are accessible. Note: The script will use a default configuration if the API fails, so the button may still appear.',
                    },
                    {
                      error: '"Authentication timed out"',
                      meaning: 'The authentication process took too long to complete (polling timeout after wallet callback)',
                      solution: 'Try authenticating again. This can happen if the wallet takes too long to respond or if there are network issues. Ensure your Lightning wallet is properly connected and try a different wallet if the issue persists.',
                    },
                    {
                      error: '"Invalid signature"',
                      meaning: 'The wallet signature verification failed - the authentication challenge was not properly signed',
                      solution: 'Try authenticating again with your Lightning wallet. If the issue persists, try a different wallet. Ensure your wallet supports LNURL-auth protocol and is properly configured.',
                    },
                    {
                      error: '"Missing parameters"',
                      meaning: 'An API call is missing required parameters (k1, sig, key, or siteId)',
                      solution: 'This is typically an internal error. Try refreshing the page and authenticating again. If the problem persists, check the browser console (F12) for more details and ensure your integration code is correctly pasted.',
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                          <span className="text-red-400 font-bold text-sm">!</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-red-400 mb-1 font-mono">{item.error}</h4>
                          <p className="text-sm text-white/80 mb-2">
                            <strong>Meaning:</strong> {item.meaning}
                          </p>
                          <p className="text-sm text-white/80">
                            <strong>Solution:</strong> {item.solution}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backend Integration Troubleshooting - New Section */}
              <div id="backend-troubleshooting" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Backend Integration Troubleshooting</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Common issues when integrating Key-Rex authentication with your backend server.
                </p>

                <div className="space-y-6">
                  {/* CORS Issues */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">CORS (Cross-Origin Resource Sharing) Issues</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        If your frontend and backend are on different domains, you may encounter CORS errors when making API calls with the xpub.
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Common CORS errors:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><code className="bg-dark-800 px-1 rounded">Access-Control-Allow-Origin</code> header missing</li>
                          <li><code className="bg-dark-800 px-1 rounded">Access-Control-Allow-Credentials</code> not set when using cookies</li>
                          <li>Preflight OPTIONS request failing</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Solutions:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Configure your backend to allow requests from your frontend domain</li>
                          <li>Set appropriate CORS headers (see Network & CORS section for details)</li>
                          <li>If using cookies, ensure <code className="bg-dark-800 px-1 rounded">credentials: 'include'</code> is set in fetch calls</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* xpub Handling Issues */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">xpub Handling on Backend</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Common issues:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>xpub not received in API request</li>
                          <li>xpub format incorrect or malformed</li>
                          <li>Session not persisting after authentication</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">How xpub is delivered:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Via URL parameter: <code className="bg-dark-800 px-1 rounded">?xpub=...</code> (mobile/redirect flow)</li>
                          <li>Via postMessage: <code className="bg-dark-800 px-1 rounded">event.data.xpub</code> (desktop popup flow)</li>
                          <li>Via cookie: <code className="bg-dark-800 px-1 rounded">keyrex_xpub_&lt;k1prefix&gt;</code> (fallback)</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Best practices:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Always validate xpub format before storing</li>
                          <li>Use xpub as a unique user identifier (don't store sensitive data)</li>
                          <li>Implement proper session management after receiving xpub</li>
                          <li>Handle both URL parameter and postMessage delivery methods</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* API Endpoint Errors */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">API Endpoint Errors</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Common backend API issues:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>404 Not Found - endpoint doesn't exist</li>
                          <li>401 Unauthorized - authentication required but missing</li>
                          <li>500 Internal Server Error - server-side processing failed</li>
                          <li>Network timeout - request took too long</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Debugging steps:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Check browser Network tab (F12) to see the actual request/response</li>
                          <li>Verify your backend endpoint is running and accessible</li>
                          <li>Check backend server logs for errors</li>
                          <li>Test the endpoint directly with a tool like Postman or curl</li>
                          <li>Verify request format matches what your backend expects</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Session Management */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Session Management Issues</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Common session problems:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>User authenticated but session not created</li>
                          <li>Session expires too quickly</li>
                          <li>Session not persisting across page reloads</li>
                          <li>Multiple sessions for same user</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Recommended approach:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>When xpub is received, create a session on your backend</li>
                          <li>Store session ID in a secure HTTP-only cookie</li>
                          <li>Use xpub as the user identifier in your database</li>
                          <li>Implement session expiration and refresh logic</li>
                          <li>Handle session cleanup on logout</li>
                        </ol>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Security Note:</strong> Never trust the xpub alone for authentication. Always verify it came from Key-Rex and create a proper server-side session.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Common Integration Mistakes - New Section */}
              <div id="common-mistakes" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Common Integration Mistakes</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Avoid these common mistakes that prevent Key-Rex from working correctly.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      mistake: 'Missing onSuccess/onError callbacks',
                      description: 'Not setting up callbacks means you won\'t know when authentication succeeds or fails.',
                      fix: 'Always set up KeyRex.onSuccess() and KeyRex.onError() callbacks before the script loads or immediately after.',
                      code: `window.KeyRex = window.KeyRex || {};
window.KeyRex.onSuccess = function(xpub) {
  console.log('User authenticated:', xpub);
  // Handle successful authentication
};
window.KeyRex.onError = function(error) {
  console.error('Authentication error:', error);
  // Handle error
};`
                    },
                    {
                      mistake: 'Multiple script tags on same page',
                      description: 'Loading the Key-Rex script multiple times can cause conflicts and duplicate buttons.',
                      fix: 'Only include the Key-Rex script once per page. Check for duplicate script tags in your HTML.',
                    },
                    {
                      mistake: 'Script in &lt;head&gt; instead of &lt;body&gt;',
                      description: 'Placing the script in the head can cause timing issues with DOM elements.',
                      fix: 'Always place the Key-Rex script before the closing </body> tag, not in <head>.',
                    },
                    {
                      mistake: 'Wrong siteId or hardcoded siteId',
                      description: 'Using an incorrect siteId or hardcoding it instead of using your actual siteId.',
                      fix: 'Always copy the exact integration code from your dashboard. Never hardcode or modify the siteId.',
                    },
                    {
                      mistake: 'Not handling xpub delivery methods',
                      description: 'Only checking for xpub in one place (URL params OR postMessage) but not both.',
                      fix: 'Handle both URL parameter delivery (mobile/redirect) and postMessage delivery (desktop popup). The Key-Rex script handles this automatically, but your backend should accept xpub from either source.',
                    },
                    {
                      mistake: 'Forgetting to add and verify domain to dashboard',
                      description: 'Trying to use Key-Rex on a domain that hasn\'t been added to your dashboard or verified.',
                      fix: 'Add your production domain to the "Domains" tab and verify it by adding the DNS TXT record shown. Test domains (localhost, 127.0.0.1) are automatically allowed and don\'t require verification.',
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-dark-900/50 rounded-lg p-4 border border-red-500/30">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                          <span className="text-red-400 font-bold text-sm">✗</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-red-400 mb-2">{item.mistake}</h4>
                          <p className="text-sm text-white/80 mb-2">{item.description}</p>
                          <p className="text-sm text-white/80 mb-2">
                            <strong>Fix:</strong> {item.fix}
                          </p>
                          {item.code && (
                            <div className="bg-dark-950 rounded-lg p-3 mt-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">{item.code}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Debugging Guide - New Section */}
              <div id="debugging-guide" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Step-by-Step Debugging Guide</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Follow these steps in order to systematically diagnose integration issues.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: 'Check Dashboard Configuration',
                      checks: [
                        'Domain is added in "Domains" tab',
                        'Integration Status is ON (green) in "My Integration Code" tab',
                        'Site ID is correct and matches your integration code',
                        'Run the "Integration Checker" tool at the top of this page'
                      ]
                    },
                    {
                      step: 2,
                      title: 'Verify Code Integration',
                      checks: [
                        'Integration code is pasted correctly on your website',
                        'Script is in <body>, not <head>',
                        'Only one script tag exists (no duplicates)',
                        'KeyRex.init() is called (optional but recommended)'
                      ]
                    },
                    {
                      step: 3,
                      title: 'Check Browser Console',
                      checks: [
                        'Open browser Developer Tools (F12)',
                        'Go to Console tab',
                        'Look for red error messages',
                        'Check if Key-Rex object exists: type "KeyRex" in console',
                        'Verify button element exists: document.getElementById("keyrex-button")'
                      ]
                    },
                    {
                      step: 4,
                      title: 'Inspect Network Requests',
                      checks: [
                        'Open Network tab in Developer Tools (F12)',
                        'Reload page and look for embed script request',
                        'Check for /api/embed/config request (should return 200 OK)',
                        'Verify no CORS errors in Network tab',
                        'Check if requests are being blocked'
                      ]
                    },
                    {
                      step: 5,
                      title: 'Test Authentication Flow',
                      checks: [
                        'Click the Key-Rex button',
                        'Verify wallet prompt appears (WebLN) or QR code shows',
                        'Complete authentication with your wallet',
                        'Check if onSuccess callback is called',
                        'Verify xpub is received (check console logs)'
                      ]
                    },
                    {
                      step: 6,
                      title: 'Check Backend Integration',
                      checks: [
                        'Verify backend receives xpub (check server logs)',
                        'Test backend API endpoint directly',
                        'Check for CORS errors in Network tab',
                        'Verify session is created after authentication',
                        'Test session persistence across page reloads'
                      ]
                    },
                  ].map((item) => (
                    <div key={item.step} className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                          <span className="text-orange-400 font-bold text-sm">{item.step}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-white mb-3">{item.title}</h4>
                          <ul className="space-y-2">
                            {item.checks.map((check, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                                <span className="text-orange-400 mt-1">•</span>
                                <span>{check}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mt-6">
                  <h4 className="text-base font-semibold text-orange-300 mb-2">💡 Pro Tip</h4>
                  <p className="text-sm text-orange-200">
                    Work through these steps in order. Most issues are found in steps 1-3. If you reach step 6 and still have issues, review the "Backend Integration Troubleshooting" section above.
                  </p>
                </div>
              </div>

              {/* Still Not Working? - New Section */}
              <div id="still-not-working" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Still Not Working?</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  If you've tried everything above and still can't get Key-Rex working, use this checklist before seeking help.
                </p>

                <div className="space-y-6">
                  {/* Pre-Support Checklist */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Pre-Support Checklist</h4>
                    <p className="text-sm text-white/80 mb-4">
                      Complete all of these before contacting support:
                    </p>
                    <div className="space-y-3">
                      {[
                        'Completed all steps in "Step-by-Step Debugging Guide" above',
                        'Ran the "Integration Checker" tool and reviewed results',
                        'Checked browser console (F12) for error messages',
                        'Tested in multiple browsers (Chrome, Firefox, Safari)',
                        'Tested in incognito/private mode',
                        'Cleared browser cache and cookies',
                        'Verified domain is added in dashboard (or using test domain)',
                        'Verified integration is enabled in dashboard',
                        'Checked Network tab for failed requests',
                        'Reviewed all relevant sections in this Troubleshooting tab'
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <input type="checkbox" className="mt-1 w-5 h-5 text-orange-500 border-dark-600 rounded focus:ring-orange-500 bg-dark-800" />
                          <label className="text-sm text-white/80">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Information to Gather */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Information to Gather</h4>
                    <p className="text-sm text-white/80 mb-4">
                      If you need to contact support, gather this information:
                    </p>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Browser Information:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Browser name and version (e.g., Chrome 120.0.0.0)</li>
                          <li>Operating system (e.g., macOS 14.0, Windows 11)</li>
                          <li>Extensions installed (especially ad blockers or privacy tools)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Error Messages:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Exact error message from browser console</li>
                          <li>Screenshot of console errors</li>
                          <li>Network tab errors (if any)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Configuration:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Your Site ID (from dashboard)</li>
                          <li>Domain(s) you're testing on</li>
                          <li>Integration status (enabled/disabled)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Steps to Reproduce:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>What you did (step-by-step)</li>
                          <li>What you expected to happen</li>
                          <li>What actually happened</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Self-Service Resources */}
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5">
                    <h4 className="text-lg font-semibold text-orange-300 mb-3">Self-Service Resources</h4>
                    <p className="text-sm text-orange-200 mb-4">
                      Before contacting support, make sure you've reviewed:
                    </p>
                    <ul className="text-sm text-orange-100 space-y-2 list-disc list-inside ml-2">
                      <li><strong>Documentation Tab:</strong> Complete integration guide with examples</li>
                      <li><strong>This Troubleshooting Tab:</strong> All sections relevant to your issue</li>
                      <li><strong>Integration Checker:</strong> Automated diagnostic tool</li>
                      <li><strong>Code Examples:</strong> Verify your code matches the correct format</li>
                      <li><strong>Error Messages Reference:</strong> Look up specific error messages</li>
                    </ul>
                    <div className="bg-orange-600/20 border border-orange-500/50 rounded p-3 mt-4">
                      <p className="text-xs text-orange-100">
                        <strong>Note:</strong> Most issues can be resolved using the resources in this dashboard. Take your time to work through the troubleshooting steps - they're designed to help you solve problems independently.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Browser & Wallet Compatibility */}
              <div id="compatibility" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Browser & Wallet Compatibility</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Ensure your users have compatible browsers and wallets for the best experience.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supported Wallets */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-white mb-3">Supported Wallets</h4>
                    <div className="space-y-2">
                      {[
                        { name: 'Browser Extension Wallets', type: 'Desktop', status: '✓ Supported', link: null },
                        { name: 'Mobile Wallet Apps', type: 'iOS/Android', status: '✓ Supported', link: null },
                        { name: 'Other LNURL-auth Wallets', type: 'Various', status: '✓ Compatible', link: null },
                      ].map((wallet, idx) => (
                        <div key={idx} className="flex items-start justify-between p-2 bg-dark-800/50 rounded border border-dark-700">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{wallet.name}</p>
                            <p className="text-xs text-white/60">{wallet.type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-orange-400 font-medium">{wallet.status}</span>
                            {wallet.link && (
                              <a 
                                href={wallet.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-orange-400 hover:text-orange-300"
                              >
                                Learn more →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Browser Requirements */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-white mb-3">Browser Requirements</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">✓ Supported Browsers:</p>
                        <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                          <li>Chrome (latest version)</li>
                          <li>Firefox (latest version)</li>
                          <li>Safari (latest version)</li>
                          <li>Edge (latest version)</li>
                          <li>Other modern browsers with JavaScript enabled</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Requirements:</p>
                        <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                          <li>JavaScript must be enabled</li>
                          <li>No ad blockers interfering with scripts</li>
                          <li>Cookies enabled (for session management)</li>
                          <li>Modern browser (released within last 2 years)</li>
                        </ul>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mt-3">
                        <p className="text-xs text-yellow-200">
                          <strong>Note:</strong> Some browser extensions (ad blockers, privacy tools) may interfere with the authentication flow. Users may need to whitelist your domain.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Network & CORS Issues */}
              <div id="network-cors" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Network & CORS Issues</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Troubleshoot network connectivity and cross-origin resource sharing (CORS) problems.
                </p>
                
                <div className="space-y-4">
                  {/* CORS Errors */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-orange-400 mb-3">CORS Errors</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">What is CORS?</p>
                        <p>Cross-Origin Resource Sharing (CORS) is a browser security feature that blocks requests from one domain to another unless explicitly allowed.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Common CORS Error Messages:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><code className="bg-dark-800 px-1 rounded">"Access to fetch blocked by CORS policy"</code></li>
                          <li><code className="bg-dark-800 px-1 rounded">"No 'Access-Control-Allow-Origin' header"</code></li>
                          <li><code className="bg-dark-800 px-1 rounded">"CORS request did not succeed"</code></li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Solution:</p>
                        <p>Ensure your domain is added in the <strong>Domains</strong> tab. Key-Rex automatically handles CORS for domains in your allowed list. If you see CORS errors, verify:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                          <li>Domain is exactly as it appears in your browser's address bar</li>
                          <li>Both www and non-www versions are added if you use both</li>
                          <li>No typos in the domain name</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Network Errors */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-orange-400 mb-3">Network Errors</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Common Network Issues:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Script fails to load (404 or network error)</li>
                          <li>Slow or intermittent connection</li>
                          <li>Firewall blocking requests</li>
                          <li>DNS resolution problems</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Troubleshooting Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Check your internet connection</li>
                          <li>Verify Key-Rex servers are accessible (try loading the embed script URL directly)</li>
                          <li>Check browser Network tab (F12) for failed requests</li>
                          <li>Verify firewall/security software isn't blocking requests</li>
                          <li>Try from a different network (mobile hotspot, different WiFi)</li>
                        </ol>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Tip:</strong> Open browser Developer Tools (F12), go to Network tab, and reload your page. Look for failed requests (red) to identify the issue.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* URL Parameter Cleanup */}
              <div id="url-parameter-cleanup" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">URL Parameter Cleanup</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding how xpub is passed via URL parameters and automatically cleaned up after authentication.
                </p>

                <div className="space-y-6">
                  {/* How URL Cleanup Works */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">How URL Parameter Cleanup Works</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        After mobile authentication or popup-blocked redirect, the xpub is passed back to your site via URL parameter: <code className="bg-dark-800 px-1 rounded">?xpub=xpub_...</code>
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Cleanup process:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>User authenticates via QR code (mobile or redirect mode)</li>
                          <li>QR page redirects back to your site with <code className="bg-dark-800 px-1 rounded">?xpub=...</code> in URL</li>
                          <li>Key-Rex script detects xpub in URL parameters on page load</li>
                          <li>Script calls <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess(xpub)</code> with the xpub</li>
                          <li>Script removes xpub from URL using <code className="bg-dark-800 px-1 rounded">window.history.replaceState()</code></li>
                          <li>URL is cleaned (xpub removed) without page reload</li>
                        </ol>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Automatic:</strong> This cleanup happens automatically - no action needed from you. The xpub is removed from the address bar for privacy and security.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting URL Cleanup */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting URL Parameter Cleanup</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">xpub remains in URL after authentication:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Check browser console (F12) for JavaScript errors</li>
                          <li>Verify <code className="bg-dark-800 px-1 rounded">window.KeyRex</code> object exists</li>
                          <li>Check if script loaded successfully (Network tab)</li>
                          <li>Verify <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code> callback is set up</li>
                          <li>Try manually cleaning URL: <code className="bg-dark-800 px-1 rounded">window.history.replaceState({}, '', window.location.pathname)</code></li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">xpub not detected in URL:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Check if URL actually contains <code className="bg-dark-800 px-1 rounded">?xpub=...</code> parameter</li>
                          <li>Verify redirect from QR page completed successfully</li>
                          <li>Check browser console for errors during redirect</li>
                          <li>Ensure script loads before URL parameter is processed (script should be in <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code>)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">onSuccess called multiple times:</p>
                        <p>This can happen if both URL parameter detection and cookie detection trigger. The script should handle this gracefully, but you can add a flag to prevent duplicate calls:</p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mt-2 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`let authProcessed = false;

KeyRex.onSuccess(function(xpub) {
  if (authProcessed) return; // Prevent duplicate calls
  authProcessed = true;
  
  // Your authentication logic here
  console.log('xpub received:', xpub);
});`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manual Cleanup */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Manual URL Cleanup (If Needed)</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        If automatic cleanup fails, you can manually clean the URL:
                      </p>
                      <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                        <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Remove xpub from URL without reload
const url = new URL(window.location.href);
url.searchParams.delete('xpub');
window.history.replaceState({}, '', url.toString());

// Or remove all query parameters
window.history.replaceState({}, '', window.location.pathname);`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cookie-Based xpub Retrieval */}
              <div id="cookie-xpub-retrieval" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Cookie-Based xpub Retrieval</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding how cookies are used to store and retrieve xpub for cross-domain authentication.
                </p>

                <div className="space-y-6">
                  {/* How Cookie Retrieval Works */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">How Cookie-Based Retrieval Works</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        For cross-domain redirects and popup fallbacks, Key-Rex uses cookies to temporarily store authentication data:
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Cookie names used:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><code className="bg-dark-800 px-1 rounded">keyrex_k1</code> - Stores the authentication challenge (k1)</li>
                          <li><code className="bg-dark-800 px-1 rounded">keyrex_xpub_&lt;prefix&gt;</code> - Stores the xpub after authentication (format: <code className="bg-dark-800 px-1 rounded">keyrex_xpub_&lt;first16chars&gt;</code>)</li>
                          <li><code className="bg-dark-800 px-1 rounded">keyrex_return_url</code> - Stores the return URL for redirects</li>
                        </ul>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2 mt-2">
                          <p className="text-xs text-orange-200">
                            <strong>Security:</strong> All Key-Rex cookies are httpOnly (not accessible via JavaScript) and set server-side to prevent XSS attacks.
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Retrieval process:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Challenge (k1) stored in cookie before redirect</li>
                          <li>User authenticates via QR code</li>
                          <li>xpub stored in cookie after authentication</li>
                          <li>Script checks cookies on page load</li>
                          <li>If xpub found in cookie, calls <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess(xpub)</code></li>
                          <li>Cookies are cleaned up after use</li>
                        </ol>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Cross-Domain Support:</strong> Cookies enable authentication to work even when Key-Rex and your site are on different domains. Cookies are automatically cleaned up after use.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting Cookie Issues */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting Cookie Issues</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Cookies not being set:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Check if cookies are enabled in browser settings</li>
                          <li>Verify browser allows third-party cookies (if cross-domain)</li>
                          <li>Check browser console for cookie-related errors</li>
                          <li>Test in incognito/private mode (some browsers block cookies)</li>
                          <li>Verify SameSite cookie policy allows cookies (should be "Lax")</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">xpub not retrieved from cookie:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Check browser DevTools → Application → Cookies</li>
                          <li>Look for cookies starting with <code className="bg-dark-800 px-1 rounded">keyrex_</code></li>
                          <li>Verify cookie hasn't expired (cookies expire after 5 minutes)</li>
                          <li>Check if cookie domain matches your site domain</li>
                          <li>Verify script is checking cookies correctly (check console logs)</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Cookies not cleaned up:</p>
                        <p>Cookies should be automatically deleted after xpub is retrieved. If they persist:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Check browser console for cleanup errors</li>
                          <li>Manually delete cookies via DevTools → Application → Cookies</li>
                          <li>Clear browser cookies and try again</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Browser Console Commands */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Browser Console Commands</h4>
                    <p className="text-sm text-white/80 mb-3">
                      Use these commands in browser console (F12) to inspect cookies:
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mb-3">
                      <p className="text-xs text-yellow-200">
                        <strong>Note:</strong> Key-Rex cookies are httpOnly (not accessible via JavaScript). These commands will only show non-httpOnly cookies. To check Key-Rex cookies, use browser DevTools → Application → Cookies, or use the <code className="bg-dark-900 px-1 rounded">/api/auth/get-k1</code> API endpoint.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          command: 'document.cookie',
                          description: 'View all non-httpOnly cookies for current domain (Key-Rex cookies are httpOnly and won\'t appear)',
                        },
                        {
                          command: 'document.cookie.split(";").filter(c => c.includes("keyrex"))',
                          description: 'Filter to only Key-Rex cookies (will be empty as Key-Rex cookies are httpOnly)',
                        },
                        {
                          command: 'fetch("/api/auth/get-k1", { credentials: "include" }).then(r => r.json())',
                          description: 'Check Key-Rex k1 and returnUrl via API (requires same origin)',
                        },
                        {
                          command: '// Use DevTools: Application → Cookies to view httpOnly cookies',
                          description: 'View all cookies including httpOnly ones',
                        },
                      ].map((cmd, idx) => (
                        <div key={idx} className="bg-dark-950 rounded-lg p-3 border border-dark-700">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-orange-400 font-mono text-sm font-bold">&gt;</span>
                            <code className="text-sm text-white/80 font-mono flex-1">{cmd.command}</code>
                          </div>
                          <p className="text-xs text-white/60">{cmd.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skeleton Loading State */}
              <div id="skeleton-loading" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Skeleton Loading State</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding the skeleton loading animation and troubleshooting if it gets stuck.
                </p>

                <div className="space-y-6">
                  {/* How Skeleton Works */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">How Skeleton Loading Works</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        While the configuration is loading from the server, Key-Rex displays a skeleton loading state to provide visual feedback:
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Skeleton lifecycle:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Script loads and immediately shows skeleton (animated placeholder)</li>
                          <li>Skeleton matches final button and wallet layout dimensions</li>
                          <li>Config API request is made to <code className="bg-dark-800 px-1 rounded">/api/embed/config?siteId=...</code></li>
                          <li>While waiting: skeleton shows animated shimmer effect</li>
                          <li>When config loads: skeleton is replaced with actual button and wallets</li>
                          <li>If config fails: skeleton is replaced with error message or default config</li>
                        </ol>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-orange-200">
                          <strong>Purpose:</strong> The skeleton prevents layout shift and provides immediate visual feedback that something is loading, improving user experience.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting Skeleton Issues */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting Skeleton Loading</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Skeleton stuck (never replaced):</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Check browser console (F12) for JavaScript errors</li>
                          <li>Check Network tab - verify config API request completes</li>
                          <li>Look for <code className="bg-dark-800 px-1 rounded">/api/embed/config?siteId=...</code> request</li>
                          <li>Check if request returns 200 (success) or error status</li>
                          <li>Verify domain is added and integration is enabled</li>
                          <li>Check if script loaded successfully</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Skeleton appears then disappears (no button):</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Config API may have returned error or empty response</li>
                          <li>Check Network tab for config API response</li>
                          <li>Verify <code className="bg-dark-800 px-1 rounded">integrationEnabled</code> is not false</li>
                          <li>Check browser console for error messages</li>
                          <li>Verify siteId is correct in embed script URL</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Skeleton animation is janky or slow:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Check browser performance (F12 → Performance tab)</li>
                          <li>Verify no other scripts are blocking main thread</li>
                          <li>Check if <code className="bg-dark-800 px-1 rounded">prefers-reduced-motion</code> is enabled (animation should be disabled)</li>
                          <li>Test on different browsers/devices</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Skeleton doesn't respect reduced motion:</p>
                        <p>Key-Rex should automatically disable skeleton animation if user has <code className="bg-dark-800 px-1 rounded">prefers-reduced-motion</code> enabled. If animation still plays:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Check browser accessibility settings</li>
                          <li>Verify CSS media query is working: <code className="bg-dark-800 px-1 rounded">@media (prefers-reduced-motion: reduce)</code></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Inspecting Skeleton State */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Inspecting Skeleton State</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        Use browser DevTools to inspect the skeleton element:
                      </p>
                      <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                        <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Check if skeleton exists
document.querySelector('[data-keyrex="skeleton"]')

// Check if button exists (skeleton should be replaced)
document.getElementById('keyrex-button')

// Check config loading status
// Open Network tab → Look for /api/embed/config request
// Check response status and body`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Config Fallback */}
              <div id="default-config-fallback" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Default Config Fallback</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Understanding when and how Key-Rex uses default configuration when the config API fails.
                </p>

                <div className="space-y-6">
                  {/* How Default Config Works */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">How Default Config Fallback Works</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        If the config API fails to load, Key-Rex automatically uses a default configuration so the button still appears:
                      </p>
                      <div>
                        <p className="font-semibold text-white mb-2">Fallback trigger conditions:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Config API returns non-200 status (404, 500, network error)</li>
                          <li>Config API request times out</li>
                          <li>Config API returns invalid JSON</li>
                          <li>Config is null or undefined</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Default configuration includes:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Standard button text: <code className="bg-dark-800 px-1 rounded">"Sign in with Key-Rex"</code></li>
                          <li>Featured wallets: Partner wallet list (managed by admin)</li>
                          <li>Integration enabled: <code className="bg-dark-800 px-1 rounded">true</code> (allows authentication)</li>
                          <li>Show branding: <code className="bg-dark-800 px-1 rounded">true</code></li>
                          <li>Footer text: <code className="bg-dark-800 px-1 rounded">"Powered by Key-Rex — open-source"</code></li>
                        </ul>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-yellow-200">
                          <strong>Note:</strong> Default config is primarily for development. In production, the config API should always succeed. If it fails, investigate the root cause.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting Default Config */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Troubleshooting Default Config Fallback</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Button appears but using default config:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Check browser console for warning: <code className="bg-dark-800 px-1 rounded">"Failed to load configuration, using default config"</code></li>
                          <li>Check Network tab - look for <code className="bg-dark-800 px-1 rounded">/api/embed/config</code> request</li>
                          <li>Verify request status (should be 200, not 404/500)</li>
                          <li>Check if domain is added in dashboard</li>
                          <li>Verify integration is enabled</li>
                          <li>Check if siteId is correct</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Config API returns 404:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>SiteId not found - verify siteId in embed script URL</li>
                          <li>User record doesn't exist - visit dashboard to create user record</li>
                          <li>In development: storage may have been cleared (restart server)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Config API returns 403:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Integration is disabled - enable in "My Integration Code" tab</li>
                          <li>Domain not authorized - add and verify domain in "Domains" tab</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Config API times out:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Check internet connection</li>
                          <li>Verify Key-Rex servers are accessible</li>
                          <li>Check firewall/network restrictions</li>
                          <li>Test from different network</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Development vs Production */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Development vs Production Behavior</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Development Mode:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Default config fallback is more lenient</li>
                          <li>Config API may return 404 if storage was cleared (server restart)</li>
                          <li>Default config ensures button still appears for testing</li>
                          <li>Console warnings help identify issues</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Production Mode:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Config API should always succeed</li>
                          <li>Default config is emergency fallback only</li>
                          <li>If default config is used, investigate immediately</li>
                          <li>Monitor config API success rate in production</li>
                        </ul>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mt-3">
                        <p className="text-xs text-red-200">
                          <strong>Important:</strong> If default config is used in production, it means your config API is failing. This should be treated as an error and investigated. The button will work, but you're not getting your configured settings.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Checking Config Status */}
                  <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                    <h4 className="text-lg font-semibold text-white mb-3">Checking Config Status</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <p>
                        Use browser DevTools to check if default config is being used:
                      </p>
                      <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                        <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Check Network tab for config request
// Look for: /api/embed/config?siteId=YOUR_SITE_ID
// Status should be 200 (green), not 404/500 (red)

// Check console for warnings
// Look for: "Failed to load configuration, using default config"

// Manually test config API
fetch('/api/embed/config?siteId=YOUR_SITE_ID')
  .then(r => r.json())
  .then(config => console.log('Config:', config))
  .catch(err => console.error('Config error:', err));`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Troubleshooting */}
              <div id="advanced" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                <h3 className="text-xl font-semibold text-white mb-4">Advanced Troubleshooting</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Technical diagnostics and debugging tools for developers and power users.
                </p>
                
                <div className="space-y-4">
                  {/* Browser Console Commands */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-white mb-3">Browser Console Commands</h4>
                    <p className="text-sm text-white/80 mb-3">
                      Open browser Developer Tools (F12) and use these commands in the Console tab to diagnose issues:
                    </p>
                    <div className="space-y-3">
                      {[
                        {
                          command: 'KeyRex',
                          description: 'Check if Key-Rex object is loaded',
                          expected: 'Should return an object, not undefined',
                        },
                        {
                          command: 'document.getElementById("keyrex-button")',
                          description: 'Check if button element exists in DOM',
                          expected: 'Should return the button element, not null',
                        },
                        {
                          command: 'window.KeyRex',
                          description: 'Check if Key-Rex is available globally',
                          expected: 'Should return an object with init() method',
                        },
                        {
                          command: 'new URLSearchParams(window.location.search).get("xpub")',
                          description: 'Check if xpub is in URL parameters (should be null normally)',
                          expected: 'Should return null (or xpub string if just authenticated)',
                        },
                        {
                          command: 'document.cookie.split(";").filter(c => c.includes("keyrex"))',
                          description: 'Check for Key-Rex cookies (should be empty after cleanup)',
                          expected: 'Should return empty array (or cookies if just authenticated)',
                        },
                        {
                          command: 'window.KeyRex && typeof window.KeyRex.init === "function"',
                          description: 'Verify auto-initialization is available',
                          expected: 'Should return true',
                        },
                        {
                          command: 'document.querySelector(\'[data-keyrex="skeleton"]\')',
                          description: 'Check if skeleton loading state is present',
                          expected: 'Should return null (skeleton should be replaced by button)',
                        },
                        {
                          command: 'window.open("about:blank", "test", "width=100,height=100")',
                          description: 'Test if popup blocking is enabled (returns null if blocked)',
                          expected: 'Should return popup object (null means popups are blocked)',
                        },
                      ].map((cmd, idx) => (
                        <div key={idx} className="bg-dark-950 rounded-lg p-3 border border-dark-700">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-orange-400 font-mono text-sm font-bold">&gt;</span>
                            <code className="text-sm text-white/80 font-mono flex-1 break-all">{cmd.command}</code>
                          </div>
                          <p className="text-xs text-white/60 mb-1">{cmd.description}</p>
                          <p className="text-xs text-orange-400">Expected: {cmd.expected}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                      <p className="text-xs text-orange-200">
                        <strong>Tip:</strong> Copy and paste these commands directly into your browser console (F12 → Console tab) to quickly diagnose issues.
                      </p>
                    </div>
                  </div>

                  {/* Debug Information */}
                  <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-base font-semibold text-white mb-3">Debug Information</h4>
                    <div className="space-y-3 text-sm text-white/80">
                      <div>
                        <p className="font-semibold text-white mb-2">Check Script Loading:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Open Developer Tools (F12)</li>
                          <li>Go to Network tab</li>
                          <li>Filter by "JS" or search for "embed"</li>
                          <li>Reload your page</li>
                          <li>Look for the embed script request</li>
                          <li>Check Status: should be 200 (green), not 404 (red) or failed</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Check for JavaScript Errors:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Open Developer Tools (F12)</li>
                          <li>Go to Console tab</li>
                          <li>Look for red error messages</li>
                          <li>Click on errors to see details</li>
                          <li>Common errors: "KeyRex is not defined", "Cannot read property", etc.</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-2">Verify Configuration:</p>
                        <p className="text-xs text-white/60 mb-2">Your current configuration:</p>
                        <div className="bg-dark-950 rounded p-2 font-mono text-xs text-white/80">
                          <div className="flex items-center gap-2">
                            Site ID: <Tooltip content="Your unique Site ID is used in the integration code to identify your account. Keep it secure and don't share it publicly."><span className="text-orange-400">{user?.siteId || 'Not available'}</span></Tooltip>
                          </div>
                          <div>Domains: <span className="text-orange-400">{user?.allowedDomains?.length || 0}</span> configured</div>
                          <div>Integration: <span className={user?.integrationEnabled !== false ? 'text-orange-400' : 'text-red-400'}>{user?.integrationEnabled !== false ? 'Enabled' : 'Disabled'}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: Documentation */}
          {activeTab === 'documentation' && (
            <div className="flex gap-6">
              {/* Quick Navigation Pane - Sticky Left Sidebar */}
              <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-[136px] z-30">
                  <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Navigation</h3>
                    <nav className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Getting Started</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#quick-start" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('quick-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Quick Start
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#integration-checklist" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('integration-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Integration Checklist
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#authentication-flow" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('authentication-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Authentication Flow
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#integration-guide" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('integration-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Integration Guide
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Framework Examples</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#react-example" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('react-example')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              React
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#vue-example" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('vue-example')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Vue
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#nextjs-example" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('nextjs-example')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Next.js
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#html-example" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('html-example')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Plain HTML
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Integration</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#backend-integration" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('backend-integration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Backend Integration
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#testing-debugging" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('testing-debugging')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Testing & Debugging
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Reference</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#api-reference" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('api-reference')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              API Reference
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#configuration" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('configuration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Configuration
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#best-practices" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('best-practices')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Best Practices
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Advanced</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#advanced-features" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('advanced-features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Advanced Features
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#account-linking" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('account-linking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Account Linking
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#use-cases" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('use-cases')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Common Use Cases
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#faq" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              FAQ
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Resources</h4>
                        <ul className="space-y-1 text-sm">
                          <li>
                            <a 
                              href="#quick-reference" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('quick-reference')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Quick Reference
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#health-monitoring" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('health-monitoring')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Health Monitoring
                            </a>
                          </li>
                          <li>
                            <a 
                              href="#support-resources" 
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('support-resources')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="text-white/80 hover:text-orange-400 transition-colors block py-1 cursor-pointer"
                            >
                              Support Resources
                            </a>
                          </li>
                        </ul>
                      </div>
                    </nav>
                  </div>
                </div>
              </div>

              {/* Main Content - Right Side */}
              <div className="flex-1 min-w-0">
                <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                  <h2 className="text-2xl font-semibold text-white mb-4">Integration Documentation</h2>
                  <p className="text-white/80 mb-6">
                    Complete guide to integrating Key-Rex authentication into your website. Follow the steps below to get started.
                  </p>

                  {/* Quick Start Guide */}
                  <div id="quick-start" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Quick Start Guide</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Get Key-Rex authentication working on your website in under 2 minutes. Follow the steps below, then use the <strong className="text-orange-400">Integration Checklist</strong> to track your progress.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <span className="text-orange-400 font-bold text-sm">1</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-white mb-2">Copy Your Integration Code</h4>
                            <p className="text-sm text-white/80 mb-3">
                              You're already in your dashboard (you completed the setup wizard to get here). Go to the <strong className="text-orange-400">"My Integration Code"</strong> tab and copy the integration code provided.
                            </p>
                            <div className="bg-dark-950 rounded-lg p-3 border border-dark-700 overflow-x-auto">
                              <code className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
                                {`<script src="https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}"></script>`}
                                <br />
                                {`<script>KeyRex.init();</script>`}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <span className="text-orange-400 font-bold text-sm">2</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-white mb-2">Paste Into Your Website</h4>
                            <p className="text-sm text-white/80 mb-2">
                              Paste the code just before the closing <code className="bg-dark-800 px-1 rounded">&lt;/body&gt;</code> tag in your HTML.
                            </p>
                            <div className="bg-dark-950 rounded-lg p-3 border border-dark-700 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<body>
  <!-- Your website content -->
  
  <!-- Key-Rex Integration -->
  <script src="https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}"></script>
  <script>KeyRex.init();</script>
</body>`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <span className="text-orange-400 font-bold text-sm">3</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-white mb-2">Add Your Domain</h4>
                            <p className="text-sm text-white/80 mb-2">
                              Go to the <strong className="text-orange-400">"Domains"</strong> tab and add your website domain. This authorizes your domain to use Key-Rex authentication.
                            </p>
                            <p className="text-xs text-white/60">
                              <strong>Important:</strong> The domain must match exactly as it appears in your browser's address bar (including www or non-www).
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-orange-300 mb-2">✓ That's It!</h4>
                      <p className="text-sm text-orange-200">
                        Your authentication button should now appear on your website. Users can click it to sign in with their Lightning wallets.
                      </p>
                    </div>
                  </div>

                  {/* Integration Checklist */}
                  <div id="integration-checklist" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Integration Checklist</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Use this checklist to ensure your integration is complete and working correctly. Check off each item as you complete it.
                    </p>

                    <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                      <div className="space-y-3">
                        {[
                          { category: 'Setup', items: [
                            'Copied integration code from "My Integration Code" tab',
                            'Added domain(s) in "Domains" tab and verified ownership via DNS TXT record',
                            'Verified domain matches exactly (including www/non-www)',
                            'Integration status is enabled (green/active)',
                          ]},
                          { category: 'Code Integration', items: [
                            'Pasted code before closing </body> tag',
                            'Code is in <body>, not <head>',
                            'Both script tags are included',
                            'Site ID is correct in embed URL',
                          ]},
                          { category: 'Testing', items: [
                            'Button appears on website',
                            'Button is clickable (not disabled)',
                            'Wallet prompt appears when clicked',
                            'Authentication completes successfully',
                            'Tested with multiple wallets',
                            'Tested on mobile device',
                          ]},
                          { category: 'Backend Integration', items: [
                            'KeyRex.onSuccess() callback implemented',
                            'KeyRex.onError() callback implemented',
                            'Backend session creation working',
                            'User authentication flow complete',
                          ]},
                          { category: 'Production Readiness', items: [
                            'HTTPS enabled on production domain',
                            'All production domains added to dashboard',
                            'Error handling implemented',
                            'Analytics tracking configured (optional)',
                            'Tested in production environment',
                          ]},
                        ].map((section, sectionIdx) => (
                          <div key={sectionIdx} className="mb-4 last:mb-0">
                            <h4 className="text-base font-semibold text-orange-400 mb-2">{section.category}</h4>
                            <div className="space-y-2">
                              {section.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex items-start gap-2 bg-dark-800/50 rounded p-2">
                                  <input
                                    type="checkbox"
                                    className="mt-1 w-4 h-4 text-orange-500 border-dark-600 rounded focus:ring-orange-500 bg-dark-800"
                                  />
                                  <label className="text-sm text-white/80 flex-1">{item}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded p-3">
                        <p className="text-xs text-orange-200">
                          <strong>Tip:</strong> Print this page or keep it open while setting up your integration to track your progress.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Authentication Flow */}
                  <div id="authentication-flow" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Authentication Flow</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Understanding how Key-Rex authentication works helps you integrate it properly and handle edge cases.
                    </p>

                    <div className="space-y-6">
                      {/* Flow Overview */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">How Authentication Works</h4>
                        <p className="text-sm text-white/80 mb-3">
                          When a user clicks the Key-Rex button, the system follows this flow:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 ml-2">
                          <li><strong className="text-white">WebLN Detection:</strong> Script checks for WebLN browser extension</li>
                          <li><strong className="text-white">WebLN Authentication:</strong> If WebLN is available, user authenticates directly in browser</li>
                          <li><strong className="text-white">QR Code Fallback:</strong> If no WebLN, system generates QR code for mobile wallet scanning</li>
                          <li><strong className="text-white">Device-Specific Behavior:</strong>
                            <ul className="list-disc list-inside space-y-1 ml-4 mt-1">
                              <li><strong>Desktop:</strong> Opens QR code in popup window (better UX, maintains context)</li>
                              <li><strong>Mobile:</strong> Redirects to full-page QR code (more reliable on mobile)</li>
                            </ul>
                          </li>
                          <li><strong className="text-white">xpub Retrieval:</strong> After authentication, xpub is delivered via URL params, cookies, or postMessage</li>
                          <li><strong className="text-white">Callback Execution:</strong> Your <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code> callback is called with the xpub</li>
                        </ol>
                      </div>

                      {/* WebLN Flow */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">WebLN Authentication (Desktop Browser)</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            If the user has a WebLN-compatible browser extension, authentication happens seamlessly:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>User clicks Key-Rex button</li>
                            <li>Script detects <code className="bg-dark-800 px-1 rounded">window.webln</code> object</li>
                            <li>Extension prompts user to sign authentication challenge</li>
                            <li>User approves in extension popup</li>
                            <li>xpub is returned immediately via <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code></li>
                          </ol>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-orange-200">
                              <strong>Note:</strong> Some wallets return <code className="bg-orange-600/30 px-1 rounded">sig</code> and <code className="bg-orange-600/30 px-1 rounded">key</code> directly, while others use the standard LNURL-auth callback flow. Key-Rex handles both automatically.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* QR Code Flow - Desktop */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">QR Code Flow (Desktop - Popup)</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            On desktop, when WebLN is not available, a popup window opens with the QR code:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Popup window opens (600x800px, centered on screen)</li>
                            <li>User scans QR code with mobile Lightning wallet</li>
                            <li>Wallet authenticates and calls Key-Rex callback endpoint</li>
                            <li>Popup detects authentication via polling</li>
                            <li>Popup sends xpub to parent window via <code className="bg-dark-800 px-1 rounded">postMessage</code></li>
                            <li>Parent window receives message and calls <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code></li>
                            <li>Popup automatically closes</li>
                          </ol>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Popup Blocking:</strong> If popup is blocked by browser, system automatically falls back to full-page redirect (same as mobile flow).
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* QR Code Flow - Mobile */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">QR Code Flow (Mobile - Redirect)</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            On mobile devices, the entire page redirects to the QR code page for better reliability:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Page redirects to <code className="bg-dark-800 px-1 rounded">/embed/qr</code> with challenge and return URL</li>
                            <li>QR code is displayed on full page</li>
                            <li>User scans with another device or switches to wallet app</li>
                            <li>Wallet authenticates and calls Key-Rex callback</li>
                            <li>QR page detects authentication via polling</li>
                            <li>QR page redirects back to your site with xpub in URL: <code className="bg-dark-800 px-1 rounded">?xpub=...</code></li>
                            <li>Key-Rex script detects xpub in URL and calls <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code></li>
                            <li>URL parameter is automatically cleaned up (removed from address bar)</li>
                          </ol>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-orange-200">
                              <strong>Cross-Domain Support:</strong> The redirect flow works even if your site and Key-Rex are on different domains. Cookies are used to store the challenge temporarily.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* postMessage Communication */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Popup Communication (postMessage)</h4>
                        <p className="text-sm text-white/80 mb-3">
                          When using popup mode, the popup communicates with your page using the browser's <code className="bg-dark-800 px-1 rounded">postMessage</code> API:
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Key-Rex automatically handles postMessage, but you can listen manually if needed
window.addEventListener('message', function(event) {
  // Verify origin matches Key-Rex domain (important for security)
  if (event.data && event.data.type === 'keyrex-auth-success') {
    const xpub = event.data.xpub;
    // Handle authentication
    console.log('Received xpub from popup:', xpub);
  }
});`}
                          </pre>
                        </div>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Message Types:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><code className="bg-dark-800 px-1 rounded">keyrex-auth-success</code> - Authentication succeeded, includes xpub</li>
                            <li><code className="bg-dark-800 px-1 rounded">keyrex-auth-error</code> - Authentication failed, includes error message</li>
                            <li><code className="bg-dark-800 px-1 rounded">keyrex-popup-closed</code> - User manually closed popup</li>
                          </ul>
                          <p className="text-xs text-white/60 mt-2">
                            <strong>Note:</strong> You typically don't need to handle postMessage manually. Key-Rex automatically processes these messages and calls your <code className="bg-dark-800 px-1 rounded">onSuccess</code> or <code className="bg-dark-800 px-1 rounded">onError</code> callbacks.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integration Guide */}
                  <div id="integration-guide" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Step-by-Step Integration Guide</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Detailed instructions for integrating Key-Rex into your website.
                    </p>

                    <div className="space-y-6">
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 1: Get Your Integration Code</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 ml-2">
                          <li>Navigate to the <strong className="text-orange-400">"My Integration Code"</strong> tab in your dashboard</li>
                          <li>Copy the integration code (two script tags)</li>
                          <li>Your unique <code className="bg-dark-800 px-1 rounded">siteId</code> is already included in the code</li>
                        </ol>
                      </div>

                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 2: Place the Code Correctly</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p><strong className="text-white">Where to place:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Just before the closing <code className="bg-dark-800 px-1 rounded">&lt;/body&gt;</code> tag</li>
                            <li>In the <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code> section, not in <code className="bg-dark-800 px-1 rounded">&lt;head&gt;</code></li>
                            <li>After your main content, but before closing <code className="bg-dark-800 px-1 rounded">&lt;/body&gt;</code></li>
                          </ul>
                          <p className="mt-3"><strong className="text-white">Why this location?</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Ensures the DOM is fully loaded before the script runs</li>
                            <li>Prevents blocking page rendering</li>
                            <li>Allows the button to appear in the correct location</li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 3: Configure Your Domain</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>Go to the <strong className="text-orange-400">"Domains"</strong> tab and add your website domain:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Enter your domain exactly as it appears in your browser (e.g., <code className="bg-dark-800 px-1 rounded">example.com</code>)</li>
                            <li>If you use both <code className="bg-dark-800 px-1 rounded">www.example.com</code> and <code className="bg-dark-800 px-1 rounded">example.com</code>, add both separately</li>
                            <li>Subdomains like <code className="bg-dark-800 px-1 rounded">login.example.com</code> need to be added separately</li>
                          </ul>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Security Note:</strong> Only domains in your allowed list can use your integration code. This prevents unauthorized use of your siteId.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 4: Test Your Integration</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 ml-2">
                          <li>Visit your website where you added the code</li>
                          <li>Look for the "Sign in with Key-Rex" button</li>
                          <li>Click the button to test the authentication flow</li>
                          <li>If you have a Lightning wallet, you should see a login prompt</li>
                        </ol>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                          <p className="text-xs text-orange-200">
                            <strong>Tip:</strong> If the button doesn't appear, check the browser console (F12) for errors. See the Troubleshooting tab for help.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Framework Examples */}
                  <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Framework Examples</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      See how to integrate Key-Rex in different frameworks and platforms.
                    </p>

                      {/* React Example */}
                      <div id="react-example" className="bg-dark-900/50 rounded-lg p-5 border border-dark-700 mb-6 scroll-mt-24">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">⚛️</span>
                          <h4 className="text-lg font-semibold text-white">React</h4>
                        </div>
                        <p className="text-sm text-white/80 mb-3">
                          Add Key-Rex to a React component using <code className="bg-dark-800 px-1 rounded">useEffect</code>. <strong className="text-white">Note:</strong> <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> is optional since the script auto-initializes.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`import { useEffect } from 'react';

function LoginPage() {
  useEffect(() => {
    // Load Key-Rex script
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}';
    script.async = true;
    
    // Script auto-initializes when loaded (KeyRex.init() is optional)
    // Only call init() manually if you need to delay or re-initialize
    document.body.appendChild(script);
    
    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  return (
    <div>
      <h1>Login Page</h1>
      <div id="keyrex-container"></div>
      {/* Key-Rex button will appear here automatically */}
    </div>
  );
}

export default LoginPage;`}
                          </pre>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-3">
                          <p className="text-xs text-orange-200">
                            <strong>Auto-Initialization:</strong> The embed script automatically calls <code className="bg-orange-600/30 px-1 rounded">KeyRex.init()</code> when the DOM is ready. You can omit the manual <code className="bg-orange-600/30 px-1 rounded">init()</code> call unless you need to delay initialization.
                          </p>
                        </div>
                      <button
                        onClick={() => {
                          const code = `import { useEffect } from 'react';\n\nfunction LoginPage() {\n  useEffect(() => {\n    const script = document.createElement('script');\n    script.src = 'https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}';\n    script.async = true;\n    \n    // Script auto-initializes when loaded\n    document.body.appendChild(script);\n    \n    return () => {\n      if (document.body.contains(script)) {\n        document.body.removeChild(script);\n      }\n    };\n  }, []);\n  \n  return (\n    <div>\n      <h1>Login Page</h1>\n      <div id="keyrex-container"></div>\n    </div>\n  );\n}\n\nexport default LoginPage;`
                          navigator.clipboard.writeText(code)
                          toast.showSuccess('✓ React example copied to clipboard!')
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
                      >
                        Copy React Example
                      </button>
                    </div>

                      {/* Vue Example */}
                      <div id="vue-example" className="bg-dark-900/50 rounded-lg p-5 border border-dark-700 mb-6 scroll-mt-24">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">🖖</span>
                          <h4 className="text-lg font-semibold text-white">Vue.js</h4>
                        </div>
                        <p className="text-sm text-white/80 mb-3">
                          Add Key-Rex to a Vue component using <code className="bg-dark-800 px-1 rounded">onMounted</code>. <strong className="text-white">Note:</strong> <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> is optional since the script auto-initializes.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<template>
  <div>
    <h1>Login Page</h1>
    <div id="keyrex-container"></div>
    <!-- Key-Rex button will appear here automatically -->
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  // Load Key-Rex script
  const script = document.createElement('script');
  script.src = 'https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}';
  script.async = true;
  
  // Script auto-initializes when loaded (KeyRex.init() is optional)
  document.body.appendChild(script);
});

onUnmounted(() => {
  // Cleanup
  const scripts = document.querySelectorAll('script[src*="embed"]');
  scripts.forEach(script => script.remove());
});
</script>`}
                          </pre>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-3">
                          <p className="text-xs text-orange-200">
                            <strong>Auto-Initialization:</strong> The embed script automatically calls <code className="bg-orange-600/30 px-1 rounded">KeyRex.init()</code> when the DOM is ready. You can omit the manual <code className="bg-orange-600/30 px-1 rounded">init()</code> call unless you need to delay initialization.
                          </p>
                        </div>
                      <button
                        onClick={() => {
                          const code = `<template>\n  <div>\n    <h1>Login Page</h1>\n    <div id="keyrex-container"></div>\n  </div>\n</template>\n\n<script setup>\nimport { onMounted, onUnmounted } from 'vue';\n\nonMounted(() => {\n  const script = document.createElement('script');\n  script.src = 'https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}';\n  script.async = true;\n  \n  // Script auto-initializes when loaded\n  document.body.appendChild(script);\n});\n\nonUnmounted(() => {\n  const scripts = document.querySelectorAll('script[src*="embed"]');\n  scripts.forEach(script => script.remove());\n});\n</script>`
                          navigator.clipboard.writeText(code)
                          toast.showSuccess('✓ Vue example copied to clipboard!')
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
                      >
                        Copy Vue Example
                      </button>
                    </div>

                      {/* Next.js Example */}
                      <div id="nextjs-example" className="bg-dark-900/50 rounded-lg p-5 border border-dark-700 mb-6 scroll-mt-24">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">▲</span>
                          <h4 className="text-lg font-semibold text-white">Next.js</h4>
                        </div>
                        <p className="text-sm text-white/80 mb-3">
                          Add Key-Rex to a Next.js page using <code className="bg-dark-800 px-1 rounded">useEffect</code> in a client component. <strong className="text-white">Note:</strong> <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> is optional since the script auto-initializes.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    // Load Key-Rex script
    const script = document.createElement('script');
    script.src = 'https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}';
    script.async = true;
    
    // Script auto-initializes when loaded (KeyRex.init() is optional)
    document.body.appendChild(script);
    
    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  return (
    <div>
      <h1>Login Page</h1>
      <div id="keyrex-container"></div>
      {/* Key-Rex button will appear here automatically */}
    </div>
  );
}`}
                          </pre>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-3">
                          <p className="text-xs text-orange-200">
                            <strong>Auto-Initialization:</strong> The embed script automatically calls <code className="bg-orange-600/30 px-1 rounded">KeyRex.init()</code> when the DOM is ready. You can omit the manual <code className="bg-orange-600/30 px-1 rounded">init()</code> call unless you need to delay initialization. For Next.js, you can also add the scripts directly in <code className="bg-dark-800 px-1 rounded">pages/_document.js</code> or <code className="bg-dark-800 px-1 rounded">app/layout.tsx</code> using Next.js Script component.
                          </p>
                        </div>
                      <button
                        onClick={() => {
                          const code = `'use client';\n\nimport { useEffect } from 'react';\n\nexport default function LoginPage() {\n  useEffect(() => {\n    const script = document.createElement('script');\n    script.src = 'https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}';\n    script.async = true;\n    \n    // Script auto-initializes when loaded\n    document.body.appendChild(script);\n    \n    return () => {\n      if (document.body.contains(script)) {\n        document.body.removeChild(script);\n      }\n    };\n  }, []);\n  \n  return (\n    <div>\n      <h1>Login Page</h1>\n      <div id="keyrex-container"></div>\n    </div>\n  );\n}`
                          navigator.clipboard.writeText(code)
                          toast.showSuccess('✓ Next.js example copied to clipboard!')
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
                      >
                        Copy Next.js Example
                      </button>
                    </div>

                    {/* Plain HTML Example */}
                    <div id="html-example" className="bg-dark-900/50 rounded-lg p-5 border border-dark-700 scroll-mt-24">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">📄</span>
                        <h4 className="text-lg font-semibold text-white">Plain HTML</h4>
                      </div>
                      <p className="text-sm text-white/80 mb-3">
                        The simplest integration - just paste the code before the closing <code className="bg-dark-800 px-1 rounded">&lt;/body&gt;</code> tag. <strong className="text-white">Note:</strong> <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> is optional since the script auto-initializes.
                      </p>
                      <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3">
                        <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Website</h1>
  <p>Your content here...</p>
  
  <!-- Optional: Custom container for button placement -->
  <div id="keyrex-container"></div>
  
  <!-- Key-Rex Integration -->
  <!-- Script auto-initializes when loaded (KeyRex.init() is optional) -->
  <script src="https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}"></script>
  <!-- Optional: Only call init() if you need manual control -->
  <!-- <script>KeyRex.init();</script> -->
</body>
</html>`}
                        </pre>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-3">
                        <p className="text-xs text-orange-200">
                          <strong>Auto-Initialization:</strong> The embed script automatically calls <code className="bg-orange-600/30 px-1 rounded">KeyRex.init()</code> when the DOM is ready. You can omit the manual <code className="bg-orange-600/30 px-1 rounded">init()</code> call unless you need to delay initialization.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const code = `<!-- Key-Rex Integration -->\n<!-- Script auto-initializes when loaded -->\n<script src="https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}"></script>\n<!-- Optional: Only call init() if you need manual control -->\n<!-- <script>KeyRex.init();</script> -->`
                          navigator.clipboard.writeText(code)
                          toast.showSuccess('✓ HTML example copied to clipboard!')
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
                      >
                        Copy HTML Example
                      </button>
                    </div>
                  </div>

                  {/* Backend Integration */}
                  <div id="backend-integration" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Backend Integration Guide</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Complete guide to integrating Key-Rex authentication on your backend server. This is required to create user sessions and manage authenticated users.
                    </p>

                    <div className="space-y-6">
                      {/* Overview */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Overview</h4>
                        <p className="text-sm text-white/80 mb-3">
                          When a user successfully authenticates with Key-Rex, your frontend receives their <code className="bg-dark-800 px-1 rounded">xpub</code> (extended public key) via the <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code> callback. Your backend must:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 ml-2">
                          <li>Receive the xpub from your frontend</li>
                          <li>Create or retrieve a user account based on the xpub</li>
                          <li>Generate a session token or set a session cookie</li>
                          <li>Return the session to your frontend</li>
                          <li>Use the session to authenticate subsequent requests</li>
                        </ol>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                          <p className="text-xs text-yellow-200">
                            <strong>Important:</strong> The xpub is a public identifier, not a secret. Never use it as a session token directly. Always create a separate session token on your backend.
                          </p>
                        </div>
                      </div>

                      {/* Frontend to Backend Flow */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Frontend to Backend Flow</h4>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Frontend: Send xpub to your backend
KeyRex.onSuccess(function(xpub) {
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub }),
    credentials: 'include' // Important: Include cookies
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Session created - redirect or update UI
      window.location.href = '/dashboard';
    } else {
      // Handle error
      console.error('Login failed:', data.error);
    }
  })
  .catch(error => {
    console.error('Network error:', error);
  });
});`}
                          </pre>
                        </div>
                      </div>

                      {/* Backend Examples */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Backend Implementation Examples</h4>
                        
                        {/* Node.js/Express */}
                        <div className="mb-4">
                          <h5 className="text-base font-semibold text-orange-400 mb-2">Node.js/Express</h5>
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                            <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// POST /api/auth/login
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/api/auth/login', async (req, res) => {
  const { xpub } = req.body;
  
  if (!xpub || !xpub.startsWith('xpub_')) {
    return res.status(400).json({ error: 'Invalid xpub' });
  }
  
  try {
    // Find or create user by xpub
    let user = await User.findOne({ xpub: xpub });
    
    if (!user) {
      // Create new user
      user = await User.create({
        xpub: xpub,
        createdAt: new Date()
      });
    }
    
    // Generate session token
    const token = jwt.sign(
      { userId: user._id, xpub: xpub },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set session cookie
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({ success: true, user: { id: user._id } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify session
function requireAuth(req, res, next) {
  const token = req.cookies.session || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid session' });
  }
}`}
                            </pre>
                          </div>
                        </div>

                        {/* Python/Flask */}
                        <div className="mb-4">
                          <h5 className="text-base font-semibold text-orange-400 mb-2">Python/Flask</h5>
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                            <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`# POST /api/auth/login
from flask import Flask, request, jsonify, make_response
import jwt
import datetime
from models import User

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    xpub = data.get('xpub')
    
    if not xpub or not xpub.startswith('xpub_'):
        return jsonify({'error': 'Invalid xpub'}), 400
    
    try:
        # Find or create user
        user = User.query.filter_by(xpub=xpub).first()
        
        if not user:
            user = User(xpub=xpub, created_at=datetime.datetime.utcnow())
            db.session.add(user)
            db.session.commit()
        
        # Generate session token
        token = jwt.encode({
            'user_id': user.id,
            'xpub': xpub,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        # Create response
        response = make_response(jsonify({'success': True, 'user': {'id': user.id}}))
        response.set_cookie('session', token, httponly=True, secure=True, samesite='Lax', max_age=604800)
        return response
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

# Decorator to require authentication
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.cookies.get('session') or request.headers.get('Authorization', '').split(' ')[-1]
        
        if not token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        try:
            decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user = decoded
            return f(*args, **kwargs)
        except:
            return jsonify({'error': 'Invalid session'}), 401
    
    return decorated_function`}
                            </pre>
                          </div>
                        </div>

                        {/* Serverless Functions */}
                        <div className="mb-4">
                          <h5 className="text-base font-semibold text-orange-400 mb-2">Serverless Functions (Vercel/Netlify)</h5>
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                            <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Vercel: api/auth/login.js
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db'; // Your database client

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { xpub } = req.body;
  
  if (!xpub || !xpub.startsWith('xpub_')) {
    return res.status(400).json({ error: 'Invalid xpub' });
  }
  
  try {
    // Find or create user
    let user = await db.user.findUnique({ where: { xpub } });
    
    if (!user) {
      user = await db.user.create({
        data: { xpub, createdAt: new Date() }
      });
    }
    
    // Generate session token
    const token = jwt.sign(
      { userId: user.id, xpub },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set cookie
    res.setHeader('Set-Cookie', \`session=\${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800\`);
    
    return res.status(200).json({ success: true, user: { id: user.id } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Netlify: netlify/functions/auth-login.js
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  
  const { xpub } = JSON.parse(event.body);
  
  // Similar implementation...
  // Return with Set-Cookie header in response
};`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Database Schema */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Database Schema Examples</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-base font-semibold text-orange-400 mb-2">SQL (PostgreSQL/MySQL)</h5>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  xpub VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  -- Add your custom fields here
  email VARCHAR(255),
  name VARCHAR(255)
);

CREATE INDEX idx_users_xpub ON users(xpub);

-- Sessions table (optional, if using database sessions)
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <h5 className="text-base font-semibold text-orange-400 mb-2">NoSQL (MongoDB)</h5>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// User collection
{
  _id: ObjectId("..."),
  xpub: "xpub_72edb9b751578194763736a65f1179d7...",
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  lastLogin: ISODate("2024-01-15T10:30:00Z"),
  // Add your custom fields
  email: "user@example.com",
  name: "John Doe"
}

// Create unique index on xpub
db.users.createIndex({ xpub: 1 }, { unique: true });

// Sessions collection (optional)
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  token: "jwt_token_string",
  expiresAt: ISODate("2024-01-22T10:30:00Z"),
  createdAt: ISODate("2024-01-15T10:30:00Z")
}`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Security Best Practices */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Security Best Practices</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">Validate xpub format:</strong> Always verify xpub starts with <code className="bg-dark-800 px-1 rounded">xpub_</code> and has correct length</li>
                          <li><strong className="text-white">Use HTTPS:</strong> Always use HTTPS in production to protect session cookies</li>
                          <li><strong className="text-white">HttpOnly cookies:</strong> Set session cookies with <code className="bg-dark-800 px-1 rounded">HttpOnly</code> flag to prevent XSS attacks</li>
                          <li><strong className="text-white">Secure cookies:</strong> Use <code className="bg-dark-800 px-1 rounded">Secure</code> flag in production (HTTPS only)</li>
                          <li><strong className="text-white">Session expiration:</strong> Key-Rex sessions expire after 30 days. For longer sessions, implement refresh tokens in your application.</li>
                          <li><strong className="text-white">Rate limiting:</strong> Key-Rex automatically implements rate limiting on all endpoints to prevent abuse. No additional rate limiting needed on your side.</li>
                          <li><strong className="text-white">CORS:</strong> Configure CORS properly to only allow requests from your frontend domain</li>
                          <li><strong className="text-white">Input validation:</strong> Validate and sanitize all inputs, including xpub format</li>
                        </ul>
                      </div>

                      {/* CORS Configuration */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">CORS Configuration</h4>
                        <p className="text-sm text-white/80 mb-3">
                          If your frontend and backend are on different domains, configure CORS properly:
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Express.js example
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true, // Important: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Flask example
from flask_cors import CORS

CORS(app, 
     origins=['https://yourdomain.com'],
     supports_credentials=True,
     methods=['GET', 'POST', 'PUT', 'DELETE'])

// Next.js API route
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // ... rest of handler
}`}
                          </pre>
                        </div>
                      </div>

                      {/* Environment Variables */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Environment Variables</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Required environment variables for your backend:
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`# Required
JWT_SECRET=your-secret-key-here-min-32-chars
DATABASE_URL=your-database-connection-string

# Optional
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
SESSION_EXPIRY_DAYS=7`}
                          </pre>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                          <p className="text-xs text-yellow-200">
                            <strong>Security:</strong> Never commit <code className="bg-yellow-600/30 px-1 rounded">JWT_SECRET</code> to version control. Use environment variables or a secrets management service.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* API Reference */}
                  <div id="api-reference" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">API Reference</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Complete reference for the Key-Rex JavaScript API and available methods.
                    </p>

                    <div className="space-y-6">
                      {/* KeyRex.init() */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">
                          <code className="text-orange-400 font-mono">KeyRex.init()</code>
                        </h4>
                        <p className="text-sm text-white/80 mb-3">
                          Initializes the Key-Rex integration. <strong className="text-white">Note:</strong> The script automatically initializes when the DOM is ready, so calling <code className="bg-dark-800 px-1 rounded">KeyRex.init()</code> is optional in most cases.
                        </p>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-3">
                          <p className="text-xs text-orange-200">
                            <strong>Auto-Initialization:</strong> The embed script automatically calls <code className="bg-orange-600/30 px-1 rounded">KeyRex.init()</code> when the page loads. You only need to call it manually if you want to delay initialization or re-initialize after the page has loaded.
                          </p>
                        </div>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<!-- Automatic initialization (recommended) -->
<script src="https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}"></script>
<!-- Script auto-initializes when DOM is ready -->

<!-- Manual initialization (optional) -->
<script src="https://yourdomain.com/embed?siteId=${user?.siteId || 'YOUR_SITE_ID'}"></script>
<script>
  // Call init() manually if needed (e.g., after dynamic content loads)
  KeyRex.init();
</script>`}
                          </pre>
                        </div>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Parameters:</strong> None (optional <code className="bg-dark-800 px-1 rounded">options</code> object may be added in future versions)</p>
                          <p><strong className="text-white">Returns:</strong> void</p>
                          <p><strong className="text-white">When to call:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><strong>Automatic:</strong> Script auto-initializes when DOM is ready (recommended)</li>
                            <li><strong>Manual:</strong> Call after dynamic content loads, or to re-initialize after page changes</li>
                            <li><strong>Framework Integration:</strong> In React/Vue/Next.js, you may want to call it in <code className="bg-dark-800 px-1 rounded">useEffect</code> or <code className="bg-dark-800 px-1 rounded">onMounted</code> for better control</li>
                          </ul>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Timing:</strong> If you call <code className="bg-yellow-600/30 px-1 rounded">KeyRex.init()</code> manually, make sure the embed script has fully loaded first. The script sets up <code className="bg-yellow-600/30 px-1 rounded">window.KeyRex</code> before auto-initializing.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* KeyRex.onSuccess() */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">
                          <code className="text-orange-400 font-mono">KeyRex.onSuccess(callback)</code>
                        </h4>
                        <p className="text-sm text-white/80 mb-3">
                          Register a callback function that will be called when authentication succeeds.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Register success callback
KeyRex.onSuccess(function(xpub) {
  console.log('User authenticated with xpub:', xpub);
  // Redirect to dashboard, update UI, etc.
  window.location.href = '/dashboard';
});`}
                          </pre>
                        </div>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Parameters:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><code className="bg-dark-800 px-1 rounded">callback(xpub)</code> - Function called with the user's xpub (extended public key) on successful authentication</li>
                          </ul>
                          <p><strong className="text-white">Returns:</strong> void</p>
                          <p><strong className="text-white">Example use cases:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Redirect user to authenticated area</li>
                            <li>Update UI to show logged-in state</li>
                            <li>Store authentication token</li>
                            <li>Fetch user-specific data</li>
                          </ul>
                        </div>
                      </div>

                      {/* KeyRex.onError() */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">
                          <code className="text-orange-400 font-mono">KeyRex.onError(callback)</code>
                        </h4>
                        <p className="text-sm text-white/80 mb-3">
                          Register a callback function that will be called when authentication fails or an error occurs.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Register error callback
KeyRex.onError(function(error) {
  console.error('Authentication error:', error);
  // Show error message to user
  alert('Login failed: ' + error.message);
});`}
                          </pre>
                        </div>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Parameters:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><code className="bg-dark-800 px-1 rounded">callback(error)</code> - Function called with an Error object when authentication fails</li>
                          </ul>
                          <p><strong className="text-white">Returns:</strong> void</p>
                          <p><strong className="text-white">Common error scenarios:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>User cancels authentication</li>
                            <li>Wallet connection fails</li>
                            <li>Network errors</li>
                            <li>Domain not authorized</li>
                            <li>Integration disabled</li>
                          </ul>
                        </div>
                      </div>

                      {/* xpub Retrieval Methods */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">xpub Retrieval Methods</h4>
                        <p className="text-sm text-white/80 mb-3">
                          After authentication, the xpub (extended public key) is delivered to your <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code> callback using one of three methods, depending on the authentication flow:
                        </p>

                        <div className="space-y-4">
                          {/* Method 1: URL Parameters */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Method 1: URL Parameters (Mobile Redirect)</h5>
                            <p className="text-sm text-white/80 mb-2">
                              When using mobile redirect flow, the xpub is appended to the return URL:
                            </p>
                            <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 mb-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`// After QR authentication, user is redirected to:
https://yoursite.com/dashboard?xpub=xpub_72edb9b751578194763736a65f1179d7

// Key-Rex automatically:
// 1. Detects xpub in URL parameters
// 2. Calls KeyRex.onSuccess(xpub)
// 3. Removes xpub from URL (clean address bar)
// 4. Updates browser history without reload`}
                              </pre>
                            </div>
                            <p className="text-xs text-white/60">
                              <strong>When used:</strong> Mobile devices, or when popup is blocked on desktop
                            </p>
                          </div>

                          {/* Method 2: Cookies */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Method 2: Cookies (Cross-Domain Support)</h5>
                            <p className="text-sm text-white/80 mb-2">
                              For cross-domain scenarios, xpub may be stored in cookies temporarily:
                            </p>
                            <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 mb-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Cookies used:
keyrex_k1=<challenge>              // Stores authentication challenge
keyrex_xpub_<k1prefix>=<xpub>     // Stores xpub after authentication
keyrex_return_url=<url>            // Stores return URL for redirect

// Key-Rex automatically:
// 1. Checks cookies for stored xpub
// 2. Calls KeyRex.onSuccess(xpub) if found
// 3. Cleans up cookies after use`}
                              </pre>
                            </div>
                            <p className="text-xs text-white/60">
                              <strong>When used:</strong> Cross-domain redirects, fallback when URL params aren't available
                            </p>
                          </div>

                          {/* Method 3: postMessage */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Method 3: postMessage (Desktop Popup)</h5>
                            <p className="text-sm text-white/80 mb-2">
                              When using popup mode on desktop, xpub is sent via postMessage:
                            </p>
                            <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 mb-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Popup sends message to parent window:
window.opener.postMessage({
  type: 'keyrex-auth-success',
  siteId: 'your-site-id',
  xpub: 'xpub_72edb9b751578194763736a65f1179d7'
}, 'https://keyrex-domain.com');

// Key-Rex automatically:
// 1. Listens for postMessage events
// 2. Validates message origin and siteId
// 3. Calls KeyRex.onSuccess(xpub)
// 4. Closes popup window`}
                              </pre>
                            </div>
                            <p className="text-xs text-white/60">
                              <strong>When used:</strong> Desktop popup mode (better UX, maintains page context)
                            </p>
                          </div>

                          {/* Polling Fallback */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Polling Fallback</h5>
                            <p className="text-sm text-white/80 mb-2">
                              If other methods fail, Key-Rex polls the callback endpoint to retrieve xpub:
                            </p>
                            <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 mb-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Key-Rex polls this endpoint:
GET /api/auth/callback?tag=login&k1=<challenge>&siteId=<siteId>

// Response when authenticated:
{
  "status": "OK",
  "xpub": "xpub_72edb9b751578194763736a65f1179d7"
}

// Key-Rex automatically:
// 1. Polls endpoint every 500ms (up to 10 retries)
// 2. Calls KeyRex.onSuccess(xpub) when found
// 3. Stops polling after success or timeout`}
                              </pre>
                            </div>
                            <p className="text-xs text-white/60">
                              <strong>When used:</strong> Fallback when popup closes before postMessage, or when cookies/URL params aren't available
                            </p>
                          </div>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                          <p className="text-xs text-orange-200">
                            <strong>Important:</strong> You don't need to handle these methods manually. Key-Rex automatically tries all methods in order and calls your <code className="bg-orange-600/30 px-1 rounded">KeyRex.onSuccess()</code> callback when the xpub is found. Just register your callback and handle the xpub when it arrives.
                          </p>
                        </div>
                      </div>

                      {/* Configuration Object */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Configuration Object</h4>
                        <p className="text-sm text-white/80 mb-3">
                          The configuration is automatically fetched from the server. The button text, footer text, and featured wallets are standardized and cannot be customized. If you need custom branding or styling, contact us to discuss custom solutions.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`{
  "siteId": "your-site-id",
  "buttonText": "Sign in with Key-Rex",
  "featuredWallets": [],
  "footerText": "Powered by Key-Rex — open-source",
  "integrationEnabled": true,
  "showBranding": true
}`}
                          </pre>
                        </div>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Properties:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><code className="bg-dark-800 px-1 rounded">siteId</code> - Your unique site identifier</li>
                            <li><code className="bg-dark-800 px-1 rounded">buttonText</code> - Standard button text (fixed: "Sign in with Key-Rex")</li>
                            <li><code className="bg-dark-800 px-1 rounded">featuredWallets</code> - Array of featured wallet names (managed by Key-Rex)</li>
                            <li><code className="bg-dark-800 px-1 rounded">footerText</code> - Footer text below the button (fixed: "Powered by Key-Rex — open-source")</li>
                            <li><code className="bg-dark-800 px-1 rounded">integrationEnabled</code> - Whether integration is active</li>
                            <li><code className="bg-dark-800 px-1 rounded">showBranding</code> - Whether branding is required (always true for free accounts)</li>
                          </ul>
                          <p className="text-xs text-white/60 mt-2">
                            <strong>Note:</strong> Button text, footer text, and featured wallets are standardized and cannot be customized. For custom branding options, contact us about custom solutions.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div id="configuration" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Configuration</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      The Key-Rex button uses a standardized design with fixed button text, footer text, and featured wallets. Configuration is managed server-side and automatically fetched when the script loads.
                    </p>

                    <div className="space-y-6">
                      {/* Standard Configuration */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Standard Button Configuration</h4>
                        <p className="text-sm text-white/80 mb-3">
                          All Key-Rex integrations use the same standardized button design. Configuration is fetched from the server and cannot be customized client-side:
                        </p>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Button Text:</strong> "Sign in with Key-Rex" (server-managed, fixed)</p>
                          <p><strong className="text-white">Footer Text:</strong> "Powered by Key-Rex — open-source" (server-managed, fixed)</p>
                          <p><strong className="text-white">Featured Wallets:</strong> Managed by Key-Rex server (partner wallets showcased here)</p>
                          <p><strong className="text-white">Configuration Source:</strong> Automatically fetched from <code className="bg-dark-800 px-1 rounded">/api/embed/config?siteId=...</code> when script loads</p>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-orange-200">
                              <strong>Custom Branding:</strong> If you need custom button text, styling, or branding, contact us to discuss custom solutions.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Integration Toggle */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Integration Toggle (Enable/Disable)</h4>
                        <p className="text-sm text-white/80 mb-3">
                          You can enable or disable authentication across all your domains from the dashboard:
                        </p>
                        <div className="space-y-3 text-sm text-white/80">
                          <p><strong className="text-white">Location:</strong> Go to <strong className="text-orange-400">"My Integration Code"</strong> tab → <strong className="text-orange-400">"Integration Status"</strong> toggle</p>
                          <p><strong className="text-white">When Enabled:</strong> Authentication button appears and works normally</p>
                          <p><strong className="text-white">When Disabled:</strong> Button is replaced with a message: "Key-Rex authentication is currently disabled. Please contact the website owner."</p>
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                            <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// When integrationEnabled: false, users see:
<div style="background: #fef3c7; border: 2px solid #f59e0b; ...">
  <p>Key-Rex authentication is currently disabled</p>
  <p>Please contact the website owner to enable authentication.</p>
</div>

// Your KeyRex.onSuccess() callback will NOT be called
// Users cannot authenticate until you re-enable it`}
                            </pre>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Use Cases:</strong> Temporarily disable authentication during maintenance, testing, or if you need to pause new signups.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Default Config Fallback */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Default Configuration Fallback</h4>
                        <p className="text-sm text-white/80 mb-3">
                          If the configuration API fails to load (network error, server down, etc.), Key-Rex uses a default configuration to ensure the button still renders:
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Default config used when API fails:
{
  siteId: siteId,
  buttonText: 'Sign in with Key-Rex',
  showBranding: true,
  featuredWallets: [
    // Partner wallets will be listed here when available
  ],
  footerText: 'Powered by Key-Rex — open-source',
  integrationEnabled: true
}

// KeyRex.onError() is called with:
// Error('Failed to load configuration - using default')`}
                          </pre>
                        </div>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Behavior:</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Button still renders and is functional</li>
                            <li>Default featured wallets are shown</li>
                            <li>Authentication flow works normally</li>
                            <li><code className="bg-dark-800 px-1 rounded">KeyRex.onError()</code> is called to notify you of the fallback</li>
                          </ul>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-orange-200">
                              <strong>Note:</strong> This fallback ensures your site remains functional even if the Key-Rex API is temporarily unavailable. The button will work, but you may want to monitor for configuration API failures.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Container Placement */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Container Placement</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Control where the Key-Rex button appears on your page by specifying a container element with <code className="bg-dark-800 px-1 rounded">id="keyrex-container"</code>.
                        </p>

                        <div className="space-y-4">
                          {/* Default Behavior */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Default Behavior (No Container)</h5>
                            <p className="text-sm text-white/80 mb-2">
                              If no container is specified, the button is appended to the <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code> element:
                            </p>
                            <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 mb-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`<body>
  <h1>My Website</h1>
  <p>Content here...</p>
  
  <!-- Key-Rex button will be added here automatically -->
  <script src="https://yourdomain.com/embed?siteId=..."></script>
  <!-- Script auto-initializes -->
</body>`}
                              </pre>
                            </div>
                            <p className="text-xs text-white/60">
                              <strong>Result:</strong> Button appears at the end of the page body
                            </p>
                          </div>

                          {/* Custom Container */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Custom Container (Recommended)</h5>
                            <p className="text-sm text-white/80 mb-2">
                              Place the button in a specific location by creating an element with <code className="bg-dark-800 px-1 rounded">id="keyrex-container"</code>:
                            </p>
                            <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 mb-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`<body>
  <header>
    <h1>My Website</h1>
  </header>
  
  <main>
    <div class="login-section">
      <h2>Sign In</h2>
      
      <!-- Key-Rex button will be inserted here -->
      <div id="keyrex-container"></div>
    </div>
  </main>
  
  <script src="https://yourdomain.com/embed?siteId=..."></script>
  <!-- Script detects #keyrex-container and places button there -->
</body>`}
                              </pre>
                            </div>
                            <p className="text-xs text-white/60">
                              <strong>Result:</strong> Button appears inside the <code className="bg-dark-800 px-1 rounded">#keyrex-container</code> element
                            </p>
                          </div>

                          {/* Multiple Containers */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Important: Only One Container</h5>
                            <p className="text-sm text-white/80 mb-2">
                              If multiple elements with <code className="bg-dark-800 px-1 rounded">id="keyrex-container"</code> exist, Key-Rex will use the first one found:
                            </p>
                            <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 mb-2 overflow-x-auto">
                              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`<!-- This will be used (first one found) -->
<div id="keyrex-container">Button here</div>

<!-- This will be ignored -->
<div id="keyrex-container">Not used</div>

<!-- Recommendation: Use unique IDs or classes -->
<div id="keyrex-login-container">Button here</div>
<div id="keyrex-header-container">Not used</div>`}
                              </pre>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-2">
                              <p className="text-xs text-yellow-200">
                                <strong>Best Practice:</strong> Use only one <code className="bg-yellow-600/30 px-1 rounded">id="keyrex-container"</code> per page. If you need multiple buttons, create custom buttons that trigger the authentication flow programmatically.
                              </p>
                            </div>
                          </div>

                          {/* Framework Examples */}
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700">
                            <h5 className="text-base font-semibold text-orange-400 mb-2">Framework Examples</h5>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-white mb-1">React:</p>
                                <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 overflow-x-auto">
                                  <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`function LoginPage() {
  return (
    <div>
      <h2>Sign In</h2>
      <div id="keyrex-container"></div>
    </div>
  );
}`}
                                  </pre>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white mb-1">Vue:</p>
                                <div className="bg-dark-900 rounded-lg p-3 border border-dark-600 overflow-x-auto">
                                  <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`<template>
  <div>
    <h2>Sign In</h2>
    <div id="keyrex-container"></div>
  </div>
</template>`}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-4">
                          <p className="text-xs text-orange-200">
                            <strong>Detection:</strong> Key-Rex checks for <code className="bg-orange-600/30 px-1 rounded">#keyrex-container</code> when <code className="bg-orange-600/30 px-1 rounded">init()</code> is called (or auto-initializes). If found, the button is placed there. Otherwise, it's appended to <code className="bg-orange-600/30 px-1 rounded">&lt;body&gt;</code>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Best Practices */}
                  <div id="best-practices" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Best Practices</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Follow these guidelines to ensure a secure, performant, and accessible integration.
                    </p>

                    <div className="space-y-6">
                      {/* Security */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">🔒 Security Considerations</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">Domain Authorization:</strong> Always add and verify your domains in the dashboard. Production domains require DNS TXT record verification to prove ownership. Only verified domains can use your integration code.</li>
                          <li><strong className="text-white">HTTPS Required:</strong> Use HTTPS in production. Authentication requires secure connections.</li>
                          <li><strong className="text-white">Site ID Protection:</strong> Never expose your siteId in client-side code that could be copied. The embed script handles this securely.</li>
                          <li><strong className="text-white">Session Management:</strong> Implement proper session handling on your backend. The xpub returned is a public identifier, not a secret.</li>
                          <li><strong className="text-white">Error Handling:</strong> Always implement <code className="bg-dark-800 px-1 rounded">KeyRex.onError()</code> to handle authentication failures gracefully.</li>
                        </ul>
                      </div>

                      {/* Performance */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">⚡ Performance Optimization</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">Script Placement:</strong> Place scripts at the end of <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code> to avoid blocking page rendering.</li>
                          <li><strong className="text-white">Async Loading:</strong> The embed script loads asynchronously by default, so it won't block other resources.</li>
                          <li><strong className="text-white">Lazy Loading:</strong> Consider loading the script only when needed (e.g., when user clicks "Login" button).</li>
                          <li><strong className="text-white">Caching:</strong> The embed script is cacheable. Ensure your server sends appropriate cache headers.</li>
                        </ul>
                      </div>

                      {/* Accessibility */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">♿ Accessibility Guidelines</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">Button Labels:</strong> The button includes proper ARIA labels and is keyboard accessible.</li>
                          <li><strong className="text-white">Screen Readers:</strong> The button is designed to be accessible to screen readers.</li>
                          <li><strong className="text-white">Color Contrast:</strong> The button maintains WCAG AA contrast ratios (4.5:1 for text).</li>
                          <li><strong className="text-white">Focus States:</strong> Focus indicators are included for keyboard navigation.</li>
                          <li><strong className="text-white">Error Messages:</strong> Provide clear, accessible error messages when authentication fails.</li>
                        </ul>
                      </div>

                      {/* SEO */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">🔍 SEO Considerations</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">No Impact:</strong> The embed script doesn't affect SEO. It's loaded client-side and doesn't modify page content for crawlers.</li>
                          <li><strong className="text-white">Progressive Enhancement:</strong> Ensure your site works without JavaScript. The login button is an enhancement, not a requirement.</li>
                          <li><strong className="text-white">Structured Data:</strong> The integration doesn't interfere with structured data or meta tags.</li>
                          <li><strong className="text-white">Page Speed:</strong> Script placement at the end of body ensures it doesn't affect Core Web Vitals.</li>
                        </ul>
                      </div>

                      {/* xpub Handling */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">📦 Handling xpub from URL Parameters & Cookies</h4>
                        <p className="text-sm text-white/80 mb-3">
                          After authentication, the xpub may arrive via URL parameters (mobile redirect) or cookies (cross-domain). Key-Rex handles this automatically, but you should be aware of the behavior:
                        </p>
                        <div className="space-y-3 text-sm text-white/80">
                          <div>
                            <p className="font-semibold text-white mb-2">URL Parameters (Mobile Redirect):</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>xpub is appended to return URL: <code className="bg-dark-800 px-1 rounded">?xpub=xpub_...</code></li>
                              <li>Key-Rex automatically detects and removes it from the URL</li>
                              <li>Your <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code> callback is called</li>
                              <li>URL is cleaned up (xpub removed from address bar) without page reload</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-2">Cookies (Cross-Domain):</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Used for cross-domain redirects (e.g., Key-Rex on different domain)</li>
                              <li>Cookies: <code className="bg-dark-800 px-1 rounded">keyrex_k1</code>, <code className="bg-dark-800 px-1 rounded">keyrex_xpub_*</code></li>
                              <li>Key-Rex automatically reads cookies and cleans them up after use</li>
                              <li>No manual cookie handling required</li>
                            </ul>
                          </div>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                            <p className="text-xs text-orange-200">
                              <strong>Best Practice:</strong> Don't manually parse URL parameters or cookies. Key-Rex handles all xpub retrieval automatically. Just register your <code className="bg-orange-600/30 px-1 rounded">KeyRex.onSuccess()</code> callback and handle the xpub when it arrives.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile vs Desktop */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">📱 Mobile vs Desktop Considerations</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Key-Rex automatically adapts to mobile and desktop environments, but there are important differences to understand:
                        </p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Desktop Behavior:</p>
                            <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-4">
                              <li>Uses popup window for QR code (better UX, maintains page context)</li>
                              <li>WebLN extensions work seamlessly</li>
                              <li>Popup communicates via <code className="bg-dark-800 px-1 rounded">postMessage</code></li>
                              <li>If popup is blocked, automatically falls back to full-page redirect</li>
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Mobile Behavior:</p>
                            <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-4">
                              <li>Uses full-page redirect for QR code (more reliable on mobile)</li>
                              <li>WebLN may not be available (depends on mobile browser)</li>
                              <li>xpub delivered via URL parameters after redirect</li>
                              <li>Better for users scanning QR codes with separate device</li>
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Testing Recommendations:</p>
                            <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-4">
                              <li>Test on both mobile and desktop devices</li>
                              <li>Test with popup blockers enabled (should fallback gracefully)</li>
                              <li>Test with different mobile browsers (Safari, Chrome mobile)</li>
                              <li>Test QR code scanning flow (user scans with separate device)</li>
                            </ul>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Important:</strong> Mobile users often scan QR codes with a different device (e.g., scan desktop QR with mobile wallet). The redirect flow handles this seamlessly.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Popup Blocking */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">🚫 Popup Blocking Fallback</h4>
                        <p className="text-sm text-white/80 mb-3">
                          If a user's browser blocks popups, Key-Rex automatically falls back to a full-page redirect:
                        </p>
                        <div className="space-y-3 text-sm text-white/80">
                          <div>
                            <p className="font-semibold text-white mb-2">Automatic Fallback:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-4">
                              <li>Script attempts to open popup window</li>
                              <li>If popup is blocked, detects <code className="bg-dark-800 px-1 rounded">window.open()</code> returns <code className="bg-dark-800 px-1 rounded">null</code></li>
                              <li>Automatically switches to full-page redirect (same as mobile flow)</li>
                              <li>Stores challenge in cookie for cross-domain support</li>
                              <li>Redirects to QR page, then back to your site with xpub in URL</li>
                            </ol>
                          </div>
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                            <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Key-Rex automatically handles this:
// 1. Try popup
const popup = window.open(qrUrl, 'Key-Rex Authentication', ...);

// 2. If blocked, fallback to redirect
if (!popup) {
  // Store k1 in httpOnly cookie via server-side API (prevents XSS)
  await fetch('/api/auth/store-k1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ k1: challenge, returnUrl: window.location.href }),
  });
  // Redirect to QR page
  window.location.href = qrUrl + '&redirect=true';
}

// No action needed from you - Key-Rex handles it automatically`}
                            </pre>
                          </div>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                            <p className="text-xs text-orange-200">
                              <strong>User Experience:</strong> Users with popup blockers will experience the same redirect flow as mobile users. The authentication still works, just with a different UX pattern.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* General Tips */}
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5">
                        <h4 className="text-base font-semibold text-orange-300 mb-3">💡 General Tips</h4>
                        <ul className="space-y-2 text-sm text-orange-200 list-disc list-inside ml-2">
                          <li>Test your integration in multiple browsers (Chrome, Firefox, Safari, Edge)</li>
                          <li>Test with different Lightning wallets</li>
                          <li>Always test on mobile devices - many users will authenticate from mobile</li>
                          <li>Test with popup blockers enabled to verify fallback behavior</li>
                          <li>Monitor your Analytics tab to track authentication usage</li>
                          <li>Keep your domain list up to date - remove unused domains</li>
                          <li>Use the Troubleshooting tab if you encounter issues</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Testing & Debugging */}
                  <div id="testing-debugging" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Testing & Debugging</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Guide to testing your integration and debugging common issues.
                    </p>

                    <div className="space-y-6">
                      {/* Local Testing */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Testing Locally</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 ml-2">
                          <li>Add <code className="bg-dark-800 px-1 rounded">localhost</code> or <code className="bg-dark-800 px-1 rounded">127.0.0.1</code> to your domains list in the dashboard</li>
                          <li>Run your local development server (e.g., <code className="bg-dark-800 px-1 rounded">npm run dev</code>)</li>
                          <li>Add the integration code to your local HTML file</li>
                          <li>Open the page in your browser</li>
                          <li>Click the button and test with a Lightning wallet</li>
                        </ol>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                          <p className="text-xs text-orange-200">
                            <strong>Tip:</strong> Test domains (localhost, 127.0.0.1, test subdomains) are automatically recognized and don't require strict domain matching.
                          </p>
                        </div>
                      </div>

                      {/* Debug Mode */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Debug Mode</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Enable debug logging to troubleshoot issues. Open browser console (F12) to see debug messages.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Debug information is automatically logged to console
// Open browser DevTools (F12) and check Console tab

// Check if Key-Rex is loaded
console.log('Key-Rex object:', window.KeyRex);

// Check if button exists
console.log('Button element:', document.getElementById('keyrex-button'));

// Check configuration
// Configuration is fetched from: /api/embed/config?siteId=YOUR_SITE_ID
// Check Network tab in DevTools to see the response`}
                          </pre>
                        </div>
                      </div>

                      {/* Common Debugging Steps */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Common Debugging Steps</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 ml-2">
                          <li><strong className="text-white">Check Browser Console:</strong> Open DevTools (F12) → Console tab. Look for red error messages.</li>
                          <li><strong className="text-white">Check Network Tab:</strong> Verify the embed script loads (status 200). Check config request succeeds.</li>
                          <li><strong className="text-white">Verify Domain:</strong> Ensure your domain is added and verified in the dashboard (production domains require DNS TXT record verification) and matches exactly.</li>
                          <li><strong className="text-white">Check Integration Status:</strong> Verify integration is enabled in the "My Integration Code" tab.</li>
                          <li><strong className="text-white">Test Wallet:</strong> Try different Lightning wallets.</li>
                          <li><strong className="text-white">Clear Cache:</strong> Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to clear cached scripts.</li>
                          <li><strong className="text-white">Check Script Placement:</strong> Ensure scripts are in <code className="bg-dark-800 px-1 rounded">&lt;body&gt;</code>, not <code className="bg-dark-800 px-1 rounded">&lt;head&gt;</code>.</li>
                        </ol>
                      </div>

                      {/* Error Messages */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Understanding Error Messages</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <div>
                            <p className="font-semibold text-white mb-1">"Domain not authorized"</p>
                            <p>Your domain isn't in the allowed list. Add it in the Domains tab.</p>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-1">"Integration is disabled"</p>
                            <p>Integration toggle is off. Enable it in the "My Integration Code" tab.</p>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-1">"Failed to load configuration"</p>
                            <p>Network error or server issue. Check your internet connection and try again.</p>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-1">"Key-Rex is not defined"</p>
                            <p>Script didn't load. Check Network tab for failed requests.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Features */}
                  <div id="advanced-features" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Advanced Features</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Advanced integration techniques and custom implementations.
                    </p>

                    <div className="space-y-6">
                      {/* Custom Event Handling */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Custom Event Handling</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Use callbacks to handle authentication events and integrate with your application logic.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Register success callback
KeyRex.onSuccess(function(xpub) {
  // Send xpub to your backend for session creation
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub })
  })
  .then(response => response.json())
  .then(data => {
    // Store session token
    localStorage.setItem('authToken', data.token);
    // Redirect to authenticated area
    window.location.href = '/dashboard';
  });
});

// Register error callback
KeyRex.onError(function(error) {
  // Log error for debugging
  console.error('Key-Rex error:', error);
  // Show user-friendly error message
  document.getElementById('error-message').textContent = 
    'Authentication failed. Please try again.';
});`}
                          </pre>
                        </div>
                      </div>

                      {/* Multiple Buttons */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Multiple Buttons on One Page</h4>
                        <p className="text-sm text-white/80 mb-3">
                          By default, only one button is created. To have multiple buttons, you can create custom buttons that trigger the authentication flow.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`<!-- Custom button that triggers Key-Rex -->
<button id="custom-login-btn" onclick="triggerKeyRexLogin()">
  Login with Lightning
</button>

<script>
function triggerKeyRexLogin() {
  // Get the Key-Rex button and click it programmatically
  const keyrexBtn = document.getElementById('keyrex-button');
  if (keyrexBtn) {
    keyrexBtn.click();
  }
}
</script>`}
                          </pre>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                          <p className="text-xs text-orange-200">
                            <strong>Note:</strong> The embed script creates one button by default. Custom buttons can trigger the same authentication flow.
                          </p>
                        </div>
                      </div>

                      {/* Programmatic Authentication */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Programmatic Authentication</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Trigger authentication programmatically without requiring a button click.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Trigger authentication programmatically
function loginWithKeyRex() {
  const button = document.getElementById('keyrex-button');
  if (button) {
    button.click();
  } else {
    console.error('Key-Rex button not found. Make sure KeyRex.init() has been called.');
  }
}

// Example: Auto-trigger on page load (not recommended for UX)
// window.addEventListener('load', () => {
//   setTimeout(loginWithKeyRex, 1000);
// });`}
                          </pre>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                          <p className="text-xs text-yellow-200">
                            <strong>Warning:</strong> Auto-triggering authentication is not recommended as it can be intrusive to users. Always require explicit user action.
                          </p>
                        </div>
                      </div>

                      {/* Session Management */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Session Management</h4>
                        <p className="text-sm text-white/80 mb-3">
                          The xpub returned is a public identifier. Implement proper session management on your backend.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Frontend: Send xpub to backend
KeyRex.onSuccess(function(xpub) {
  fetch('/api/auth/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub }),
    credentials: 'include' // Include cookies
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Session created, redirect
      window.location.href = '/dashboard';
    }
  });
});

// Backend: Create session (example)
// POST /api/auth/create-session
// {
//   xpub: "xpub_...",
//   // Create session token, store in database, set cookie
//   // Return { success: true, token: "..." }
// }`}
                          </pre>
                        </div>
                      </div>

                      {/* postMessage API Details */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">postMessage API (Popup Communication)</h4>
                        <p className="text-sm text-white/80 mb-3">
                          When using desktop popup mode, the popup communicates with your page using the browser's <code className="bg-dark-800 px-1 rounded">postMessage</code> API. Key-Rex handles this automatically, but you can listen manually if needed:
                        </p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Message Format:</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Success message
{
  type: 'keyrex-auth-success',
  siteId: 'your-site-id',
  xpub: 'xpub_72edb9b751578194763736a65f1179d7'
}

// Error message
{
  type: 'keyrex-auth-error',
  siteId: 'your-site-id',
  error: 'Authentication failed: User cancelled'
}

// Popup closed message
{
  type: 'keyrex-popup-closed',
  siteId: 'your-site-id'
}`}
                              </pre>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Manual Listener (Optional):</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Listen for messages from Key-Rex popup
window.addEventListener('message', function(event) {
  // IMPORTANT: Verify origin matches Key-Rex domain (security)
  const keyrexDomain = 'https://your-keyrex-domain.com';
  if (event.origin !== keyrexDomain) {
    return; // Ignore messages from other origins
  }
  
  // Verify message type and siteId
  if (event.data && event.data.type === 'keyrex-auth-success' && 
      event.data.siteId === 'your-site-id') {
    const xpub = event.data.xpub;
    // Handle authentication
    console.log('Received xpub from popup:', xpub);
    // Your custom logic here
  } else if (event.data && event.data.type === 'keyrex-auth-error') {
    // Handle error
    console.error('Authentication error:', event.data.error);
  }
});`}
                              </pre>
                            </div>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Security:</strong> Always verify <code className="bg-yellow-600/30 px-1 rounded">event.origin</code> matches your Key-Rex domain before processing messages. This prevents malicious sites from sending fake authentication messages.
                            </p>
                          </div>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                            <p className="text-xs text-orange-200">
                              <strong>Note:</strong> You typically don't need to handle postMessage manually. Key-Rex automatically processes these messages and calls your <code className="bg-orange-600/30 px-1 rounded">KeyRex.onSuccess()</code> or <code className="bg-orange-600/30 px-1 rounded">KeyRex.onError()</code> callbacks.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Dark Mode Detection */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">🌙 Dark Mode Detection</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Key-Rex automatically detects and adapts to dark mode preferences:
                        </p>
                        <div className="space-y-3 text-sm text-white/80">
                          <div>
                            <p className="font-semibold text-white mb-2">Detection Methods:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Checks <code className="bg-dark-800 px-1 rounded">prefers-color-scheme: dark</code> media query</li>
                              <li>Checks for <code className="bg-dark-800 px-1 rounded">dark</code> class on <code className="bg-dark-800 px-1 rounded">document.documentElement</code></li>
                              <li>Automatically applies dark mode styling if detected</li>
                            </ul>
                          </div>
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                            <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Key-Rex automatically detects dark mode:
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDarkMode = prefersDark || document.documentElement.classList.contains('dark');

// Then applies appropriate styling:
// - Dark background colors
// - Light text colors
// - Adjusted border colors
// - Proper contrast ratios

// No configuration needed - works automatically`}
                            </pre>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-2">Styling Adaptations:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Card background: Dark slate in dark mode, white in light mode</li>
                              <li>Text colors: Adjusted for proper contrast</li>
                              <li>Border colors: Subtle orange borders with appropriate opacity</li>
                              <li>Wallet logos: Maintain visibility in both modes</li>
                            </ul>
                          </div>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                            <p className="text-xs text-orange-200">
                              <strong>Automatic:</strong> No configuration needed. Key-Rex detects your site's theme and adapts automatically. Works with CSS <code className="bg-orange-600/30 px-1 rounded">prefers-color-scheme</code> and common dark mode class names.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Skeleton Loading State */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">⏳ Skeleton Loading State</h4>
                        <p className="text-sm text-white/80 mb-3">
                          While the configuration is loading from the server, Key-Rex displays a skeleton loading state to provide visual feedback:
                        </p>
                        <div className="space-y-3 text-sm text-white/80">
                          <div>
                            <p className="font-semibold text-white mb-2">When Skeleton Appears:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Immediately when script loads (before config API responds)</li>
                              <li>Shows animated placeholder matching button and wallet layout</li>
                              <li>Prevents layout shift when real content loads</li>
                              <li>Automatically replaced when configuration loads</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-2">Skeleton Features:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Animated gradient shimmer effect</li>
                              <li>Matches final button and wallet dimensions</li>
                              <li>Respects <code className="bg-dark-800 px-1 rounded">prefers-reduced-motion</code> (disables animation)</li>
                              <li>Appears in same location as final button</li>
                            </ul>
                          </div>
                          <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                            <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Skeleton is automatically shown when:
// 1. Script loads
// 2. Config API hasn't responded yet
// 3. Config is null or undefined

// Skeleton is automatically hidden when:
// 1. Config loads successfully
// 2. Real button and wallets are rendered
// 3. Error occurs (shows error message instead)

// No manual control needed - Key-Rex handles it automatically`}
                            </pre>
                          </div>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                            <p className="text-xs text-orange-200">
                              <strong>User Experience:</strong> The skeleton provides immediate visual feedback that something is loading, preventing users from thinking the page is broken. The animation is subtle and respects accessibility preferences.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Linking & User Management */}
                  <div id="account-linking" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Account Linking & User Management</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Learn how to link Key-Rex authentication to existing user accounts and manage user identity in your application.
                    </p>

                    <div className="space-y-6">
                      {/* Understanding xpub */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Understanding xpub and User Identity</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            When a user authenticates with Key-Rex, you receive their <code className="bg-dark-800 px-1 rounded">xpub</code> (extended public key) in the <code className="bg-dark-800 px-1 rounded">KeyRex.onSuccess()</code> callback. The xpub is:
                          </p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong className="text-white">Deterministic:</strong> Same wallet = same xpub every time</li>
                            <li><strong className="text-white">Unique:</strong> Each Lightning wallet has a unique xpub</li>
                            <li><strong className="text-white">Public:</strong> Safe to store in your database (not a secret)</li>
                            <li><strong className="text-white">Persistent:</strong> Never changes for a given wallet</li>
                          </ul>
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                            <p className="text-xs text-orange-200">
                              <strong>Key Point:</strong> The xpub is like a username that's cryptographically tied to the user's wallet. You need to map it to your own user IDs to know which account to log them into.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Supporting Multiple Wallets per User */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Supporting Multiple Wallets per User</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            Some of your users may want to sign in with more than one Lightning wallet (for example, a mobile wallet and a desktop wallet). Key-Rex makes this straightforward: each wallet has its own <code className="bg-dark-800 px-1 rounded">xpub</code>, and you can allow multiple xpubs to be linked to the same user account in your system.
                          </p>
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">Recommended approach:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Store one primary Key-Rex xpub for each user (for example, the first wallet they used to sign in).</li>
                              <li>Add a separate field or table to store additional linked xpubs for the same account (for example, a <code className="bg-dark-800 px-1 rounded">linked_xpubs</code> array or a <code className="bg-dark-800 px-1 rounded">user_wallets</code> table).</li>
                              <li>When Key-Rex returns an xpub you haven&apos;t seen before, decide whether to attach it to an existing account (user is already logged in) or create a new account if this is a completely new user.</li>
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">Safety tips:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Ensure each xpub is linked to only one user account (make the xpub unique in your database).</li>
                              <li>Do not allow users to unlink their last wallet if it is their only login method—offer an alternate login or recovery path first.</li>
                            </ul>
                          </div>
                        </div>

                      {/* Handling Lost Wallets & Recovery */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Handling Lost Wallets & Account Recovery</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            Because Key-Rex is a passwordless system based on Lightning wallets, there is no &quot;reset password&quot; button for a lost wallet. If a user loses access to a wallet that was their only way to sign in, your application needs to provide a separate recovery path.
                          </p>
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">Recommended recovery strategy:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Encourage users to link at least one additional wallet (backup) to their account while they still have access.</li>
                              <li>Offer an alternate login or recovery channel (for example, email + password, magic link, or an admin-reviewed support process) that can be used if all wallets are lost.</li>
                              <li>After verifying the user through your recovery flow, let them link a new wallet (new xpub) to the same account.</li>
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">Important safety rules:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Do not allow users to unlink their last wallet if they have no other login method configured (to avoid accidental lockout).</li>
                              <li>Keep your recovery process strict enough that an attacker cannot easily convince support to reassign an account to their wallet.</li>
                            </ul>
                          </div>
                          <p>
                            Key-Rex&apos;s role is to provide a strong cryptographic identifier (xpub) for each wallet. How you handle recovery and wallet replacement is up to your application&apos;s account management and support policies.
                          </p>
                        </div>
                      </div>
                      </div>

                      {/* xpub Format Specification */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">xpub Format Specification</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Understanding the exact format helps you validate and store xpubs correctly.
                        </p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Format Details</p>
                            <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                              <li><strong className="text-white">Prefix:</strong> Always starts with <code className="bg-dark-800 px-1 rounded">xpub_</code></li>
                              <li><strong className="text-white">Length:</strong> Exactly 37 characters total (5 for "xpub_" + 32 hex characters)</li>
                              <li><strong className="text-white">Format:</strong> <code className="bg-dark-800 px-1 rounded">xpub_</code> + 32 hexadecimal characters (0-9, a-f)</li>
                              <li><strong className="text-white">Example:</strong> <code className="bg-dark-800 px-1 rounded">xpub_72edb9b751578194763736a65f1179d7</code></li>
                              <li><strong className="text-white">Case:</strong> Hex characters are lowercase (a-f, not A-F)</li>
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Validation Function</p>
                            <p className="text-sm text-white/80 mb-2">
                              Always validate xpubs before storing them in your database:
                            </p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Validate xpub format
function isValidXpub(xpub) {
  if (!xpub || typeof xpub !== 'string') {
    return false;
  }
  
  // Check prefix
  if (!xpub.startsWith('xpub_')) {
    return false;
  }
  
  // Check total length (should be 37: "xpub_" + 32 hex chars)
  if (xpub.length !== 37) {
    return false;
  }
  
  // Check hex characters (after "xpub_")
  const hexPart = xpub.substring(5); // Everything after "xpub_"
  const hexRegex = /^[0-9a-f]{32}$/; // Exactly 32 lowercase hex chars
  
  if (!hexRegex.test(hexPart)) {
    return false;
  }
  
  return true;
}

// Usage in your backend
app.post('/api/auth/keyrex', async (req, res) => {
  const { xpub } = req.body;
  
  // Validate xpub format
  if (!isValidXpub(xpub)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid xpub format',
      message: 'xpub must be in format: xpub_ followed by 32 hexadecimal characters'
    });
  }
  
  // Continue with authentication...
});

// TypeScript version
function isValidXpub(xpub: string | undefined | null): boolean {
  if (!xpub || typeof xpub !== 'string') {
    return false;
  }
  
  return /^xpub_[0-9a-f]{32}$/.test(xpub);
}`}
                              </pre>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Handling Edge Cases</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Comprehensive xpub handling with error messages
function validateAndNormalizeXpub(xpub) {
  // Check if xpub exists
  if (!xpub) {
    return {
      valid: false,
      error: 'xpub is required',
      normalized: null
    };
  }
  
  // Convert to string and trim whitespace
  const trimmed = String(xpub).trim();
  
  // Check if empty after trimming
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'xpub cannot be empty',
      normalized: null
    };
  }
  
  // Check prefix
  if (!trimmed.startsWith('xpub_')) {
    return {
      valid: false,
      error: 'xpub must start with "xpub_"',
      normalized: null
    };
  }
  
  // Check length
  if (trimmed.length !== 37) {
    return {
      valid: false,
      error: \`xpub must be exactly 37 characters (got \${trimmed.length})\`,
      normalized: null
    };
  }
  
  // Extract and validate hex part
  const hexPart = trimmed.substring(5);
  const hexRegex = /^[0-9a-f]{32}$/;
  
  if (!hexRegex.test(hexPart)) {
    // Check if it's uppercase (common mistake)
    if (/^[0-9A-F]{32}$/.test(hexPart)) {
      // Normalize to lowercase
      const normalized = 'xpub_' + hexPart.toLowerCase();
      return {
        valid: true,
        error: null,
        normalized: normalized
      };
    }
    
    return {
      valid: false,
      error: 'xpub hex part must be exactly 32 lowercase hexadecimal characters (0-9, a-f)',
      normalized: null
    };
  }
  
  // Valid xpub
  return {
    valid: true,
    error: null,
    normalized: trimmed // Already lowercase
  };
}

// Usage
const result = validateAndNormalizeXpub(userInput);
if (!result.valid) {
  console.error('Invalid xpub:', result.error);
  return res.status(400).json({ error: result.error });
}

// Use result.normalized (always lowercase, validated)
const xpub = result.normalized;`}
                              </pre>
                            </div>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Important:</strong> Always validate xpubs on your backend before storing them. Never trust client-side data. The validation function above ensures you only store properly formatted xpubs.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* The Problem */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">The Account Linking Challenge</h4>
                        <div className="space-y-3 text-sm text-white/80">
                          <p>
                            When a user clicks "Sign in with Key-Rex" for the first time, you receive their xpub. But how do you know if this is:
                          </p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>A <strong className="text-white">new user</strong> who needs a new account created?</li>
                            <li>An <strong className="text-white">existing user</strong> who wants to link their wallet to their current account?</li>
                          </ul>
                          <p className="mt-3">
                            <strong className="text-white">Solution:</strong> Implement an account linking flow that allows existing users to connect their Lightning wallet to their current account.
                          </p>
                        </div>
                      </div>

                      {/* Database Setup */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 1: Database Setup</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Add a column to store the Key-Rex xpub in your user table.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Example: SQL migration
ALTER TABLE users ADD COLUMN keyrex_xpub VARCHAR(255) UNIQUE;

// Example: MongoDB schema
{
  _id: ObjectId("..."),
  email: "user@example.com",
  username: "johndoe",
  keyrexXpub: "xpub_72edb9b751578194763736a65f1179d7", // Optional, can be null
  createdAt: ISODate("..."),
  // ... other fields
}

// Example: Prisma schema
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  username    String
  keyrexXpub String?  @unique // Optional field
  createdAt   DateTime @default(now())
}`}
                          </pre>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                          <p className="text-xs text-yellow-200">
                            <strong>Important:</strong> Make the xpub column <code className="bg-yellow-600/30 px-1 rounded">UNIQUE</code> to prevent one wallet from being linked to multiple accounts. Also make it nullable since users might not have linked a wallet yet.
                          </p>
                        </div>
                      </div>

                      {/* New User Flow */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 2: New User Flow (First-Time Authentication)</h4>
                        <p className="text-sm text-white/80 mb-3">
                          When a user authenticates and you don't recognize their xpub, create a new account.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Frontend: Handle authentication
KeyRex.onSuccess(async function(xpub) {
  try {
    const response = await fetch('/api/auth/keyrex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpub: xpub })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store session token
      localStorage.setItem('authToken', data.token);
      // Redirect based on whether it's a new or existing user
      if (data.isNewUser) {
        window.location.href = '/onboarding'; // New user flow
      } else {
        window.location.href = '/dashboard'; // Existing user
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
  }
});

// Backend: Check if user exists, create if new
// POST /api/auth/keyrex
app.post('/api/auth/keyrex', async (req, res) => {
  const { xpub } = req.body;
  
  // Check if xpub already exists
  let user = await db.users.findOne({ keyrexXpub: xpub });
  
  if (!user) {
    // New user - create account
    user = await db.users.create({
      keyrexXpub: xpub,
      // Set default values or prompt for additional info
      createdAt: new Date()
    });
    
    // Create session
    const token = generateSessionToken(user.id);
    
    return res.json({
      success: true,
      isNewUser: true,
      token: token,
      userId: user.id
    });
  } else {
    // Existing user - log them in
    const token = generateSessionToken(user.id);
    
    return res.json({
      success: true,
      isNewUser: false,
      token: token,
      userId: user.id
    });
  }
});`}
                          </pre>
                        </div>
                      </div>

                      {/* Account Linking Flow */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 3: Account Linking Flow (For Existing Users)</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Allow users who are already logged in to link their Lightning wallet to their current account.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Frontend: Account Settings Page (User already logged in)
function LinkKeyRexWallet() {
  const [linking, setLinking] = useState(false);
  
  const handleLinkWallet = () => {
    setLinking(true);
    
    // Register callback for this specific action
    KeyRex.onSuccess(async function(xpub) {
      try {
        // Get current user's ID (they're already logged in)
        const currentUserId = getCurrentUserId(); // From session/token
        
        const response = await fetch('/api/users/link-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${getAuthToken()}\`
          },
          body: JSON.stringify({ xpub: xpub })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('Lightning wallet linked successfully!');
          // Refresh user data
          loadUserProfile();
        } else {
          alert('Failed to link wallet: ' + data.error);
        }
      } catch (error) {
        console.error('Link error:', error);
        alert('Error linking wallet. Please try again.');
      } finally {
        setLinking(false);
      }
    });
    
    // Trigger Key-Rex authentication
    // (User clicks button, Key-Rex handles the rest)
  };
  
  return (
    <div>
      <h3>Link Lightning Wallet</h3>
      <p>Connect your Lightning wallet to enable quick login.</p>
      <button onClick={handleLinkWallet} disabled={linking}>
        {linking ? 'Linking...' : 'Link Wallet'}
      </button>
    </div>
  );
}

// Backend: Link wallet to existing account
// POST /api/users/link-wallet
app.post('/api/users/link-wallet', authenticateUser, async (req, res) => {
  const userId = req.user.id; // From authentication middleware
  const { xpub } = req.body;
  
  // Check if xpub is already linked to another account
  const existingUser = await db.users.findOne({ keyrexXpub: xpub });
  
  if (existingUser && existingUser.id !== userId) {
    return res.status(400).json({
      success: false,
      error: 'This wallet is already linked to another account'
    });
  }
  
  // Link xpub to current user's account
  await db.users.update(
    { id: userId },
    { keyrexXpub: xpub }
  );
  
  return res.json({
    success: true,
    message: 'Wallet linked successfully'
  });
});`}
                          </pre>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mt-3">
                          <p className="text-xs text-orange-200">
                            <strong>Tip:</strong> This flow requires the user to be already authenticated (logged in with email/password, etc.). They're linking their wallet as an additional login method.
                          </p>
                        </div>
                      </div>

                      {/* Login Flow */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Step 4: Login Flow (Returning Users)</h4>
                        <p className="text-sm text-white/80 mb-3">
                          When a user with a linked wallet authenticates, look them up by xpub and log them in.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Frontend: Login page
KeyRex.onSuccess(async function(xpub) {
  try {
    const response = await fetch('/api/auth/keyrex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpub: xpub })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store session token
      localStorage.setItem('authToken', data.token);
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      // Handle error (wallet not linked, etc.)
      if (data.error === 'wallet_not_linked') {
        // Show message: "This wallet is not linked to an account. 
        // Please log in with email/password first to link your wallet."
        showError('Please link your wallet first by logging in with your email/password.');
      }
    }
  } catch (error) {
    console.error('Login error:', error);
  }
});

// Backend: Login with xpub
// POST /api/auth/keyrex
app.post('/api/auth/keyrex', async (req, res) => {
  const { xpub } = req.body;
  
  // Find user by xpub
  const user = await db.users.findOne({ keyrexXpub: xpub });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'wallet_not_linked',
      message: 'This wallet is not linked to an account'
    });
  }
  
  // Create session
  const token = generateSessionToken(user.id);
  
  return res.json({
    success: true,
    token: token,
    userId: user.id,
    user: {
      id: user.id,
      email: user.email,
      username: user.username
    }
  });
});`}
                          </pre>
                        </div>
                      </div>

                      {/* Complete Example */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Complete React Example</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Full implementation example for a React application.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// components/KeyRexLogin.jsx
import { useEffect, useState } from 'react';

export default function KeyRexLogin({ onSuccess, onError }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Register success callback
    if (window.KeyRex) {
      window.KeyRex.onSuccess(async function(xpub) {
        try {
          const response = await fetch('/api/auth/keyrex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xpub })
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Store token
            localStorage.setItem('authToken', data.token);
            setIsAuthenticated(true);
            onSuccess?.(data.user);
          } else {
            onError?.(new Error(data.error || 'Authentication failed'));
          }
        } catch (error) {
          onError?.(error);
        }
      });
      
      window.KeyRex.onError(function(error) {
        onError?.(error);
      });
    }
  }, [onSuccess, onError]);
  
  return (
    <div>
      {/* Key-Rex button will appear here automatically */}
      <div id="keyrex-container"></div>
    </div>
  );
}

// components/AccountSettings.jsx
export default function AccountSettings({ user }) {
  const [walletLinked, setWalletLinked] = useState(!!user.keyrexXpub);
  
  const handleLinkWallet = () => {
    // Register callback for linking
    window.KeyRex.onSuccess(async function(xpub) {
      try {
        const response = await fetch('/api/users/link-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${localStorage.getItem('authToken')}\`
          },
          body: JSON.stringify({ xpub })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setWalletLinked(true);
          alert('Wallet linked successfully!');
        }
      } catch (error) {
        console.error('Link error:', error);
      }
    });
    
    // User will click Key-Rex button to authenticate
  };
  
  return (
    <div>
      <h3>Lightning Wallet</h3>
      {walletLinked ? (
        <p>✓ Wallet linked: {user.keyrexXpub.substring(0, 20)}...</p>
      ) : (
        <div>
          <p>No wallet linked. Click below to link your Lightning wallet.</p>
          <button onClick={handleLinkWallet}>Link Wallet</button>
        </div>
      )}
    </div>
  );
}`}
                          </pre>
                        </div>
                      </div>

                      {/* Best Practices */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Best Practices & Security</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">Always verify xpub uniqueness:</strong> Check if an xpub is already linked before allowing a new link</li>
                          <li><strong className="text-white">Require authentication for linking:</strong> Users must be logged in to link a wallet (prevents unauthorized linking)</li>
                          <li><strong className="text-white">Store xpub securely:</strong> While xpub is public, treat it like any user identifier - don't expose it unnecessarily</li>
                          <li><strong className="text-white">Handle edge cases:</strong> What if user tries to link a wallet that's already linked to another account?</li>
                          <li><strong className="text-white">Provide unlinking option:</strong> Allow users to unlink their wallet if they want to use a different one</li>
                          <li><strong className="text-white">Clear error messages:</strong> Tell users exactly what went wrong (wallet not linked, already in use, etc.)</li>
                          <li><strong className="text-white">Support multiple wallets:</strong> Consider allowing users to link multiple wallets to one account (store as array)</li>
                        </ul>
                      </div>

                      {/* Common Scenarios */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Common Scenarios & Solutions</h4>
                        <div className="space-y-4 text-sm text-white/80">
                          <div>
                            <p className="font-semibold text-white mb-1">Scenario 1: User wants to link wallet to existing account</p>
                            <p>Solution: Implement account linking flow (Step 3 above). User logs in first, then links wallet in settings.</p>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-1">Scenario 2: User tries to link wallet already linked to another account</p>
                            <p>Solution: Check if xpub exists before linking. Show error: "This wallet is already linked to another account."</p>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-1">Scenario 3: User wants to unlink their wallet</p>
                            <p>Solution: Provide "Unlink Wallet" button in settings. Set <code className="bg-dark-800 px-1 rounded">keyrexXpub</code> to <code className="bg-dark-800 px-1 rounded">null</code>.</p>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-1">Scenario 4: User has multiple wallets</p>
                            <p>Solution: Store xpubs as an array instead of single value. Check all xpubs during login.</p>
                          </div>
                          <div>
                            <p className="font-semibold text-white mb-1">Scenario 5: User loses access to their wallet</p>
                            <p>Solution: Provide account recovery via email/password. Allow unlinking old wallet and linking new one.</p>
                          </div>
                        </div>
                      </div>

                      {/* User-Facing Error Messages & UX Patterns */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">User-Facing Error Messages & UX Patterns</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Provide clear, actionable error messages and smooth user experiences when handling account linking scenarios.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">When Wallet Isn't Linked (Login Attempt)</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Frontend: Show user-friendly error with action buttons
KeyRex.onSuccess(async function(xpub) {
  const response = await fetch('/api/auth/keyrex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub })
  });
  
  const data = await response.json();
  
  if (!data.success && data.error === 'wallet_not_linked') {
    // Show friendly error message with options
    showWalletNotLinkedModal({
      message: "This Lightning wallet isn't linked to an account yet.",
      options: [
        {
          label: "Link Wallet",
          action: () => {
            // Redirect to login page with linking option
            window.location.href = '/login?link-wallet=true';
          }
        },
        {
          label: "Create New Account",
          action: () => {
            // Continue with new account creation
            createAccountWithXpub(xpub);
          }
        }
      ]
    });
  }
});

// Example UI Component
function WalletNotLinkedModal({ message, options }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Wallet Not Linked</h3>
        <p>{message}</p>
        <div className="button-group">
          {options.map(option => (
            <button key={option.label} onClick={option.action}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">When Wallet Already Linked to Another Account</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Backend: Check before linking
app.post('/api/users/link-wallet', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { xpub } = req.body;
  
  const existingUser = await db.users.findOne({ keyrexXpub: xpub });
  
  if (existingUser && existingUser.id !== userId) {
    return res.status(400).json({
      success: false,
      error: 'wallet_already_linked',
      message: 'This wallet is already linked to another account. Please use a different wallet or contact support if you believe this is an error.'
    });
  }
  
  // ... rest of linking logic
});

// Frontend: Show clear error message
if (data.error === 'wallet_already_linked') {
  showError({
    title: "Wallet Already in Use",
    message: data.message,
    type: 'warning'
  });
}`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">UX Best Practices</p>
                            <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                              <li><strong className="text-white">Always provide next steps:</strong> Don't just show an error, give users clear actions they can take</li>
                              <li><strong className="text-white">Use friendly language:</strong> Avoid technical jargon like "xpub not found" - say "This wallet isn't linked yet"</li>
                              <li><strong className="text-white">Offer alternatives:</strong> If wallet isn't linked, offer to link it OR create new account</li>
                              <li><strong className="text-white">Show progress:</strong> Use loading states during authentication and linking processes</li>
                              <li><strong className="text-white">Confirm actions:</strong> Ask for confirmation before unlinking wallets</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Alternative Linking Methods */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Alternative Linking Methods</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Sometimes users want to link their wallet but aren't currently logged in. Here are alternative approaches.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Method 1: Email Verification Flow</p>
                            <p className="text-sm text-white/80 mb-2">
                              User authenticates with Key-Rex, then enters their email to verify account ownership.
                            </p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Step 1: User authenticates with Key-Rex
KeyRex.onSuccess(async function(xpub) {
  // Check if wallet is already linked
  const checkResponse = await fetch(\`/api/auth/check-wallet?xpub=\${xpub}\`);
  const checkData = await checkResponse.json();
  
  if (checkData.linked) {
    // Wallet already linked - log them in
    loginWithXpub(xpub);
  } else {
    // Show email verification form
    showEmailVerificationForm(xpub);
  }
});

// Step 2: User enters email
function showEmailVerificationForm(xpub) {
  const email = prompt('Enter the email address for your account:');
  
  if (email) {
    // Send verification email
    fetch('/api/auth/verify-email-for-linking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, xpub })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Verification email sent! Check your inbox and click the link to complete wallet linking.');
      }
    });
  }
}

// Backend: Send verification email
app.post('/api/auth/verify-email-for-linking', async (req, res) => {
  const { email, xpub } = req.body;
  
  // Find user by email
  const user = await db.users.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No account found with this email'
    });
  }
  
  // Generate verification token
  const token = generateVerificationToken();
  await db.verificationTokens.create({
    token,
    userId: user.id,
    xpub,
    expiresAt: new Date(Date.now() + 3600000) // 1 hour
  });
  
  // Send email with verification link
  await sendEmail({
    to: email,
    subject: 'Link Your Lightning Wallet',
    html: \`<a href="https://yoursite.com/verify-wallet-link?token=\${token}">Click here to link your wallet</a>\`
  });
  
  return res.json({ success: true });
});

// Step 3: User clicks verification link
app.get('/verify-wallet-link', async (req, res) => {
  const { token } = req.query;
  
  const verification = await db.verificationTokens.findOne({ token });
  
  if (!verification || verification.expiresAt < new Date()) {
    return res.send('Invalid or expired verification link');
  }
  
  // Link wallet to account
  await db.users.update(
    { id: verification.userId },
    { keyrexXpub: verification.xpub }
  );
  
  // Delete verification token
  await db.verificationTokens.delete({ token });
  
  // Log user in
  const sessionToken = generateSessionToken(verification.userId);
  res.cookie('authToken', sessionToken);
  res.redirect('/dashboard?wallet-linked=true');
});`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Method 2: Username/Password Confirmation</p>
                            <p className="text-sm text-white/80 mb-2">
                              User authenticates with Key-Rex, then confirms their identity with existing credentials.
                            </p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Step 1: User authenticates with Key-Rex
KeyRex.onSuccess(async function(xpub) {
  // Check if wallet is linked
  const checkResponse = await fetch(\`/api/auth/check-wallet?xpub=\${xpub}\`);
  const checkData = await checkResponse.json();
  
  if (checkData.linked) {
    loginWithXpub(xpub);
  } else {
    // Show login form to verify identity
    showIdentityConfirmationForm(xpub);
  }
});

// Step 2: User enters username/password
function showIdentityConfirmationForm(xpub) {
  const username = prompt('Enter your username:');
  const password = prompt('Enter your password:');
  
  if (username && password) {
    // Verify credentials and link wallet
    fetch('/api/auth/confirm-and-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, xpub })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Wallet linked, log them in
        localStorage.setItem('authToken', data.token);
        window.location.href = '/dashboard';
      } else {
        alert('Invalid credentials. Please try again.');
      }
    });
  }
}

// Backend: Verify credentials and link
app.post('/api/auth/confirm-and-link', async (req, res) => {
  const { username, password, xpub } = req.body;
  
  // Verify credentials
  const user = await db.users.findOne({ username });
  
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
  
  // Check if xpub is already linked to another account
  const existingUser = await db.users.findOne({ keyrexXpub: xpub });
  if (existingUser && existingUser.id !== user.id) {
    return res.status(400).json({
      success: false,
      error: 'This wallet is already linked to another account'
    });
  }
  
  // Link wallet
  await db.users.update(
    { id: user.id },
    { keyrexXpub: xpub }
  );
  
  // Create session
  const token = generateSessionToken(user.id);
  
  return res.json({
    success: true,
    token,
    userId: user.id
  });
});`}
                              </pre>
                            </div>
                          </div>

                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                            <p className="text-xs text-orange-200">
                              <strong>Security Note:</strong> Email verification is more secure than password confirmation since it doesn't require users to enter passwords. However, password confirmation is faster if users remember their credentials.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Wallet Unlinking */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Wallet Unlinking Implementation</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Allow users to unlink their wallet if they want to use a different one or remove Key-Rex authentication.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Frontend: Unlink Wallet UI</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Account Settings Component
function WalletSettings({ user }) {
  const [unlinking, setUnlinking] = useState(false);
  
  const handleUnlink = async () => {
    // Confirm action
    const confirmed = window.confirm(
      'Are you sure you want to unlink your Lightning wallet?\\n\\n' +
      'You will need to link a wallet again or use another login method to access your account.'
    );
    
    if (!confirmed) return;
    
    setUnlinking(true);
    
    try {
      const response = await fetch('/api/users/unlink-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${getAuthToken()}\`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Wallet unlinked successfully.');
        // Refresh user data
        loadUserProfile();
      } else {
        alert('Failed to unlink wallet: ' + data.error);
      }
    } catch (error) {
      console.error('Unlink error:', error);
      alert('Error unlinking wallet. Please try again.');
    } finally {
      setUnlinking(false);
    }
  };
  
  return (
    <div className="wallet-settings">
      <h3>Lightning Wallet</h3>
      {user.keyrexXpub ? (
        <div>
          <p>Linked wallet: {truncateXpub(user.keyrexXpub)}</p>
          <button 
            onClick={handleUnlink}
            disabled={unlinking}
            className="danger-button"
          >
            {unlinking ? 'Unlinking...' : 'Unlink Wallet'}
          </button>
        </div>
      ) : (
        <div>
          <p>No wallet linked</p>
          <button onClick={handleLinkWallet}>Link Wallet</button>
        </div>
      )}
    </div>
  );
}

function truncateXpub(xpub) {
  return xpub.substring(0, 20) + '...' + xpub.substring(xpub.length - 8);
}`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Backend: Unlink Wallet Endpoint</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// POST /api/users/unlink-wallet
app.post('/api/users/unlink-wallet', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  // Check if user has other login methods
  const user = await db.users.findOne({ id: userId });
  
  // If Key-Rex is their only login method, require alternative first
  if (!user.email && !user.passwordHash) {
    return res.status(400).json({
      success: false,
      error: 'cannot_unlink_only_method',
      message: 'Cannot unlink wallet. Please set up email/password login first.'
    });
  }
  
  // Unlink wallet
  await db.users.update(
    { id: userId },
    { keyrexXpub: null }
  );
  
  // Log the action (optional)
  await db.auditLogs.create({
    userId,
    action: 'wallet_unlinked',
    timestamp: new Date()
  });
  
  return res.json({
    success: true,
    message: 'Wallet unlinked successfully'
  });
});`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Important Considerations</p>
                            <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                              <li><strong className="text-white">Prevent account lockout:</strong> Don't allow unlinking if it's the only login method</li>
                              <li><strong className="text-white">Require confirmation:</strong> Always ask users to confirm before unlinking</li>
                              <li><strong className="text-white">Audit logging:</strong> Log unlinking actions for security</li>
                              <li><strong className="text-white">Clear messaging:</strong> Explain what happens after unlinking</li>
                              <li><strong className="text-white">Re-linking option:</strong> Make it easy to link a new wallet after unlinking</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Multiple Wallets Support */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Multiple Wallets Per Account (Advanced)</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Allow users to link multiple Lightning wallets to a single account for flexibility.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Database Schema Options</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Option 1: Array of xpubs (Simple)
// SQL
ALTER TABLE users ADD COLUMN keyrex_xpubs TEXT[]; -- PostgreSQL
-- or JSON column for other databases

// MongoDB
{
  _id: ObjectId("..."),
  email: "user@example.com",
  keyrexXpubs: [
    "xpub_72edb9b751578194763736a65f1179d7",
    "xpub_abc123def456..."
  ]
}

// Option 2: Separate table (More flexible)
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  xpub VARCHAR(255) UNIQUE NOT NULL,
  linked_at TIMESTAMP DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT FALSE
);

// Prisma
model User {
  id      String   @id @default(uuid())
  email   String   @unique
  wallets UserWallet[]
}

model UserWallet {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  xpub      String   @unique
  linkedAt  DateTime @default(now())
  isPrimary Boolean  @default(false)
}`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Login Logic (Check All Wallets)</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Backend: Login with multiple wallets support
app.post('/api/auth/keyrex', async (req, res) => {
  const { xpub } = req.body;
  
  // Option 1: Array-based lookup
  const user = await db.users.findOne({
    keyrexXpubs: { $in: [xpub] } // MongoDB
    // or: keyrex_xpubs @> ARRAY[xpub] -- PostgreSQL
  });
  
  // Option 2: Separate table lookup
  const wallet = await db.userWallets.findOne({ xpub });
  const user = wallet ? await db.users.findOne({ id: wallet.userId }) : null;
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'wallet_not_linked'
    });
  }
  
  // Create session
  const token = generateSessionToken(user.id);
  
  return res.json({
    success: true,
    token,
    userId: user.id
  });
});

// Frontend: Link additional wallet
async function linkAdditionalWallet(xpub) {
  const response = await fetch('/api/users/link-wallet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${getAuthToken()}\`
    },
    body: JSON.stringify({ xpub })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('Additional wallet linked successfully!');
    loadUserProfile();
  }
}`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">UI for Managing Multiple Wallets</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Component to display and manage linked wallets
function LinkedWallets({ user }) {
  const wallets = user.keyrexXpubs || []; // or user.wallets
  
  return (
    <div className="linked-wallets">
      <h3>Linked Lightning Wallets</h3>
      {wallets.length === 0 ? (
        <p>No wallets linked. <button onClick={linkWallet}>Link Wallet</button></p>
      ) : (
        <ul>
          {wallets.map((xpub, index) => (
            <li key={xpub}>
              <span>Wallet {index + 1}: {truncateXpub(xpub)}</span>
              <button onClick={() => unlinkWallet(xpub)}>Unlink</button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={linkWallet}>Link Additional Wallet</button>
    </div>
  );
}`}
                              </pre>
                            </div>
                          </div>

                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                            <p className="text-xs text-yellow-200">
                              <strong>Note:</strong> Multiple wallets add complexity. Most applications only need one wallet per account. Consider this an advanced feature for power users.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* User Verification */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">User Verification & Display</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Show users which wallet is linked to their account and provide verification methods.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Display Linked Wallet Information</p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Component to show linked wallet
function LinkedWalletDisplay({ user }) {
  if (!user.keyrexXpub) {
    return (
      <div className="no-wallet">
        <p>No Lightning wallet linked</p>
        <button onClick={linkWallet}>Link Wallet</button>
      </div>
    );
  }
  
  return (
    <div className="linked-wallet-info">
      <h4>Linked Lightning Wallet</h4>
      <div className="wallet-details">
        <div className="wallet-id">
          <label>Wallet ID:</label>
          <code>{truncateXpub(user.keyrexXpub)}</code>
          <button onClick={() => copyToClipboard(user.keyrexXpub)}>Copy</button>
        </div>
        <div className="linked-date">
          <label>Linked:</label>
          <span>{formatDate(user.walletLinkedAt)}</span>
        </div>
      </div>
      <div className="actions">
        <button onClick={verifyWallet}>Verify Wallet</button>
        <button onClick={unlinkWallet} className="danger">Unlink</button>
      </div>
    </div>
  );
}

function truncateXpub(xpub) {
  // Show first 12 and last 8 characters
  return \`\${xpub.substring(0, 12)}...\${xpub.substring(xpub.length - 8)}\`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Wallet Verification Flow</p>
                            <p className="text-sm text-white/80 mb-2">
                              Allow users to verify they still have access to their linked wallet by re-authenticating.
                            </p>
                            <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Verify wallet ownership
function verifyWallet() {
  const confirmed = window.confirm(
    'Verify your wallet by authenticating with Key-Rex.\\n\\n' +
    'This confirms you still have access to the linked wallet.'
  );
  
  if (!confirmed) return;
  
  // Register callback for verification
  KeyRex.onSuccess(async function(xpub) {
    // Check if xpub matches linked wallet
    const currentUser = getCurrentUser();
    
    if (xpub === currentUser.keyrexXpub) {
      // Wallet verified
      showSuccess('Wallet verified successfully!');
      
      // Update last verified timestamp
      await fetch('/api/users/update-wallet-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${getAuthToken()}\`
        }
      });
    } else {
      // Xpub doesn't match
      showError('This wallet does not match your linked wallet. Please use the correct wallet or link a new one.');
    }
  });
  
  // Trigger Key-Rex authentication
  // (User clicks button, Key-Rex handles the rest)
}

// Backend: Update verification timestamp
app.post('/api/users/update-wallet-verification', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  await db.users.update(
    { id: userId },
    { walletLastVerifiedAt: new Date() }
  );
  
  return res.json({ success: true });
});`}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Display Best Practices</p>
                            <ul className="text-sm text-white/80 space-y-1 list-disc list-inside ml-2">
                              <li><strong className="text-white">Truncate xpub:</strong> Don't show full xpub - use format like "xpub_72edb9b7...c65f1179d7"</li>
                              <li><strong className="text-white">Show linked date:</strong> Display when wallet was linked for user reference</li>
                              <li><strong className="text-white">Copy functionality:</strong> Allow users to copy full xpub if needed</li>
                              <li><strong className="text-white">Verification status:</strong> Show when wallet was last verified</li>
                              <li><strong className="text-white">Clear actions:</strong> Make it obvious how to verify, unlink, or link new wallet</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                        <h4 className="text-base font-semibold text-orange-300 mb-2">✓ Summary</h4>
                        <ul className="text-sm text-orange-200 space-y-1 list-disc list-inside ml-2">
                          <li>Store xpub in your database (unique, nullable column)</li>
                          <li>New users: Create account when xpub is not found</li>
                          <li>Existing users: Link wallet while logged in (account settings)</li>
                          <li>Login: Look up user by xpub, create session</li>
                          <li>Always verify xpub uniqueness and handle edge cases</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* FAQ */}
                  <div id="faq" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Frequently Asked Questions</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Common questions and answers about Key-Rex integration.
                    </p>

                    <div className="space-y-4">
                      {[
                        {
                          q: "Do I need a Lightning wallet to test the integration?",
                          a: "Yes, you need a Lightning wallet that supports LNURL-auth. Any compatible browser extension or mobile wallet app will work."
                        },
                        {
                          q: "Can I use this on multiple domains?",
                          a: "Yes! Add all your domains in the Domains tab and verify each one. Production domains require DNS TXT record verification to prove ownership. Each domain must be added and verified separately (including www and non-www versions if you use both). Test domains work automatically without verification."
                        },
                        {
                          q: "Can I customize the button text or styling?",
                          a: "The Key-Rex button uses a standardized design with fixed button text ('Sign in with Key-Rex') and orange styling. This ensures consistent branding and user recognition. If you need custom branding or styling options, contact us to discuss custom solutions."
                        },
                        {
                          q: "Is the xpub secure? Can others use it to access my account?",
                          a: "The xpub is a public identifier, not a secret. It's derived from your wallet's public key. However, you should still implement proper session management on your backend and never expose sensitive operations based solely on xpub."
                        },
                        {
                          q: "Can I customize the button appearance?",
                          a: "The Key-Rex button uses a standard design with orange styling and includes 'Key-Rex' branding. This helps users recognize and trust the authentication method. If you're interested in custom branding or styling options, contact us to discuss custom solutions."
                        },
                        {
                          q: "What browsers are supported?",
                          a: "All modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled. The integration requires WebLN support for browser extensions or QR code fallback for mobile wallets."
                        },
                        {
                          q: "How do I handle authentication on my backend?",
                          a: "When authentication succeeds, KeyRex.onSuccess() is called with the user's xpub. Send this to your backend to create a session, verify the user, and return a session token or cookie."
                        },
                        {
                          q: "Can I use this with React/Vue/Next.js?",
                          a: "Absolutely! See the Framework Examples section above for code examples for React, Vue, Next.js, and plain HTML."
                        },
                        {
                          q: "What if a user doesn't have a Lightning wallet?",
                          a: "The integration will show a QR code that can be scanned with a mobile Lightning wallet. Users need a Lightning wallet to authenticate."
                        },
                        {
                          q: "How do I disable authentication temporarily?",
                          a: "Go to the 'My Integration Code' tab and toggle the 'Integration Status' switch to OFF. This disables authentication on all your domains."
                        }
                      ].map((faq, idx) => (
                        <div key={idx} className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                          <h4 className="text-base font-semibold text-orange-400 mb-2">Q: {faq.q}</h4>
                          <p className="text-sm text-white/80">{faq.a}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-orange-300 mb-2">Still Have Questions?</h4>
                      <p className="text-sm text-orange-200 mb-2">
                        If you can't find the answer you're looking for:
                      </p>
                      <ul className="text-sm text-orange-200 space-y-1 list-disc list-inside ml-2">
                        <li>Check the <strong>Troubleshooting</strong> tab for common issues and solutions</li>
                        <li>Review the <strong>API Reference</strong> section for technical details</li>
                        <li>Use the <strong>Integration Checker</strong> in the Troubleshooting tab to diagnose issues</li>
                      </ul>
                    </div>
                  </div>

                  {/* Common Use Cases */}
                  <div id="use-cases" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Common Use Cases</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Real-world integration scenarios and implementation patterns.
                    </p>

                    <div className="space-y-6">
                      {/* E-commerce */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">🛒 E-commerce Checkout</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Allow customers to authenticate before checkout to save shipping information and order history.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// On checkout page
KeyRex.onSuccess(function(xpub) {
  // Create or retrieve customer account
  fetch('/api/customers/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub })
  })
  .then(response => response.json())
  .then(customer => {
    // Pre-fill shipping info if available
    if (customer.shippingAddress) {
      document.getElementById('address').value = customer.shippingAddress;
    }
    // Proceed to payment
    showPaymentForm();
  });
});`}
                          </pre>
                        </div>
                      </div>

                      {/* SaaS Dashboard */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">💼 SaaS Application</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Secure login for SaaS applications with session management and user preferences.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// On login page
KeyRex.onSuccess(function(xpub) {
  // Create session
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub }),
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  });
});

KeyRex.onError(function(error) {
  // Show user-friendly error
  showNotification('Login failed. Please try again.', 'error');
});`}
                          </pre>
                        </div>
                      </div>

                      {/* Blog Comments */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">💬 Blog Comments</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Authenticate users to post comments while maintaining privacy (no email required).
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// On comment form
let userXpub = null;

KeyRex.onSuccess(function(xpub) {
  userXpub = xpub;
  // Show comment form
  document.getElementById('comment-form').style.display = 'block';
  document.getElementById('login-prompt').style.display = 'none';
});

// When comment is submitted
function submitComment() {
  if (!userXpub) {
    alert('Please authenticate first');
    return;
  }
  
  fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      xpub: userXpub,
      content: document.getElementById('comment').value
    })
  });
}`}
                          </pre>
                        </div>
                      </div>

                      {/* Membership Site */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">🔒 Membership/Protected Content</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Restrict access to premium content or member-only areas. Send the xpub to your backend to create a session.
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Handle successful authentication
KeyRex.onSuccess(function(xpub) {
  // Send xpub to your backend to create a session
  fetch('/api/your-backend-endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub })
  })
  .then(response => response.json())
  .then(data => {
    // Your backend should return a session token or set a cookie
    // Then redirect or show protected content
    if (data.success) {
      window.location.href = '/members-area';
      // Or show content:
      // document.getElementById('login-section').style.display = 'none';
      // document.getElementById('content').style.display = 'block';
    }
  })
  .catch(error => {
    console.error('Authentication failed:', error);
    KeyRex.onError(error);
  });
});

// Handle errors
KeyRex.onError(function(error) {
  console.error('Key-Rex error:', error);
  alert('Authentication failed. Please try again.');
});`}
                          </pre>
                        </div>
                        <p className="text-xs text-white/60 mt-2">
                          <strong>Note:</strong> Replace <code className="bg-dark-800 px-1 rounded">/api/your-backend-endpoint</code> with your actual backend endpoint that handles authentication and session creation.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Reference Card */}
                  <div id="quick-reference" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Quick Reference Card</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Cheat sheet for common Key-Rex commands and configurations.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* API Methods */}
                      <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                        <h4 className="text-base font-semibold text-orange-400 mb-3">API Methods</h4>
                        <div className="space-y-2 text-sm">
                          <div className="bg-dark-950 rounded p-2">
                            <code className="text-orange-300 font-mono">KeyRex.init()</code>
                            <p className="text-white/60 text-xs mt-1">Initialize integration</p>
                          </div>
                          <div className="bg-dark-950 rounded p-2">
                            <code className="text-orange-300 font-mono">KeyRex.onSuccess(callback)</code>
                            <p className="text-white/60 text-xs mt-1">Success callback</p>
                          </div>
                          <div className="bg-dark-950 rounded p-2">
                            <code className="text-orange-300 font-mono">KeyRex.onError(callback)</code>
                            <p className="text-white/60 text-xs mt-1">Error callback</p>
                          </div>
                        </div>
                      </div>

                      {/* Integration Code */}
                      <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                        <h4 className="text-base font-semibold text-orange-400 mb-3">Integration Code</h4>
                        <div className="bg-dark-950 rounded p-3 overflow-x-auto">
                          <code className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
{`<script src="https://yourdomain.com/embed?siteId=YOUR_SITE_ID"></script>
<script>KeyRex.init();</script>`}
                          </code>
                        </div>
                      </div>

                      {/* Callback Parameters */}
                      <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                        <h4 className="text-base font-semibold text-orange-400 mb-3">Callback Parameters</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <code className="text-orange-300 font-mono">onSuccess(xpub)</code>
                            <p className="text-white/60 text-xs mt-1">xpub: User's extended public key (string)</p>
                          </div>
                          <div>
                            <code className="text-orange-300 font-mono">onError(error)</code>
                            <p className="text-white/60 text-xs mt-1">error: Error object with message property</p>
                          </div>
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-700">
                        <h4 className="text-base font-semibold text-orange-400 mb-3">Configuration</h4>
                        <div className="space-y-2 text-sm text-white/80">
                          <p><strong className="text-white">Button ID:</strong> <code className="bg-dark-800 px-1 rounded">#keyrex-button</code></p>
                          <p><strong className="text-white">Container ID:</strong> <code className="bg-dark-800 px-1 rounded">#keyrex-container</code></p>
                          <p><strong className="text-white">Config URL:</strong> <code className="bg-dark-800 px-1 rounded text-xs">/api/embed/config?siteId=...</code></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integration Health Monitoring */}
                  <div id="health-monitoring" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Integration Health Monitoring</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Monitor your integration to ensure it's working correctly in production.
                    </p>

                    <div className="space-y-6">
                      {/* Health Checks */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Health Check Script</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Add this to your monitoring system to check if your integration is healthy:
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Health check function
async function checkKeyRexHealth() {
  const checks = {
    scriptLoaded: false,
    buttonExists: false,
    configLoaded: false,
    integrationEnabled: true
  };
  
  // Check if script loaded
  checks.scriptLoaded = typeof window.KeyRex !== 'undefined';
  
  // Check if button exists
  checks.buttonExists = document.getElementById('keyrex-button') !== null;
  
  // Check config (if you know your siteId)
  try {
    const response = await fetch('/api/embed/config?siteId=YOUR_SITE_ID');
    const config = await response.json();
    checks.configLoaded = response.ok;
    checks.integrationEnabled = config.integrationEnabled !== false;
  } catch (error) {
    checks.configLoaded = false;
  }
  
  return checks;
}

// Run health check
checkKeyRexHealth().then(checks => {
    console.log('Key-Rex Health:', checks);
  // Send to monitoring service
  if (!checks.scriptLoaded || !checks.buttonExists || !checks.configLoaded || !checks.integrationEnabled) {
    // Alert monitoring service
    console.error('Key-Rex health check failed:', checks);
  }
});`}
                          </pre>
                        </div>
                      </div>

                      {/* Monitoring Dashboard */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">What to Monitor</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">Script Load Success Rate:</strong> Track if embed script loads successfully (should be &gt;99%)</li>
                          <li><strong className="text-white">Button Render Rate:</strong> Monitor if button appears on page (should be 100%)</li>
                          <li><strong className="text-white">Authentication Success Rate:</strong> Track successful vs failed authentications</li>
                          <li><strong className="text-white">Error Frequency:</strong> Monitor common errors (domain not authorized, integration disabled, etc.)</li>
                          <li><strong className="text-white">Response Times:</strong> Track config fetch and authentication response times</li>
                          <li><strong className="text-white">Wallet Compatibility:</strong> Track which wallets users are using</li>
                        </ul>
                      </div>

                      {/* Analytics Integration */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">Analytics Integration</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Track authentication events in your analytics platform:
                        </p>
                        <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 mb-3 overflow-x-auto">
                          <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap break-words">
{`// Google Analytics example
KeyRex.onSuccess(function(xpub) {
  // Track successful authentication
  if (window.gtag) {
    gtag('event', 'keyrex_login_success', {
      'event_category': 'Authentication',
      'event_label': 'Key-Rex'
    });
  }
  
  // Or for Google Analytics 4
  if (window.dataLayer) {
    dataLayer.push({
      'event': 'keyrex_login_success',
      'method': 'Key-Rex'
    });
  }
});

KeyRex.onError(function(error) {
  // Track authentication errors
  if (window.gtag) {
    gtag('event', 'keyrex_login_error', {
      'event_category': 'Authentication',
      'event_label': error.message
    });
  }
});`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Support Resources */}
                  <div id="support-resources" className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 scroll-mt-24">
                    <h3 className="text-xl font-semibold text-white mb-4">Support Resources</h3>
                    <p className="text-white/80 text-base mb-4 leading-relaxed">
                      Additional resources to help you succeed with Key-Rex.
                    </p>

                    <div className="space-y-4">
                      {/* Documentation Links */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">📚 Documentation</h4>
                        <ul className="space-y-2 text-sm text-white/80">
                          <li>
                            <strong className="text-orange-400">Dashboard Documentation:</strong> You're reading it! Use the navigation sidebar to find specific topics.
                          </li>
                          <li>
                            <strong className="text-orange-400">Troubleshooting Tab:</strong> Comprehensive troubleshooting guide with common issues and solutions.
                          </li>
                          <li>
                            <strong className="text-orange-400">Open Source Page:</strong> View the complete source code and API documentation on the Open Source tab.
                          </li>
                        </ul>
                      </div>

                      {/* Self-Help Resources */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">🔧 Self-Help Tools</h4>
                        <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
                          <li><strong className="text-white">Integration Checker:</strong> Use the "Test My Integration" button in the Troubleshooting tab to diagnose issues</li>
                          <li><strong className="text-white">Setup Verification Checklist:</strong> Step-by-step checklist in the Troubleshooting tab</li>
                          <li><strong className="text-white">Analytics Tab:</strong> Monitor authentication usage and identify patterns</li>
                          <li><strong className="text-white">Domain Management:</strong> Verify and manage your authorized domains</li>
                        </ul>
                      </div>

                      {/* Best Practices Reminder */}
                      <div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
                        <h4 className="text-lg font-semibold text-white mb-3">✅ Before Asking for Help</h4>
                        <p className="text-sm text-white/80 mb-3">
                          Try these steps first:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 ml-2">
                          <li>Check the <strong className="text-orange-400">Troubleshooting</strong> tab for your specific issue</li>
                          <li>Run the <strong className="text-orange-400">Integration Checker</strong> in the Troubleshooting tab</li>
                          <li>Review the <strong className="text-orange-400">Error Messages Reference</strong> section</li>
                          <li>Check browser console (F12) for error messages</li>
                          <li>Verify your domain is added correctly in the Domains tab</li>
                          <li>Ensure integration is enabled in the "My Integration Code" tab</li>
                          <li>Test with different browsers and wallets</li>
                          <li>Clear browser cache and try again</li>
                        </ol>
                      </div>

                      {/* Additional Information */}
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5">
                        <h4 className="text-base font-semibold text-orange-300 mb-3">💡 Pro Tips</h4>
                        <ul className="space-y-2 text-sm text-orange-200 list-disc list-inside ml-2">
                          <li>Use the <strong>Integration Checklist</strong> above to ensure nothing is missed during setup</li>
                          <li>Bookmark the <strong>Quick Reference Card</strong> for easy access to common commands</li>
                          <li>Monitor your <strong>Analytics tab</strong> regularly to track integration health</li>
                          <li>Keep your <strong>domain list</strong> up to date - remove unused domains</li>
                          <li>Test in <strong>incognito mode</strong> to avoid cache issues during development</li>
                          <li>Use the <strong>Test Domain</strong> feature for local development (localhost, 127.0.0.1)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: Settings */}
          {activeTab === 'settings' && (
            <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
              <h2 className="text-2xl font-semibold text-white mb-4">Settings</h2>
              
              {/* Account Information */}
              {user && (
                <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">Account Information</h3>
                    <HelpIcon content="Your account information includes your xpub (extended public key) and Site ID. These are used for authentication and integration." />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm text-white/80">Your unique identifier (for technical reference):</p>
                    <Tooltip content="xpub (extended public key) is a cryptographic identifier derived from your Lightning wallet's public key. It's used to identify you securely without exposing private keys.">
                      <HelpIcon content="xpub (extended public key) is a cryptographic identifier derived from your Lightning wallet's public key. It's used to identify you securely without exposing private keys." />
                    </Tooltip>
                  </div>
                  <p className="font-mono text-sm bg-dark-900/80 border-2 border-orange-500/40 text-white p-3 rounded break-all">
                    {user.xpub}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-white/80">Site ID:</p>
                    <Tooltip content="Your Site ID is a unique identifier used in your integration code. It links your website's authentication button to your Key-Rex account.">
                      <span className="text-xs text-orange-400 font-mono">{user.siteId}</span>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* Lost Wallet Warning */}
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔐</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Lost Wallet Access</h3>
                    <p className="text-white/80 text-sm mb-3">
                      <strong>Important:</strong> If you lose access to the Lightning wallet you use to sign in to your Key-Rex dashboard, you must create a new Key-Rex account with a different wallet. There is no account recovery—this is by design to prevent bad actors from gaining unauthorized access to accounts.
                    </p>
                    <div className="bg-dark-900/50 rounded-lg p-4 mt-3">
                      <p className="text-sm font-semibold text-white mb-2">What this means:</p>
                      <ul className="text-sm text-white/80 space-y-1 list-disc list-inside">
                        <li>You cannot recover your existing Key-Rex account if you lose your wallet</li>
                        <li>You must create a new account with a new wallet</li>
                        <li>Your new account will have a new Site ID</li>
                        <li>You will need to update your integration code on your website with the new Site ID</li>
                        <li>Your previous account&apos;s domains, settings, and statistics cannot be transferred</li>
                      </ul>
                    </div>
                    <p className="text-white/80 text-sm mt-3">
                      <strong>Recommendation:</strong> Keep your Lightning wallet secure and backed up. Consider using a hardware wallet or secure backup method for your wallet keys.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Data Persistence Notice */}
              <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">Development Mode Notice</h3>
                    <p className="text-white/80 text-sm mb-3">
                      This dashboard uses in-memory storage during development. Your data (domains, settings, statistics) will be reset when the server restarts.
                    </p>
                    <p className="text-white/80 text-sm">
                      <strong>Recommendation:</strong> Export your data regularly for backup. In production, data will be stored persistently.
                    </p>
                  </div>
                </div>
              </div>

              {/* Export Data */}
              <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Export Data</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Download your account data, domains, and statistics for backup or migration.
                </p>
                <button
                  onClick={async () => {
                    if (!user) return
                    
                    try {
                      const exportData = {
                        account: {
                          xpub: user.xpub,
                          siteId: user.siteId,
                          createdAt: user.createdAt,
                        },
                        domains: user.allowedDomains || [],
                        settings: {
                          integrationEnabled: user.integrationEnabled !== false,
                        },
                        usage: usage,
                        exportedAt: new Date().toISOString(),
                      }
                      
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `keyrex-export-${new Date().toISOString().split('T')[0]}.json`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                      
                      toast.showSuccess('Data exported successfully!')
                    } catch (error) {
                      toast.showError('Failed to export data')
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Export All Data (JSON)
                </button>
              </div>

              {/* Activity Log Export */}
              <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Export Activity Log</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Download your activity log for audit or analysis purposes.
                </p>
                <button
                  onClick={async () => {
                    if (!user) return
                    
                    try {
                      const res = await fetch('/api/activity', {
                        credentials: 'include',
                      })
                      
                      if (res.ok) {
                        const data = await res.json()
                        const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `keyrex-activity-${new Date().toISOString().split('T')[0]}.json`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                        
                        toast.showSuccess('Activity log exported successfully!')
                      } else {
                        toast.showError('Failed to export activity log')
                      }
                    } catch (error) {
                      toast.showError('Failed to export activity log')
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Export Activity Log (JSON)
                </button>
              </div>

              {/* Display Preferences */}
              <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Display Preferences</h3>
                <p className="text-white/80 text-base mb-4 leading-relaxed">
                  Customize how information is displayed in your dashboard.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">Date Format</p>
                      <p className="text-white/60 text-xs">How dates are displayed</p>
                    </div>
                    <select className="bg-dark-900 text-white border border-dark-600 rounded px-3 py-1 text-sm">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">Time Format</p>
                      <p className="text-white/60 text-xs">12-hour or 24-hour time</p>
                    </div>
                    <select className="bg-dark-900 text-white border border-dark-600 rounded px-3 py-1 text-sm">
                      <option>12-hour (AM/PM)</option>
                      <option>24-hour</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB: Domains */}
          {activeTab === 'domains' && (
            <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-semibold text-white mb-4">Domain Management</h2>
              
              {/* Domain Management - All users have unlimited domains */}
              <div className="bg-dark-800/70 border-2 border-orange-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Your Domains</h3>
                <p className="text-sm text-white/80 mb-4">
                  Manage domains where your Key-Rex login can be used. All users have unlimited domains.
                </p>
                <DomainManager 
                  user={user} 
                  setUser={setUser} 
                  onNavigateToTab={(tab) => {
                    if (['login-code', 'domains', 'analytics', 'documentation', 'troubleshooting', 'settings'].includes(tab)) {
                      setActiveTab(tab as typeof activeTab)
                    }
                  }} 
                />
              </div>
              
              {/* Domain Format Instructions */}
              <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">How to Enter Domains</h3>
                <p className="text-sm text-white/80 mb-4">
                  Enter the domain(s) where your Key-Rex authentication button will be used. You can add multiple domains, and you can always add, edit, or remove domains later.
                </p>
                
                <div className="bg-dark-900/50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-white mb-3">✓ Correct Format Examples:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1 font-bold">✓</span>
                      <div>
                        <span className="text-white/80 font-mono">example.com</span>
                        <span className="text-white/60 ml-2">(main domain)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1 font-bold">✓</span>
                      <div>
                        <span className="text-white/80 font-mono">login.example.com</span>
                        <span className="text-white/60 ml-2">(subdomain)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1 font-bold">✓</span>
                      <div>
                        <span className="text-white/80 font-mono">app.mysite.com</span>
                        <span className="text-white/60 ml-2">(subdomain)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1 font-bold">✓</span>
                      <div>
                        <span className="text-white/80 font-mono">www.example.com</span>
                        <span className="text-white/60 ml-2">(www subdomain)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Test Domains Section */}
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <p className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wide">🧪 Test Domains (For Testing Only):</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-1 font-bold">✓</span>
                        <div>
                          <span className="text-white/80 font-mono">localhost</span>
                          <span className="text-yellow-300 ml-2 font-medium">(test domain - for testing only)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-1 font-bold">✓</span>
                        <div>
                          <span className="text-white/80 font-mono">test.example.com</span>
                          <span className="text-yellow-300 ml-2 font-medium">(test subdomain - for testing only)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-1 font-bold">✓</span>
                        <div>
                          <span className="text-white/80 font-mono">staging.example.com</span>
                          <span className="text-yellow-300 ml-2 font-medium">(staging environment - for testing only)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-900/50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-white mb-3">✗ Incorrect Format Examples:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">✗</span>
                      <div>
                        <span className="text-white/80 font-mono">https://example.com</span>
                        <span className="text-white/60 ml-2">(don't include http:// or https://)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">✗</span>
                      <div>
                        <span className="text-white/80 font-mono">example.com/</span>
                        <span className="text-white/60 ml-2">(don't include trailing slash)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">✗</span>
                      <div>
                        <span className="text-white/80 font-mono">example.com/login</span>
                        <span className="text-white/60 ml-2">(don't include paths or pages)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">✗</span>
                      <div>
                        <span className="text-white/80 font-mono">example</span>
                        <span className="text-white/60 ml-2">(missing .com or TLD)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-orange-200 mb-2">💡 Important Tips:</p>
                  <ul className="text-sm text-orange-100 space-y-1 list-disc list-inside">
                    <li>Enter only the domain name (e.g., <span className="font-mono">example.com</span>), not the full URL</li>
                    <li>You can add multiple domains - each domain where you embed the button needs to be listed here</li>
                    <li>Subdomains are treated as separate domains (e.g., <span className="font-mono">www.example.com</span> and <span className="font-mono">example.com</span> are different)</li>
                    <li>If you use both <span className="font-mono">www</span> and non-www versions, add both separately</li>
                    <li>You can edit or remove domains at any time</li>
                    <li>You must keep at least one domain - if you have only one, you can edit it but not remove it</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* TAB: Analytics */}
          {activeTab === 'analytics' && (
            <>
              {/* SECTION 1: Overview - High-Level Summary */}
              <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-2">Overview</h2>
                <p className="text-sm text-white/60 mb-6">High-level login statistics at a glance</p>
                
                <Card variant="default" className="p-6 mb-6">
                  {usage ? (
                    (usage.currentMonth === 0 && usage.yearToDate === 0 && usage.allTime === 0) ? (
                      <div className="bg-dark-800/50 border-2 border-dark-700/50 rounded-lg p-8 text-center">
                        <div className="text-4xl mb-4">📊</div>
                        <h3 className="text-lg font-semibold text-white mb-2">No Activity Yet</h3>
                        <p className="text-white/80 text-base mb-4 leading-relaxed">
                          Once users start authenticating on your website, you'll see statistics here.
                        </p>
                        <div className="text-white/60 text-xs space-y-1">
                          <p>Make sure you've:</p>
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>Added your domain in the <strong className="text-white/80">Domains</strong> tab</li>
                            <li>Pasted the integration code on your website</li>
                            <li>Tested the authentication flow</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-dark-800/70 p-4 rounded-lg text-center border border-orange-500/20">
                          <div className="text-3xl font-bold text-orange-400">{usage.currentMonth || 0}</div>
                          <div className="text-sm text-white font-medium">This Month</div>
                          <div className="text-xs text-white/80 mt-1">Unique logins to your website using Key-Rex</div>
                        </div>
                        <div className="bg-dark-800/70 p-4 rounded-lg text-center border border-orange-500/20">
                          <div className="text-3xl font-bold text-orange-400">{usage.yearToDate || 0}</div>
                          <div className="text-sm text-white font-medium">Year to Date</div>
                          <div className="text-xs text-white/80 mt-1">Unique logins to your website using Key-Rex</div>
                        </div>
                        <div className="bg-dark-800/70 p-4 rounded-lg text-center border border-orange-500/20">
                          <div className="text-3xl font-bold text-orange-400">{usage.allTime || 0}</div>
                          <div className="text-sm text-white font-medium">All Time</div>
                          <div className="text-xs text-white/80 mt-1">Unique logins to your website using Key-Rex</div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-white/80 text-sm">Loading usage statistics...</p>
                      </div>
                    </div>
                  )}
                </Card>
              </Card>

              {/* Only show detailed analytics if there's activity */}
              {usage && usage.allTime > 0 && (
                <>
                  {/* SECTION 2: User Metrics - New vs Returning, Retention */}
                  <Card className="p-8 mt-6">
                    <h2 className="text-2xl font-bold text-white mb-2">User Metrics</h2>
                    <p className="text-sm text-white/60 mb-6">Understand your user base: new users, returning users, and retention rates</p>
                    
                    {/* New vs Returning Users */}
                    {usage.newUsers !== undefined && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">New vs Returning Users</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-dark-800/70 p-4 rounded-lg border border-orange-500/30">
                            <div className="text-sm text-white/80 mb-1">New Users (First-Time)</div>
                            <div className="text-3xl font-bold text-orange-400 mb-1">{usage.newUsers || 0}</div>
                            <div className="text-xs text-white/60">{usage.newUserPercentage || 0}% of total users</div>
                          </div>
                          <div className="bg-dark-800/70 p-4 rounded-lg border border-blue-500/30">
                            <div className="text-sm text-white/80 mb-1">Returning Users</div>
                            <div className="text-3xl font-bold text-orange-400 mb-1">{usage.returningUsers || 0}</div>
                            <div className="text-xs text-white/60">{usage.returningUserPercentage || 0}% of total users</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* User Retention */}
                    {(usage.sevenDayRetention !== undefined || usage.thirtyDayRetention !== undefined) && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">User Retention</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-dark-800/70 p-4 rounded-lg border border-dark-700">
                            <div className="text-sm text-white/80 mb-1">7-Day Retention Rate</div>
                            <div className="text-3xl font-bold text-orange-400 mb-1">{usage.sevenDayRetention || 0}%</div>
                            <div className="text-xs text-white/60">
                              {usage.sevenDayRetentionUsers || 0} users returned within 7 days
                            </div>
                          </div>
                          <div className="bg-dark-800/70 p-4 rounded-lg border border-dark-700">
                            <div className="text-sm text-white/80 mb-1">30-Day Retention Rate</div>
                            <div className="text-3xl font-bold text-orange-400 mb-1">{usage.thirtyDayRetention || 0}%</div>
                            <div className="text-xs text-white/60">
                              {usage.thirtyDayRetentionUsers || 0} users returned within 30 days
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* SECTION 3: Growth & Trends - Growth metrics and time-series charts */}
                  <Card className="p-8 mt-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Growth & Trends</h2>
                    <p className="text-sm text-white/60 mb-6">Track growth over time and view authentication trends</p>
                    
                    {/* Growth Metrics */}
                    {(usage.wowGrowth !== undefined || usage.momGrowth !== undefined) && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-white mb-3">Growth Metrics</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-dark-800/70 p-4 rounded-lg border border-dark-700">
                            <div className="text-sm text-white/80 mb-1">Week-over-Week Growth</div>
                            <div className={`text-3xl font-bold mb-1 ${(usage.wowGrowth || 0) >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
                              {(usage.wowGrowth || 0) >= 0 ? '+' : ''}{usage.wowGrowth || 0}%
                            </div>
                            <div className="text-xs text-white/60">
                              {usage.thisWeekLogins || 0} this week vs {usage.lastWeekLogins || 0} last week
                            </div>
                          </div>
                          <div className="bg-dark-800/70 p-4 rounded-lg border border-dark-700">
                            <div className="text-sm text-white/80 mb-1">Month-over-Month Growth</div>
                            <div className={`text-3xl font-bold mb-1 ${(usage.momGrowth || 0) >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
                              {(usage.momGrowth || 0) >= 0 ? '+' : ''}{usage.momGrowth || 0}%
                            </div>
                            <div className="text-xs text-white/60">
                              {usage.thisMonthLogins || 0} this month vs {usage.lastMonthLogins || 0} last month
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Time-Series Charts */}
                    <div className="space-y-6">
                      {/* Last 7 Days Chart */}
                      {usage.dailyData && usage.dailyData.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Last 7 Days</h3>
                          <AnalyticsChart 
                            data={usage.dailyData.map(d => ({
                              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              logins: d.count,
                              uniqueUsers: d.uniqueUsers,
                            }))} 
                            type="line" 
                            title="Daily Logins" 
                          />
                        </div>
                      )}

                      {/* Last 30 Days Chart */}
                      {usage.last30Days && usage.last30Days.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Last 30 Days</h3>
                          <AnalyticsChart 
                            data={usage.last30Days.map(d => ({
                              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              logins: d.count,
                              uniqueUsers: d.uniqueUsers,
                            }))} 
                            type="bar" 
                            title="Daily Logins" 
                          />
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* SECTION 4: Time Patterns - Day of week and hourly patterns */}
                  <Card className="p-8 mt-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Time Patterns</h2>
                    <p className="text-sm text-white/60 mb-6">When do your users authenticate? View patterns by day of week and time of day</p>
                    
                    {/* Day of Week Breakdown */}
                    {usage.dayOfWeekBreakdown && usage.dayOfWeekBreakdown.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-white mb-3">Logins by Day of Week</h3>
                        <div className="bg-dark-800/70 rounded-lg p-4 border border-dark-700">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {usage.dayOfWeekBreakdown.map((day, idx) => (
                              <div key={idx} className="bg-dark-900/50 p-3 rounded-lg border border-dark-700 text-center">
                                <div className="font-semibold text-white text-sm mb-1">{day.day}</div>
                                <div className="text-lg font-bold text-orange-400">{day.totalLogins}</div>
                                <div className="text-xs text-white/60">{day.uniqueUsers} unique</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hourly Pattern - Last 7 Days */}
                    {usage.last7DaysHourly && usage.last7DaysHourly.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Login Activity by Hour (Last 7 Days)</h3>
                        <AnalyticsChart 
                          data={usage.last7DaysHourly.map(d => ({
                            date: `${d.hour}:00`,
                            logins: d.count,
                          }))} 
                          type="bar" 
                          title="Average Logins per Hour" 
                        />
                      </div>
                    )}

                    {/* Quick Time Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      <div className="bg-dark-800/70 p-4 rounded-lg border border-dark-700">
                        <div className="text-sm text-white/80 mb-1">Average Daily Logins (Last 7 Days)</div>
                        <div className="text-2xl font-bold text-orange-400">
                          {usage.dailyData && usage.dailyData.length > 0
                            ? Math.round(usage.dailyData.reduce((sum, d) => sum + d.count, 0) / usage.dailyData.length)
                            : 0}
                        </div>
                      </div>
                      <div className="bg-dark-800/70 p-4 rounded-lg border border-dark-700">
                        <div className="text-sm text-white/80 mb-1">Peak Hour (Last 7 Days)</div>
                        <div className="text-2xl font-bold text-orange-400">
                          {usage.last7DaysHourly && usage.last7DaysHourly.length > 0
                            ? `${usage.last7DaysHourly.reduce((max, d) => d.count > max.count ? d : max, usage.last7DaysHourly[0]).hour}:00`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* SECTION 5: Technical Breakdown - Domain, Wallet, Browser, Device */}
                  <Card className="p-8 mt-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Technical Breakdown</h2>
                    <p className="text-sm text-white/60 mb-6">See how users authenticate: which domains, wallets, browsers, and devices they use</p>
                    
                    <div className="space-y-6">
                      {/* Domain Breakdown */}
                      {usage.domainBreakdown && usage.domainBreakdown.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Logins by Domain</h3>
                          <div className="bg-dark-800/70 rounded-lg p-4 border border-dark-700">
                            <div className="space-y-3">
                              {usage.domainBreakdown.map((domain, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-lg border border-dark-700">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white text-sm">{domain.domain}</div>
                                    <div className="text-xs text-white/60 mt-1">
                                      {domain.uniqueUsers} unique {domain.uniqueUsers === 1 ? 'user' : 'users'}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-orange-400">{domain.totalLogins}</div>
                                    <div className="text-xs text-white/60">total logins</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wallet Breakdown */}
                      {usage.walletBreakdown && usage.walletBreakdown.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Logins by Wallet</h3>
                          <div className="bg-dark-800/70 rounded-lg p-4 border border-dark-700">
                            <div className="space-y-3">
                              {usage.walletBreakdown.map((wallet, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-lg border border-dark-700">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white text-sm">{wallet.wallet}</div>
                                    <div className="text-xs text-white/60 mt-1">
                                      {wallet.uniqueUsers} unique {wallet.uniqueUsers === 1 ? 'user' : 'users'}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-orange-400">{wallet.totalLogins}</div>
                                    <div className="text-xs text-white/60">total logins</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Browser Breakdown */}
                      {usage.browserBreakdown && usage.browserBreakdown.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Logins by Browser</h3>
                          <div className="bg-dark-800/70 rounded-lg p-4 border border-dark-700">
                            <div className="space-y-3">
                              {usage.browserBreakdown.map((browser, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-lg border border-dark-700">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white text-sm">{browser.browser}</div>
                                    <div className="text-xs text-white/60 mt-1">
                                      {browser.uniqueUsers} unique {browser.uniqueUsers === 1 ? 'user' : 'users'}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-orange-400">{browser.totalLogins}</div>
                                    <div className="text-xs text-white/60">total logins</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Device Type Breakdown */}
                      {usage.deviceBreakdown && usage.deviceBreakdown.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Logins by Device Type</h3>
                          <div className="bg-dark-800/70 rounded-lg p-4 border border-dark-700">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {usage.deviceBreakdown.map((device, idx) => (
                                <div key={idx} className="bg-dark-900/50 p-4 rounded-lg border border-dark-700 text-center">
                                  <div className="font-semibold text-white text-sm mb-2">{device.deviceType}</div>
                                  <div className="text-2xl font-bold text-orange-400 mb-1">{device.totalLogins}</div>
                                  <div className="text-xs text-white/60">{device.uniqueUsers} unique users</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </>
          )}

          {/* Removed: Support and Custom Styling tabs - all users are now free users */}
          </div>
        </div>
      </div>
      <div className="fixed bottom-24 right-8 z-50">
        <Button variant="secondary" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </Layout>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <Layout showNav={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-lg">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    }>
      <DashboardContent />
    </Suspense>
  )
}
