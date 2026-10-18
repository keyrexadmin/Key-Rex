/**
 * Key-Rex Storage Layer - PostgreSQL with Prisma
 *
 * Migrated from in-memory Maps to persistent PostgreSQL storage
 * All functions are now async and return Promises
 */

import { User, UsageStats, FeaturedWallet, ActivityLog, ActivityType, ContactSubmission, DomainVerification } from '@/types'
import { isTestDomain } from './utils'
import {
  prisma,
  serializeUsageStats,
  deserializeUsageStats,
  maybeCleanupAuthSessions,
  withRetry
} from './db'

// ============================================================================
// Auth Session Functions
// ============================================================================

const AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1000

function cleanK1Value(k1: string): string {
  return k1.split('&')[0].split('?')[0]
}

export const AUTH_NONCE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

/**
 * Register an issued k1 challenge. Create-only: re-registering an existing k1
 * never resets its consumed flag, expiry, site binding or nonce.
 */
export async function issueAuthChallenge(
  k1: string,
  siteId?: string | null,
  nonce?: string | null
): Promise<void> {
  const now = Date.now()
  await withRetry(async () => {
    return await prisma.authChallenge.upsert({
      where: { k1: cleanK1Value(k1) },
      update: {},
      create: {
        k1: cleanK1Value(k1),
        siteId: siteId || null,
        nonce: nonce && AUTH_NONCE_PATTERN.test(nonce) ? nonce : null,
        consumed: false,
        createdAt: BigInt(now),
        expiresAt: BigInt(now + AUTH_CHALLENGE_TTL_MS),
      },
    })
  })
  await maybeCleanupAuthSessions()
}

export async function getAuthChallenge(k1: string): Promise<{ siteId: string | null; nonce: string | null } | null> {
  const row = await withRetry(async () => {
    return await prisma.authChallenge.findUnique({ where: { k1: cleanK1Value(k1) } })
  })
  return row ? { siteId: row.siteId, nonce: row.nonce } : null
}

/**
 * Atomically consume an issued challenge. Returns true for exactly one caller;
 * false if the k1 was never issued, already consumed, expired, or bound to a
 * different siteId. Fails closed on database errors.
 */
export async function consumeAuthChallenge(k1: string, siteId?: string | null): Promise<boolean> {
  try {
    const result = await withRetry(async () => {
      return await prisma.authChallenge.updateMany({
        where: {
          k1: cleanK1Value(k1),
          consumed: false,
          expiresAt: { gt: BigInt(Date.now()) },
          ...(siteId ? { OR: [{ siteId: null }, { siteId }] } : { siteId: null }),
        },
        data: { consumed: true },
      })
    })
    return result.count === 1
  } catch (error) {
    console.error('Error consuming auth challenge:', error)
    return false
  }
}

export async function storeAuthSession(k1: string, xpub: string): Promise<void> {
  // Clean k1 of any extra query params
  const cleanK1 = k1.split('&')[0].split('?')[0]
  console.log('storeAuthSession: Storing k1 -> xpub mapping')
  console.log('k1 (cleaned):', cleanK1.substring(0, 20) + '...')
  console.log('xpub:', xpub.substring(0, 20) + '...')

  const now = Date.now()
  const expiresAt = now + (5 * 60 * 1000) // 5 minutes

  try {
    await withRetry(async () => {
      return await prisma.authSession.upsert({
        where: { k1: cleanK1 },
        // Never overwrite an existing session: that would reset `used` and enable replay
        update: {},
        create: {
          k1: cleanK1,
          xpub,
          used: false,
          timestamp: BigInt(now),
          expiresAt: BigInt(expiresAt),
        },
      })
    })
    console.log('Session stored in database')

    // Periodically cleanup expired sessions (10% chance)
    await maybeCleanupAuthSessions()
  } catch (error) {
    console.error('Error storing auth session:', error)
    throw error
  }
}

