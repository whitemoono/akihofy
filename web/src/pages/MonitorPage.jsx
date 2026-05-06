/**
 * AKIHO 监控面板页面 - 美化版
 * 实时展示情绪、生理、行为、认知等系统状态
 * 包含数据表格、趋势图表、动画效果
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Wifi, WifiOff, RefreshCw, Brain, Zap, Heart, TrendingUp,
  ChevronDown, ChevronUp, TrendingDown, Minus, ArrowUp, ArrowDown,
  AlertTriangle, CheckCircle, Clock, Eye, BarChart3, Table2, Grid3X3
} from 'lucide-react'
import { useMonitor } from '../hooks/useMonitor'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts'

// 拟人化组件
import { IntentCard } from '../components/Monitor/IntentCard'
import { DesireCard } from '../components/Monitor/DesireCard'
import { CognitiveBiasCard } from '../components/Monitor/CognitiveBiasCard'
import { NarrativeCard } from '../components/Monitor/NarrativeCard'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// 颜色配置
const POOL_COLORS = {
  cognitive: { main: '#8b5cf6', bg: 'bg-violet-100', text: 'text-violet-600', light: 'rgba(139, 92, 246, 0.2)' },
  social: { main: '#06b6d4', bg: 'bg-cyan-100', text: 'text-cyan-600', light: 'rgba(6, 182, 212, 0.2)' },
  emotional: { main: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-600', light: 'rgba(245, 158, 11, 0.2)' },
  creative: { main: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-600', light: 'rgba(16, 185, 129, 0.2)' },
}

const POOL_NAMES = {
  cognitive: '认知资源',
  social: '社交资源',
  emotional: '情绪资源',
  creative: '创造资源',
}

export function MonitorPage() {
  const { state, connected, loading, refresh, lastUpdate } = useMonitor()

  // 拟人化状态
  const [intent, setIntent] = useState(null)
  const [desires, setDesires] = useState(null)
  const [cognitiveBias, setCognitiveBias] = useState(null)
  const [narrative, setNarrative] = useState(null)

  // 视图切换
  const [statsViewMode, setStatsViewMode] = useState('card') // 'card' | 'table'

  // 加载拟人化数据
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-200"
              >
                <Activity className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">系统监控</h1>
                <p className="text-xs text-slate-500">
                  实时状态 · 最后更新: {lastUpdate || '加载中'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionStatus connected={connected} />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition text-slate-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">刷新</span>
              </motion.button>
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
          {/* 核心系统状态卡片 */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <EnhancedEmotionCard emotion={state?.emotion} />
              <EnhancedPhysiologyCard physiological={state?.physiological} />
              <EnhancedBehaviorCard behavior={state?.behavior} />
              <EnhancedCognitionCard cognition={state?.cognition} />
            </div>
          </motion.div>

          {/* 情绪 PAD 三维可视化 */}
          <motion.div variants={itemVariants}>
            <EnhancedPADVisualization emotion={state?.emotion} />
          </motion.div>

          {/* 四池资源系统 */}
          <motion.div variants={itemVariants}>
            <EnhancedResourcePools physiological={state?.physiological} />
          </motion.div>

          {/* 关系系统 */}
          <motion.div variants={itemVariants}>
            <EnhancedRelationshipOverview relationship={state?.relationship} />
          </motion.div>

          {/* 拟人化系统 */}
          <motion.div variants={itemVariants}>
            <AnthropomorphicSection
              intent={intent}
              desires={desires}
              cognitiveBias={cognitiveBias}
              narrative={narrative}
            />
          </motion.div>

          {/* 统计概览 */}
          <motion.div variants={itemVariants}>
            <EnhancedStatsOverview state={state} viewMode={statsViewMode} onViewModeChange={setStatsViewMode} />
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

// 连接状态
function ConnectionStatus({ connected }) {
  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: connected ? [1, 1.02, 1] : 1 }}
      transition={{ duration: 1, repeat: connected ? Infinity : 0 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50"
    >
      {connected ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Wifi className="w-4 h-4 text-emerald-500" />
          </motion.div>
          <span className="text-sm text-emerald-600 font-medium">实时连接</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600 font-medium">未连接</span>
        </>
      )}
    </motion.div>
  )
}

// ========== 增强版核心状态卡片 ==========

