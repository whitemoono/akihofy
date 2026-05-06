/**
 * AKIHO 人格档案页面
 * 展示成长阶段、人格特征、驱动力矩阵等
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, TrendingUp, Target, Award, Clock, Sparkles, Leaf, Sprout, TreePine, Flower2, Mountain, Star, Check, Trophy, Lock, Table2, LayoutGrid } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// 成长阶段定义
const GROWTH_PHASES = [
  { id: 'infant', name: '婴儿期', minDays: 0, maxDays: 7, icon: Leaf, description: '基础反应与依赖' },
  { id: 'toddler', name: '幼儿期', minDays: 7, maxDays: 30, icon: Sprout, description: '探索与学习' },
  { id: 'child', name: '儿童期', minDays: 30, maxDays: 180, icon: TreePine, description: '社会化与规则意识' },
  { id: 'adolescent', name: '青春期', minDays: 180, maxDays: 365, icon: Flower2, description: '自我认同与独立' },
  { id: 'adult', name: '成熟期', minDays: 365, maxDays: 730, icon: Mountain, description: '稳定发展与责任' },
  { id: 'sage', name: '智慧期', minDays: 730, maxDays: Infinity, icon: Star, description: '传承与超越' },
]

// 五大人格特征
const PERSONALITY_TRAITS = [
  { name: '开放性', description: '对新体验的接受度', key: 'openness' },
  { name: '尽责性', description: '目标导向程度', key: 'conscientiousness' },
  { name: '外向性', description: '社交能量', key: 'extraversion' },
  { name: '宜人性', description: '合作与信任', key: 'agreeableness' },
  { name: '神经质', description: '情绪稳定性', key: 'neuroticism' },
]

// 原生驱动力
const DRIVE_MATRIX = [
  { name: '好奇心', description: '对新事物的探索欲望', key: 'curiosity' },
  { name: '社交需求', description: '与他人互动的渴望', key: 'social_need' },
  { name: '隐私敏感', description: '对个人信息保护意识', key: 'privacy_sensitivity' },
  { name: '宽容度', description: '对错误的接受程度', key: 'forgiveness' },
  { name: '攻击性', description: '面对冲突的反应倾向', key: 'aggression' },
  { name: '自我保护', description: '维护自身利益的意识', key: 'self_preservation' },
]

export function PersonalityPage() {
  const [growth, setGrowth] = useState({
    currentPhase: 'child',
    phaseProgress: 0.45,
    ageDays: 0,
    experienceCount: 0,
  })

  const [personality, setPersonality] = useState({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  })

  const [drives, setDrives] = useState({
    curiosity: 0.5,
    social_need: 0.5,
    privacy_sensitivity: 0.5,
    forgiveness: 0.5,
    aggression: 0.5,
    self_preservation: 0.5,
  })

  const [milestones, setMilestones] = useState([
    { id: 1, name: '首次对话', description: '完成第一次互动', achieved: true, date: '2024-01-15' },
    { id: 2, name: '好奇心萌芽', description: '主动提问超过10次', achieved: true, date: '2024-01-20' },
    { id: 3, name: '建立信任', description: '信任度首次超过50%', achieved: true, date: '2024-02-01' },
    { id: 4, name: '社交达人', description: '一天内互动超过20次', achieved: false, date: null },
    { id: 5, name: '情绪大师', description: '成功调节负面情绪5次', achieved: true, date: '2024-02-15' },
    { id: 6, name: '知识探索', description: '学习新主题超过3个', achieved: false, date: null },
    { id: 7, name: '亲密伙伴', description: '关系阶段达到知己', achieved: true, date: '2024-03-01' },
    { id: 8, name: '成熟蜕变', description: '进入成熟期', achieved: false, date: null },
  ])

  const [learningHistory, setLearningHistory] = useState([
    { date: '2024-01', topics: ['日常对话', '问候礼仪'], count: 45 },
    { date: '2024-02', topics: ['情感表达', '兴趣话题'], count: 67 },
    { date: '2024-03', topics: ['深度交流', '观点分享'], count: 89 },
    { date: '2024-04', topics: ['创意表达', '学习技巧'], count: 78 },
  ])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPersonality() {
      try {
        const resp = await fetch('/api/personality')
        const json = await resp.json()
        if (json.code === 0 && json.data) {
          const d = json.data
          setGrowth(d.growth || growth)
          setPersonality(d.personality || personality)
          setDrives(d.drives || drives)
          setMilestones(d.milestones || milestones)
          setLearningHistory(d.learningHistory || learningHistory)
        }
      } catch (e) {
        console.warn('Failed to load personality:', e)
      } finally {
        setLoading(false)
      }
    }
    loadPersonality()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/50">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">人格档案</h1>
              <p className="text-xs text-slate-500">了解秋穗的成长历程与性格特征</p>
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
          {/* 成长阶段进度 */}
          <motion.div variants={itemVariants}>
            <GrowthProgress
              phases={GROWTH_PHASES}
              currentPhase={growth.currentPhase}
              progress={growth.phaseProgress}
              ageDays={growth.ageDays}
              experienceCount={growth.experienceCount}
            />
          </motion.div>

          {/* 人格特征与驱动力 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <PersonalityRadar personality={personality} traits={PERSONALITY_TRAITS} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <DriveMatrixCard drives={drives} />
            </motion.div>
          </div>

          {/* 学习历史 */}
          <motion.div variants={itemVariants}>
            <LearningHistory history={learningHistory} />
          </motion.div>

          {/* 里程碑成就 */}
          <motion.div variants={itemVariants}>
            <MilestonesGrid milestones={milestones} />
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