export async function getAuthSession(k1: string): Promise<string | undefined> {
  // Clean k1 of any extra query params
  const cleanK1 = k1.split('&')[0].split('?')[0]
  console.log('getAuthSession: Looking up k1')
  console.log('Original k1:', k1.substring(0, 20) + '...')
  console.log('k1 (cleaned):', cleanK1.substring(0, 20) + '...')
  console.log('Full cleaned k1:', cleanK1)

  try {
    const session = await withRetry(async () => {
      return await prisma.authSession.findUnique({
        where: { k1: cleanK1 },
      })
    })

    if (!session) {
      console.log('Session not found')
      return undefined
    }

    // SECURITY: Check if k1 has already been used (prevent reuse)
    if (session.used) {
      console.log('SECURITY: k1 has already been used - preventing reuse')
      await prisma.authSession.delete({ where: { k1: cleanK1 } })
      return undefined
    }

    // Check if expired (5 minutes)
    const now = Date.now()
    if (now > Number(session.expiresAt)) {
      console.log('Session expired')
      await prisma.authSession.delete({ where: { k1: cleanK1 } })
      return undefined
    }

    console.log('Session found! xpub:', session.xpub.substring(0, 20) + '...')
    return session.xpub
  } catch (error) {
    console.error('Error getting auth session:', error)
    return undefined
  }
}

export async function markAuthSessionAsUsed(k1: string): Promise<void> {
  const cleanK1 = k1.split('&')[0].split('?')[0]

  const result = await prisma.authSession.updateMany({
    where: { k1: cleanK1 },
    data: { used: true },
  })
  if (result.count === 0) {
    throw new Error('Auth session not found when marking as used')
  }
  console.log('SECURITY: Marked k1 as used to prevent reuse:', cleanK1.substring(0, 20) + '...')
}

// ============================================================================
// User Management Functions
// ============================================================================

export async function getUserByXpub(xpub: string): Promise<User | undefined> {
  try {
    const dbUser = await withRetry(async () => {
      return await prisma.user.findUnique({
        where: { xpub },
        include: { domains: true },
      })
    })

    if (!dbUser) return undefined

    // Convert Domain[] to Map<string, DomainVerification>
    const domainVerifications = new Map<string, DomainVerification>()
    dbUser.domains.forEach(d => {
      domainVerifications.set(d.domain, {
        domain: d.domain,
        status: d.verificationStatus as any,
        verificationMethod: d.verificationMethod as any,
        verificationToken: d.verificationToken,
        verifiedAt: d.verifiedAt ? Number(d.verifiedAt) : undefined,
        createdAt: Number(d.createdAt),
      })
    })

    return {
      xpub: dbUser.xpub,
      siteId: dbUser.siteId,
      subscribed: dbUser.subscribed,
      subscriptionTier: dbUser.subscriptionTier as 'free',
      allowedDomains: dbUser.domains.map(d => d.domain),
      domainVerifications,
      integrationEnabled: dbUser.integrationEnabled,
      freeDisclaimerAccepted: dbUser.freeDisclaimerAccepted,
      freeDisclaimerAcceptedAt: dbUser.freeDisclaimerAcceptedAt ? Number(dbUser.freeDisclaimerAcceptedAt) : undefined,
      freeDisclaimerAcceptedIp: undefined, // Not stored in DB currently
      freeDisclaimerAcceptedUserAgent: undefined, // Not stored in DB currently
      createdAt: Number(dbUser.createdAt),
    }
  } catch (error) {
    console.error('Error fetching user by xpub:', error)
    return undefined
  }
}

