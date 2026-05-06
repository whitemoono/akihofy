/**
 * AKIHO 详细日志页面 - 美化版
 * 展示系统运行日志、行为日志、情绪日志、对话日志等
 * 支持卡片视图和表格视图切换
 */

import { useState, useMemo, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, Filter, Search, Download, RefreshCw,
  ChevronDown, ChevronRight, AlertCircle, Info, AlertTriangle,
  CheckCircle, XCircle, Activity, MessageSquare, Brain, Heart,
  Zap, Database, User, Settings, Trash2, Eye, EyeOff, Terminal,
  Table2, LayoutGrid, ChevronLeft, ChevronRight as ChevRight
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 }
}

// 日志级别定义
const LOG_LEVELS = {
  DEBUG: { id: 'debug', name: '调试', color: 'slate', icon: Terminal },
  INFO: { id: 'info', name: '信息', color: 'blue', icon: Info },
  WARNING: { id: 'warning', name: '警告', color: 'amber', icon: AlertTriangle },
  ERROR: { id: 'error', name: '错误', color: 'rose', icon: XCircle },
  SUCCESS: { id: 'success', name: '成功', color: 'emerald', icon: CheckCircle },
}

// 日志类型定义
const LOG_TYPES = {
  SYSTEM: { id: 'system', name: '系统', icon: Settings, color: 'slate' },
  BEHAVIOR: { id: 'behavior', name: '行为', icon: Zap, color: 'amber' },
  EMOTION: { id: 'emotion', name: '情绪', icon: Heart, color: 'rose' },
  COGNITION: { id: 'cognition', name: '认知', icon: Brain, color: 'violet' },
  MEMORY: { id: 'memory', name: '记忆', icon: Database, color: 'cyan' },
  CONVERSATION: { id: 'conversation', name: '对话', icon: MessageSquare, color: 'teal' },
  RELATIONSHIP: { id: 'relationship', name: '关系', icon: User, color: 'pink' },
  ACTIVITY: { id: 'activity', name: '活动', icon: Activity, color: 'indigo' },
}

