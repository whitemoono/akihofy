/**
 * AKIHO 社交页面
 * Twitter/X 时间线、互动日志、情绪影响和统计分析
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, RefreshCw, Send, Heart, MessageCircle, Repeat2, MoreHorizontal,
  User, Eye, Zap, CheckCircle, XCircle, ExternalLink, Clock, Search,
  Filter, Download, TrendingUp, TrendingDown, Minus, BarChart3, PieChart,
  Activity, ThumbsUp, MessageSquare, Share2, UserPlus, FileText, Calendar,
  ChevronDown, ChevronRight, AlertCircle, Info, Settings, Table2, LayoutGrid
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RePieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// Tab 定义
const TABS = [
  { id: 'timeline', label: '时间线', icon: Globe },
  { id: 'logs', label: '互动日志', icon: FileText },
  { id: 'emotion', label: '情绪影响', icon: Heart },
  { id: 'stats', label: '统计', icon: BarChart3 },
]

// 互动类型定义
const INTERACTION_TYPES = {
  like: { label: '点赞', icon: ThumbsUp, color: 'pink' },
  retweet: { label: '转发', icon: Share2, color: 'green' },
  reply: { label: '回复', icon: MessageSquare, color: 'sky' },
  follow: { label: '关注', icon: UserPlus, color: 'violet' },
  tweet: { label: '发推', icon: Send, color: 'amber' },
  browse: { label: '浏览', icon: Eye, color: 'slate' },
}

const COLORS = {
  slate: 'bg-slate-100 text-slate-600',
  pink: 'bg-pink-100 text-pink-600',
  green: 'bg-green-100 text-green-600',
  sky: 'bg-sky-100 text-sky-600',
  violet: 'bg-violet-100 text-violet-600',
  amber: 'bg-amber-100 text-amber-600',
  teal: 'bg-teal-100 text-teal-600',
  rose: 'bg-rose-100 text-rose-600',
  indigo: 'bg-indigo-100 text-indigo-600',
}

// ============ 账号状态卡片 ============
function AccountCard({ account, loading }) {
  return (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <h3 className="text-sm font-medium text-slate-500 mb-3">账号状态</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      ) : account?.isLoggedIn ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-800">@{account.username}</p>
              <div className="flex items-center gap-1 text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs">已登录</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-400">
          <XCircle className="w-4 h-4" />
          <span className="text-sm">未登录</span>
        </div>
      )}
    </motion.div>
  )
}

// ============ 状态概览卡片 ============
function StatsOverviewCard({ stats }) {
  const getMoodIcon = (mood) => {
    const icons = {
      positive: ThumbsUp,
      neutral: Minus,
      negative: TrendingDown,
      excited: Zap,
      calm: Activity,
    }
    return icons[mood] || Activity
  }
  const MoodIcon = getMoodIcon(stats.mood)

  return (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <h3 className="text-sm font-medium text-slate-500 mb-3">今日概览</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <Eye className="w-4 h-4" />
            <span className="text-sm">浏览</span>
          </div>
          <span className="font-medium text-slate-800">{stats.viewed}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <Zap className="w-4 h-4" />
            <span className="text-sm">互动</span>
          </div>
          <span className="font-medium text-slate-800">{stats.interacted}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <MoodIcon className="w-4 h-4" />
            <span className="text-sm text-slate-600">情绪</span>
          </div>
          <span className="font-medium text-slate-800 capitalize">{stats.mood}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ============ 操作面板 ============
function ActionPanel({ onRefresh, onTweet, isLoading }) {
  return (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <h3 className="text-sm font-medium text-slate-500 mb-3">操作</h3>
      <div className="space-y-2">
        <button onClick={onRefresh} disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-sm font-medium transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新 Timeline
        </button>
        <button onClick={onTweet}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 rounded-xl text-white text-sm font-medium transition-all shadow-sm hover:shadow">
          <Send className="w-4 h-4" />
          发推
        </button>
      </div>
    </motion.div>
  )
}

// ============ 推文卡片 ============
function TweetCard({ tweet, onLike, onRetweet, onReply }) {
  const [isLiked, setIsLiked] = useState(tweet.isLiked || false)
  const [isRetweeted, setIsRetweeted] = useState(tweet.isRetweeted || false)

  const handleLike = () => { setIsLiked(!isLiked); onLike?.(tweet.id, !isLiked) }
  const handleRetweet = () => { setIsRetweeted(!isRetweeted); onRetweet?.(tweet.id, !isRetweeted) }

  const formatTime = (ts) => {
    const date = new Date(ts * 1000)
    const diff = Date.now() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours > 24) return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    if (hours > 0) return `${hours}h`
    return `${Math.floor(diff / 60000)}m`
  }

  return (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-800">{tweet.displayName || tweet.username}</span>
            <span className="text-slate-500 text-sm">@{tweet.username}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400 text-sm">{formatTime(tweet.timestamp)}</span>
          </div>
          <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-wrap">{tweet.content}</p>
          {tweet.media?.length > 0 && (
            <div className="mt-2 rounded-xl overflow-hidden bg-slate-100">
              {tweet.media[0].type === 'image' && (
                <img src={tweet.media[0].url} alt="" className="w-full max-h-64 object-cover" />
              )}
            </div>
          )}
          <div className="flex items-center gap-6 mt-3 text-slate-500">
            <button onClick={() => onReply?.(tweet)} className="flex items-center gap-1.5 hover:text-sky-500 transition-colors group">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{tweet.replyCount || 0}</span>
            </button>
            <button onClick={handleRetweet} className={`flex items-center gap-1.5 transition-colors ${isRetweeted ? 'text-green-500' : 'hover:text-green-500'}`}>
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm">{isRetweeted ? (tweet.retweetCount || 0) + 1 : tweet.retweetCount || 0}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500' : ''}`} />
              <span className="text-sm">{isLiked ? (tweet.likeCount || 0) + 1 : tweet.likeCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============ 发推弹窗 ============
function TweetModal({ isOpen, onClose, onSubmit }) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)
    await onSubmit(content)
    setContent('')
    setIsSubmitting(false)
    onClose()
  }
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">取消</button>
          <span className="font-medium text-slate-800">发推</span>
          <button onClick={handleSubmit} disabled={!content.trim() || isSubmitting}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-full text-sm font-medium transition-colors">
            {isSubmitting ? '发送中...' : '发布'}
          </button>
        </div>
        <div className="p-4">
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="有什么新鲜事？"
            className="w-full h-32 resize-none outline-none text-slate-800 placeholder-slate-400" autoFocus />
        </div>
        <div className="px-4 pb-4 text-sm text-slate-400">{content.length} / 280</div>
      </motion.div>
    </div>
  )
}

// ============ Tab 导航 ============
function TabNav({ tabs, activeTab, onChange }) {
  return (
    <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-100 flex gap-1">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============ 互动日志 Tab ============
function SocialLogsTab({ logs }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('today')
  const [expandedLog, setExpandedLog] = useState(null)
  const [viewMode, setViewMode] = useState('card') // 'card' | 'table'

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchQuery || log.content?.toLowerCase().includes(searchQuery.toLowerCase()) || log.username?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'all' || log.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [logs, searchQuery, typeFilter])

  const formatTimestamp = (ts) => {
    const date = new Date(ts * 1000)
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getTypeIcon = (type) => {
    const config = INTERACTION_TYPES[type] || INTERACTION_TYPES.browse
    const Icon = config.icon
    return <Icon className="w-4 h-4" />
  }

  const exportLogs = (format) => {
    const data = format === 'csv'
      ? ['时间,类型,用户,内容,结果', ...filteredLogs.map(l => `${l.timestamp},${l.type},${l.username},${l.content},${l.result}`)].join('\n')
      : JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `social_logs.${format}`
    a.click()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* 筛选栏 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-3 items-center">
          {/* 搜索 */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="搜索内容或用户..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-200" />
          </div>

          {/* 类型筛选 */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 rounded-xl text-sm outline-none cursor-pointer border border-slate-200">
            <option value="all">全部类型</option>
            {Object.entries(INTERACTION_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          {/* 时间范围 */}
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-slate-50 rounded-xl text-sm outline-none cursor-pointer border border-slate-200">
            <option value="today">今日</option>
            <option value="week">本周</option>
            <option value="all">全部</option>
          </select>

          {/* 导出 */}
          <div className="flex gap-2 ml-auto">
            <button onClick={() => exportLogs('csv')}
              className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm hover:bg-emerald-100 flex items-center gap-1">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => exportLogs('json')}
              className="px-3 py-2 bg-violet-50 text-violet-600 rounded-xl text-sm hover:bg-violet-100 flex items-center gap-1">
              <Download className="w-4 h-4" /> JSON
            </button>
          </div>

          {/* 视图切换 */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <motion.button
              onClick={() => setViewMode('card')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
              title="卡片视图"
            >
              <LayoutGrid className="w-4 h-4 text-slate-600" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode('table')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded transition ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
              title="表格视图"
            >
              <Table2 className="w-4 h-4 text-slate-600" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-100 text-sky-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{filteredLogs.length}</p>
              <p className="text-sm text-slate-500">总记录数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{filteredLogs.filter(l => l.result === 'success').length}</p>
              <p className="text-sm text-slate-500">成功操作</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{filteredLogs.filter(l => l.result === 'failed').length}</p>
              <p className="text-sm text-slate-500">失败操作</p>
            </div>
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-x-auto"
            >
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">时间</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">类型</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">用户</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">内容</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>暂无日志记录</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3 text-sm text-slate-600">{formatTimestamp(log.timestamp)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${COLORS[INTERACTION_TYPES[log.type]?.color] || COLORS.slate}`}>
                            {getTypeIcon(log.type)}
                            {INTERACTION_TYPES[log.type]?.label || log.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">@{log.username}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{log.content || '无内容'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.result === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {log.result === 'success' ? '成功' : '失败'}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-slate-100"
            >
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <FileText className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">暂无日志记录</p>
                  <p className="text-sm mt-1">开始浏览 Twitter 看看吧</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                      <div className={`p-2.5 rounded-xl ${COLORS[INTERACTION_TYPES[log.type]?.color] || COLORS.slate}`}>
                        {getTypeIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            log.result === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {log.result === 'success' ? '成功' : '失败'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[INTERACTION_TYPES[log.type]?.color] || COLORS.slate}`}>
                            {INTERACTION_TYPES[log.type]?.label || log.type}
                          </span>
                          <span className="text-sm text-slate-600 font-medium">@{log.username}</span>
                          <span className="text-xs text-slate-400">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700 line-clamp-2">{log.content || '无内容'}</p>
                        {expandedLog === log.id && log.details && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mt-3 p-4 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono"
                          >
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                          </motion.div>
                        )}
                      </div>
                      <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        {expandedLog === log.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============ 情绪影响 Tab ============
function EmotionImpactTab({ impacts }) {
  const [selectedImpact, setSelectedImpact] = useState(null)

  const moodTrendData = impacts.slice(-24).map((impact, i) => ({
    time: i,
    pleasure: impact.pleasureChange || 0,
    arousal: impact.arousalChange || 0,
    dominance: impact.dominanceChange || 0,
    impact: impact.emotionalImpact || 0,
  }))

  const impactTypeStats = useMemo(() => {
    const stats = { positive: 0, negative: 0, neutral: 0, exciting: 0, calming: 0 }
    impacts.forEach(i => { if (stats[i.type] !== undefined) stats[i.type]++ })
    return Object.entries(stats).map(([name, value]) => ({ name, value, label: { positive: '正面', negative: '负面', neutral: '中性', exciting: '兴奋', calming: '平静' }[name] }))
  }, [impacts])

  const PIE_COLORS = ['#10b981', '#ef4444', '#94a3b8', '#f59e0b', '#3b82f6']

  const formatTimestamp = (ts) => new Date(ts * 1000).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const avgImpact = impacts.length > 0 ? (impacts.reduce((a, b) => a + Math.abs(b.emotionalImpact || 0), 0) / impacts.length).toFixed(2) : 0
  const maxPositive = impacts.length > 0 ? Math.max(...impacts.map(i => i.emotionalImpact > 0 ? i.emotionalImpact : 0)).toFixed(2) : 0
  const maxNegative = impacts.length > 0 ? Math.min(...impacts.map(i => i.emotionalImpact < 0 ? i.emotionalImpact : 0)).toFixed(2) : 0
  const neutralRatio = impacts.length > 0 ? ((impacts.filter(i => Math.abs(i.emotionalImpact) < 0.1).length / impacts.length * 100).toFixed(1) + '%') : '0%'

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* 情绪趋势图 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">情绪影响趋势</h3>
          <span className="text-sm text-slate-400">最近 {moodTrendData.length} 条记录</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={moodTrendData}>
              <defs>
                <linearGradient id="colorPleasure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorArousal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorDominance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[-1, 1]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: 16 }} />
              <Area type="monotone" dataKey="pleasure" stroke="#10b981" fill="url(#colorPleasure)" name="愉悦度" strokeWidth={2} />
              <Area type="monotone" dataKey="arousal" stroke="#f59e0b" fill="url(#colorArousal)" name="唤醒度" strokeWidth={2} />
              <Area type="monotone" dataKey="dominance" stroke="#3b82f6" fill="url(#colorDominance)" name="控制度" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 影响类型分布 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">影响类型分布</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={impactTypeStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                  {impactTypeStats.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 强度统计 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-800 mb-4">强度统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">平均影响强度</p>
              <p className="text-2xl font-bold text-slate-800">{avgImpact}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
              <p className="text-xs text-emerald-600 mb-1">最大正面影响</p>
              <p className="text-2xl font-bold text-emerald-600">+{maxPositive}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl">
              <p className="text-xs text-rose-600 mb-1">最大负面影响</p>
              <p className="text-2xl font-bold text-rose-600">{maxNegative}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">中性占比</p>
              <p className="text-2xl font-bold text-slate-800">{neutralRatio}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 影响详情列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">详细记录</h3>
            <span className="text-sm text-slate-400">{impacts.length} 条记录</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {impacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Heart className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">暂无情绪影响记录</p>
            </div>
          ) : (
            impacts.slice().reverse().map(impact => (
              <div key={impact.tweetId} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedImpact(selectedImpact === impact.tweetId ? null : impact.tweetId)}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${impact.emotionalImpact > 0 ? 'bg-emerald-100 text-emerald-600' : impact.emotionalImpact < 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                    {impact.emotionalImpact > 0 ? <TrendingUp className="w-5 h-5" /> : impact.emotionalImpact < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        impact.type === 'positive' ? 'bg-emerald-100 text-emerald-600' :
                        impact.type === 'negative' ? 'bg-rose-100 text-rose-600' :
                        impact.type === 'exciting' ? 'bg-amber-100 text-amber-600' :
                        impact.type === 'calming' ? 'bg-blue-100 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {{ positive: '正面', negative: '负面', neutral: '中性', exciting: '兴奋', calming: '平静' }[impact.type]}
                      </span>
                      <span className="text-xs text-slate-400">{formatTimestamp(impact.timestamp)}</span>
                      <span className="ml-auto text-lg font-bold ${impact.emotionalImpact > 0 ? 'text-emerald-600' : impact.emotionalImpact < 0 ? 'text-rose-600' : 'text-slate-400'}">
                        {impact.emotionalImpact > 0 ? '+' : ''}{impact.emotionalImpact?.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 line-clamp-2">{impact.content}</p>
                    {selectedImpact === impact.tweetId && (
                      <div className="mt-3 p-4 bg-slate-50 rounded-xl">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-xs text-slate-400">愉悦度 P</p>
                            <p className="font-semibold text-emerald-600">{impact.pleasureChange?.toFixed(3)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-400">唤醒度 A</p>
                            <p className="font-semibold text-amber-600">{impact.arousalChange?.toFixed(3)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-400">控制度 D</p>
                            <p className="font-semibold text-blue-600">{impact.dominanceChange?.toFixed(3)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    {selectedImpact === impact.tweetId ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ============ 统计 Tab ============
function StatsTab({ stats }) {
  // 从API获取数据，如果不存在则使用默认值
  const weekData = [
    { day: 'Mon', viewed: stats.weekly_tweets?.[0] || 2, liked: Math.floor((stats.weekly_tweets?.[0] || 2) * 0.3), retweeted: Math.floor((stats.weekly_tweets?.[0] || 2) * 0.1), replied: Math.floor((stats.weekly_tweets?.[0] || 2) * 0.2) },
    { day: 'Tue', viewed: stats.weekly_tweets?.[1] || 3, liked: Math.floor((stats.weekly_tweets?.[1] || 3) * 0.3), retweeted: Math.floor((stats.weekly_tweets?.[1] || 3) * 0.1), replied: Math.floor((stats.weekly_tweets?.[1] || 3) * 0.2) },
    { day: 'Wed', viewed: stats.weekly_tweets?.[2] || 1, liked: Math.floor((stats.weekly_tweets?.[2] || 1) * 0.3), retweeted: Math.floor((stats.weekly_tweets?.[2] || 1) * 0.1), replied: Math.floor((stats.weekly_tweets?.[2] || 1) * 0.2) },
    { day: 'Thu', viewed: stats.weekly_tweets?.[3] || 4, liked: Math.floor((stats.weekly_tweets?.[3] || 4) * 0.3), retweeted: Math.floor((stats.weekly_tweets?.[3] || 4) * 0.1), replied: Math.floor((stats.weekly_tweets?.[3] || 4) * 0.2) },
    { day: 'Fri', viewed: stats.weekly_tweets?.[4] || 2, liked: Math.floor((stats.weekly_tweets?.[4] || 2) * 0.3), retweeted: Math.floor((stats.weekly_tweets?.[4] || 2) * 0.1), replied: Math.floor((stats.weekly_tweets?.[4] || 2) * 0.2) },
    { day: 'Sat', viewed: stats.weekly_tweets?.[5] || 5, liked: Math.floor((stats.weekly_tweets?.[5] || 5) * 0.3), retweeted: Math.floor((stats.weekly_tweets?.[5] || 5) * 0.1), replied: Math.floor((stats.weekly_tweets?.[5] || 5) * 0.2) },
    { day: 'Sun', viewed: stats.weekly_tweets?.[6] || 3, liked: Math.floor((stats.weekly_tweets?.[6] || 3) * 0.3), retweeted: Math.floor((stats.weekly_tweets?.[6] || 3) * 0.1), replied: Math.floor((stats.weekly_tweets?.[6] || 3) * 0.2) },
  ]

  // 使用 API 数据计算互动分布
  const totalInteractions = stats.total?.interacted || 0
  const replyRate = stats.reply_rate || 0.3
  const retweetRate = stats.retweet_rate || 0.2
  const likeRate = 1 - replyRate - retweetRate
  const interactionPieData = [
    { name: '点赞', value: Math.round(totalInteractions * likeRate) || 0, color: '#ec4899' },
    { name: '转发', value: Math.round(totalInteractions * retweetRate) || 0, color: '#22c55e' },
    { name: '回复', value: Math.round(totalInteractions * replyRate) || 0, color: '#0ea5e9' },
  ]

  const topUsers = stats.topUsers || [
    { username: 'tech_news', count: 15 },
    { username: 'daily_ai', count: 12 },
    { username: 'creative_writing', count: 8 },
    { username: 'ai_daily', count: 6 },
    { username: 'design_inspire', count: 4 },
  ]

  const topTopics = stats.topTopics || [
    { topic: 'AI技术', count: 25 },
    { topic: '创意写作', count: 18 },
    { topic: '生活分享', count: 12 },
    { topic: '科技新闻', count: 8 },
    { topic: '读书笔记', count: 5 },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '今日浏览', value: stats.today?.viewed || 0, icon: Eye, color: 'slate', gradient: 'from-slate-50 to-slate-100' },
          { label: '今日互动', value: stats.today?.interacted || 0, icon: Zap, color: 'amber', gradient: 'from-amber-50 to-amber-100' },
          { label: '本周互动', value: stats.week?.interacted || 0, icon: Activity, color: 'teal', gradient: 'from-teal-50 to-teal-100' },
          { label: '总互动', value: stats.total?.interacted || 0, icon: BarChart3, color: 'violet', gradient: 'from-violet-50 to-violet-100' },
        ].map(card => (
          <motion.div key={card.label} variants={itemVariants}
            className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 shadow-sm border border-white`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl bg-white shadow-sm ${COLORS[card.color]}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-500">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 周趋势图 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">本周互动趋势</h3>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span>点赞</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>转发</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span>回复</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="liked" fill="#ec4899" name="点赞" radius={[4, 4, 0, 0]} />
                <Bar dataKey="retweeted" fill="#22c55e" name="转发" radius={[4, 4, 0, 0]} />
                <Bar dataKey="replied" fill="#0ea5e9" name="回复" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 互动分布 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">互动类型分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={interactionPieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} dataKey="value">
                  {interactionPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 最常互动用户 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">最常互动用户</h3>
            <span className="text-xs text-slate-400">Top 5</span>
          </div>
          <div className="space-y-4">
            {topUsers.slice(0, 5).map((user, i) => (
              <div key={user.username} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">@{user.username}</span>
                    <span className="text-sm text-slate-500">{user.count}次</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(user.count / topUsers[0].count) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 热门话题 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">热门话题</h3>
            <span className="text-xs text-slate-400">Top 5</span>
          </div>
          <div className="space-y-4">
            {topTopics.slice(0, 5).map((topic, i) => (
              <div key={topic.topic} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{topic.topic}</span>
                    <span className="text-sm text-slate-500">{topic.count}次</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${(topic.count / topTopics[0].count) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Timeline Tab ============
function TimelineTab({ tweets, isLoading, onRefresh, onTweet, onLike, onRetweet, onReply }) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">时间线</h3>
          <p className="text-sm text-slate-400 mt-0.5">{tweets.length} 条推文</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onRefresh} disabled={isLoading}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 rounded-xl text-sm font-medium border border-slate-200 flex items-center gap-2 disabled:opacity-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button onClick={onTweet}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 rounded-xl text-sm font-medium text-white flex items-center gap-2 shadow-sm hover:shadow">
            <Send className="w-4 h-4" />
            发推
          </button>
        </div>
      </div>

      {isLoading && tweets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mb-3" />
          <p className="text-slate-500">加载中...</p>
        </div>
      ) : tweets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Globe className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-lg font-medium text-slate-600">暂无推文</p>
          <p className="text-sm text-slate-400 mt-1">点击刷新获取最新内容</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tweets.map(tweet => (
            <TweetCard key={tweet.id} tweet={tweet} onLike={onLike} onRetweet={onRetweet} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============ 主组件 ============
export function SocialPage() {
  const [activeTab, setActiveTab] = useState('timeline')
  const [account, setAccount] = useState(null)
  const [stats, setStats] = useState({ viewed: 0, interacted: 0, mood: 'neutral' })
  const [tweets, setTweets] = useState([])
  const [logs, setLogs] = useState([])
  const [impacts, setImpacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLoadingTweets, setIsLoadingTweets] = useState(false)
  const [showTweetModal, setShowTweetModal] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [accountRes, statsRes, tweetsRes, logsRes, impactsRes] = await Promise.all([
        fetch('/api/social/account').then(r => r.json()).catch(() => ({ code: 0, data: null })),
        fetch('/api/social/stats').then(r => r.json()).catch(() => ({ code: 0, data: { viewed: 0, interacted: 0, mood: 'neutral' } })),
        fetch('/api/social/timeline').then(r => r.json()).catch(() => ({ code: 0, data: [] })),
        fetch('/api/social/logs').then(r => r.json()).catch(() => ({ code: 0, data: [] })),
        fetch('/api/social/impacts').then(r => r.json()).catch(() => ({ code: 0, data: [] })),
      ])

      if (accountRes.code === 0) setAccount(accountRes.data)
      if (statsRes.code === 0) setStats(statsRes.data)
      if (tweetsRes.code === 0) setTweets(tweetsRes.data)
      if (logsRes.code === 0) setLogs(logsRes.data)
      if (impactsRes.code === 0) setImpacts(impactsRes.data)
    } catch (e) {
      console.error('Failed to load social data:', e)
    } finally {
      setLoading(false)
    }
  }

  const refreshTimeline = async () => {
    setIsLoadingTweets(true)
    try {
      const res = await fetch('/api/social/timeline/refresh', { method: 'POST' })
      const data = await res.json()
      if (data.code === 0) setTweets(data.data)
    } catch (e) {
      console.error('Failed to refresh timeline:', e)
    } finally {
      setIsLoadingTweets(false)
    }
  }

  const handleTweet = async (content) => {
    try {
      const res = await fetch('/api/social/tweet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.code === 0) await refreshTimeline()
    } catch (e) {
      console.error('Failed to tweet:', e)
    }
  }

  const handleLike = async (tweetId, liked) => {
    try {
      await fetch('/api/social/like', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tweetId, liked }),
      })
    } catch (e) {
      console.error('Failed to like tweet:', e)
    }
  }

  const handleRetweet = async (tweetId, retweeted) => {
    try {
      await fetch('/api/social/retweet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tweetId, retweeted }),
      })
    } catch (e) {
      console.error('Failed to retweet:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20">
        <div className="ml-24 mr-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-100">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">社交</h1>
                <p className="text-xs text-slate-400">Twitter 互动中心</p>
              </div>
            </div>
            <div className="w-[420px]">
              <TabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="ml-24 mr-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'timeline' && (
            <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-6">
                {/* 左侧边栏 */}
                <div className="w-72 space-y-4 flex-shrink-0">
                  <AccountCard account={account} loading={loading} />
                  <StatsOverviewCard stats={stats} />
                  <ActionPanel onRefresh={refreshTimeline} onTweet={() => setShowTweetModal(true)} isLoading={isLoadingTweets} />
                </div>

                {/* 中间内容 */}
                <div className="flex-1">
                  <TimelineTab tweets={tweets} isLoading={isLoadingTweets} onRefresh={refreshTimeline}
                    onTweet={() => setShowTweetModal(true)} onLike={handleLike} onRetweet={handleRetweet}
                    onReply={() => setShowTweetModal(true)} />
                </div>

                {/* 右侧边栏 */}
                <div className="w-72 flex-shrink-0 hidden xl:block">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 sticky top-28 space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-3">
                        <User className="w-8 h-8 text-slate-400" />
                      </div>
                      <h4 className="font-medium text-slate-800">开始探索</h4>
                      <p className="text-sm text-slate-500 mt-1">浏览 Twitter 获取更多内容</p>
                    </div>
                    <a href="/settings" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                      <Settings className="w-4 h-4" />
                      前往设置
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <SocialLogsTab logs={logs} />
            </motion.div>
          )}

          {activeTab === 'emotion' && (
            <motion.div key="emotion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <EmotionImpactTab impacts={impacts} />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <StatsTab stats={stats} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 发推弹窗 */}
      <TweetModal isOpen={showTweetModal} onClose={() => setShowTweetModal(false)} onSubmit={handleTweet} />
    </div>
  )
}

export default SocialPage
