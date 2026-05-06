/**
 * 统计概览卡片组件
 * 展示对话统计、性能指标
 */

import { motion } from 'framer-motion'
import { MessageSquare, Clock, TrendingUp, CheckCircle, XCircle, Zap, Activity } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sublabel, color, trend }) {
  const colorConfig = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-50 text-slate-600',
  }

  return (
    <div className="bg-slate-50/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${colorConfig[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-800">{value}</p>
        </div>
        {trend !== undefined && (
          <div className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      {sublabel && (
        <p className="text-xs text-slate-400">{sublabel}</p>
      )}
    </div>
  )
}

function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const height = 30
  const width = 100
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  )
}

export function StatsCard({ stats, state }) {
  // 从 state 中提取统计数据
  const interactionCount = state?.relationship?.interaction_count || 0
  const emotionHistory = state?.emotion?.history || []

  // 计算情绪峰值
  const emotionPeak = emotionHistory.length > 0
    ? Math.max(...emotionHistory.map(h => h.intensity))
    : 0

  // 计算平均情绪强度
  const avgEmotionIntensity = emotionHistory.length > 0
    ? emotionHistory.reduce((sum, h) => sum + h.intensity, 0) / emotionHistory.length
    : 0

  // 计算模拟统计数据
  const totalConversations = interactionCount || 1
  const successRate = stats?.successRate || 95
  const avgResponseTime = stats?.avgResponseTime || 150
  const todayInteractions = Math.floor(totalConversations * 0.3) // 模拟今天的数据

  // 生成模拟趋势数据
  const sparklineData = [65, 72, 68, 75, 80, 78, 85]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">统计概览</h3>
            <p className="text-xs text-slate-500">Statistics Overview</p>
          </div>
        </div>
        <span className="text-xs text-slate-400">实时更新</span>
      </div>

      {/* 统计卡片网格 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard
          icon={MessageSquare}
          label="总对话数"
          value={totalConversations}
          sublabel="累计互动"
          color="blue"
          trend={8}
        />
        <StatCard
          icon={CheckCircle}
          label="成功率"
          value={`${successRate}%`}
          sublabel="生成成功"
          color="emerald"
          trend={2}
        />
        <StatCard
          icon={Zap}
          label="平均响应"
          value={`${avgResponseTime}ms`}
          sublabel="响应时间"
          color="amber"
          trend={-5}
        />
        <StatCard
          icon={TrendingUp}
          label="情绪峰值"
          value={`${(emotionPeak * 100).toFixed(0)}%`}
          sublabel="最高强度"
          color="rose"
        />
      </div>

      {/* 趋势图表 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">互动趋势 (最近7次)</span>
          <span className="text-xs text-emerald-600 font-medium">+12%</span>
        </div>
        <div className="flex items-center justify-between">
          <MiniSparkline data={sparklineData} color="#10b981" />
          <div className="text-right">
            <p className="text-xs text-slate-500">今日</p>
            <p className="text-lg font-bold text-slate-800">{todayInteractions}</p>
          </div>
        </div>
      </div>

      {/* 详细指标 */}
      <div className="mt-4 pt-3 border-t border-slate-200/50 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">情绪稳定度</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: '75%' }} />
            </div>
            <span className="text-slate-700 font-medium">75%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">平均情绪强度</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full" style={{ width: `${avgEmotionIntensity * 100}%` }} />
            </div>
            <span className="text-slate-700 font-medium">{(avgEmotionIntensity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
