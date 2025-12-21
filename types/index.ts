// Removed: EnterpriseFeature and SubscriptionTier types - all users are now free users
// Keeping legacy types for backward compatibility but they are no longer used

export type SubscriptionTier = 'free' // Legacy - all users are now free
export type EnterpriseFeature = never // Legacy - no longer used

export interface User {
  xpub: string
  siteId: string
  subscribed: boolean // Always true for free users
  subscriptionTier?: 'free' // All users are free users
  allowedDomains?: string[] // List of allowed domains (unlimited for all users)
  freeDisclaimerAccepted?: boolean // If true, user has accepted the free version disclaimer
  freeDisclaimerAcceptedAt?: number // Timestamp when disclaimer was accepted (milliseconds since epoch)
  freeDisclaimerAcceptedIp?: string // IP address when disclaimer was accepted
  freeDisclaimerAcceptedUserAgent?: string // User agent (browser/device) when disclaimer was accepted
  integrationEnabled?: boolean // If false, authentication is disabled for all domains (default: true)
  createdAt: number
  // Legacy enterprise fields (kept for backward compatibility but not used):
  enterpriseFeatures?: never // Legacy - no longer used
  enterprisePackageId?: never // Legacy - no longer used
  enterprisePrice?: never // Legacy - no longer used
  needsCodeUpdate?: never // Legacy - no longer used
  customButtonText?: never // Legacy - no longer used
  customFooterText?: never // Legacy - no longer used
  customCSS?: never // Legacy - no longer used
  customCSSProperties?: never // Legacy - no longer used
}

export interface ContactSubmission {
  id: string
  name?: string
  email: string
  subject: string
  message: string
  urgent?: boolean
  timestamp: number
  status: 'unread' | 'read' | 'replied' | 'archived'
  ipAddress?: string
  userAgent?: string
}

export interface UsageStats {
  currentMonth: number
  yearToDate: number
  allTime: number
  uniquePubkeys: Set<string>
  monthlyPubkeys: Map<string, Set<string>>
  // Daily tracking
  dailyLogins: Map<string, number> // "YYYY-MM-DD" -> count
  dailyUniqueUsers: Map<string, Set<string>> // "YYYY-MM-DD" -> Set of pubkeys
  // Per-domain tracking
  domainLogins: Map<string, number> // domain -> count
  domainUniqueUsers: Map<string, Set<string>> // domain -> Set of pubkeys
  // Hourly tracking (for time-of-day patterns)
  hourlyLogins: Map<string, number> // "YYYY-MM-DD-HH" -> count (24-hour format)
  // Historical data for charts
  loginHistory: Array<{ date: string; count: number; uniqueUsers: number }> // Last 90 days
  // Wallet tracking
  walletLogins: Map<string, number> // wallet name -> count
  walletUniqueUsers: Map<string, Set<string>> // wallet name -> Set of pubkeys
  // New vs Returning Users
  firstTimeLogins: Set<string> // pubkeys that have logged in for the first time
  returningUserLogins: number // count of logins from users who have logged in before
  // Day of Week tracking
  dayOfWeekLogins: Map<number, number> // 0 (Sunday) - 6 (Saturday) -> count
  dayOfWeekUniqueUsers: Map<number, Set<string>> // day -> Set of pubkeys
  // Browser/Device tracking
  browserLogins: Map<string, number> // browser name -> count
  browserUniqueUsers: Map<string, Set<string>> // browser name -> Set of pubkeys
  deviceTypeLogins: Map<string, number> // 'mobile' | 'desktop' | 'tablet' | 'unknown' -> count
  deviceTypeUniqueUsers: Map<string, Set<string>> // device type -> Set of pubkeys
  // User login history (for retention calculation)
  userFirstLoginDate: Map<string, number> // pubkey -> timestamp of first login
  userLastLoginDate: Map<string, number> // pubkey -> timestamp of last login
  userLoginCount: Map<string, number> // pubkey -> total login count for this user
}

export interface LoginRequest {
  k1: string
  sig: string
  key: string
}

export interface FeaturedWallet {
  id: string
  name: string
  logoUrl: string // URL to wallet logo (SVG/PNG)
  downloadUrl: string // URL where users can download the wallet
  enabled: boolean // Whether this wallet is currently shown
  priority: number // Order priority (lower = higher priority)
  createdAt: number
  updatedAt: number
}

export interface EmbedConfig {
  siteId: string
  buttonText: string // Default: "Sign in with ₿itPass"
  showBranding: boolean // Always true - all users see branding
  featuredWallets: FeaturedWallet[] // Active featured wallets, ordered by priority
  footerText: string // Default: "Powered by ₿itPass — open-source"
  isTestMode?: boolean // If true, this is a test mode configuration
  integrationEnabled?: boolean // Integration enabled status
}

export type ActivityType = 
  | 'domain_added'
  | 'domain_removed'
  | 'domain_updated'
  | 'integration_enabled'
  | 'integration_disabled'
  | 'login_success'
  | 'config_changed'

export interface ActivityLog {
  id: string
  xpub: string
  type: ActivityType
  description: string
  timestamp: number
  metadata?: Record<string, any> // Additional context (domain name, etc.)
}



