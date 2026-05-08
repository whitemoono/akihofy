/**
 * AKIHO 详细日志页面 - 美化版
 * 展示系统运行日志、行为日志、情绪日志、对话日志等
 * 支持卡片视图和表格视图切换
 */

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, Filter, Search, Download, RefreshCw,
  AlertCircle, Info, AlertTriangle,
  CheckCircle, XCircle, Activity, MessageSquare, Brain, Heart,
  Zap, Database, User, Settings, Trash2, Eye, Terminal,
  Table2, LayoutGrid
} from 'lucide-react'
import { useLogs } from '../hooks/useMonitor'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 }
}

// 日志级别
const LEVEL_CONFIG = {
  info: { color: 'blue', icon: Info, label: '信息' },
  warning: { color: 'amber', icon: AlertTriangle, label: '警告' },
  error: { color: 'rose', icon: XCircle, label: '错误' },
  debug: { color: 'slate', icon: Terminal, label: '调试' },
}

// 日志类型
const TYPE_CONFIG = {
  system: { color: 'slate', icon: Settings, label: '系统' },
  behavior: { color: 'amber', icon: Zap, label: '行为' },
  emotion: { color: 'rose', icon: Heart, label: '情绪' },
  conversation: { color: 'teal', icon: MessageSquare, label: '对话' },
}