// 成长进度组件
function GrowthProgress({ phases, currentPhase, progress, ageDays, experienceCount }) {
  const currentIndex = phases.findIndex(p => p.id === currentPhase)

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-500" />
          成长阶段
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">当前天数: <span className="font-semibold text-violet-600">{ageDays}</span></span>
          <span className="text-slate-500">经验: <span className="font-semibold text-violet-600">{experienceCount}</span></span>
        </div>
      </div>

      {/* 阶段进度条 */}
      <div className="relative mb-6">
        <div className="flex justify-between">
          {phases.map((phase, index) => {
            const isActive = index <= currentIndex
            const isCurrent = phase.id === currentPhase
            return (
              <div
                key={phase.id}
                className={`flex flex-col items-center ${index <= currentIndex ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-200 scale-110'
                    : isActive
                    ? 'bg-violet-100 text-violet-600'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  <phase.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isCurrent ? 'text-violet-600' : 'text-slate-500'}`}>
                  {phase.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* 进度线 */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 -z-10" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 -z-10 transition-all duration-500"
          style={{ width: `${(currentIndex / (phases.length - 1)) * 100}%` }}
        />
      </div>

      {/* 当前阶段详情 */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">当前阶段</div>
          <div className="text-lg font-semibold text-violet-700">{phases[currentIndex].name}</div>
          <div className="text-xs text-slate-500 mt-1">{phases[currentIndex].description}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">阶段进度</div>
          <div className="text-2xl font-bold text-violet-600">{(progress * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  )
}

// 人格雷达图
function PersonalityRadar({ personality, traits }) {
  const data = traits.map(trait => ({
    subject: trait.name,
    value: personality[trait.key] * 100,
    fullMark: 100,
  }))

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg h-full">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-500" />
        五大人格特征
      </h3>
      <div className="h-64 min-h-[256px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="人格"
              dataKey="value"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-1">
        {traits.map(trait => (
          <div key={trait.key} className="flex justify-between text-xs">
            <span className="text-slate-500">{trait.name}</span>
            <span className="font-medium text-slate-700">{(personality[trait.key] * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 驱动力矩阵
function DriveMatrixCard({ drives }) {
  const data = Object.entries(drives).map(([key, value]) => {
    const drive = DRIVE_MATRIX.find(d => d.key === key)
    return {
      name: drive?.name || key,
      value: value * 100,
      description: drive?.description || '',
      level: value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low'
    }
  })
  const [showTable, setShowTable] = useState(false)

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Target className="w-5 h-5 text-rose-500" />
          原生驱动力矩阵
        </h3>
        <button
          onClick={() => setShowTable(!showTable)}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          title={showTable ? '切换到图表' : '切换到表格'}
        >
          {showTable ? <BarChart className="w-4 h-4 text-slate-600" /> : <Table2 className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showTable ? (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden rounded-xl border border-slate-200"
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">驱动力</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">强度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">等级</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">描述</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, index) => (
                  <motion.tr
                    key={item.name}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-rose-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            className={`h-full rounded-full ${
                              item.level === 'high' ? 'bg-rose-500' :
                              item.level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span className="text-slate-600 w-12">{item.value.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.level === 'high' ? 'bg-rose-100 text-rose-600' :
                        item.level === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {item.level === 'high' ? '高' : item.level === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.description}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="space-y-3">
              {data.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{item.name}</span>
                    <span className="text-slate-500">{(item.value).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg,
                          ${item.value > 70 ? '#f43f5e' : item.value > 40 ? '#f59e0b' : '#10b981'}
                          0%,
                          ${item.value > 70 ? '#fb7185' : item.value > 40 ? '#fbbf24' : '#34d399'}
                          100%)`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <div className="text-[10px] text-slate-500">
          <span className="font-medium text-slate-600">驱动力解读:</span>
          好奇心强，社交需求适中，有较强的隐私意识，宽容度偏低，攻击性低，有一定自我保护意识。
        </div>
      </div>
    </div>
  )
}

// 学习历史
function LearningHistory({ history }) {
  const data = history.map(h => ({
    month: h.date,
    count: h.count,
  }))

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-cyan-500" />
        学习历程
      </h3>
      <div className="h-48 min-h-[192px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={`url(#barGradient)`} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                <stop offset="100%" stopColor="#0891b2" stopOpacity={0.8} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {history.map((h, i) => (
          <div key={i} className="bg-slate-50/50 rounded-lg p-2">
            <div className="text-xs text-slate-500">{h.date}</div>
            <div className="text-sm font-medium text-cyan-600">{h.count} 次互动</div>
            <div className="text-[10px] text-slate-400 mt-1">{h.topics.join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 里程碑网格
function MilestonesGrid({ milestones }) {
  const achieved = milestones.filter(m => m.achieved).length
  const total = milestones.length
  const [viewMode, setViewMode] = useState('card') // 'card' | 'table'

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          里程碑成就
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            已达成 <span className="font-semibold text-amber-600">{achieved}</span> / {total}
          </div>
          {/* 视图切换 */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <motion.button
              onClick={() => setViewMode('card')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
            >
              <LayoutGrid className="w-4 h-4 text-slate-600" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode('table')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded transition ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
            >
              <Table2 className="w-4 h-4 text-slate-600" />
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden rounded-xl border border-slate-200"
          >
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">成就名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">描述</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">达成日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {milestones.map((milestone, index) => (
                  <motion.tr
                    key={milestone.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-amber-50/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {milestone.achieved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-medium">
                          <Check className="w-3 h-3" /> 已达成
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                          <Lock className="w-3 h-3" /> 未解锁
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{milestone.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{milestone.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{milestone.date || '-'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {milestones.map(milestone => (
              <motion.div
                key={milestone.id}
                whileHover={{ scale: 1.02 }}
                className={`relative p-4 rounded-xl border transition-all ${
                  milestone.achieved
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                    : 'bg-slate-50/50 border-slate-200 opacity-60'
                }`}
              >
                {milestone.achieved && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`text-xl mb-2 ${milestone.achieved ? '' : 'opacity-50'}`}>
                  {milestone.achieved ? <Trophy className="w-6 h-6 text-amber-500" /> : <Lock className="w-6 h-6 text-slate-400" />}
                </div>
                <div className={`font-medium text-sm ${milestone.achieved ? 'text-amber-700' : 'text-slate-500'}`}>
                  {milestone.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">{milestone.description}</div>
                {milestone.achieved && milestone.date && (
                  <div className="text-[10px] text-amber-600 mt-2">{milestone.date}</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PersonalityPage
