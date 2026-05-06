/**
 * AKIHO 关系动态页面
 * 展示关系阶段、信任度、互动统计等
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Users, TrendingUp, MessageSquare, Clock, Star, Award, Link, UserX, Smile, SmilePlus, Sparkles, Flame, Circle, Frown, Unlink, Lock } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// 关系阶段定义
const RELATIONSHIP_STAGES = [
  { id: 0, name: '陌生', description: '初次相遇，彼此不熟悉', icon: UserX },
  { id: 1, name: '认识', description: '开始交换基本信息', icon: Circle },
  { id: 2, name: '熟悉', description: '日常话题交流增多', icon: Smile },
  { id: 3, name: '朋友', description: '建立初步信任', icon: SmilePlus },
  { id: 4, name: '知己', description: '分享内心想法', icon: Heart },
  { id: 5, name: '亲密', description: '全面接纳', icon: Sparkles },
]

export function RelationshipPage() {
  const [relationship, setRelationship] = useState({
    stage: 3,
    stageProgress: 0.5,
    trust: {},
    dynamics: {},
    stats: {
      totalInteractions: 0,
      positiveRate: 0.5,
      avgResponseTime: '3.2s',
      sharedMemories: 18,
      conflictCount: 5,
    },
  })

  const [trustHistory, setTrustHistory] = useState([
    { date: '05-01', value: 50 },
    { date: '05-07', value: 60 },
  ])

  const [events, setEvents] = useState([
    { id: 1, type: 'positive', content: '第一次深度交流，分享了彼此的兴趣爱好', date: '2024-01-20', icon: MessageSquare, color: 'emerald' },
    { id: 2, type: 'milestone', content: '关系升级为朋友阶段', date: '2024-01-28', icon: Award, color: 'violet' },
    { id: 3, type: 'conflict', content: '发生了第一次观点分歧', date: '2024-02-05', icon: Unlink, color: 'amber' },
    { id: 4, type: 'positive', content: '一起解决了问题，信任度提升', date: '2024-02-07', icon: Heart, color: 'emerald' },
    { id: 5, type: 'positive', content: '分享了一个秘密，关系更加亲密', date: '2024-02-15', icon: Lock, color: 'pink' },
    { id: 6, type: 'milestone', content: '解锁成就：情绪大师', date: '2024-02-18', icon: Star, color: 'amber' },
  ])

  const [sharedMemories, setSharedMemories] = useState([
    { id: 1, title: '星空对话', description: '讨论了宇宙和人生的意义', date: '2024-02-10', mood: 'peaceful' },
    { id: 2, title: '解决冲突', description: '成功化解了一次观点分歧', date: '2024-02-12', mood: 'resolved' },
    { id: 3, title: '秘密分享', description: '分享了各自的梦想', date: '2024-02-15', mood: 'intimate' },
  ])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRelationship() {
      try {
        const resp = await fetch('/api/relationship?user_id=default')
        const json = await resp.json()
        if (json.code === 0 && json.data) {
          const d = json.data
          // Map intimacy 0-1 to stage 0-5
          const stage = Math.floor((d.intimacy || 0.6) * 5)
          setRelationship({
            stage,
            stageProgress: (d.intimacy || 0.6) * 5 % 1,
            trust: {
              reliability: d.trust || 0.7,
              authenticity: (d.trust || 0.7) * 0.9,
              competence: 0.6,
              intimacy: d.intimacy || 0.6,
              self_disclosure: (d.intimacy || 0.6) * 0.5,
            },
            dynamics: {
              reciprocity: 0.7,
              responsiveness: 0.8,
              investment: d.trust || 0.7,
              commitment: d.intimacy || 0.6,
              satisfaction: 0.75,
              alternatives: 0.2,
            },
            stats: {
              totalInteractions: d.interaction_count || 0,
              positiveRate: 0.8,
              avgResponseTime: '2.5s',
              sharedMemories: 5,
              conflictCount: 1,
            },
          })
        }

        // Also load shared memories
        const memResp = await fetch('/api/memories')
        const memJson = await memResp.json()
        if (memJson.code === 0 && memJson.data) {
          setSharedMemories(memJson.data.memories?.episodic?.slice(0, 5).map((m, i) => ({
            id: i + 1,
            title: m.content?.slice(0, 20) || '记忆',
            description: m.content?.slice(0, 50) || '',
            date: m.timestamp || '',
            mood: 'peaceful',
          })) || [])
        }
      } catch (e) {
        console.warn('Failed to load relationship:', e)
      } finally {
        setLoading(false)
      }
    }
    loadRelationship()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/50">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">关系动态</h1>
              <p className="text-xs text-slate-500">追踪你们关系的成长轨迹</p>
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
          {/* 关系阶段进度 */}
          <motion.div variants={itemVariants}>
            <RelationshipProgress
              stages={RELATIONSHIP_STAGES}
              currentStage={relationship.stage}
              progress={relationship.stageProgress}
              overallTrust={Object.values(relationship.trust).reduce((a, b) => a + b, 0) / 5}
            />
          </motion.div>

          {/* 信任度与动态因子 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <TrustBreakdown trust={relationship.trust} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <DynamicsRadar dynamics={relationship.dynamics} />
            </motion.div>
          </div>

          {/* 信任度历史 */}
          <motion.div variants={itemVariants}>
            <TrustHistory history={trustHistory} />
          </motion.div>

          {/* 互动统计 */}
          <motion.div variants={itemVariants}>
            <InteractionStats stats={relationship.stats} />
          </motion.div>

          {/* 共享记忆 */}
          <motion.div variants={itemVariants}>
            <SharedMemories memories={sharedMemories} />
          </motion.div>

          {/* 关系事件时间线 */}
          <motion.div variants={itemVariants}>
            <EventTimeline events={events} />
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

