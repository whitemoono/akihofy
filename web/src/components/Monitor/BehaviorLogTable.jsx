/**
 * 行为日志表格组件
 * 展示详细的行为日志记录
 */

import { motion, AnimatePresence } from 'framer-motion'
import { List, Clock, ChevronDown, ChevronRight, Filter, Search, MessageSquare, RefreshCw, Scale, BarChart3, FileText, Heart, UserPlus, Pin } from 'lucide-react'
import { useState, useMemo } from 'react'

// 行为类型配置
const actionConfig = {
  response_generated: { label: '生成回复', color: 'emerald' },
  generator_changed: { label: '切换生成器', color: 'violet' },
  comparison_test: { label: '对比测试', color: 'blue' },
  state_updated: { label: '状态更新', color: 'amber' },
  behavior: { label: '行为', color: 'slate' },
  emotion_changed: { label: '情绪变化', color: 'rose' },
  relationship_updated: { label: '关系更新', color: 'purple' },
  default: { label: '其他', color: 'gray' },
}

function getActionConfig(action) {
  const key = Object.keys(actionConfig).find(k => action?.includes(k)) || 'default'
  return actionConfig[key] || actionConfig.default
}

function getActionIcon(color) {
  const icons = {
    emerald: MessageSquare,
    violet: RefreshCw,
    blue: Scale,
    amber: BarChart3,
    slate: FileText,
    rose: Heart,
    purple: UserPlus,
    gray: Pin,
  }
  return icons[color] || Pin
}

function LogEntry({ entry, index }) {
  const [expanded, setExpanded] = useState(false)
  const config = getActionConfig(entry.action)
  const hasDetails = entry.details && Object.keys(entry.details).length > 0
  const Icon = getActionIcon(config.color)

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group"
    >
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
          expanded
            ? 'bg-slate-100/80'
            : 'hover:bg-slate-50/80'
        }`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* 时间 */}
        <div className="flex-shrink-0 w-20 text-xs text-slate-400 font-mono">
          <div>{formatTime(entry.timestamp)}</div>
          <div className="text-slate-300">{formatDate(entry.timestamp)}</div>
        </div>

        {/* 类型标签 */}
        <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          config.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
          config.color === 'violet' ? 'bg-violet-50 text-violet-700' :
          config.color === 'blue' ? 'bg-blue-50 text-blue-700' :
          config.color === 'amber' ? 'bg-amber-50 text-amber-700' :
          config.color === 'rose' ? 'bg-rose-50 text-rose-700' :
          config.color === 'purple' ? 'bg-purple-50 text-purple-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          <Icon size={12} />
          <span>{config.label}</span>
        </div>

        {/* 操作描述 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 truncate">
            {entry.action.replace(/_/g, ' ')}
          </p>
          {hasDetails && (
            <p className="text-xs text-slate-400 truncate">
              {Object.entries(entry.details || {})
                .slice(0, 2)
                .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                .join(' | ')}
            </p>
          )}
        </div>

        {/* 展开按钮 */}
        {hasDetails && (
          <button
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* 展开详情 */}
      <AnimatePresence>
        {expanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-14 mr-3 mb-2 p-3 bg-slate-50 rounded-lg border border-slate-200/50">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function BehaviorLogTable({ behaviors }) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState(new Set())

  const logs = behaviors || []

  // 获取可用的行为类型
  const availableTypes = useMemo(() => {
    const types = new Set()
    logs.forEach(log => {
      const config = getActionConfig(log.action)
      types.add(config.label)
    })
    return Array.from(types)
  }, [logs])

  // 过滤日志
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 搜索过滤
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesAction = log.action?.toLowerCase().includes(searchLower)
        const matchesDetails = JSON.stringify(log.details)?.toLowerCase().includes(searchLower)
        if (!matchesAction && !matchesDetails) return false
      }

      // 类型过滤
      if (selectedTypes.size > 0) {
        const config = getActionConfig(log.action)
        if (!selectedTypes.has(config.label)) return false
      }

      return true
    })
  }, [logs, search, selectedTypes])

  const toggleType = (type) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <List className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">行为日志</h3>
            <p className="text-xs text-slate-500">Behavior Log</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {filteredLogs.length} / {logs.length} 条
          </span>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="relative mb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索日志内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100/50 border-0 rounded-lg focus:ring-2 focus:ring-violet-200 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* 类型过滤 */}
      {showFilters && availableTypes.length > 0 && (
        <div className="mb-3 p-3 bg-slate-50 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-2.5 py-1 text-xs rounded-full transition ${
                  selectedTypes.has(type)
                    ? 'bg-violet-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type}
              </button>
            ))}
            {selectedTypes.size > 0 && (
              <button
                onClick={() => setSelectedTypes(new Set())}
                className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                清除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="max-h-80 overflow-y-auto">
        {filteredLogs.length > 0 ? (
          <div className="space-y-0.5">
            {filteredLogs.map((entry, index) => (
              <LogEntry key={`${entry.timestamp}-${index}`} entry={entry} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <List className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 mb-1">暂无日志记录</p>
            <p className="text-xs text-slate-400">
              {search ? '没有匹配的日志' : '开始对话后将显示行为日志'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
