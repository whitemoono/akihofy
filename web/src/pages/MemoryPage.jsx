/**
 * AKIHO 记忆管理系统页面
 * 展示情景记忆、语义记忆、记忆检索和遗忘机制
 */

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Database, Brain, Search, Clock, Trash2, Star, Filter,
  ChevronDown, ChevronRight, Eye, Sparkles, Layers, Network,
  Zap, Calendar, Tag, Hash, ArrowUpRight, ArrowDownRight, Minus,
  ArrowRight, TrendingDown, BarChart3, Table2, LayoutGrid
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, AreaChart, Area
} from 'recharts'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
}

// 记忆类型定义
const MEMORY_TYPES = {
  EPISODIC: { id: 'episodic', name: '情景记忆', color: 'violet', icon: Clock },
  SEMANTIC: { id: 'semantic', name: '语义记忆', color: 'teal', icon: Brain },
  WORKING: { id: 'working', name: '工作记忆', color: 'amber', icon: Zap },
  PROCEDURAL: { id: 'procedural', name: '程序记忆', color: 'rose', icon: Layers },
}

// 记忆强度等级
const STRENGTH_LEVELS = [
  { min: 0.8, label: '深刻', color: 'emerald' },
  { min: 0.5, label: '清晰', color: 'teal' },
  { min: 0.3, label: '模糊', color: 'amber' },
  { min: 0, label: '遗忘', color: 'slate' },
]

