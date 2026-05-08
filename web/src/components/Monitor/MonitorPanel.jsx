/**
 * AKIHO 监控面板 - 专业级状态监控界面
 * 
 * 展示内容：
 * - 情绪系统 (PAD模型、情绪历史)
 * - 关系系统 (亲密度、信任度、互动统计)
 * - 生理系统 (能量、疲劳、活力状态)
 * - 生成器状态
 * - 统计概览
 * - 实时活动
 * - 情绪历史图表
 * - 对话历史
 * - 行为日志
 * - 快速测试
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  Heart, 
  Clock, 
  Radio,
  RefreshCw,
  Settings,
  X,
  Zap,
  Users,
  Moon,
  MessageSquare,
  BarChart3,
  List,
  Sparkles,
  Wifi,
  WifiOff,
  ChevronDown,
} from 'lucide-react'

// 组件导入
import { EmotionCard } from './EmotionCard'
import { RelationshipCard } from './RelationshipCard'
import { PhysiologyCard } from './PhysiologyCard'
import { GeneratorCard } from './GeneratorCard'
import { StatsCard } from './StatsCard'
import { ActivityCard } from './ActivityCard'
import { EmotionHistoryChart } from './EmotionHistoryChart'
import { ConversationLog } from './ConversationLog'
import { BehaviorLogTable } from './BehaviorLogTable'
import { QuickTest } from './QuickTest'
// 拟人化组件
import { IntentCard } from './IntentCard'
import { DesireCard } from './DesireCard'
import { CognitiveBiasCard } from './CognitiveBiasCard'
import { NarrativeCard } from './NarrativeCard'

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

// 连接状态指示器
function ConnectionStatus({ connected }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50">
      {connected ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="relative"
          >
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </motion.div>
          <span className="text-sm text-slate-600">实时连接</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm text-slate-600">未连接</span>
        </>
      )}
    </div>
  )
}

// 刷新按钮
function RefreshButton({ onClick, loading }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition text-slate-600 disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      <span className="text-sm">刷新</span>
    </motion.button>
  )
}

// 设置按钮
function SettingsButton({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition text-slate-600"
    >
      <Settings className="w-4 h-4" />
      <span className="text-sm">设置</span>
    </motion.button>
  )
}

// 折叠面板
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-glass-panel overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/30 transition"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-500" />
          <span className="font-semibold text-slate-800">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>
      
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

// 主监控面板
export function MonitorPanel({ onClose, onOpenSettings }) {
  const [state, setState] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  // 拟人化状态
  const [intent, setIntent] = useState(null)
  const [desires, setDesires] = useState(null)
  const [cognitiveBias, setCognitiveBias] = useState(null)
  const [narrative, setNarrative] = useState(null)

  // WebSocket 连接
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`
    
    let ws
    let reconnectTimeout
    let heartbeatInterval

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          setWsConnected(true)
          // 启动心跳检测
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }))
            }
          }, 30000)
        }

        ws.onclose = () => {
          setWsConnected(false)
          clearInterval(heartbeatInterval)
          // 尝试重新连接
          reconnectTimeout = setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          setWsConnected(false)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'state' || data.type === 'state_update') {
              // 处理双层嵌套：{type, data: {code, data: {...}}}
              let stateData = data.data
              if (stateData?.data) {
                stateData = stateData.data  // 解包双层嵌套
              }
              setState(stateData)
              setLastUpdate(new Date())
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e)
          }
        }
      } catch (err) {
        console.error('WebSocket connection failed:', err)
        reconnectTimeout = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimeout)
      clearInterval(heartbeatInterval)
      if (ws) {
        ws.close()
      }
    }
  }, [])

  // 加载拟人化状态数据
  useEffect(() => {
    const fetchAnthropomorphic = async () => {
      try {
        const [intentRes, desiresRes, biasRes, narrativeRes] = await Promise.all([
          fetch('/api/intent').then(r => r.json()),
          fetch('/api/desires').then(r => r.json()),
          fetch('/api/cognitive-bias').then(r => r.json()),
          fetch('/api/narrative').then(r => r.json()),
        ])
        if (intentRes.code === 0) setIntent(intentRes.data)
        if (desiresRes.code === 0) setDesires(desiresRes.data)
        if (biasRes.code === 0) setCognitiveBias(biasRes.data)
        if (narrativeRes.code === 0) setNarrative(narrativeRes.data)
      } catch (err) {
        console.error('Failed to fetch anthropomorphic data:', err)
      }
    }

    fetchAnthropomorphic()
    const interval = setInterval(fetchAnthropomorphic, 5000)
    return () => clearInterval(interval)
  }, [])

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/state')
      const data = await res.json()
      if (data.code === 0) {
        setState(data.data)
        setLastUpdate(new Date())
      }
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  // 格式化最后更新时间
  const formatLastUpdate = () => {
    if (!lastUpdate) return '从未'
    const diff = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
    if (diff < 5) return '刚刚'
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    return lastUpdate.toLocaleTimeString()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.90) 50%, rgba(241,245,249,0.85) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex items-center justify-between">
              {/* 标题 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-200">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-800">
                      AKIHO Monitor
                    </h1>
                    <p className="text-xs text-slate-500">
                      实时状态监控 · 最后更新: {formatLastUpdate()}
                    </p>
                  </div>
                </div>
              </div>

              {/* 控制按钮 */}
              <div className="flex items-center gap-3">
                <ConnectionStatus connected={wsConnected} />
                <RefreshButton onClick={handleRefresh} loading={refreshing} />
                <SettingsButton onClick={onOpenSettings} />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-full hover:from-slate-700 hover:to-slate-800 transition shadow-lg shadow-slate-200"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-medium">关闭</span>
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* 第一行: 核心系统卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <EmotionCard emotion={state?.emotion} />
              <RelationshipCard relationship={state?.relationship} />
              <PhysiologyCard physiological={state?.physiological} />
            </div>

            {/* 第二行: 生成器和统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GeneratorCard
                currentGenerator={state?.generator_type}
                generatorList={state?.generators || {}}
                onOpenSettings={onOpenSettings}
              />
              <StatsCard stats={state} state={state} />
              <ActivityCard
                isActive={wsConnected}
                lastActivity={lastUpdate}
                behaviorLog={state?.recent_behaviors || state?.behavior_log}
              />
            </div>

            {/* 拟人化系统卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntentCard intent={intent} />
              <DesireCard desires={desires} />
              <CognitiveBiasCard bias={cognitiveBias} />
              <NarrativeCard narrative={narrative} />
            </div>

            {/* 第三行: 情绪历史图表 */}
            <EmotionHistoryChart emotion={state?.emotion} />

            {/* 第四行: 对话历史和行为日志 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConversationLog history={state?.behavior_log?.filter(b => b.action?.includes('response')) ? 
                state.behavior_log.filter(b => b.action?.includes('response')).map(b => ({
                  role: 'user',
                  content: b.details?.user_message || '',
                  timestamp: b.timestamp,
                })) : []
              } />
              <BehaviorLogTable behaviors={state?.recent_behaviors || state?.behavior_log || []} />
            </div>

            {/* 第五行: 快速测试 */}
            <QuickTest />

            {/* 底部信息 */}
            <div className="text-center py-4 text-sm text-slate-400">
              <p>AKIHO Engine v1.0.0 · 监控面板</p>
              <p className="mt-1">详细状态监控 · 实时数据更新</p>
            </div>
          </motion.div>
        </main>
      </div>
    </motion.div>
  )
}