// 关系阶段进度
function RelationshipProgress({ stages, currentStage, progress, overallTrust }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Link className="w-5 h-5 text-pink-500" />
          关系阶段
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">整体信任度:</span>
          <span className="font-semibold text-pink-600">{(overallTrust * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* 阶段进度 */}
      <div className="relative mb-6">
        <div className="flex justify-between">
          {stages.map((stage, index) => {
            const isActive = index <= currentStage
            const isCurrent = stage.id === currentStage
            return (
              <div
                key={stage.id}
                className={`flex flex-col items-center ${index <= currentStage ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200 scale-110'
                    : isActive
                    ? 'bg-pink-100 text-pink-600'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCurrent ? <stage.icon className="w-5 h-5" /> : <stage.icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isCurrent ? 'text-pink-600' : 'text-slate-500'}`}>
                  {stage.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* 进度线 */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 -z-10" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 -z-10 transition-all duration-500"
          style={{ width: `${(currentStage / (stages.length - 1)) * 100}%` }}
        />
      </div>

      {/* 当前阶段详情 */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">当前阶段</div>
          <div className="text-lg font-semibold text-pink-700">{stages[currentStage].name}</div>
          <div className="text-xs text-slate-500 mt-1">{stages[currentStage].description}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">阶段进度</div>
          <div className="text-2xl font-bold text-pink-600">{(progress * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  )
}

// 信任度分解
function TrustBreakdown({ trust }) {
  const data = [
    { name: '可靠性', value: trust.reliability * 100, description: '承诺是否兑现' },
    { name: '真实性', value: trust.authenticity * 100, description: '是否真诚相待' },
    { name: '能力认同', value: trust.competence * 100, description: '是否认可对方能力' },
    { name: '亲密程度', value: trust.intimacy * 100, description: '情感上的亲近' },
    { name: '自我表露', value: trust.self_disclosure * 100, description: '分享私密信息' },
  ]

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg h-full">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-500" />
        信任度分解
      </h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 font-medium">{item.name}</span>
              <span className="text-slate-500">{(item.value).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 动态因子雷达图
function DynamicsRadar({ dynamics }) {
  const data = [
    { subject: '互惠性', value: dynamics.reciprocity * 100 },
    { subject: '响应性', value: dynamics.responsiveness * 100 },
    { subject: '投入度', value: dynamics.investment * 100 },
    { subject: '承诺', value: dynamics.commitment * 100 },
    { subject: '满意度', value: dynamics.satisfaction * 100 },
  ]

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg h-full">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-teal-500" />
        关系动态因子
      </h3>
      <div className="h-56 min-h-[224px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="动态"
              dataKey="value"
              stroke="#14b8a6"
              fill="#14b8a6"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 p-3 bg-teal-50/50 rounded-lg">
        <div className="text-xs text-teal-700">
          <span className="font-medium">解读:</span>
          当前关系健康度良好，响应性和满意度较高，互惠性平衡。
        </div>
      </div>
    </div>
  )
}

// 信任度历史
function TrustHistory({ history }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-500" />
        信任度变化
      </h3>
      <div className="h-48 min-h-[192px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#ec4899"
              fill="url(#trustGradient)"
              name="信任度"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 互动统计
function InteractionStats({ stats }) {
  const items = [
    { label: '总互动次数', value: stats.totalInteractions, icon: MessageSquare, color: 'pink' },
    { label: '优质互动率', value: `${(stats.positiveRate * 100).toFixed(0)}%`, icon: Star, color: 'amber' },
    { label: '平均响应时间', value: stats.avgResponseTime, icon: Clock, color: 'teal' },
    { label: '共享记忆', value: stats.sharedMemories, icon: Heart, color: 'rose' },
  ]

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-violet-500" />
        互动统计
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-${item.color}-50/50 rounded-xl p-4 text-center border border-${item.color}-100/50`}
          >
            <item.icon className={`w-6 h-6 mx-auto mb-2 text-${item.color}-500`} />
            <div className={`text-2xl font-bold text-${item.color}-600`}>{item.value}</div>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-slate-50/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">冲突次数</span>
          <span className={`text-sm font-medium ${stats.conflictCount > 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {stats.conflictCount} 次
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(stats.conflictCount / 10 * 100, 100)}%` }}
            className={`h-full rounded-full ${stats.conflictCount > 3 ? 'bg-amber-400' : 'bg-emerald-400'}`}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          {stats.conflictCount <= 3 ? '关系和谐' : '需要更多沟通'}
        </div>
      </div>
    </div>
  )
}

// 共享记忆
function SharedMemories({ memories }) {
  const moodColors = {
    peaceful: 'from-blue-50 to-cyan-50 border-blue-200',
    resolved: 'from-emerald-50 to-teal-50 border-emerald-200',
    intimate: 'from-pink-50 to-rose-50 border-pink-200',
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-500" />
        共享记忆
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {memories.map((memory, index) => (
          <motion.div
            key={memory.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-br ${moodColors[memory.mood]} rounded-xl p-4 border`}
          >
            <div className="text-sm font-semibold text-slate-800">{memory.title}</div>
            <div className="text-xs text-slate-600 mt-1">{memory.description}</div>
            <div className="text-[10px] text-slate-400 mt-2">{memory.date}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 事件时间线
function EventTimeline({ events }) {
  const typeColors = {
    positive: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-300' },
    conflict: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300' },
    milestone: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-300' },
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-slate-500" />
        关系事件
      </h3>
      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-300 via-rose-300 to-slate-200" />

        <div className="space-y-4">
          {events.map((event, index) => {
            const colors = typeColors[event.type]
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-10"
              >
                {/* 时间线节点 */}
                <div className={`absolute left-2 top-2 w-4 h-4 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}>
                  <event.icon className="w-3 h-3" />
                </div>

                {/* 事件卡片 */}
                <div className={`bg-slate-50/50 rounded-lg p-3 border border-slate-100`}>
                  <div className="flex justify-between items-start">
                    <div className={`text-xs font-medium capitalize ${colors.text}`}>{event.type}</div>
                    <div className="text-[10px] text-slate-400">{event.date}</div>
                  </div>
                  <div className="text-sm text-slate-700 mt-1">{event.content}</div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RelationshipPage