export function MemoryPage() {
  const [activeTab, setActiveTab] = useState('episodic')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStrength, setFilterStrength] = useState('all')
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [viewMode, setViewMode] = useState('card') // 'card' | 'table'
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(8)

  // 记忆数据
  const [memories, setMemories] = useState({
    episodic: [],
    semantic: [],
    working: [],
  })

  // 记忆统计
  const [stats, setStats] = useState({
    totalMemories: 0,
    episodicCount: 0,
    semanticCount: 0,
    workingCount: 0,
    avgStrength: 0,
    consolidationQueue: 0,
    forgetQueue: 0,
    memoryUsage: 0,
    retrievalLatency: 0,
    lastConsolidation: '',
    nextScheduled: '',
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMemories() {
      try {
        const resp = await fetch('/api/memories')
        const json = await resp.json()
        if (json.code === 0 && json.data) {
          setMemories(json.data.memories || memories)
          setStats(json.data.stats || stats)
        }
      } catch (e) {
        console.warn('Failed to load memories:', e)
      } finally {
        setLoading(false)
      }
    }
    loadMemories()

    // Refresh every 30s
    const interval = setInterval(loadMemories, 30000)
    return () => clearInterval(interval)
  }, [])

  // 记忆强度分布数据
  const strengthDistribution = useMemo(() => [
    { range: '0-0.2', count: 2, fill: '#94a3b8' },
    { range: '0.2-0.4', count: 5, fill: '#fbbf24' },
    { range: '0.4-0.6', count: 8, fill: '#38bdf8' },
    { range: '0.6-0.8', count: 15, fill: '#34d399' },
    { range: '0.8-1.0', count: 17, fill: '#10b981' },
  ], [])

  // 记忆衰减曲线
  const decayCurve = useMemo(() => [
    { day: 0, strength: 1.0 },
    { day: 1, strength: 0.92 },
    { day: 2, strength: 0.85 },
    { day: 3, strength: 0.78 },
    { day: 4, strength: 0.72 },
    { day: 5, strength: 0.67 },
    { day: 6, strength: 0.62 },
    { day: 7, strength: 0.58 },
  ], [])

  // 检索性能数据
  const retrievalPerformance = useMemo(() => [
    { type: '向量检索', latency: 8.2, fill: '#8b5cf6' },
    { type: '关键词匹配', latency: 3.5, fill: '#06b6d4' },
    { type: '元数据过滤', latency: 1.2, fill: '#f59e0b' },
    { type: '混合检索', latency: 12.5, fill: '#ec4899' },
  ], [])

  // 获取记忆强度标签
  const getStrengthLabel = (strength) => {
    const level = STRENGTH_LEVELS.find(l => strength >= l.min)
    return level?.label || '遗忘'
  }

  // 过滤记忆
  const filteredMemories = useMemo(() => {
    let result = memories[activeTab] || []

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(m => {
        const content = m.content?.toLowerCase() || m.concept?.toLowerCase() || ''
        const tags = m.tags?.join(' ').toLowerCase() || ''
        return content.includes(query) || tags.includes(query)
      })
    }

    if (filterStrength !== 'all') {
      const [min, max] = filterStrength.split('-').map(Number)
      result = result.filter(m => (m.strength || m.confidence) >= min && (m.strength || m.confidence) < max)
    }

    return result
  }, [memories, activeTab, searchQuery, filterStrength])

  // 分页
  const paginatedMemories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredMemories.slice(startIndex, startIndex + pageSize)
  }, [filteredMemories, currentPage, pageSize])

  const totalPages = Math.ceil(filteredMemories.length / pageSize)

  // 重置页码
  useMemo(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, filterStrength])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">记忆管理</h1>
                <p className="text-xs text-slate-500">情景记忆 / 语义记忆 / 工作记忆 / 遗忘机制</p>
              </div>
            </div>

            {/* 记忆统计 */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-600">{stats.totalMemories}</div>
                <div className="text-[10px] text-slate-500">总记忆</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">{stats.avgStrength.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500">平均强度</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">{stats.memoryUsage * 100}%</div>
                <div className="text-[10px] text-slate-500">内存占用</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* 记忆系统概览 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <MemorySystemOverview stats={stats} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <RetrievalPerformance retrievalPerformance={retrievalPerformance} />
            </motion.div>
          </div>

          {/* 记忆类型标签页 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg overflow-hidden">
              {/* 标签导航 */}
              <div className="flex border-b border-white/50">
                {Object.values(MEMORY_TYPES).map(type => (
                  <button
                    key={type.id}
                    onClick={() => setActiveTab(type.id)}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                      activeTab === type.id
                        ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.name}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      activeTab === type.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {memories[type.id]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* 搜索和过滤 */}
              <div className="p-4 border-b border-white/50 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索记忆内容..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filterStrength}
                    onChange={(e) => { setFilterStrength(e.target.value); setCurrentPage(1) }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 cursor-pointer"
                  >
                    <option value="all">全部强度</option>
                    <option value="0.8-1">深刻 (0.8-1.0)</option>
                    <option value="0.5-0.8">清晰 (0.5-0.8)</option>
                    <option value="0.3-0.5">模糊 (0.3-0.5)</option>
                    <option value="0-0.3">遗忘边缘</option>
                  </select>
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

              {/* 记忆列表 */}
              <div className="max-h-[500px] overflow-y-auto">
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>没有找到匹配的记忆</p>
                  </div>
                ) : viewMode === 'table' ? (
                  <MemoryTable memories={paginatedMemories} type={activeTab} onRowClick={setSelectedMemory} />
                ) : (
                  <div className="space-y-3 p-4">
                    {paginatedMemories.map(memory => (
                      <MemoryItem
                        key={memory.id}
                        memory={memory}
                        type={activeTab}
                        onClick={() => setSelectedMemory(memory)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 分页器 */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-white/50 bg-slate-50/30 flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredMemories.length)} 条，共 {filteredMemories.length} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </motion.button>
                    <span className="text-sm text-slate-600">
                      {currentPage} / {totalPages}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 记忆分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <MemoryStrengthChart distribution={strengthDistribution} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MemoryDecayCurve curve={decayCurve} />
            </motion.div>
          </div>

          {/* 巩固与遗忘队列 */}
          <motion.div variants={itemVariants}>
            <ConsolidationQueue />
          </motion.div>

          {/* 记忆详情弹窗 */}
          {selectedMemory && (
            <MemoryDetailModal
              memory={selectedMemory}
              type={activeTab}
              onClose={() => setSelectedMemory(null)}
            />
          )}
        </motion.div>
      </main>
    </div>
  )
}

// 记忆系统概览
function MemorySystemOverview({ stats }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-500" />
        记忆系统状态
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-violet-50/50 rounded-xl border border-violet-100">
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">情景记忆</span>
          </div>
          <div className="text-2xl font-bold text-violet-700">{stats.episodicCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">段记忆</div>
        </div>
        <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100">
          <div className="flex items-center gap-2 text-teal-600 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">语义记忆</span>
          </div>
          <div className="text-2xl font-bold text-teal-700">{stats.semanticCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">条概念</div>
        </div>
        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-medium">工作记忆</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.workingCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">项当前</div>
        </div>
        <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium">程序记忆</span>
          </div>
          <div className="text-2xl font-bold text-rose-700">8</div>
          <div className="text-[10px] text-slate-500 mt-1">条技能</div>
        </div>
      </div>

      {/* 记忆生命周期 */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-slate-600 mb-3">记忆生命周期</h4>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-center">
            <div className="text-xs text-slate-500">编码</div>
            <div className="text-sm font-medium text-slate-700">工作记忆</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex-1 px-3 py-2 bg-violet-100 rounded-lg text-center">
            <div className="text-xs text-violet-500">短期</div>
            <div className="text-sm font-medium text-violet-700">情景记忆</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex-1 px-3 py-2 bg-teal-100 rounded-lg text-center">
            <div className="text-xs text-teal-500">长期</div>
            <div className="text-sm font-medium text-teal-700">语义记忆</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex-1 px-3 py-2 bg-slate-200 rounded-lg text-center opacity-60">
            <div className="text-xs text-slate-400">遗忘</div>
            <div className="text-sm font-medium text-slate-500">删除</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 检索性能
function RetrievalPerformance({ retrievalPerformance }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-6 h-full">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Network className="w-5 h-5 text-cyan-500" />
        检索性能 (ms)
      </h3>
      <div className="h-48 min-h-[192px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={retrievalPerformance} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={80} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="latency" radius={[0, 4, 4, 0]}>
              {retrievalPerformance.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-slate-500 text-center">
        平均检索延迟: <span className="font-semibold text-cyan-600">12.5ms</span>
      </div>
    </div>
  )
}

// 记忆项
function MemoryItem({ memory, type, onClick }) {
  const getStrengthColor = (strength) => {
    if (strength >= 0.8) return 'bg-emerald-500'
    if (strength >= 0.5) return 'bg-teal-500'
    if (strength >= 0.3) return 'bg-amber-500'
    return 'bg-slate-400'
  }

  if (type === 'semantic') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 cursor-pointer hover:border-teal-200 hover:bg-teal-50/30 transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                概念
              </span>
              <span className="text-sm font-medium text-slate-800">{memory.concept}</span>
            </div>
            <div className="text-xs text-slate-500">
              来源: {memory.sources?.join(', ')} | 更新: {memory.lastUpdated}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-teal-600">{Math.round(memory.confidence * 100)}%</div>
            <div className="text-[10px] text-slate-400">置信度</div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (type === 'working') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 cursor-pointer hover:border-amber-200 hover:bg-amber-50/30 transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm text-slate-800 mb-2">{memory.content}</div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span>创建: {memory.created}</span>
              <span>访问: {memory.accessCount}次</span>
              <span>最近: {memory.lastAccess}</span>
            </div>
          </div>
          <Eye className="w-4 h-4 text-amber-400" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-sm text-slate-800 line-clamp-2">{memory.content}</div>
          <div className="flex items-center gap-2 mt-2">
            {memory.tags?.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">
                {tag}
              </span>
            ))}
            {memory.emotional && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>
                情感记忆
              </span>
            )}
          </div>
        </div>
        <div className="text-right ml-4">
          <div className={`w-2 h-8 rounded-full ${getStrengthColor(memory.strength)}`} />
          <div className="text-[10px] text-slate-500 mt-1">{(memory.strength * 100).toFixed(0)}%</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{memory.timestamp}</span>
        <span>重要性: {(memory.importance * 100).toFixed(0)}%</span>
      </div>
    </motion.div>
  )
}

// 记忆强度分布图
function MemoryStrengthChart({ distribution }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-emerald-500" />
        记忆强度分布
      </h3>
      <div className="h-48 min-h-[192px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution}>
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {distribution.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 记忆衰减曲线
function MemoryDecayCurve({ curve }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-rose-500" />
        记忆衰减曲线
      </h3>
      <div className="h-48 min-h-[192px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curve}>
            <defs>
              <linearGradient id="decayGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: '天数', position: 'bottom', fontSize: 10 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} label={{ value: '强度', angle: -90, position: 'insideLeft', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Area
              type="monotone"
              dataKey="strength"
              stroke="#f43f5e"
              fill="url(#decayGradient)"
              name="记忆强度"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-slate-500 text-center">
        半衰期: 约 <span className="font-semibold text-rose-600">7天</span> | 遗忘阈值: <span className="font-semibold text-slate-600">10%</span>
      </div>
    </div>
  )
}

// 巩固与遗忘队列
function ConsolidationQueue() {
  const [consolidationQueue] = useState([
    { id: 'c1', content: '用户喜欢日式风格...', type: 'episodic', priority: 'high', scheduledFor: '2024-03-16 03:00' },
    { id: 'c2', content: '讨论了工作压力的对话...', type: 'episodic', priority: 'high', scheduledFor: '2024-03-16 03:00' },
    { id: 'c3', content: '分享镜野故事的对话...', type: 'semantic', priority: 'medium', scheduledFor: '2024-03-16 03:30' },
    { id: 'c4', content: '分析电影剧情的对话...', type: 'episodic', priority: 'low', scheduledFor: '2024-03-16 04:00' },
  ])

  const [forgetQueue] = useState([
    { id: 'f1', content: '某个冷知识的细节...', strength: 0.12, reason: '低于遗忘阈值' },
    { id: 'f2', content: '很久以前的问候...', strength: 0.08, reason: '长期未访问' },
  ])

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-indigo-500" />
        记忆维护队列
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 巩固队列 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              巩固队列 ({consolidationQueue.length})
            </h4>
            <span className="text-xs text-slate-400">下次执行: 03:00</span>
          </div>
          <div className="space-y-2">
            {consolidationQueue.map(item => (
              <div key={item.id} className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    item.priority === 'high' ? 'bg-rose-100 text-rose-600' :
                    item.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.scheduledFor}</span>
                </div>
                <div className="text-xs text-slate-600 truncate">{item.content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 遗忘队列 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4" />
              遗忘队列 ({forgetQueue.length})
            </h4>
            <span className="text-xs text-slate-400">待删除</span>
          </div>
          <div className="space-y-2">
            {forgetQueue.map(item => (
              <div key={item.id} className="p-3 bg-slate-50/50 rounded-lg border border-slate-200 opacity-70">
                <div className="flex items-center justify-between mb-1">
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px]">
                    强度 {(item.strength * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-amber-500">{item.reason}</span>
                </div>
                <div className="text-xs text-slate-500 truncate">{item.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 记忆表格组件
function MemoryTable({ memories, type, onRowClick }) {
  // 情景记忆列
  const episodicColumns = [
    { key: 'timestamp', label: '时间', width: '160px' },
    { key: 'content', label: '记忆内容', render: (val) => <span className="truncate max-w-md">{val}</span> },
    { key: 'strength', label: '强度', width: '100px', render: (val) => <StrengthBar value={val} /> },
    { key: 'importance', label: '重要性', width: '100px', render: (val) => <ImportanceBar value={val} /> },
    { key: 'emotional', label: '情感', width: '80px', render: (val) => val ? <EmotionBadge /> : <span className="text-slate-400">-</span> },
  ]

  // 语义记忆列
  const semanticColumns = [
    { key: 'concept', label: '概念', render: (val) => <span className="font-medium text-teal-700">{val}</span> },
    { key: 'confidence', label: '置信度', width: '100px', render: (val) => <ConfidenceBar value={val} /> },
    { key: 'lastUpdated', label: '更新时间', width: '120px' },
    { key: 'sources', label: '来源', width: '100px', render: (val) => <span className="text-slate-500 text-xs">{val?.length || 0}条</span> },
  ]

  // 工作记忆列
  const workingColumns = [
    { key: 'created', label: '创建时间', width: '160px' },
    { key: 'content', label: '内容', render: (val) => <span className="truncate max-w-md">{val}</span> },
    { key: 'accessCount', label: '访问次数', width: '100px', render: (val) => <span className="text-amber-600 font-medium">{val}</span> },
    { key: 'lastAccess', label: '最近访问', width: '160px' },
  ]

  const columns = type === 'episodic' ? episodicColumns :
                  type === 'semantic' ? semanticColumns : workingColumns

  return (
    <table className="w-full">
      <thead className="bg-slate-50">
        <tr>
          {columns.map(col => (
            <th key={col.key} className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left" style={{ width: col.width }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {memories.map((memory, index) => (
          <motion.tr
            key={memory.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onRowClick(memory)}
            className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
          >
            {columns.map(col => (
              <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                {col.render ? col.render(memory[col.key], memory) : memory[col.key]}
              </td>
            ))}
          </motion.tr>
        ))}
      </tbody>
    </table>
  )
}

// 强度进度条
function StrengthBar({ value }) {
  const color = value >= 0.8 ? 'bg-emerald-500' : value >= 0.5 ? 'bg-teal-500' : value >= 0.3 ? 'bg-amber-500' : 'bg-slate-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
      <span className="text-xs text-slate-500 w-10">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

// 重要性进度条
function ImportanceBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          className="h-full bg-amber-500 rounded-full"
        />
      </div>
      <span className="text-xs text-slate-500 w-10">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

// 置信度进度条
function ConfidenceBar({ value }) {
  const color = value >= 0.8 ? 'bg-teal-500' : value >= 0.6 ? 'bg-cyan-500' : 'bg-amber-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
      <span className="text-xs text-teal-600 font-medium w-10">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

// 情感徽章
function EmotionBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-600">
      <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>
      情感
    </span>
  )
}

// 记忆详情弹窗
function MemoryDetailModal({ memory, type, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">记忆详情</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <Minus className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {memory.content && (
            <div>
              <div className="text-xs text-slate-500 mb-1">记忆内容</div>
              <div className="text-sm text-slate-700">{memory.content}</div>
            </div>
          )}
          {memory.concept && (
            <div>
              <div className="text-xs text-slate-500 mb-1">概念</div>
              <div className="text-sm text-slate-700">{memory.concept}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">记忆强度</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(memory.strength || memory.confidence) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-indigo-600">
                  {((memory.strength || memory.confidence) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            {memory.importance && (
              <div>
                <div className="text-xs text-slate-500 mb-1">重要性</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${memory.importance * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-amber-600">
                    {(memory.importance * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          {memory.timestamp && (
            <div>
              <div className="text-xs text-slate-500 mb-1">创建时间</div>
              <div className="text-sm text-slate-700">{memory.timestamp}</div>
            </div>
          )}
          {memory.tags && (
            <div>
              <div className="text-xs text-slate-500 mb-1">标签</div>
              <div className="flex flex-wrap gap-1">
                {memory.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {memory.emotional && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg">
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-rose-700">情感标记记忆</span>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default MemoryPage