export async function getUserBySiteId(siteId: string): Promise<User | undefined> {
  try {
    const dbUser = await withRetry(async () => {
      return await prisma.user.findUnique({
        where: { siteId },
        include: { domains: true },
      })
    })

    if (!dbUser) return undefined

    // Convert to User format (same as getUserByXpub)
    const domainVerifications = new Map<string, DomainVerification>()
    dbUser.domains.forEach(d => {
      domainVerifications.set(d.domain, {
        domain: d.domain,
        status: d.verificationStatus as any,
        verificationMethod: d.verificationMethod as any,
        verificationToken: d.verificationToken,
        verifiedAt: d.verifiedAt ? Number(d.verifiedAt) : undefined,
        createdAt: Number(d.createdAt),
      })
    })

    return {
      xpub: dbUser.xpub,
      siteId: dbUser.siteId,
      subscribed: dbUser.subscribed,
      subscriptionTier: dbUser.subscriptionTier as 'free',
      allowedDomains: dbUser.domains.map(d => d.domain),
      domainVerifications,
      integrationEnabled: dbUser.integrationEnabled,
      freeDisclaimerAccepted: dbUser.freeDisclaimerAccepted,
      freeDisclaimerAcceptedAt: dbUser.freeDisclaimerAcceptedAt ? Number(dbUser.freeDisclaimerAcceptedAt) : undefined,
      freeDisclaimerAcceptedIp: undefined,
      freeDisclaimerAcceptedUserAgent: undefined,
      createdAt: Number(dbUser.createdAt),
    }
  } catch (error) {
    console.error('Error fetching user by siteId:', error)
    return undefined
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const dbUsers = await prisma.user.findMany({
      include: { domains: true },
    })

    return dbUsers.map(dbUser => {
      const domainVerifications = new Map<string, DomainVerification>()
      dbUser.domains.forEach(d => {
        domainVerifications.set(d.domain, {
          domain: d.domain,
          status: d.verificationStatus as any,
          verificationMethod: d.verificationMethod as any,
          verificationToken: d.verificationToken,
          verifiedAt: d.verifiedAt ? Number(d.verifiedAt) : undefined,
          createdAt: Number(d.createdAt),
        })
      })

      return {
        xpub: dbUser.xpub,
        siteId: dbUser.siteId,
        subscribed: dbUser.subscribed,
        subscriptionTier: dbUser.subscriptionTier as 'free',
        allowedDomains: dbUser.domains.map(d => d.domain),
        domainVerifications,
        integrationEnabled: dbUser.integrationEnabled,
        freeDisclaimerAccepted: dbUser.freeDisclaimerAccepted,
        freeDisclaimerAcceptedAt: dbUser.freeDisclaimerAcceptedAt ? Number(dbUser.freeDisclaimerAcceptedAt) : undefined,
        freeDisclaimerAcceptedIp: undefined,
        freeDisclaimerAcceptedUserAgent: undefined,
        createdAt: Number(dbUser.createdAt),
      }
    })
  } catch (error) {
    console.error('Error fetching all users:', error)
    return []
  }
}

