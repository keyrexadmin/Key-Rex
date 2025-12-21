'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartData {
  date: string
  logins: number
  uniqueUsers?: number
}

interface AnalyticsChartProps {
  data: ChartData[]
  type?: 'line' | 'bar'
  title?: string
}

export default function AnalyticsChart({ data, type = 'line', title }: AnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-dark-200/80 border border-orange-500/30 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-white/90">No data available</p>
        <p className="text-white/60 text-sm mt-1">Data will appear here once you have authentication activity</p>
      </div>
    )
  }

  const hasUniqueUsers = data.some(d => d.uniqueUsers !== undefined)
  const ChartComponent = type === 'line' ? LineChart : BarChart

  return (
    <div className="bg-dark-200/80 border border-orange-500/30 rounded-lg p-6">
      {title && <h4 className="text-lg font-semibold text-white mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(249, 115, 22, 0.2)" />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255, 255, 255, 0.7)"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="rgba(255, 255, 255, 0.7)"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              borderRadius: '8px',
              color: '#ffffff',
            }}
          />
          <Legend />
          {type === 'line' ? (
            <>
              <Line 
                type="monotone" 
                dataKey="logins" 
                stroke="#f97316" 
                strokeWidth={2}
                name="Total Logins"
                dot={{ fill: '#f97316', r: 4 }}
              />
              {hasUniqueUsers && (
                <Line 
                  type="monotone" 
                  dataKey="uniqueUsers" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Unique Users"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              )}
            </>
          ) : (
            <>
              <Bar 
                dataKey="logins" 
                fill="#f97316"
                name="Total Logins"
              />
              {hasUniqueUsers && (
                <Bar 
                  dataKey="uniqueUsers" 
                  fill="#3b82f6"
                  name="Unique Users"
                />
              )}
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}