// 增强版情绪卡片
function EnhancedEmotionCard({ emotion }) {
  const pad = emotion?.pad || { pleasure: 0, arousal: 0, dominance: 0 }
  const category = emotion?.category || 'Neutral'
  const intensity = emotion?.intensity || 0.5

  const emotionStatus = useMemo(() => {
    if (intensity > 0.7) return { label: '强烈', color: 'rose' }
    if (intensity > 0.4) return { label: '平稳', color: 'teal' }
    return { label: '平静', color: 'slate' }
  }, [intensity])

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="font-semibold text-slate-800">情绪状态</h3>
        </div>
        <StatusIndicator status={emotionStatus} />
      </div>

      <div className="mb-4">
        <div className="text-center p-3 bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl">
          <div className="text-lg font-bold text-rose-600">{category}</div>
          <div className="text-xs text-slate-500 mt-1">情绪类别</div>
        </div>
      </div>

      <div className="space-y-2">
        <PADMiniBar label="愉悦" value={pad.pleasure} color="rose" />
        <PADMiniBar label="唤醒" value={pad.arousal} color="orange" />
        <PADMiniBar label="支配" value={pad.dominance} color="blue" />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">情绪强度</span>
          <span className={`font-medium ${
            intensity > 0.7 ? 'text-rose-600' :
            intensity > 0.4 ? 'text-amber-600' : 'text-slate-500'
          }`}>
            {(intensity * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intensity * 100}%` }}
            className={`h-full rounded-full ${
              intensity > 0.7 ? 'bg-rose-500' :
              intensity > 0.4 ? 'bg-amber-500' : 'bg-slate-400'
            }`}
          />
        </div>
      </div>
    </motion.div>
  )
}

// 增强版生理卡片
function EnhancedPhysiologyCard({ physiological }) {
  const pools = physiological?.pools || {
    cognitive: 0.8,
    social: 0.8,
    emotional: 0.8,
    creative: 0.8
  }

  const hasWarning = Object.values(pools).some(v => v < 0.3)
  const hasCaution = Object.values(pools).some(v => v < 0.6 && v >= 0.3)

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="font-semibold text-slate-800">资源状态</h3>
        </div>
        {hasWarning ? (
          <AlertBadge type="critical" />
        ) : hasCaution ? (
          <AlertBadge type="warning" />
        ) : (
          <StatusIndicator status={{ label: '正常', color: 'emerald', icon: '✓' }} />
        )}
      </div>

      <div className="space-y-3">
        {Object.entries(pools).map(([key, value]) => {
          const color = POOL_COLORS[key]
          return (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className={color.text}>{POOL_NAMES[key]}</span>
                <span className="font-medium text-slate-700">{(value * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full relative"
                  style={{ backgroundColor: color.main }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs">
        <span className="text-slate-500">平均资源</span>
        <span className="font-medium text-amber-600">
          {(Object.values(pools).reduce((a, b) => a + b, 0) / 4 * 100).toFixed(0)}%
        </span>
      </div>
    </motion.div>
  )
}

// 增强版行为卡片
function EnhancedBehaviorCard({ behavior }) {
  const current = behavior?.current || null
  const recentBehaviors = behavior?.recent_behaviors || []
  const recentCount = recentBehaviors.length

  const trend = recentCount > 5 ? 'up' : recentCount > 2 ? 'stable' : 'down'
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-teal-500" />
          </div>
          <h3 className="font-semibold text-slate-800">行为状态</h3>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-xs font-medium capitalize">{trend === 'stable' ? '平稳' : trend === 'up' ? '活跃' : '低频'}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="p-3 bg-teal-50 rounded-xl text-center">
          <div className="text-sm text-slate-500 mb-1">当前行为</div>
          <div className="font-semibold text-teal-700">{current || '空闲'}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500 flex justify-between">
          <span>最近行为</span>
          <span className="font-medium text-teal-600">{recentCount} 条</span>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1">
          {recentBehaviors.slice(0, 5).map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 text-xs p-1.5 bg-slate-50 rounded-lg"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="flex-1 truncate text-slate-600">{b.action || b}</span>
            </motion.div>
          ))}
          {recentCount === 0 && (
            <div className="text-xs text-slate-400 text-center py-2">暂无行为记录</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// 增强版认知卡片
function EnhancedCognitionCard({ cognition }) {
  const attention = cognition?.attention || { current_focus: [], sustained_attention: 0.8 }
  const focus = attention.current_focus?.[0] || '无'
  const sustained = attention.sustained_attention || 0.8

  const loadStatus = useMemo(() => {
    if (sustained > 0.8) return { label: '高度专注', color: 'violet', level: 3 }
    if (sustained > 0.5) return { label: '正常', color: 'teal', level: 2 }
    return { label: '注意力分散', color: 'amber', level: 1 }
  }, [sustained])

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Brain className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="font-semibold text-slate-800">认知状态</h3>
        </div>
        <StatusIndicator
          status={{
            label: loadStatus.label,
            color: loadStatus.color === 'violet' ? 'violet' : loadStatus.color === 'teal' ? 'emerald' : 'amber'
          }}
        />
      </div>

      <div className="mb-4">
        <div className="p-3 bg-indigo-50 rounded-xl">
          <div className="text-xs text-slate-500 mb-1 text-center">当前焦点</div>
          <div className="font-medium text-indigo-700 text-center truncate" title={focus}>
            {focus}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500 flex justify-between">
          <span>持续注意力</span>
          <span className="font-medium text-indigo-600">{(sustained * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${sustained * 100}%` }}
            className={`h-full rounded-full ${
              sustained > 0.8 ? 'bg-violet-500' :
              sustained > 0.5 ? 'bg-indigo-400' : 'bg-amber-400'
            }`}
          />
        </div>

        <div className="flex gap-1 mt-2">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={`flex-1 h-1 rounded-full transition-all ${
                level <= loadStatus.level
                  ? loadStatus.color === 'violet' ? 'bg-violet-500' :
                    loadStatus.color === 'teal' ? 'bg-teal-500' : 'bg-amber-500'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ========== 增强版 PAD 情绪可视化 ==========
function EnhancedPADVisualization({ emotion }) {
  const [showTable, setShowTable] = useState(false)
  const pad = emotion?.pad || { pleasure: 0.5, arousal: 0.3, dominance: 0.4 }
  const category = emotion?.category || 'Neutral'

  const data = [
    { subject: '愉悦度', value: (pad.pleasure + 1) * 50, fullMark: 100 },
    { subject: '唤醒度', value: (pad.arousal + 1) * 50, fullMark: 100 },
    { subject: '支配度', value: (pad.dominance + 1) * 50, fullMark: 100 },
  ]

  const emotionInterpretation = useMemo(() => {
    const { pleasure, arousal, dominance } = pad
    let type = ''

    if (pleasure > 0.3 && arousal > 0.3) {
      type = '愉悦激活'
    } else if (pleasure > 0.3 && arousal <= 0.3) {
      type = '平静满足'
    } else if (pleasure <= -0.3 && arousal > 0.3) {
      type = '焦虑不安'
    } else {
      type = '低落平静'
    }

    return {
      type,
      description: getEmotionDescription(pad),
      suggestion: getEmotionSuggestion(pad)
    }
  }, [pad])

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          PAD 情绪模型
        </h3>
        <ViewToggle showTable={showTable} onToggle={() => setShowTable(!showTable)} />
      </div>

      <AnimatePresence mode="wait">
        {showTable ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">维度</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">当前值</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">范围</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 text-slate-700">愉悦度 (P)</td>
                    <td className="px-4 py-3 font-medium text-rose-600">{pad.pleasure.toFixed(3)}</td>
                    <td className="px-4 py-3 text-slate-500">-1 ~ +1</td>
                    <td className="px-4 py-3">
                      <LevelIndicator value={pad.pleasure} positive="积极" negative="消极" />
                    </td>
                  </tr>
                  <tr className="bg-slate-50/30">
                    <td className="px-4 py-3 text-slate-700">唤醒度 (A)</td>
                    <td className="px-4 py-3 font-medium text-orange-600">{pad.arousal.toFixed(3)}</td>
                    <td className="px-4 py-3 text-slate-500">-1 ~ +1</td>
                    <td className="px-4 py-3">
                      <LevelIndicator value={pad.arousal} positive="激活" negative="低激活" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-700">支配度 (D)</td>
                    <td className="px-4 py-3 font-medium text-blue-600">{pad.dominance.toFixed(3)}</td>
                    <td className="px-4 py-3 text-slate-500">-1 ~ +1</td>
                    <td className="px-4 py-3">
                      <LevelIndicator value={pad.dominance} positive="主导" negative="顺从" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Brain className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="font-medium text-rose-700">{emotionInterpretation.type}</div>
                  <div className="text-sm text-slate-600 mt-1">{emotionInterpretation.description}</div>
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {emotionInterpretation.suggestion}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="h-64 min-h-[256px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="情绪"
                    dataKey="value"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <PADBar label="愉悦度 (Pleasure)" value={pad.pleasure} color="rose" />
              <PADBar label="唤醒度 (Arousal)" value={pad.arousal} color="orange" />
              <PADBar label="支配度 (Dominance)" value={pad.dominance} color="blue" />

              <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-500 mb-1">情绪状态</div>
                <div className="font-medium text-slate-700">{emotionInterpretation.type}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ========== 增强版四池资源 ==========
function EnhancedResourcePools({ physiological }) {
  const [showTable, setShowTable] = useState(false)
  const pools = physiological?.pools || {
    cognitive: 0.75,
    social: 0.65,
    emotional: 0.55,
    creative: 0.45
  }

  const historyData = useMemo(() => {
    return [
      { name: '认知', value: pools.cognitive * 100, fill: '#8b5cf6' },
      { name: '社交', value: pools.social * 100, fill: '#06b6d4' },
      { name: '情绪', value: pools.emotional * 100, fill: '#f59e0b' },
      { name: '创造', value: pools.creative * 100, fill: '#10b981' },
    ]
  }, [pools])

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          四池资源系统
        </h3>
        <ViewToggle showTable={showTable} onToggle={() => setShowTable(!showTable)} />
      </div>

      <AnimatePresence mode="wait">
        {showTable ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="overflow-hidden rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">资源类型</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">当前值</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">状态</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">建议</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(pools).map(([key, value]) => {
                    const status = getPoolStatus(value)
                    return (
                      <tr key={key}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: POOL_COLORS[key].main }} />
                            <span className="text-slate-700">{POOL_NAMES[key]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{(value * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{getPoolSuggestion(key, value)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {Object.values(pools).some(v => v < 0.3) && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">部分资源严重不足，建议及时恢复</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="h-48 min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    {historyData.map((entry, index) => (
                      <linearGradient key={index} id={`poolGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={entry.fill} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={entry.fill} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {historyData.map((entry, index) => (
                    <Area
                      key={index}
                      type="monotone"
                      dataKey="value"
                      stroke={entry.fill}
                      fill={`url(#poolGradient${index})`}
                      name={entry.name}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 text-xs text-slate-500 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-8 h-0.5 bg-red-400" />
                <span>告警线 (30%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-0.5 bg-amber-400" />
                <span>注意线 (60%)</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ========== 增强版关系概览 ==========
function EnhancedRelationshipOverview({ relationship }) {
  const [showTable, setShowTable] = useState(false)
  const trust = relationship?.trust || {
    reliability: 0.6,
    authenticity: 0.5,
    competence: 0.4,
    intimacy: 0.3,
    self_disclosure: 0.2
  }
  const stage = relationship?.stage || 'Friend'

  const data = [
    { subject: '可靠性', value: trust.reliability * 100 },
    { subject: '真实性', value: trust.authenticity * 100 },
    { subject: '能力认同', value: trust.competence * 100 },
    { subject: '亲密程度', value: trust.intimacy * 100 },
    { subject: '自我表露', value: trust.self_disclosure * 100 },
  ]

  const healthScore = (Object.values(trust).reduce((a, b) => a + b, 0) / 5) * 100

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
            <Heart className="w-4 h-4 text-pink-500" />
          </div>
          关系动态
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            健康度: <span className={`font-medium ${
              healthScore > 70 ? 'text-emerald-600' :
              healthScore > 40 ? 'text-amber-600' : 'text-red-600'
            }`}>{healthScore.toFixed(0)}%</span>
          </div>
          <ViewToggle showTable={showTable} onToggle={() => setShowTable(!showTable)} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showTable ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600 mb-1">{stage}</div>
                <div className="text-sm text-slate-500">当前关系阶段</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">信任维度</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">当前值</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">等级</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">可视化</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { key: 'reliability', label: '可靠性', value: trust.reliability },
                    { key: 'authenticity', label: '真实性', value: trust.authenticity },
                    { key: 'competence', label: '能力认同', value: trust.competence },
                    { key: 'intimacy', label: '亲密程度', value: trust.intimacy },
                    { key: 'self_disclosure', label: '自我表露', value: trust.self_disclosure },
                  ].map(item => (
                    <tr key={item.key}>
                      <td className="px-4 py-3 text-slate-700">{item.label}</td>
                      <td className="px-4 py-3 font-medium text-pink-600">{(item.value * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3">
                        <LevelBadge value={item.value} />
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value * 100}%` }}
                            className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="text-center p-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl">
              <div className="text-4xl font-bold text-pink-500 mb-1">{stage}</div>
              <div className="text-sm text-slate-500 mb-4">关系阶段</div>
              <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full"
                />
              </div>
              <div className="text-xs text-slate-500 mt-2">关系健康度</div>
            </div>

            <div className="h-48 min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="信任"
                    dataKey="value"
                    stroke="#ec4899"
                    fill="#ec4899"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ========== 拟人化系统区域 ==========
function AnthropomorphicSection({ intent, desires, cognitiveBias, narrative }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-500" />
        拟人化系统
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <IntentCard intent={intent} />
        <DesireCard desires={desires} />
        <CognitiveBiasCard bias={cognitiveBias} />
        <NarrativeCard narrative={narrative} />
      </div>
    </>
  )
}

// ========== 增强版统计概览 ==========
function EnhancedStatsOverview({ state, viewMode, onViewModeChange }) {
  const stats = [
    {
      label: '总对话',
      value: state?.stats?.total_conversations || 42,
      color: 'teal',
      trend: '+3',
      trendUp: true
    },
    {
      label: '总互动',
      value: state?.stats?.total_interactions || 156,
      color: 'violet',
      trend: '+12',
      trendUp: true
    },
    {
      label: '优质互动',
      value: state?.stats?.positive_rate || '78%',
      color: 'emerald',
      trend: '+5%',
      trendUp: true
    },
    {
      label: '在线时长',
      value: state?.stats?.uptime || '2h 30m',
      color: 'amber',
      trend: '稳定',
      trendUp: null
    },
  ]

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-slate-600" />
          </div>
          统计概览
        </h3>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => onViewModeChange('card')}
            className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
          >
            <Grid3X3 className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded transition ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
          >
            <Table2 className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'card' ? (
          <motion.div
            key="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100"
              >
                <div className={`text-2xl font-bold text-${stat.color}-500 mb-1`}>
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 mb-2">{stat.label}</div>
                {stat.trendUp !== null && (
                  <div className={`flex items-center justify-center gap-1 text-xs ${
                    stat.trendUp ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {stat.trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    <span>{stat.trend}</span>
                  </div>
                )}
                {stat.trendUp === null && (
                  <div className="text-xs text-slate-400">{stat.trend}</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">指标</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">当前值</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">变化</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">趋势</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.map((stat, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-700">{stat.label}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{stat.value}</td>
                      <td className="px-4 py-3 text-slate-600">{stat.trend}</td>
                      <td className="px-4 py-3">
                        {stat.trendUp === true && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <ArrowUp className="w-4 h-4" /> 上升
                          </span>
                        )}
                        {stat.trendUp === false && (
                          <span className="inline-flex items-center gap-1 text-rose-600">
                            <ArrowDown className="w-4 h-4" /> 下降
                          </span>
                        )}
                        {stat.trendUp === null && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Minus className="w-4 h-4" /> 稳定
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ========== 辅助组件 ==========

function StatusIndicator({ status }) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-600',
    teal: 'bg-teal-100 text-teal-600',
    rose: 'bg-rose-100 text-rose-600',
    violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorMap[status.color] || colorMap.slate}`}>
      {status.icon} {status.label}
    </span>
  )
}

function AlertBadge({ type }) {
  if (type === 'critical') {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        告警
      </span>
    )
  }
  return (
    <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-600 flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      注意
    </span>
  )
}

function ViewToggle({ showTable, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
      title={showTable ? '切换到图表' : '切换到表格'}
    >
      {showTable ? (
        <BarChart3 className="w-4 h-4 text-slate-600" />
      ) : (
        <Table2 className="w-4 h-4 text-slate-600" />
      )}
    </button>
  )
}

function PADBar({ label, value, color }) {
  const colors = {
    rose: { bg: 'bg-rose-100', fill: 'bg-rose-500' },
    orange: { bg: 'bg-orange-100', fill: 'bg-orange-500' },
    blue: { bg: 'bg-blue-100', fill: 'bg-blue-500' }
  }
  const c = colors[color]

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-700">{value.toFixed(2)}</span>
      </div>
      <div className={`h-3 ${c.bg} rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value + 1) * 50}%` }}
          className={`h-full ${c.fill} rounded-full`}
        />
      </div>
    </div>
  )
}

function PADMiniBar({ label, value, color }) {
  const colors = {
    rose: { bg: 'bg-rose-100', fill: 'bg-rose-500' },
    orange: { bg: 'bg-orange-100', fill: 'bg-orange-500' },
    blue: { bg: 'bg-blue-100', fill: 'bg-blue-500' }
  }
  const c = colors[color]

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-8">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value + 1) * 50}%` }}
          className={`h-full ${c.fill} rounded-full`}
        />
      </div>
      <span className="text-xs text-slate-400 w-12 text-right">{(value + 1) * 50 - 50}%</span>
    </div>
  )
}

function LevelIndicator({ value, positive, negative }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${
      value > 0 ? 'bg-emerald-100 text-emerald-700' :
      value < 0 ? 'bg-amber-100 text-amber-700' :
      'bg-slate-100 text-slate-600'
    }`}>
      {value > 0 ? positive : value < 0 ? negative : '中性'}
    </span>
  )
}

function LevelBadge({ value }) {
  const level = value > 0.7 ? '高' : value > 0.4 ? '中' : '低'
  const color = value > 0.7 ? 'emerald' : value > 0.4 ? 'amber' : 'rose'

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full bg-${color}-100 text-${color}-700`}>
      {level}
    </span>
  )
}

function StatusBadge({ status }) {
  const configs = {
    healthy: { label: '健康', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    caution: { label: '注意', bg: 'bg-amber-100', text: 'text-amber-700' },
    warning: { label: '告警', bg: 'bg-red-100', text: 'text-red-700' },
  }

  const config = configs[status] || configs.healthy

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function getPoolStatus(value) {
  if (value >= 0.6) return 'healthy'
  if (value >= 0.3) return 'caution'
  return 'warning'
}

function getPoolSuggestion(key, value) {
  const suggestions = {
    cognitive: value < 0.3 ? '建议进行简单思考活动' : value < 0.6 ? '可以尝试学习新知识' : '认知状态良好',
    social: value < 0.3 ? '建议减少社交活动' : value < 0.6 ? '可以适度互动' : '社交状态活跃',
    emotional: value < 0.3 ? '建议进行情绪调节' : value < 0.6 ? '保持情绪稳定' : '情绪状态积极',
    creative: value < 0.3 ? '建议休息恢复' : value < 0.6 ? '可以尝试创作' : '创造力充沛',
  }
  return suggestions[key] || ''
}

function getEmotionDescription(pad) {
  const { pleasure, arousal } = pad

  if (pleasure > 0.3 && arousal > 0.3) {
    return '当前处于愉悦且激活的状态，情绪积极并愿意参与活动'
  }
  if (pleasure > 0.3 && arousal <= 0.3) {
    return '处于平静满足的状态，情绪稳定且舒适'
  }
  if (pleasure <= -0.3 && arousal > 0.3) {
    return '处于焦虑不安的状态，可能需要情绪调节'
  }
  if (pleasure <= -0.3 && arousal <= -0.3) {
    return '处于低落状态，建议寻求积极的互动'
  }
  return '情绪处于中性平稳状态'
}

function getEmotionSuggestion(pad) {
  const { pleasure, arousal } = pad

  if (pleasure > 0.3 && arousal > 0.3) {
    return '适合进行社交活动或学习新技能'
  }
  if (pleasure > 0.3 && arousal <= 0.3) {
    return '适合进行深度思考或创造性工作'
  }
  if (pleasure <= -0.3 || arousal <= -0.3) {
    return '建议进行放松活动或寻求支持'
  }
  return '继续保持当前状态'
}

export default MonitorPage
