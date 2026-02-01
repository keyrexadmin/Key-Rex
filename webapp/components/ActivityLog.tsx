'use client'

import { useState, useEffect } from 'react'
import { ActivityLog, ActivityType } from '@/types'
import Card from './Card'

interface ActivityLogProps {
  xpub: string
  limit?: number
}

const activityIcons: Record<ActivityType, string> = {
  domain_added: '➕',
  domain_removed: '➖',
  domain_updated: '✏️',
  integration_enabled: '✅',
  integration_disabled: '❌',
  login_success: '🔐',
  config_changed: '⚙️',
}

const activityColors: Record<ActivityType, string> = {
  domain_added: 'text-green-400',
  domain_removed: 'text-red-400',
  domain_updated: 'text-blue-400',
  integration_enabled: 'text-green-400',
  integration_disabled: 'text-red-400',
  login_success: 'text-orange-400',
  config_changed: 'text-yellow-400',
}

export default function ActivityLogComponent({ xpub, limit = 50 }: ActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ActivityType | 'all'>('all')

  useEffect(() => {
    loadLogs()
  }, [xpub, filter, limit])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('type', filter)
      }
      if (limit) {
        params.set('limit', limit.toString())
      }

      const res = await fetch(`/api/activity?${params.toString()}`, {
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-white/300 text-sm">Loading activity log...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Activity Log</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActivityType | 'all')}
          className="bg-dark-800 text-white border border-dark-600 rounded px-3 py-1 text-sm"
        >
          <option value="all">All Activities</option>
          <option value="domain_added">Domain Added</option>
          <option value="domain_removed">Domain Removed</option>
          <option value="domain_updated">Domain Updated</option>
          <option value="integration_enabled">Integration Enabled</option>
          <option value="integration_disabled">Integration Disabled</option>
          <option value="login_success">Logins</option>
          <option value="config_changed">Config Changed</option>
        </select>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-white/300">No activity logged yet</p>
          <p className="text-white/400 text-sm mt-1">Activity will appear here as you use the dashboard</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-dark-800/50 border border-dark-700 rounded-lg p-3 flex items-start gap-3"
            >
              <div className="text-2xl flex-shrink-0">{activityIcons[log.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-medium text-sm ${activityColors[log.type]}`}>
                    {log.description}
                  </p>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="text-xs text-white/400 mt-1">
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        <span className="text-white/500">{key}:</span> {String(value)}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-white/500 mt-1">{formatTimestamp(log.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}






