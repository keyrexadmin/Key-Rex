/**
 * Database utilities for Key-Rex PostgreSQL migration
 *
 * This module provides:
 * - Prisma client singleton (prevents connection exhaustion in serverless)
 * - Map/Set ↔ JSON conversion helpers
 * - UsageStats serialization/deserialization
 * - Cleanup functions for expired data
 */

import { PrismaClient } from '@prisma/client'

// WORKAROUND: Use DATABASE_URL_CUSTOM if available (Vercel doesn't allow overriding DATABASE_URL)
// This allows us to use optimized connection parameters in production
if (process.env.DATABASE_URL_CUSTOM) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_CUSTOM
  console.log('Using DATABASE_URL_CUSTOM for connection')
}

// Singleton pattern prevents connection exhaustion in Vercel serverless
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Connection pool configuration for serverless
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Ensure connection is established (warm up for serverless)
prisma.$connect().catch((err) => {
  console.error('Failed to connect to database:', err)
})

// Graceful shutdown handler
if (process.env.NODE_ENV === 'production') {
  // In serverless, connections should be reused but may need cleanup
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

// ============================================================================
// Database Connection Utilities
// ============================================================================

/**
 * Retry wrapper for database operations
 * Handles transient connection errors in serverless environments
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      // Check if error is retryable (connection issues, timeouts)
      const isRetryable =
        error?.code === 'P1001' || // Can't reach database server
        error?.code === 'P1002' || // Database server timeout
        error?.code === 'P1008' || // Operations timed out
        error?.code === 'P1017' || // Server closed connection
        error?.message?.includes('Connection') ||
        error?.message?.includes('closed') ||
        error?.message?.includes('timeout')

      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Operation failed after retries')
}

// ============================================================================
// Map/Set ↔ JSON Conversion Helpers
// ============================================================================

/**
 * Convert Map to JSON object
 * @param map - Map to convert
 * @returns JSON object representation
 */
export function mapToJson<K, V>(map: Map<K, V>): Record<string, V> {
  const obj: Record<string, V> = {}
  map.forEach((value, key) => {
    obj[String(key)] = value
  })
  return obj
}

/**
 * Convert JSON object to Map
 * @param json - JSON object to convert
 * @returns Map representation
 */
export function jsonToMap<V>(json: any): Map<string, V> {
  const map = new Map<string, V>()
  if (json && typeof json === 'object') {
    Object.entries(json).forEach(([key, value]) => {
      map.set(key, value as V)
    })
  }
  return map
}

/**
 * Convert Set to JSON array
 * @param set - Set to convert
 * @returns JSON array representation
 */
export function setToJson<T>(set: Set<T>): T[] {
  return Array.from(set)
}

/**
 * Convert JSON array to Set
 * @param json - JSON array to convert
 * @returns Set representation
 */
export function jsonToSet<T>(json: any): Set<T> {
  return new Set(Array.isArray(json) ? json : [])
}

// ============================================================================
// UsageStats Serialization/Deserialization
// ============================================================================

/**
 * Serialize UsageStats from in-memory format to database format
 * Converts all Maps to objects and Sets to arrays for JSON storage
 */
export function serializeUsageStats(stats: any) {
  // Helper to convert Map<string, Set> to a plain object with arrays
  const mapOfSetsToJson = (map: Map<string, Set<any>> | undefined) => {
    const obj: Record<string, any[]> = {}
    if (map) {
      for (const [k, v] of map.entries()) {
        obj[k] = setToJson(v)
      }
    }
    return obj
  }

  // IMPORTANT: Only include fields that exist in the Prisma schema (UsageStats model).
  // Extra fields cause Prisma to reject the entire update, silently breaking analytics.
  return {
    // Simple counters (in schema)
    currentMonth: stats.currentMonth || 0,
    yearToDate: stats.yearToDate || 0,
    allTime: stats.allTime || 0,
    returningUserLogins: stats.returningUserLogins || 0,

    // Sets → arrays (in schema)
    uniquePubkeys: setToJson(stats.uniquePubkeys || new Set()),

    // Map<string, Set<string>> → object with arrays (in schema)
    monthlyPubkeys: mapOfSetsToJson(stats.monthlyPubkeys),
    dailyUniqueUsers: mapOfSetsToJson(stats.dailyUniqueUsers),

    // Simple Maps → objects (in schema)
    dailyLogins: mapToJson(stats.dailyLogins || new Map()),
    domainLogins: mapToJson(stats.domainLogins || new Map()),
    hourlyLogins: mapToJson(stats.hourlyLogins || new Map()),
    walletLogins: mapToJson(stats.walletLogins || new Map()),
    geographicData: mapToJson(stats.geographicData || new Map()),
    deviceTypes: mapToJson(stats.deviceTypes || new Map()),
    referrers: mapToJson(stats.referrers || new Map()),
    weeklyLogins: mapToJson(stats.weeklyLogins || new Map()),
    monthlyLogins: mapToJson(stats.monthlyLogins || new Map()),
    peakHours: mapToJson(stats.peakHours || new Map()),
    averageSessionLength: mapToJson(stats.averageSessionLength || new Map()),
    bounceRate: mapToJson(stats.bounceRate || new Map()),

    // Array (in schema)
    loginHistory: Array.isArray(stats.loginHistory) ? stats.loginHistory : [],
  }
}

/**
 * Deserialize UsageStats from database format to in-memory format
 * Converts all objects to Maps and arrays to Sets
 */
export function deserializeUsageStats(dbStats: any) {
  // Helper to convert a JSON object with arrays to Map<string, Set<string>>
  // Fix: Object.entries(Map) returns [] — must use plain object directly from DB
  const jsonObjToMapOfSets = (json: any): Map<string, Set<string>> => {
    const map = new Map<string, Set<string>>()
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      for (const [k, v] of Object.entries(json)) {
        map.set(k, jsonToSet(v))
      }
    }
    return map
  }

  return {
    currentMonth: dbStats.currentMonth || 0,
    yearToDate: dbStats.yearToDate || 0,
    allTime: dbStats.allTime || 0,
    returningUserLogins: dbStats.returningUserLogins || 0,

    // Convert arrays to Sets
    uniquePubkeys: jsonToSet(dbStats.uniquePubkeys),
    firstTimeLogins: jsonToSet(dbStats.firstTimeLogins || []),

    // Convert object with arrays to Map<string, Set<string>>
    // Use plain Object.entries on the raw DB JSON (NOT on a Map)
    monthlyPubkeys: jsonObjToMapOfSets(dbStats.monthlyPubkeys),
    dailyUniqueUsers: jsonObjToMapOfSets(dbStats.dailyUniqueUsers),
    domainUniqueUsers: jsonObjToMapOfSets(dbStats.domainUniqueUsers),
    walletUniqueUsers: jsonObjToMapOfSets(dbStats.walletUniqueUsers),
    dayOfWeekUniqueUsers: jsonObjToMapOfSets(dbStats.dayOfWeekUniqueUsers),
    browserUniqueUsers: jsonObjToMapOfSets(dbStats.browserUniqueUsers),
    deviceTypeUniqueUsers: jsonObjToMapOfSets(dbStats.deviceTypeUniqueUsers),

    // Convert objects to Maps
    dailyLogins: jsonToMap(dbStats.dailyLogins),
    domainLogins: jsonToMap(dbStats.domainLogins),
    hourlyLogins: jsonToMap(dbStats.hourlyLogins),
    walletLogins: jsonToMap(dbStats.walletLogins),
    dayOfWeekLogins: jsonToMap(dbStats.dayOfWeekLogins || {}),
    browserLogins: jsonToMap(dbStats.browserLogins || {}),
    deviceTypeLogins: jsonToMap(dbStats.deviceTypeLogins || {}),
    userFirstLoginDate: jsonToMap(dbStats.userFirstLoginDate || {}),
    userLastLoginDate: jsonToMap(dbStats.userLastLoginDate || {}),
    userLoginCount: jsonToMap(dbStats.userLoginCount || {}),
    geographicData: jsonToMap(dbStats.geographicData),
    deviceTypes: jsonToMap(dbStats.deviceTypes),
    referrers: jsonToMap(dbStats.referrers),
    weeklyLogins: jsonToMap(dbStats.weeklyLogins),
    monthlyLogins: jsonToMap(dbStats.monthlyLogins),
    peakHours: jsonToMap(dbStats.peakHours),
    averageSessionLength: jsonToMap(dbStats.averageSessionLength),
    bounceRate: jsonToMap(dbStats.bounceRate),

    // loginHistory stays as array
    loginHistory: Array.isArray(dbStats.loginHistory) ? dbStats.loginHistory : [],
  }
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Delete expired auth sessions from database
 * Should be called periodically (e.g., 10% chance on each auth request)
 * Auth sessions expire after 5 minutes
 */
export async function cleanupExpiredAuthSessions() {
  const now = Date.now()
  try {
    const result = await prisma.authSession.deleteMany({
      where: {
        expiresAt: {
          lt: BigInt(now),
        },
      },
    })
    await prisma.authChallenge.deleteMany({
      where: { expiresAt: { lt: BigInt(now) } },
    })

    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired auth sessions`)
    }

    return result.count
  } catch (error) {
    console.error('Error cleaning up expired auth sessions:', error)
    return 0
  }
}

/**
 * Cleanup function to call on random auth requests
 * 10% chance to run cleanup to avoid overhead
 */
export async function maybeCleanupAuthSessions() {
  if (Math.random() < 0.1) {
    await cleanupExpiredAuthSessions()
  }
}