export async function createUser(xpub: string, siteId: string): Promise<User> {
  try {
    const dbUser = await prisma.user.create({
      data: {
        xpub,
        siteId,
        subscribed: false,
        subscriptionTier: 'free',
        integrationEnabled: true,
        freeDisclaimerAccepted: false,
        createdAt: BigInt(Date.now()),
      },
    })

    return {
      xpub: dbUser.xpub,
      siteId: dbUser.siteId,
      subscribed: dbUser.subscribed,
      subscriptionTier: dbUser.subscriptionTier as 'free',
      allowedDomains: [],
      domainVerifications: new Map(),
      integrationEnabled: dbUser.integrationEnabled,
      freeDisclaimerAccepted: dbUser.freeDisclaimerAccepted,
      freeDisclaimerAcceptedAt: undefined,
      freeDisclaimerAcceptedIp: undefined,
      freeDisclaimerAcceptedUserAgent: undefined,
      createdAt: Number(dbUser.createdAt),
    }
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function updateUser(xpub: string, updates: Partial<User>): Promise<User | undefined> {
  console.log('updateUser: Updating user with:', JSON.stringify(updates, null, 2))

  try {
    const currentUser = await getUserByXpub(xpub)
    if (!currentUser) {
      console.error('updateUser: User not found for xpub:', xpub.substring(0, 20) + '...')
      return undefined
    }

    console.log('updateUser: Current user before update:', {
      subscribed: currentUser.subscribed,
      tier: currentUser.subscriptionTier,
      domains: currentUser.allowedDomains,
      domainCount: currentUser.allowedDomains?.length || 0,
    })

    // Log activity for integration status changes
    if ('integrationEnabled' in updates) {
      if (updates.integrationEnabled === false && currentUser.integrationEnabled !== false) {
        await logActivity(xpub, 'integration_disabled', 'Integration disabled', {})
      } else if (updates.integrationEnabled !== false && currentUser.integrationEnabled === false) {
        await logActivity(xpub, 'integration_enabled', 'Integration enabled', {})
      }
    }

    // Prepare update data (exclude fields that shouldn't be updated directly)
    const updateData: any = {
      updatedAt: BigInt(Date.now()),
    }

    if ('subscribed' in updates) updateData.subscribed = updates.subscribed
    if ('subscriptionTier' in updates) updateData.subscriptionTier = updates.subscriptionTier
    if ('integrationEnabled' in updates) updateData.integrationEnabled = updates.integrationEnabled
    if ('freeDisclaimerAccepted' in updates) updateData.freeDisclaimerAccepted = updates.freeDisclaimerAccepted
    if ('freeDisclaimerAcceptedAt' in updates && updates.freeDisclaimerAcceptedAt) {
      updateData.freeDisclaimerAcceptedAt = BigInt(updates.freeDisclaimerAcceptedAt)
    }

    // Update user in database
    await prisma.user.update({
      where: { xpub },
      data: updateData,
    })

    // Get updated user
    const updatedUser = await getUserByXpub(xpub)

    if (!updatedUser) {
      console.error('updateUser: CRITICAL - User disappeared after update!')
      return undefined
    }

    console.log('updateUser: Update verified. subscribed:', updatedUser.subscribed, 'tier:', updatedUser.subscriptionTier, 'domains:', updatedUser.allowedDomains)
    return updatedUser
  } catch (error) {
    console.error('Error updating user:', error)
    return undefined
  }
}

export async function deleteUser(xpub: string): Promise<boolean> {
  try {
    await prisma.user.delete({
      where: { xpub },
      // Cascade deletes domains, usage stats, and activity logs
    })
    return true
  } catch (error) {
    console.error('Error deleting user:', error)
    return false
  }
}

// ============================================================================
// Domain Management Functions
// ============================================================================

// Keep utility functions as-is (not async)
export function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim()
  normalized = normalized.replace(/^https?:\/\//, '')
  normalized = normalized.replace(/^www\./, '')
  normalized = normalized.replace(/\/$/, '')
  normalized = normalized.split(':')[0]
  return normalized
}

export function isDomainAllowed(domain: string, allowedDomains: string[]): boolean {
  const normalized = normalizeDomain(domain)
  return allowedDomains.some(allowed => {
    const normalizedAllowed = normalizeDomain(allowed)
    return normalized === normalizedAllowed || normalized.endsWith('.' + normalizedAllowed)
  })
}

export async function addDomain(xpub: string, domain: string): Promise<User | undefined> {
  const normalized = normalizeDomain(domain)

  try {
    // Get user to find userId
    const dbUser = await prisma.user.findUnique({
      where: { xpub },
    })

    if (!dbUser) return undefined

    // Check if domain already exists
    const existingDomain = await prisma.domain.findFirst({
      where: {
        userId: dbUser.id,
        domain: normalized,
      },
    })

    if (!existingDomain) {
      // Create new domain
      await prisma.domain.create({
        data: {
          userId: dbUser.id,
          domain: normalized,
          verificationStatus: 'pending',
          verificationMethod: 'dns_txt',
          verificationToken: '', // Will be set by addDomainVerification
          createdAt: BigInt(Date.now()),
        },
      })

      // Log activity
      await logActivity(xpub, 'domain_added', `Domain "${normalized}" added`, { domain: normalized })
    }

    return await getUserByXpub(xpub)
  } catch (error) {
    console.error('Error adding domain:', error)
    return undefined
  }
}

export async function removeDomain(xpub: string, domain: string): Promise<User | undefined> {
  const normalized = normalizeDomain(domain)

  try {
    const dbUser = await prisma.user.findUnique({
      where: { xpub },
    })

    if (!dbUser) return undefined

    // Delete domain (will cascade verification if exists)
    const result = await prisma.domain.deleteMany({
      where: {
        userId: dbUser.id,
        domain: normalized,
      },
    })

    if (result.count > 0) {
      await logActivity(xpub, 'domain_removed', `Domain "${normalized}" removed`, { domain: normalized })
      console.log('removeDomain: Domain permanently deleted')
      console.log('removeDomain: Deleted domain:', normalized)
    }

    return await getUserByXpub(xpub)
  } catch (error) {
    console.error('Error removing domain:', error)
    return undefined
  }
}

export async function addDomainVerification(
  xpub: string,
  domain: string,
  verificationToken: string
): Promise<DomainVerification | undefined> {
  const normalized = normalizeDomain(domain)

  try {
    const dbUser = await prisma.user.findUnique({
      where: { xpub },
    })

    if (!dbUser) return undefined

    // Find or create domain
    let dbDomain = await prisma.domain.findFirst({
      where: {
        userId: dbUser.id,
        domain: normalized,
      },
    })

    if (!dbDomain) {
      dbDomain = await prisma.domain.create({
        data: {
          userId: dbUser.id,
          domain: normalized,
          verificationStatus: 'pending',
          verificationMethod: 'dns_txt',
          verificationToken,
          createdAt: BigInt(Date.now()),
        },
      })
    } else {
      // Update existing domain with verification token
      dbDomain = await prisma.domain.update({
        where: { id: dbDomain.id },
        data: {
          verificationToken,
          verificationStatus: 'pending',
        },
      })
    }

    return {
      domain: dbDomain.domain,
      status: dbDomain.verificationStatus as any,
      verificationMethod: dbDomain.verificationMethod as any,
      verificationToken: dbDomain.verificationToken,
      createdAt: Number(dbDomain.createdAt),
    }
  } catch (error) {
    console.error('Error adding domain verification:', error)
    return undefined
  }
}

export async function getDomainVerification(xpub: string, domain: string): Promise<DomainVerification | undefined> {
  const normalized = normalizeDomain(domain)

  try {
    const dbUser = await prisma.user.findUnique({
      where: { xpub },
    })

    if (!dbUser) return undefined

    const dbDomain = await prisma.domain.findFirst({
      where: {
        userId: dbUser.id,
        domain: normalized,
      },
    })

    if (!dbDomain) return undefined

    return {
      domain: dbDomain.domain,
      status: dbDomain.verificationStatus as any,
      verificationMethod: dbDomain.verificationMethod as any,
      verificationToken: dbDomain.verificationToken,
      verifiedAt: dbDomain.verifiedAt ? Number(dbDomain.verifiedAt) : undefined,
      createdAt: Number(dbDomain.createdAt),
    }
  } catch (error) {
    console.error('Error getting domain verification:', error)
    return undefined
  }
}

export async function updateDomainVerification(
  xpub: string,
  domain: string,
  updates: Partial<DomainVerification>
): Promise<DomainVerification | undefined> {
  const normalized = normalizeDomain(domain)

  try {
    const dbUser = await prisma.user.findUnique({
      where: { xpub },
    })

    if (!dbUser) return undefined

    const dbDomain = await prisma.domain.findFirst({
      where: {
        userId: dbUser.id,
        domain: normalized,
      },
    })

    if (!dbDomain) return undefined

    const updateData: any = {
      updatedAt: BigInt(Date.now()),
    }

    if ('status' in updates) updateData.verificationStatus = updates.status
    if ('verifiedAt' in updates && updates.verifiedAt) {
      updateData.verifiedAt = BigInt(updates.verifiedAt)
    }

    const updated = await prisma.domain.update({
      where: { id: dbDomain.id },
      data: updateData,
    })

    return {
      domain: updated.domain,
      status: updated.verificationStatus as any,
      verificationMethod: updated.verificationMethod as any,
      verificationToken: updated.verificationToken,
      verifiedAt: updated.verifiedAt ? Number(updated.verifiedAt) : undefined,
      createdAt: Number(updated.createdAt),
    }
  } catch (error) {
    console.error('Error updating domain verification:', error)
    return undefined
  }
}

export async function getVerifiedDomains(xpub: string): Promise<string[]> {
  try {
    const user = await getUserByXpub(xpub)
    if (!user) return []

    const allDomains = user.allowedDomains || []
    return allDomains.filter(domain => {
      // Test domains are always verified
      if (isTestDomain(domain)) return true

      // Check verification status
      const verification = user.domainVerifications?.get(domain)
      return verification?.status === 'verified'
    })
  } catch (error) {
    console.error('Error getting verified domains:', error)
    return []
  }
}

// ============================================================================
// Usage Stats Functions
// ============================================================================

export async function getUsageStats(siteId: string): Promise<UsageStats> {
  try {
    let dbStats = await prisma.usageStats.findUnique({
      where: { siteId },
    })

    if (!dbStats) {
      // Create default stats
      const user = await prisma.user.findUnique({ where: { siteId } })
      if (!user) {
        throw new Error('User not found for siteId: ' + siteId)
      }

      const now = new Date()
      const monthKey = `${now.getFullYear()}-${now.getMonth()}`

      dbStats = await prisma.usageStats.create({
        data: {
          userId: user.id,
          siteId,
          currentMonth: 0,
          yearToDate: 0,
          allTime: 0,
          returningUserLogins: 0,
          uniquePubkeys: [],
          monthlyPubkeys: { [monthKey]: [] },
          dailyLogins: {},
          dailyUniqueUsers: {},
          domainLogins: {},
          hourlyLogins: {},
          loginHistory: [],
          walletLogins: {},
          geographicData: {},
          deviceTypes: {},
          referrers: {},
          weeklyLogins: {},
          monthlyLogins: {},
          peakHours: {},
          averageSessionLength: {},
          bounceRate: {},
          createdAt: BigInt(Date.now()),
        },
      })
    }

    return deserializeUsageStats(dbStats) as unknown as UsageStats
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    throw error
  }
}

export async function recordLogin(
  siteId: string,
  pubkey: string,
  domain?: string,
  wallet?: string,
  browser?: string,
  deviceType?: string
): Promise<void> {
  try {
    const stats = await getUsageStats(siteId)
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
    }

    // Wallet tracking
    if (wallet) {
      stats.walletLogins.set(wallet, (stats.walletLogins.get(wallet) || 0) + 1)
    }

    // New vs Returning Users tracking
    const isFirstTime = !stats.uniquePubkeys.has(pubkey)
    if (isFirstTime) {
      stats.returningUserLogins++
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
      stats.loginHistory.sort((a, b) => a.date.localeCompare(b.date))
    }

    // Serialize and save to database
    const serialized = serializeUsageStats(stats)

    await prisma.usageStats.update({
      where: { siteId },
      data: {
        ...serialized,
        updatedAt: BigInt(Date.now()),
      } as any,
    })
    console.log('recordLogin: Successfully saved stats for siteId:', siteId, 'currentMonth:', stats.currentMonth, 'allTime:', stats.allTime)
  } catch (error) {
    console.error('recordLogin: FAILED to save stats for siteId:', siteId, 'Error:', error)
  }
}

export async function resetMonthlyStats(): Promise<void> {
  try {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`

    const allStats = await prisma.usageStats.findMany()

    for (const dbStats of allStats) {
      const stats = deserializeUsageStats(dbStats)

      if (!stats.monthlyPubkeys.has(monthKey)) {
        stats.currentMonth = 0
        stats.monthlyPubkeys.set(monthKey, new Set())

        const serialized = serializeUsageStats(stats)

        await prisma.usageStats.update({
          where: { id: dbStats.id },
          data: {
            ...serialized,
            updatedAt: BigInt(Date.now()),
          } as any,
        })
      }
    }
  } catch (error) {
    console.error('Error resetting monthly stats:', error)
  }
}

// ============================================================================
// Activity Log Functions
// ============================================================================

export async function logActivity(
  xpub: string,
  type: ActivityType,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { xpub },
    })

    if (!dbUser) {
      console.error('logActivity: User not found for xpub:', xpub)
      return
    }

    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        xpub,
        type,
        description,
        timestamp: BigInt(Date.now()),
        metadata: metadata || {},
      },
    })
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

export async function getActivityLogs(xpub: string, limit?: number): Promise<ActivityLog[]> {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { xpub },
      orderBy: { timestamp: 'desc' },
      take: limit || undefined,
    })

    return logs.map(log => ({
      id: log.id,
      xpub: log.xpub,
      type: log.type as ActivityType,
      description: log.description,
      timestamp: Number(log.timestamp),
      metadata: log.metadata as Record<string, any> | undefined,
    }))
  } catch (error) {
    console.error('Error getting activity logs:', error)
    return []
  }
}

export async function getActivityLogsByType(
  xpub: string,
  type: ActivityType,
  limit?: number
): Promise<ActivityLog[]> {
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        xpub,
        type,
      },
      orderBy: { timestamp: 'desc' },
      take: limit || undefined,
    })

    return logs.map(log => ({
      id: log.id,
      xpub: log.xpub,
      type: log.type as ActivityType,
      description: log.description,
      timestamp: Number(log.timestamp),
      metadata: log.metadata as Record<string, any> | undefined,
    }))
  } catch (error) {
    console.error('Error getting activity logs by type:', error)
    return []
  }
}

export async function getActivityLogsByDateRange(
  xpub: string,
  startDate: number,
  endDate: number
): Promise<ActivityLog[]> {
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        xpub,
        timestamp: {
          gte: BigInt(startDate),
          lte: BigInt(endDate),
        },
      },
      orderBy: { timestamp: 'desc' },
    })

    return logs.map(log => ({
      id: log.id,
      xpub: log.xpub,
      type: log.type as ActivityType,
      description: log.description,
      timestamp: Number(log.timestamp),
      metadata: log.metadata as Record<string, any> | undefined,
    }))
  } catch (error) {
    console.error('Error getting activity logs by date range:', error)
    return []
  }
}

// ============================================================================
// Featured Wallets Functions
// ============================================================================

export async function getFeaturedWallets(): Promise<FeaturedWallet[]> {
  try {
    const wallets = await prisma.featuredWallet.findMany({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
    })

    return wallets.map(w => ({
      id: w.id,
      name: w.name,
      logoUrl: w.logoUrl,
      downloadUrl: w.downloadUrl,
      enabled: w.enabled,
      priority: w.priority,
      createdAt: Number(w.createdAt),
      updatedAt: Number(w.updatedAt),
    }))
  } catch (error) {
    console.error('Error getting featured wallets:', error)
    return []
  }
}

export async function getAllFeaturedWallets(): Promise<FeaturedWallet[]> {
  try {
    const wallets = await prisma.featuredWallet.findMany({
      orderBy: { priority: 'asc' },
    })

    return wallets.map(w => ({
      id: w.id,
      name: w.name,
      logoUrl: w.logoUrl,
      downloadUrl: w.downloadUrl,
      enabled: w.enabled,
      priority: w.priority,
      createdAt: Number(w.createdAt),
      updatedAt: Number(w.updatedAt),
    }))
  } catch (error) {
    console.error('Error getting all featured wallets:', error)
    return []
  }
}

export async function addFeaturedWallet(
  wallet: Omit<FeaturedWallet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FeaturedWallet> {
  try {
    const id = `wallet_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const now = Date.now()

    const dbWallet = await prisma.featuredWallet.create({
      data: {
        id,
        name: wallet.name,
        logoUrl: wallet.logoUrl,
        downloadUrl: wallet.downloadUrl,
        enabled: wallet.enabled,
        priority: wallet.priority,
        createdAt: BigInt(now),
        updatedAt: BigInt(now),
      },
    })

    return {
      id: dbWallet.id,
      name: dbWallet.name,
      logoUrl: dbWallet.logoUrl,
      downloadUrl: dbWallet.downloadUrl,
      enabled: dbWallet.enabled,
      priority: dbWallet.priority,
      createdAt: Number(dbWallet.createdAt),
      updatedAt: Number(dbWallet.updatedAt),
    }
  } catch (error) {
    console.error('Error adding featured wallet:', error)
    throw error
  }
}

export async function updateFeaturedWallet(
  id: string,
  updates: Partial<FeaturedWallet>
): Promise<FeaturedWallet | undefined> {
  try {
    const updateData: any = {
      updatedAt: BigInt(Date.now()),
    }

    if ('name' in updates) updateData.name = updates.name
    if ('logoUrl' in updates) updateData.logoUrl = updates.logoUrl
    if ('downloadUrl' in updates) updateData.downloadUrl = updates.downloadUrl
    if ('enabled' in updates) updateData.enabled = updates.enabled
    if ('priority' in updates) updateData.priority = updates.priority

    const dbWallet = await prisma.featuredWallet.update({
      where: { id },
      data: updateData,
    })

    return {
      id: dbWallet.id,
      name: dbWallet.name,
      logoUrl: dbWallet.logoUrl,
      downloadUrl: dbWallet.downloadUrl,
      enabled: dbWallet.enabled,
      priority: dbWallet.priority,
      createdAt: Number(dbWallet.createdAt),
      updatedAt: Number(dbWallet.updatedAt),
    }
  } catch (error) {
    console.error('Error updating featured wallet:', error)
    return undefined
  }
}

export async function deleteFeaturedWallet(id: string): Promise<boolean> {
  try {
    await prisma.featuredWallet.delete({
      where: { id },
    })
    return true
  } catch (error) {
    console.error('Error deleting featured wallet:', error)
    return false
  }
}

export async function reorderFeaturedWallets(walletIds: string[]): Promise<boolean> {
  try {
    // Update priority for each wallet
    for (let i = 0; i < walletIds.length; i++) {
      await prisma.featuredWallet.update({
        where: { id: walletIds[i] },
        data: {
          priority: i,
          updatedAt: BigInt(Date.now()),
        },
      })
    }
    return true
  } catch (error) {
    console.error('Error reordering featured wallets:', error)
    return false
  }
}

// ============================================================================
// Contact Submissions Functions
// ============================================================================

export async function createContactSubmission(
  submission: Omit<ContactSubmission, 'id' | 'timestamp' | 'status'>
): Promise<ContactSubmission> {
  try {
    const id = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = Date.now()

    const dbSubmission = await prisma.contactSubmission.create({
      data: {
        id,
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        message: submission.message,
        urgent: submission.urgent || false,
        timestamp: BigInt(now),
        status: 'unread',
      },
    })

    console.log('Storage: Contact submission created in database')
    console.log('  ID:', dbSubmission.id)
    console.log('  Email:', dbSubmission.email)

    return {
      id: dbSubmission.id,
      name: dbSubmission.name || undefined,
      email: dbSubmission.email,
      subject: dbSubmission.subject,
      message: dbSubmission.message,
      urgent: dbSubmission.urgent,
      timestamp: Number(dbSubmission.timestamp),
      status: dbSubmission.status as any,
    }
  } catch (error) {
    console.error('Error creating contact submission:', error)
    throw error
  }
}

export async function getContactSubmission(id: string): Promise<ContactSubmission | undefined> {
  try {
    const dbSubmission = await prisma.contactSubmission.findUnique({
      where: { id },
    })

    if (!dbSubmission) return undefined

    return {
      id: dbSubmission.id,
      name: dbSubmission.name || undefined,
      email: dbSubmission.email,
      subject: dbSubmission.subject,
      message: dbSubmission.message,
      urgent: dbSubmission.urgent,
      timestamp: Number(dbSubmission.timestamp),
      status: dbSubmission.status as any,
    }
  } catch (error) {
    console.error('Error getting contact submission:', error)
    return undefined
  }
}

export async function getAllContactSubmissions(): Promise<ContactSubmission[]> {
  try {
    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { timestamp: 'desc' },
    })

    console.log('Storage: getAllContactSubmissions from database')
    console.log('  Total:', submissions.length)

    return submissions.map(s => ({
      id: s.id,
      name: s.name || undefined,
      email: s.email,
      subject: s.subject,
      message: s.message,
      urgent: s.urgent,
      timestamp: Number(s.timestamp),
      status: s.status as any,
    }))
  } catch (error) {
    console.error('Error getting all contact submissions:', error)
    return []
  }
}