export function LogsPage() {
  const [activeTab, setActiveTab] = useState('system')
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('all')
  const [expandedLogs, setExpandedLogs] = useState(new Set())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [viewMode, setViewMode] = useState('card') // 'card' | 'table'
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  // 生成模拟系统日志数据
  const [systemLogs] = useState([
    { id: 'sys001', timestamp: '2024-03-15 10:35:22.156', level: 'info', type: 'system', source: 'EmotionEngine', message: '情绪状态更新: Positive, PAD=(0.42, 0.18, 0.25)', details: { pad: { pleasure: 0.42, arousal: 0.18, dominance: 0.25 }, category: 'Positive' } },
    { id: 'sys002', timestamp: '2024-03-15 10:35:21.892', level: 'info', type: 'behavior', source: 'BehaviorEngine', message: '行为选择: socialize, 优先级=0.72', details: { behavior: 'socialize', priority: 0.72, category: 'Belonging' } },
    { id: 'sys003', timestamp: '2024-03-15 10:35:21.456', level: 'debug', type: 'cognition', source: 'AttentionModel', message: '注意力分配: 焦点=对话处理, 强度=0.85', details: { focus: 'dialog_processing', intensity: 0.85 } },
    { id: 'sys004', timestamp: '2024-03-15 10:35:20.234', level: 'info', type: 'memory', source: 'MemoryRetriever', message: '记忆检索完成: 返回5条相关记忆, 耗时=8.2ms', details: { returned: 5, latency: 8.2 } },
    { id: 'sys005', timestamp: '2024-03-15 10:35:20.102', level: 'warning', type: 'system', source: 'ResourceMonitor', message: '认知池资源偏低: 35%, 建议恢复', details: { pool: 'cognitive', level: 0.35, threshold: 0.3 } },
    { id: 'sys006', timestamp: '2024-03-15 10:35:19.876', level: 'info', type: 'emotion', source: 'EmotionEngine', message: '情绪刺激处理: positive_interaction, 强度=0.7', details: { stimulus: 'positive_interaction', intensity: 0.7 } },
    { id: 'sys007', timestamp: '2024-03-15 10:35:18.543', level: 'info', type: 'conversation', source: 'LLMGenerator', message: '响应生成完成: 长度=86字符, 耗时=1.2s', details: { length: 86, latency: 1200 } },
    { id: 'sys008', timestamp: '2024-03-15 10:35:17.321', level: 'error', type: 'system', source: 'NetworkClient', message: 'API请求超时: DeepSeek, 重试次数=2', details: { provider: 'DeepSeek', retry: 2, timeout: 30000 } },
    { id: 'sys009', timestamp: '2024-03-15 10:35:16.987', level: 'info', type: 'relationship', source: 'TrustModel', message: '信任更新: reliability=+0.05, 当前=0.78', details: { dimension: 'reliability', delta: 0.05, current: 0.78 } },
    { id: 'sys010', timestamp: '2024-03-15 10:35:15.654', level: 'debug', type: 'cognition', source: 'ReasoningEngine', message: '推理执行: 类型=abductive, 置信度=0.72', details: { type: 'abductive', confidence: 0.72 } },
    { id: 'sys011', timestamp: '2024-03-15 10:35:14.432', level: 'info', type: 'activity', source: 'BodySystem', message: '活动执行: deep_conversation, 消耗认知=0.02', details: { activity: 'deep_conversation', cost: { cognitive: 0.02 } } },
    { id: 'sys012', timestamp: '2024-03-15 10:35:13.210', level: 'success', type: 'system', source: 'Scheduler', message: '记忆巩固任务完成: 处理5条记忆', details: { processed: 5, type: 'consolidation' } },
  ])

  // 行为日志
  const [behaviorLogs] = useState([
    { id: 'bh001', timestamp: '2024-03-15 10:35:20', action: 'generate_response', category: 'SelfActualization', priority: 0.75, energy: 0.65, success: true },
    { id: 'bh002', timestamp: '2024-03-15 10:32:15', action: 'socialize', category: 'Belonging', priority: 0.72, energy: 0.68, success: true },
    { id: 'bh003', timestamp: '2024-03-15 10:28:45', action: 'express_emotion', category: 'Belonging', priority: 0.68, energy: 0.70, success: true },
    { id: 'bh004', timestamp: '2024-03-15 10:25:30', action: 'rest', category: 'Physiological', priority: 0.45, energy: 0.55, success: true },
    { id: 'bh005', timestamp: '2024-03-15 10:15:00', action: 'seek_attention', category: 'Esteem', priority: 0.62, energy: 0.72, success: true },
    { id: 'bh006', timestamp: '2024-03-15 10:05:20', action: 'learn', category: 'SelfActualization', priority: 0.58, energy: 0.75, success: true },
  ])

  // 情绪日志
  const [emotionLogs] = useState([
    { id: 'em001', timestamp: '2024-03-15 10:35:22', state: 'Positive', pad: { pleasure: 0.42, arousal: 0.18, dominance: 0.25 }, trigger: 'positive_interaction' },
    { id: 'em002', timestamp: '2024-03-15 10:30:15', state: 'Mixed', pad: { pleasure: 0.15, arousal: 0.35, dominance: 0.10 }, trigger: 'neutral_message' },
    { id: 'em003', timestamp: '2024-03-15 10:25:08', state: 'Positive', pad: { pleasure: 0.55, arousal: 0.25, dominance: 0.30 }, trigger: 'goal_achieved' },
    { id: 'em004', timestamp: '2024-03-15 10:18:42', state: 'Neutral', pad: { pleasure: 0.05, arousal: 0.10, dominance: 0.15 }, trigger: 'casual_chat' },
    { id: 'em005', timestamp: '2024-03-15 10:10:20', state: 'Negative', pad: { pleasure: -0.25, arousal: 0.40, dominance: -0.10 }, trigger: 'attention_low' },
  ])

  // 对话日志
  const [conversationLogs] = useState([
    { id: 'cv001', timestamp: '2024-03-15 10:35:22', role: 'assistant', content: '谢谢你分享这些，我理解你的感受。工作确实有时候会让人喘不过气来。', tokens: 42, latency: 1200 },
    { id: 'cv002', timestamp: '2024-03-15 10:35:15', role: 'user', content: '最近工作压力好大，感觉有点喘不过气来', tokens: 18 },
    { id: 'cv003', timestamp: '2024-03-15 10:30:45', role: 'assistant', content: '那部《星际穿越》确实很震撼，你觉得结局意味深长吗？', tokens: 38, latency: 980 },
    { id: 'cv004', timestamp: '2024-03-15 10:30:30', role: 'user', content: '我刚看完《星际穿越》，太震撼了', tokens: 14 },
    { id: 'cv005', timestamp: '2024-03-15 10:25:20', role: 'assistant', content: '早安！今天天气真好，感觉心情也跟着明朗起来了呢', tokens: 35, latency: 850 },
    { id: 'cv006', timestamp: '2024-03-15 10:25:05', role: 'user', content: '早上好', tokens: 3 },
  ])

  // 统计数据
  const stats = useMemo(() => ({
    totalLogs: systemLogs.length + behaviorLogs.length + emotionLogs.length + conversationLogs.length,
    errorCount: systemLogs.filter(l => l.level === 'error').length,
    warningCount: systemLogs.filter(l => l.level === 'warning').length,
    avgLatency: 1250,
    uptime: '2h 35m',
  }), [systemLogs, behaviorLogs, emotionLogs, conversationLogs])

  // 获取当前日志类型
  const getCurrentLogs = () => {
    switch (activeTab) {
      case 'system': return systemLogs
      case 'behavior': return behaviorLogs
      case 'emotion': return emotionLogs
      case 'conversation': return conversationLogs
      default: return systemLogs
    }
  }

  // 过滤日志
  const filteredLogs = useMemo(() => {
    let logs = getCurrentLogs()

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      logs = logs.filter(l =>
        l.message?.toLowerCase().includes(query) ||
        l.content?.toLowerCase().includes(query) ||
        l.source?.toLowerCase().includes(query) ||
        l.action?.toLowerCase().includes(query) ||
        l.state?.toLowerCase().includes(query)
      )
    }

    if (levelFilter !== 'all') {
      logs = logs.filter(l => l.level === levelFilter || l.state?.toLowerCase() === levelFilter)
    }

    return logs
  }, [activeTab, searchQuery, levelFilter, systemLogs, behaviorLogs, emotionLogs, conversationLogs])

  // 分页
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredLogs.slice(startIndex, startIndex + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  const totalPages = Math.ceil(filteredLogs.length / pageSize)

  // 切换日志展开状态
  const toggleLog = (id) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedLogs(newExpanded)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-zinc-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-zinc-700 flex items-center justify-center shadow-lg shadow-slate-200">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">系统日志</h1>
                <p className="text-xs text-slate-500">实时运行状态 / 行为追踪 / 情绪记录 / 对话历史</p>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="flex items-center gap-6 text-sm">
              <motion.div whileHover={{ scale: 1.05 }} className="text-center p-2 bg-slate-50 rounded-xl">
                <div className="text-lg font-bold text-slate-700">{stats.totalLogs}</div>
                <div className="text-[10px] text-slate-500">总日志</div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="text-center p-2 bg-rose-50 rounded-xl">
                <div className="text-lg font-bold text-rose-600">{stats.errorCount}</div>
                <div className="text-[10px] text-slate-500">错误</div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="text-center p-2 bg-amber-50 rounded-xl">
                <div className="text-lg font-bold text-amber-600">{stats.warningCount}</div>
                <div className="text-[10px] text-slate-500">警告</div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="text-center p-2 bg-emerald-50 rounded-xl">
                <div className="text-lg font-bold text-emerald-600">{stats.uptime}</div>
                <div className="text-[10px] text-slate-500">运行时长</div>
              </motion.div>
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
          {/* 日志统计概览 */}
          <motion.div variants={itemVariants}>
            <LogStatsOverview stats={stats} logs={systemLogs} />
          </motion.div>

          {/* 日志类型标签页 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg overflow-hidden">
              {/* 标签导航 */}
              <div className="flex border-b border-white/50 overflow-x-auto">
                {Object.values(LOG_TYPES).slice(0, 4).map(type => (
                  <motion.button
                    key={type.id}
                    onClick={() => { setActiveTab(type.id); setCurrentPage(1) }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all min-w-[100px] ${
                      activeTab === type.id
                        ? 'bg-slate-100 text-slate-800 border-b-2 border-slate-600'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.name}
                  </motion.button>
                ))}
              </div>

              {/* 工具栏 */}
              <div className="p-4 border-b border-white/50 flex items-center gap-3 flex-wrap">
                {/* 搜索 */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索日志内容..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                    >
                      <XCircle className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* 级别过滤 */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={levelFilter}
                    onChange={(e) => { setLevelFilter(e.target.value); setCurrentPage(1) }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
                  >
                    <option value="all">全部级别</option>
                    <option value="debug">调试</option>
                    <option value="info">信息</option>
                    <option value="warning">警告</option>
                    <option value="error">错误</option>
                    <option value="success">成功</option>
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

                {/* 自动刷新 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    autoRefresh
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  自动刷新
                </motion.button>

                {/* 导出 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </motion.button>
              </div>

              {/* 日志列表/表格 */}
              <AnimatePresence mode="wait">
                {viewMode === 'table' ? (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-x-auto"
                  >
                    <LogTable
                      logs={paginatedLogs}
                      type={activeTab}
                      expandedLogs={expandedLogs}
                      onToggle={toggleLog}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-h-[600px] overflow-y-auto"
                  >
                    {filteredLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>没有找到匹配的日志</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {paginatedLogs.map(log => (
                          <LogItem
                            key={log.id}
                            log={log}
                            type={activeTab}
                            expanded={expandedLogs.has(log.id)}
                            onToggle={() => toggleLog(log.id)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 分页器 */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-white/50 bg-slate-50/30 flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredLogs.length)} 条，共 {filteredLogs.length} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page = i + 1
                      if (totalPages > 5) {
                        if (currentPage > 3) page = currentPage - 2 + i
                        if (currentPage > totalPages - 2) page = totalPages - 4 + i
                      }
                      return (
                        <motion.button
                          key={page}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                            currentPage === page
                              ? 'bg-violet-500 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </motion.button>
                      )
                    })}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

// 日志表格组件
function LogTable({ logs, type, expandedLogs, onToggle }) {
  // 系统日志列
  const systemColumns = [
    { key: 'timestamp', label: '时间', width: '180px' },
    { key: 'level', label: '级别', width: '80px', render: (val) => <LevelBadge level={val} /> },
    { key: 'source', label: '来源', width: '120px' },
    { key: 'message', label: '消息', render: (val) => <span className="truncate max-w-xs">{val}</span> },
    { key: 'actions', label: '操作', width: '60px', render: (_, log) => (
      <button onClick={() => onToggle(log.id)} className="p-1 hover:bg-slate-100 rounded">
        {expandedLogs.has(log.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    )},
  ]

  // 行为日志列
  const behaviorColumns = [
    { key: 'timestamp', label: '时间', width: '160px' },
    { key: 'action', label: '行为', width: '150px', render: (val) => <span className="font-medium text-amber-700">{val}</span> },
    { key: 'category', label: '类别', width: '120px' },
    { key: 'priority', label: '优先级', width: '100px', render: (val) => <PriorityBar value={val} /> },
    { key: 'energy', label: '能量消耗', width: '100px', render: (val) => <EnergyBar value={val} /> },
    { key: 'success', label: '状态', width: '80px', render: (val) => val ? <SuccessBadge /> : <FailedBadge /> },
  ]

  // 情绪日志列
  const emotionColumns = [
    { key: 'timestamp', label: '时间', width: '160px' },
    { key: 'state', label: '情绪状态', width: '100px', render: (val) => <EmotionStateBadge state={val} /> },
    { key: 'pleasure', label: '愉悦度', width: '100px', render: (val) => <PADValue value={val} color="rose" /> },
    { key: 'arousal', label: '唤醒度', width: '100px', render: (val) => <PADValue value={val} color="orange" /> },
    { key: 'dominance', label: '支配度', width: '100px', render: (val) => <PADValue value={val} color="blue" /> },
    { key: 'trigger', label: '触发源', render: (val) => <span className="text-slate-600">{val}</span> },
  ]

  // 对话日志列
  const conversationColumns = [
    { key: 'timestamp', label: '时间', width: '160px' },
    { key: 'role', label: '角色', width: '80px', render: (val) => <RoleBadge role={val} /> },
    { key: 'content', label: '内容', render: (val) => <span className="truncate max-w-md">{val}</span> },
    { key: 'tokens', label: 'Tokens', width: '80px' },
    { key: 'latency', label: '延迟', width: '80px', render: (val) => val ? `${val}ms` : '-' },
  ]

  const columns = type === 'system' ? systemColumns :
                  type === 'behavior' ? behaviorColumns :
                  type === 'emotion' ? emotionColumns :
                  conversationColumns

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>没有找到匹配的日志</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead className="bg-slate-50">
        <tr>
          {columns.map(col => (
            <th
              key={col.key}
              className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left"
              style={{ width: col.width }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {logs.map((log, index) => (
          <Fragment key={log.id}>
            <motion.tr
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="hover:bg-slate-50/50 transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                  {col.render ? col.render(log[col.key], log) : log[col.key]}
                </td>
              ))}
            </motion.tr>
            {expandedLogs.has(log.id) && log.details && (
              <tr className="bg-slate-50/30">
                <td colSpan={columns.length} className="px-4 py-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs font-medium text-slate-500 mb-2">详细信息</div>
                    <pre className="text-xs text-slate-600 font-mono overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}

// 日志统计概览
function LogStatsOverview({ stats, logs }) {
  const errorDistribution = useMemo(() => [
    { hour: '06:00', errors: 0, warnings: 2 },
    { hour: '08:00', errors: 1, warnings: 3 },
    { hour: '10:00', errors: 2, warnings: 4 },
    { hour: '12:00', errors: 0, warnings: 2 },
    { hour: '14:00', errors: 1, warnings: 3 },
    { hour: '16:00', errors: 0, warnings: 1 },
    { hour: '18:00', errors: 0, warnings: 2 },
    { hour: '20:00', errors: 1, warnings: 1 },
  ], [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-500" />
          日志统计
        </h3>
      </div>
      <div className="h-48 min-h-[192px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={errorDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Line type="monotone" dataKey="errors" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e' }} name="错误" />
            <Line type="monotone" dataKey="warnings" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="警告" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
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
