// Simple in-memory storage for demo
// In production, use Vercel KV or a proper database
// This works for Vercel deployment without additional setup

import { User, UsageStats, FeaturedWallet, ActivityLog, ActivityType, ContactSubmission } from '@/types'

interface StorageData {
  users: Map<string, User>
  usage: Map<string, UsageStats>
  featuredWallets: FeaturedWallet[] // Global admin-controlled featured wallets
  activityLogs: Map<string, ActivityLog[]> // xpub -> ActivityLog[]
  contactSubmissions: Map<string, ContactSubmission> // id -> ContactSubmission
}

let storage: StorageData = {
  users: new Map(),
  usage: new Map(),
  featuredWallets: [], // Start with empty array (launch state)
  activityLogs: new Map(),
  contactSubmissions: new Map(),
}

// Debug: Track storage instance to verify it's the same object
const STORAGE_INSTANCE_ID = Math.random().toString(36).substring(2, 9)
console.log('Storage module loaded, instance ID:', STORAGE_INSTANCE_ID)

// Temporary storage for k1 -> xpub mapping (for authentication flow)
// Cleared after 5 minutes or after use
interface AuthSession {
  xpub: string
  timestamp: number
  used: boolean // Track if k1 has been used to prevent reuse
}
const authSessions = new Map<string, AuthSession>()