export async function getUnreadContactSubmissions(): Promise<ContactSubmission[]> {
  try {
    const submissions = await prisma.contactSubmission.findMany({
      where: { status: 'unread' },
      orderBy: { timestamp: 'desc' },
    })

    return submissions.map(s => ({
      id: s.id,
      name: s.name || undefined,
      email: s.email,
      subject: s.subject,
      message: s.message,
      urgent: s.urgent,
      timestamp: Number(s.timestamp),
      status: s.status as any,
    }))
  } catch (error) {
    console.error('Error getting unread contact submissions:', error)
    return []
  }
}

export async function updateContactSubmissionStatus(
  id: string,
  status: ContactSubmission['status']
): Promise<ContactSubmission | undefined> {
  try {
    const dbSubmission = await prisma.contactSubmission.update({
      where: { id },
      data: { status },
    })

    return {
      id: dbSubmission.id,
      name: dbSubmission.name || undefined,
      email: dbSubmission.email,
      subject: dbSubmission.subject,
      message: dbSubmission.message,
      urgent: dbSubmission.urgent,
      timestamp: Number(dbSubmission.timestamp),
      status: dbSubmission.status as any,
    }
  } catch (error) {
    console.error('Error updating contact submission status:', error)
    return undefined
  }
}

export async function deleteContactSubmission(id: string): Promise<boolean> {
  try {
    await prisma.contactSubmission.delete({
      where: { id },
    })
    return true
  } catch (error) {
    console.error('Error deleting contact submission:', error)
    return false
  }
}
