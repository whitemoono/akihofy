/**
 * 实时活动卡片组件
 * 展示活跃状态、持续时间、心跳等
 */

import { motion } from 'framer-motion'
import { Activity, Heart, Clock, Zap, Circle } from 'lucide-react'
import { useState, useEffect } from 'react'

function PulseIndicator({ isActive }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`w-4 h-4 rounded-full ${
          isActive ? 'bg-emerald-400' : 'bg-slate-300'
        }`}
      />
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute inset-0 w-4 h-4 rounded-full ${
          isActive ? 'bg-emerald-400' : 'bg-slate-300'
        }`}
      />
    </div>
  )
}

function StatusBadge({ label, color, icon: Icon }) {
  const colorMap = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colorMap[color]}`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  )
}

function MetricItem({ icon: Icon, label, value, unit, color }) {
  const colorMap = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    violet: 'text-violet-600 bg-violet-50',
    amber: 'text-amber-600 bg-amber-50',
  }

  return (
    <div className="flex items-center gap-3 p-2.5 bg-slate-50/50 rounded-lg">
      <div className={`w-9 h-9 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-base font-semibold text-slate-800">
          {value}
          {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  )
}

function useUptime(startTime) {
  const [uptime, setUptime] = useState('')

  useEffect(() => {
    const updateUptime = () => {
      const seconds = Math.floor((Date.now() / 1000) - startTime)
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60

      if (hours > 0) {
        setUptime(`${hours}h ${minutes}m ${secs}s`)
      } else if (minutes > 0) {
        setUptime(`${minutes}m ${secs}s`)
      } else {
        setUptime(`${secs}s`)
      }
    }

    updateUptime()
    const interval = setInterval(updateUptime, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return uptime
}

function HeartbeatGraph({ data }) {
  const maxPoints = 20
  const height = 40
  const width = 160

  // 生成心电图样式数据
  const points = data || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* 心跳线 */}
      <polyline
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.map((v, i) => `${(i / (points.length - 1)) * width},${height / 2 + v}`).join(' ')}
      />
      {/* 中心线 */}
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="#e2e8f0"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
    </svg>
  )
}

export function ActivityCard({ isActive, lastActivity, behaviorLog }) {
  // 使用当前时间作为启动时间（模拟）
  const sessionStart = Math.floor(Date.now() / 1000) - 300 // 假设已运行5分钟
  const uptime = useUptime(sessionStart)

  // 获取最近活动
  const recentBehaviors = behaviorLog?.slice(-5).reverse() || []
  const hasRecentActivity = recentBehaviors.length > 0

  // 模拟心跳数据
  const heartbeatData = [0, 0, 5, 0, -8, 15, -5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isActive
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
              : 'bg-gradient-to-br from-slate-400 to-gray-500'
          }`}>
            <PulseIndicator isActive={isActive} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">实时活动</h3>
            <p className="text-xs text-slate-500">Live Activity</p>
          </div>
        </div>
        <StatusBadge
          label={isActive ? '运行中' : '空闲'}
          color={isActive ? 'green' : 'yellow'}
          icon={Circle}
        />
      </div>

      {/* 状态概览 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-center gap-8">
          {/* 心跳 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Heart className={`w-4 h-4 ${isActive ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`} />
              <span className="text-xs text-slate-500">心跳</span>
            </div>
            <HeartbeatGraph data={heartbeatData} />
          </div>

          {/* 运行时间 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-500">运行时间</span>
            </div>
            <p className="text-xl font-bold text-slate-800 font-mono">{uptime}</p>
          </div>
        </div>
      </div>

      {/* 指标 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricItem
          icon={Activity}
          label="活跃状态"
          value={isActive ? '活跃' : '空闲'}
          color="emerald"
        />
        <MetricItem
          icon={Zap}
          label="活动次数"
          value={recentBehaviors.length}
          unit="次"
          color="amber"
        />
      </div>

      {/* 最近活动 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-slate-700">最近活动</span>
          <span className="text-xs text-slate-400">({recentBehaviors.length})</span>
        </div>

        {recentBehaviors.length > 0 ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {recentBehaviors.map((behavior, index) => (
              <motion.div
                key={`${behavior.timestamp}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 text-xs p-2 bg-slate-50/50 rounded-lg"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  index === 0 ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <span className="flex-1 truncate text-slate-600">{behavior.action}</span>
                <span className="text-slate-400">
                  {new Date(behavior.timestamp * 1000).toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-slate-400">
            暂无活动记录
          </div>
        )}
      </div>
    </motion.div>
  )
}