export function storeAuthSession(k1: string, xpub: string): void {
  // Clean k1 of any extra query params
  const cleanK1 = k1.split('&')[0].split('?')[0]
  console.log('storeAuthSession: Storing k1 -> xpub mapping')
  console.log('k1 (cleaned):', cleanK1.substring(0, 20) + '...')
  console.log('xpub:', xpub.substring(0, 20) + '...')
  console.log('Total sessions stored:', authSessions.size)
  authSessions.set(cleanK1, { xpub, timestamp: Date.now(), used: false })
  console.log('Session stored. Total sessions now:', authSessions.size)
  // Verify it was stored
  const verify = authSessions.get(cleanK1)
  console.log('Verification: Session stored?', !!verify)
  
  // Clean up old sessions (older than 5 minutes)
  setTimeout(() => {
    const now = Date.now()
    for (const [key, value] of authSessions.entries()) {
      if (now - value.timestamp > 5 * 60 * 1000) {
        authSessions.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export function getAuthSession(k1: string): string | undefined {
  // Clean k1 of any extra query params
  const cleanK1 = k1.split('&')[0].split('?')[0]
  console.log('getAuthSession: Looking up k1')
  console.log('Original k1:', k1.substring(0, 20) + '...')
  console.log('k1 (cleaned):', cleanK1.substring(0, 20) + '...')
  console.log('Full cleaned k1:', cleanK1)
  console.log('Total sessions available:', authSessions.size)
  console.log('Available k1 keys (first 20 chars):', Array.from(authSessions.keys()).map(k => k.substring(0, 20) + '...'))
  console.log('Available k1 keys (full):', Array.from(authSessions.keys()))
  
  // Try exact match first
  let session = authSessions.get(cleanK1)
  if (!session) {
    console.log('Session not found for cleaned k1 (exact match)')
    // Try to find a partial match (in case of any encoding issues)
    for (const [storedK1, storedSession] of authSessions.entries()) {
      if (storedK1.startsWith(cleanK1.substring(0, 16)) || cleanK1.startsWith(storedK1.substring(0, 16))) {
        console.log('Found partial match! storedK1:', storedK1.substring(0, 20) + '...', 'cleanK1:', cleanK1.substring(0, 20) + '...')
        session = storedSession
        break
      }
    }
  }
  
  if (!session) {
    console.log('Session not found after all attempts')
    return undefined
  }
  
  // SECURITY: Check if k1 has already been used (prevent reuse)
  if (session.used) {
    console.log('SECURITY: k1 has already been used - preventing reuse')
    authSessions.delete(cleanK1)
    return undefined
  }
  
  // Check if expired (5 minutes)
  if (Date.now() - session.timestamp > 5 * 60 * 1000) {
    console.log('Session expired')
    authSessions.delete(cleanK1)
    return undefined
  }
  console.log('Session found! xpub:', session.xpub.substring(0, 20) + '...')
  return session.xpub
}

/**
 * Mark a k1 challenge as used to prevent reuse
 * @param k1 - The k1 challenge to mark as used
 */
export function markAuthSessionAsUsed(k1: string): void {
  const cleanK1 = k1.split('&')[0].split('?')[0]
  const session = authSessions.get(cleanK1)
  if (session) {
    session.used = true
    console.log('SECURITY: Marked k1 as used to prevent reuse:', cleanK1.substring(0, 20) + '...')
  }
}

export function getUserByXpub(xpub: string): User | undefined {
  return storage.users.get(xpub)
}

export function getUserBySiteId(siteId: string): User | undefined {
  // Find user by siteId (users are stored by xpub, so we need to search)
  for (const user of storage.users.values()) {
    if (user.siteId === siteId) {
      return user
    }
  }
  return undefined
}

export function getAllUsers(): User[] {
  // Return all users as an array
  return Array.from(storage.users.values())
}

export function createUser(xpub: string, siteId: string): User {
  const user: User = {
    xpub,
    siteId,
    subscribed: false,
    subscriptionTier: 'free',
    allowedDomains: [],
    freeDisclaimerAccepted: false,
    freeDisclaimerAcceptedAt: undefined,
    freeDisclaimerAcceptedIp: undefined,
    freeDisclaimerAcceptedUserAgent: undefined,
    integrationEnabled: true, // Default to enabled
    createdAt: Date.now(),
  }
  storage.users.set(xpub, user)
  return user
}

export function updateUser(xpub: string, updates: Partial<User>): User | undefined {
  const user = storage.users.get(xpub)
  if (!user) {
    console.error('updateUser: User not found for xpub:', xpub.substring(0, 20) + '...')
    return undefined
  }
  
  console.log('updateUser: Updating user with:', JSON.stringify(updates, null, 2))
  console.log('updateUser: Current user before update:', {
    subscribed: user.subscribed,
    tier: user.subscriptionTier,
    domains: user.allowedDomains,
    domainCount: user.allowedDomains?.length || 0,
  })
  
  // CRITICAL: If allowedDomains is being updated, ensure it completely replaces the old array
  // Don't merge arrays - explicitly replace
  const updated = { ...user, ...updates }
  
  // CRITICAL: If allowedDomains was in updates, ensure it's a new array reference (not merged)
  if ('allowedDomains' in updates && updates.allowedDomains !== undefined) {
    updated.allowedDomains = Array.isArray(updates.allowedDomains) 
      ? [...updates.allowedDomains] // Create new array to ensure replacement
      : updates.allowedDomains
    console.log('updateUser: CRITICAL - allowedDomains explicitly replaced:', updated.allowedDomains)
    console.log('updateUser: Old domain count:', user.allowedDomains?.length || 0)
    console.log('updateUser: New domain count:', updated.allowedDomains?.length || 0)
  }
  
  // Log activity for integration status changes
  if ('integrationEnabled' in updates) {
    if (updates.integrationEnabled === false && user.integrationEnabled !== false) {
      logActivity(xpub, 'integration_disabled', 'Integration disabled', {})
    } else if (updates.integrationEnabled !== false && user.integrationEnabled === false) {
      logActivity(xpub, 'integration_enabled', 'Integration enabled', {})
    }
  }
  
  storage.users.set(xpub, updated)
  
  // Verify the update was saved
  const verify = storage.users.get(xpub)
  if (!verify) {
    console.error('updateUser: CRITICAL - User disappeared after update!')
    return undefined
  }
  
  console.log('updateUser: Update verified. subscribed:', verify.subscribed, 'tier:', verify.subscriptionTier, 'domains:', verify.allowedDomains)
  console.log('updateUser: Full updated user:', JSON.stringify(verify, null, 2))
  return verify
}

export function getUsageStats(siteId: string): UsageStats {
  if (!storage.usage.has(siteId)) {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`
    storage.usage.set(siteId, {
      currentMonth: 0,
      yearToDate: 0,
      allTime: 0,
      uniquePubkeys: new Set(),
      monthlyPubkeys: new Map([[monthKey, new Set()]]),
      dailyLogins: new Map(),
      dailyUniqueUsers: new Map(),
      domainLogins: new Map(),
      domainUniqueUsers: new Map(),
      hourlyLogins: new Map(),
      loginHistory: [],
      walletLogins: new Map(),
      walletUniqueUsers: new Map(),
      firstTimeLogins: new Set(),
      returningUserLogins: 0,
      dayOfWeekLogins: new Map(),
      dayOfWeekUniqueUsers: new Map(),
      browserLogins: new Map(),
      browserUniqueUsers: new Map(),
      deviceTypeLogins: new Map(),
      deviceTypeUniqueUsers: new Map(),
      userFirstLoginDate: new Map(),
      userLastLoginDate: new Map(),
      userLoginCount: new Map(),
    })
  }
  return storage.usage.get(siteId)!
}

export function recordLogin(siteId: string, pubkey: string, domain?: string, wallet?: string, browser?: string, deviceType?: string): void {
  const stats = getUsageStats(siteId)
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  
  // Initialize month if needed
  if (!stats.monthlyPubkeys.has(monthKey)) {
    stats.monthlyPubkeys.set(monthKey, new Set())
  }
  
  const monthSet = stats.monthlyPubkeys.get(monthKey)!
  
  // Daily tracking
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (!stats.dailyUniqueUsers.has(dateKey)) {
    stats.dailyUniqueUsers.set(dateKey, new Set())
  }
  const dailySet = stats.dailyUniqueUsers.get(dateKey)!
  
  // Hourly tracking
  const hourKey = `${dateKey}-${String(now.getHours()).padStart(2, '0')}`
  stats.hourlyLogins.set(hourKey, (stats.hourlyLogins.get(hourKey) || 0) + 1)
  
  // Track daily login count (all logins, not just unique)
  stats.dailyLogins.set(dateKey, (stats.dailyLogins.get(dateKey) || 0) + 1)
  
  // Track unique users per day
  if (!dailySet.has(pubkey)) {
    dailySet.add(pubkey)
  }
  
  // Domain tracking
  if (domain) {
    const normalizedDomain = normalizeDomain(domain)
    stats.domainLogins.set(normalizedDomain, (stats.domainLogins.get(normalizedDomain) || 0) + 1)
    
    if (!stats.domainUniqueUsers.has(normalizedDomain)) {
      stats.domainUniqueUsers.set(normalizedDomain, new Set())
    }
    stats.domainUniqueUsers.get(normalizedDomain)!.add(pubkey)
  }
  
  // Wallet tracking
  if (wallet) {
    stats.walletLogins.set(wallet, (stats.walletLogins.get(wallet) || 0) + 1)
    
    if (!stats.walletUniqueUsers.has(wallet)) {
      stats.walletUniqueUsers.set(wallet, new Set())
    }
    stats.walletUniqueUsers.get(wallet)!.add(pubkey)
  }
  
  // New vs Returning Users tracking
  const isFirstTime = !stats.userFirstLoginDate.has(pubkey)
  if (isFirstTime) {
    stats.firstTimeLogins.add(pubkey)
    stats.userFirstLoginDate.set(pubkey, now.getTime())
    stats.userLoginCount.set(pubkey, 1)
  } else {
    stats.returningUserLogins++
    stats.userLoginCount.set(pubkey, (stats.userLoginCount.get(pubkey) || 0) + 1)
  }
  stats.userLastLoginDate.set(pubkey, now.getTime())
  
  // Day of Week tracking
  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
  stats.dayOfWeekLogins.set(dayOfWeek, (stats.dayOfWeekLogins.get(dayOfWeek) || 0) + 1)
  if (!stats.dayOfWeekUniqueUsers.has(dayOfWeek)) {
    stats.dayOfWeekUniqueUsers.set(dayOfWeek, new Set())
  }
  stats.dayOfWeekUniqueUsers.get(dayOfWeek)!.add(pubkey)
  
  // Browser tracking
  if (browser) {
    stats.browserLogins.set(browser, (stats.browserLogins.get(browser) || 0) + 1)
    if (!stats.browserUniqueUsers.has(browser)) {
      stats.browserUniqueUsers.set(browser, new Set())
    }
    stats.browserUniqueUsers.get(browser)!.add(pubkey)
  }
  
  // Device Type tracking
  if (deviceType) {
    stats.deviceTypeLogins.set(deviceType, (stats.deviceTypeLogins.get(deviceType) || 0) + 1)
    if (!stats.deviceTypeUniqueUsers.has(deviceType)) {
      stats.deviceTypeUniqueUsers.set(deviceType, new Set())
    }
    stats.deviceTypeUniqueUsers.get(deviceType)!.add(pubkey)
  }
  
  // Only count if new pubkey for this month (for monthly stats)
  if (!monthSet.has(pubkey)) {
    monthSet.add(pubkey)
    stats.currentMonth++
    stats.allTime++
    
    // Update YTD
    const currentYear = now.getFullYear()
    let ytdCount = 0
    for (const [key, pubkeys] of stats.monthlyPubkeys.entries()) {
      if (key.startsWith(String(currentYear))) {
        ytdCount += pubkeys.size
      }
    }
    stats.yearToDate = ytdCount
  }
  
  stats.uniquePubkeys.add(pubkey)
  
  // Update login history (keep last 90 days)
  const historyEntry = {
    date: dateKey,
    count: stats.dailyLogins.get(dateKey) || 0,
    uniqueUsers: dailySet.size,
  }
  
  // Remove old entries (older than 90 days)
  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() - 90)
  const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`
  
  stats.loginHistory = stats.loginHistory.filter(entry => entry.date >= cutoffKey)
  
  // Add or update today's entry
  const existingIndex = stats.loginHistory.findIndex(entry => entry.date === dateKey)
  if (existingIndex >= 0) {
    stats.loginHistory[existingIndex] = historyEntry
  } else {
    stats.loginHistory.push(historyEntry)
    // Sort by date (oldest first)
    stats.loginHistory.sort((a, b) => a.date.localeCompare(b.date))
  }
}

export function deleteUser(xpub: string): boolean {
  const user = storage.users.get(xpub)
  if (!user) return false
  
  // Delete user and their usage stats
  storage.users.delete(xpub)
  storage.usage.delete(user.siteId)
  return true
}

export function resetMonthlyStats(): void {
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  
  for (const [siteId, stats] of storage.usage.entries()) {
    if (!stats.monthlyPubkeys.has(monthKey)) {
      stats.currentMonth = 0
      stats.monthlyPubkeys.set(monthKey, new Set())
    }
  }
}

// Domain validation helpers
export function normalizeDomain(domain: string): string {
  // Remove protocol, www, trailing slashes, and normalize
  let normalized = domain.toLowerCase().trim()
  normalized = normalized.replace(/^https?:\/\//, '')
  normalized = normalized.replace(/^www\./, '')
  normalized = normalized.replace(/\/$/, '')
  // Remove port numbers for domain matching
  normalized = normalized.split(':')[0]
  return normalized
}

export function isDomainAllowed(domain: string, allowedDomains: string[]): boolean {
  const normalized = normalizeDomain(domain)
  return allowedDomains.some(allowed => {
    const normalizedAllowed = normalizeDomain(allowed)
    // Exact match or subdomain match
    return normalized === normalizedAllowed || normalized.endsWith('.' + normalizedAllowed)
  })
}

export function addDomain(xpub: string, domain: string): User | undefined {
  const user = storage.users.get(xpub)
  if (!user) return undefined
  
  const normalized = normalizeDomain(domain)
  if (!user.allowedDomains || !user.allowedDomains.includes(normalized)) {
    if (!user.allowedDomains) {
      user.allowedDomains = []
    }
    user.allowedDomains.push(normalized)
    storage.users.set(xpub, user)
    
    // Log activity
    logActivity(xpub, 'domain_added', `Domain "${normalized}" added`, { domain: normalized })
  }
  return user
}

export function removeDomain(xpub: string, domain: string): User | undefined {
  const user = storage.users.get(xpub)
  if (!user) return undefined
  
  if (!user.allowedDomains) {
    user.allowedDomains = []
  }
  
  const normalized = normalizeDomain(domain)
  const beforeCount = user.allowedDomains.length
  
  // CRITICAL: Permanently delete the domain - filter it out completely
  // The domain is removed from the array and cannot be found until re-added
  user.allowedDomains = user.allowedDomains.filter(d => {
    const normalizedExisting = normalizeDomain(d)
    return normalizedExisting !== normalized
  })
  
  const afterCount = user.allowedDomains.length
  storage.users.set(xpub, user)
  
  // Log activity
  if (beforeCount > afterCount) {
    logActivity(xpub, 'domain_removed', `Domain "${normalized}" removed`, { domain: normalized })
  }
  
  console.log('removeDomain: Domain permanently deleted')
  console.log('removeDomain: Before count:', beforeCount, 'After count:', afterCount)
  console.log('removeDomain: Deleted domain:', normalized)
  console.log('removeDomain: Remaining domains:', user.allowedDomains)
  console.log('removeDomain: Domain cannot be found until explicitly re-added by user')
  
  return user
}

// Featured Wallets Management (Admin-only)
export function getFeaturedWallets(): FeaturedWallet[] {
  // Return enabled wallets sorted by priority
  return storage.featuredWallets
    .filter(wallet => wallet.enabled)
    .sort((a, b) => a.priority - b.priority)
}

export function getAllFeaturedWallets(): FeaturedWallet[] {
  // Return all wallets (including disabled) sorted by priority
  return [...storage.featuredWallets].sort((a, b) => a.priority - b.priority)
}

export function addFeaturedWallet(wallet: Omit<FeaturedWallet, 'id' | 'createdAt' | 'updatedAt'>): FeaturedWallet {
  const newWallet: FeaturedWallet = {
    ...wallet,
    id: `wallet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  storage.featuredWallets.push(newWallet)
  return newWallet
}

export function updateFeaturedWallet(id: string, updates: Partial<FeaturedWallet>): FeaturedWallet | undefined {
  const index = storage.featuredWallets.findIndex(w => w.id === id)
  if (index === -1) return undefined
  
  const updated: FeaturedWallet = {
    ...storage.featuredWallets[index],
    ...updates,
    id, // Ensure ID doesn't change
    updatedAt: Date.now(),
  }
  storage.featuredWallets[index] = updated
  return updated
}

export function deleteFeaturedWallet(id: string): boolean {
  const index = storage.featuredWallets.findIndex(w => w.id === id)
  if (index === -1) return false
  storage.featuredWallets.splice(index, 1)
  return true
}

export function reorderFeaturedWallets(walletIds: string[]): boolean {
  // Reorder wallets based on provided order
  const walletMap = new Map(storage.featuredWallets.map(w => [w.id, w]))
  const reordered: FeaturedWallet[] = []
  
  for (let i = 0; i < walletIds.length; i++) {
    const wallet = walletMap.get(walletIds[i])
    if (wallet) {
      reordered.push({
        ...wallet,
        priority: i,
        updatedAt: Date.now(),
      })
      walletMap.delete(walletIds[i])
    }
  }
  
  // Add any remaining wallets (shouldn't happen, but safety check)
  for (const wallet of walletMap.values()) {
    reordered.push({
      ...wallet,
      priority: reordered.length,
      updatedAt: Date.now(),
    })
  }
  
  storage.featuredWallets = reordered
  return true
}

// Activity Log Functions
export function logActivity(
  xpub: string,
  type: ActivityType,
  description: string,
  metadata?: Record<string, any>
): void {
  if (!storage.activityLogs.has(xpub)) {
    storage.activityLogs.set(xpub, [])
  }
  
  const logs = storage.activityLogs.get(xpub)!
  const activity: ActivityLog = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    xpub,
    type,
    description,
    timestamp: Date.now(),
    metadata,
  }
  
  logs.push(activity)
  
  // Keep only last 1000 activities per user
  if (logs.length > 1000) {
    logs.shift()
  }
}

export function getActivityLogs(xpub: string, limit?: number): ActivityLog[] {
  const logs = storage.activityLogs.get(xpub) || []
  const sorted = logs.sort((a, b) => b.timestamp - a.timestamp) // Most recent first
  return limit ? sorted.slice(0, limit) : sorted
}

export function getActivityLogsByType(xpub: string, type: ActivityType, limit?: number): ActivityLog[] {
  const logs = getActivityLogs(xpub)
  const filtered = logs.filter(log => log.type === type)
  return limit ? filtered.slice(0, limit) : filtered
}

export function getActivityLogsByDateRange(
  xpub: string,
  startDate: number,
  endDate: number
): ActivityLog[] {
  const logs = getActivityLogs(xpub)
  return logs.filter(log => log.timestamp >= startDate && log.timestamp <= endDate)
}

// Contact Submissions Storage Functions
export function createContactSubmission(submission: Omit<ContactSubmission, 'id' | 'timestamp' | 'status'>): ContactSubmission {
  const id = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const contactSubmission: ContactSubmission = {
    id,
    ...submission,
    timestamp: Date.now(),
    status: 'unread',
  }
  storage.contactSubmissions.set(id, contactSubmission)
  console.log('Storage: Contact submission created and stored')
  console.log('  Storage instance ID:', STORAGE_INSTANCE_ID)
  console.log('  ID:', id)
  console.log('  Email:', contactSubmission.email)
  console.log('  Subject:', contactSubmission.subject)
  console.log('  Total stored:', storage.contactSubmissions.size)
  console.log('  All IDs in storage:', Array.from(storage.contactSubmissions.keys()))
  console.log('  Storage object reference:', storage.contactSubmissions)
  return contactSubmission
}

export function getContactSubmission(id: string): ContactSubmission | undefined {
  return storage.contactSubmissions.get(id)
}

export function getAllContactSubmissions(): ContactSubmission[] {
  const all = Array.from(storage.contactSubmissions.values()).sort((a, b) => b.timestamp - a.timestamp)
  console.log('Storage: getAllContactSubmissions called')
  console.log('  Storage instance ID:', STORAGE_INSTANCE_ID)
  console.log('  Total in Map:', storage.contactSubmissions.size)
  console.log('  Returned count:', all.length)
  console.log('  IDs:', all.map(s => s.id))
  console.log('  Storage object reference:', storage.contactSubmissions)
  if (all.length > 0) {
    console.log('  First submission:', { id: all[0].id, email: all[0].email, subject: all[0].subject })
  } else {
    console.log('  WARNING: Storage is empty - checking if this is a different instance')
  }
  return all
}

export function getUnreadContactSubmissions(): ContactSubmission[] {
  return Array.from(storage.contactSubmissions.values())
    .filter(sub => sub.status === 'unread')
    .sort((a, b) => b.timestamp - a.timestamp)
}

export function updateContactSubmissionStatus(id: string, status: ContactSubmission['status']): ContactSubmission | undefined {
  const submission = storage.contactSubmissions.get(id)
  if (!submission) return undefined
  
  submission.status = status
  storage.contactSubmissions.set(id, submission)
  return submission
}

export function deleteContactSubmission(id: string): boolean {
  return storage.contactSubmissions.delete(id)
}

// Reset stats on the 1st of each month
if (typeof window === 'undefined') {
  const now = new Date()
  if (now.getDate() === 1) {
    resetMonthlyStats()
  }
}