export function LogsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('card')
  const { logs, stats, loading, error, refresh, clearLogs } = useLogs(activeTab, 100)

  // 格式化日志时间
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return timestamp
    }
  }

  // 获取日志颜色
  const getLevelColor = (level) => {
    const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.info
    return {
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      amber: 'bg-amber-100 text-amber-600 border-amber-200',
      rose: 'bg-rose-100 text-rose-600 border-rose-200',
      slate: 'bg-slate-100 text-slate-600 border-slate-200',
    }[config.color] || 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 via-gray-600 to-slate-700 flex items-center justify-center shadow-lg"
              >
                <Terminal className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">系统日志</h1>
                <p className="text-xs text-slate-500">实时日志监控</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">刷新</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 max-w-7xl">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* 统计卡片 */}
          {stats && (
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats).map(([key, value]) => (
                  <div key={key} className="bg-white/80 backdrop-blur-xl rounded-xl p-4 border border-white/50 shadow-lg">
                    <div className="text-2xl font-bold text-slate-800">{typeof value === 'object' ? value.total || 0 : value}</div>
                    <div className="text-xs text-slate-500 capitalize">{key}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab切换 */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 p-1 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 w-fit">
              {['all', 'system', 'behavior', 'emotion', 'conversation'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === tab
                      ? 'bg-white shadow-md text-violet-600'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  {TYPE_CONFIG[tab]?.label || '全部'}
                </button>
              ))}
            </div>
          </motion.div>

          {/* 日志列表 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mx-auto" />
                  <p className="text-slate-400 mt-2">加载中...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center">
                  <Terminal className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-slate-400 mt-2">暂无日志</p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="divide-y divide-slate-100">
                  {logs.map((log, idx) => {
                    const levelConfig = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info
                    const TypeIcon = levelConfig.icon

                    return (
                      <motion.div
                        key={log.id || idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="p-4 hover:bg-slate-50/50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getLevelColor(log.level)}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-slate-400 font-mono">{formatTime(log.timestamp)}</span>
                              {log.type && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                                  {TYPE_CONFIG[log.type]?.label || log.type}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700">{log.message}</p>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-slate-400 cursor-pointer">查看详情</summary>
                                <pre className="mt-1 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-600">时间</th>
                        <th className="px-4 py-3 text-left text-slate-600">级别</th>
                        <th className="px-4 py-3 text-left text-slate-600">类型</th>
                        <th className="px-4 py-3 text-left text-slate-600">消息</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{formatTime(log.timestamp)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${getLevelColor(log.level)}`}>
                              {LEVEL_CONFIG[log.level]?.label || log.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{TYPE_CONFIG[log.type]?.label || log.type || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{log.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

// 日志项
function LogItem({ log, type, expanded, onToggle }) {
  const level = LOG_LEVELS[log.level?.toUpperCase()] || LOG_LEVELS.INFO

  const getLevelIcon = () => {
    const Icon = level.icon
    const colorClasses = {
      slate: 'text-slate-500 bg-slate-100',
      blue: 'text-blue-500 bg-blue-100',
      amber: 'text-amber-500 bg-amber-100',
      rose: 'text-rose-500 bg-rose-100',
      emerald: 'text-emerald-500 bg-emerald-100',
    }
    return (
      <div className={`w-6 h-6 rounded flex items-center justify-center ${colorClasses[level.color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    )
  }

  if (type === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`p-4 hover:bg-slate-50/50 transition-colors cursor-pointer ${expanded ? 'bg-slate-50/30' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          {getLevelIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
              <span className="font-mono">{log.timestamp}</span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{log.source}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                level.color === 'rose' ? 'bg-rose-100 text-rose-600' :
                level.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                level.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {level.name}
              </span>
            </div>
            <div className="text-sm text-slate-700">{log.message}</div>

            {expanded && log.details && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 p-3 bg-slate-100/50 rounded-lg"
              >
                <div className="text-xs font-medium text-slate-500 mb-2">详细信息</div>
                <pre className="text-xs text-slate-600 font-mono overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </motion.div>
            )}
          </div>
          <button className="p-1 text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    )
  }

  if (type === 'behavior') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-amber-100">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-mono">{log.timestamp}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                log.success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                {log.success ? '成功' : '失败'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div>
                <span className="text-slate-500">行为: </span>
                <span className="font-medium text-amber-700">{log.action}</span>
              </div>
              <div>
                <span className="text-slate-500">类别: </span>
                <span className="text-slate-700">{log.category}</span>
              </div>
              <div>
                <span className="text-slate-500">优先级: </span>
                <span className="font-medium text-slate-700">{(log.priority * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (type === 'emotion') {
    const stateColors = {
      Positive: 'bg-emerald-100 text-emerald-700',
      Negative: 'bg-rose-100 text-rose-700',
      Neutral: 'bg-slate-100 text-slate-700',
      Mixed: 'bg-amber-100 text-amber-700',
    }
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-rose-100">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-mono">{log.timestamp}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${stateColors[log.state]}`}>
                {log.state}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-500 mb-1">愉悦度 P</div>
                <div className="font-mono font-medium text-rose-600">{log.pad.pleasure.toFixed(2)}</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-500 mb-1">唤醒度 A</div>
                <div className="font-mono font-medium text-orange-600">{log.pad.arousal.toFixed(2)}</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-500 mb-1">支配度 D</div>
                <div className="font-mono font-medium text-blue-600">{log.pad.dominance.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              触发源: <span className="text-slate-700">{log.trigger}</span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (type === 'conversation') {
    const isUser = log.role === 'user'
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${
            isUser ? 'bg-teal-100' : 'bg-violet-100'
          }`}>
            <MessageSquare className={`w-3.5 h-3.5 ${isUser ? 'text-teal-500' : 'text-violet-500'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
              <span className="font-mono">{log.timestamp}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                isUser ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'
              }`}>
                {isUser ? '用户' : 'AI'}
              </span>
              {log.tokens && (
                <span className="text-slate-400">{log.tokens} tokens</span>
              )}
              {log.latency && (
                <span className="text-slate-400">耗时 {log.latency}ms</span>
              )}
            </div>
            <div className={`p-3 rounded-lg text-sm ${
              isUser ? 'bg-teal-50 text-teal-800' : 'bg-violet-50 text-violet-800'
            }`}>
              {log.content}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return null
}

// ========== 表格辅助组件 ==========

function LevelBadge({ level }) {
  const configs = {
    debug: { label: '调试', bg: 'bg-slate-100', text: 'text-slate-600' },
    info: { label: '信息', bg: 'bg-blue-100', text: 'text-blue-600' },
    warning: { label: '警告', bg: 'bg-amber-100', text: 'text-amber-600' },
    error: { label: '错误', bg: 'bg-rose-100', text: 'text-rose-600' },
    success: { label: '成功', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  }
  const config = configs[level] || configs.info
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>
}

function PriorityBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          className="h-full bg-amber-500 rounded-full"
        />
      </div>
      <span className="text-xs text-slate-500 w-8">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

function EnergyBar({ value }) {
  const color = value > 0.6 ? 'bg-emerald-500' : value > 0.3 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
      <span className="text-xs text-slate-500 w-8">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

function SuccessBadge() {
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-600">成功</span>
}

function FailedBadge() {
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-600">失败</span>
}

function EmotionStateBadge({ state }) {
  const configs = {
    Positive: { label: '积极', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    Negative: { label: '消极', bg: 'bg-rose-100', text: 'text-rose-600' },
    Neutral: { label: '中性', bg: 'bg-slate-100', text: 'text-slate-600' },
    Mixed: { label: '混合', bg: 'bg-amber-100', text: 'text-amber-600' },
  }
  const config = configs[state] || configs.Neutral
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>
}

function PADValue({ value, color }) {
  const colors = {
    rose: 'text-rose-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
  }
  return <span className={`font-mono font-medium ${colors[color]}`}>{value.toFixed(2)}</span>
}

function RoleBadge({ role }) {
  const isUser = role === 'user'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isUser ? 'bg-teal-100 text-teal-600' : 'bg-violet-100 text-violet-600'}`}>
      {isUser ? '用户' : 'AI'}
    </span>
  )
}

export default LogsPage
