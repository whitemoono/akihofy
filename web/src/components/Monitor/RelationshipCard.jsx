/**
 * 关系系统卡片组件
 * 展示关系等级、亲密度、信任度、互动统计
 */

import { motion } from 'framer-motion'
import { Heart, Users, Clock, MessageCircle, Shield, Star, User, Gem } from 'lucide-react'

// 关系等级配置
const relationshipConfig = {
  stranger: { label: '陌生人', color: 'slate', gradient: 'from-slate-400 to-gray-500', level: 1 },
  acquaintance: { label: '熟人', color: 'blue', gradient: 'from-blue-400 to-indigo-500', level: 2 },
  friend: { label: '朋友', color: 'emerald', gradient: 'from-emerald-400 to-teal-500', level: 3 },
  close: { label: '挚友', color: 'violet', gradient: 'from-violet-400 to-purple-500', level: 4 },
  intimate: { label: '亲密', color: 'rose', gradient: 'from-rose-400 to-pink-500', level: 5 },
}

const relationshipIcons = {
  stranger: User,
  acquaintance: Users,
  friend: Heart,
  close: Star,
  intimate: Gem,
}

function ProgressBar({ value, color, label, showValue = true }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        {showValue && (
          <span className="text-slate-700 font-medium">{Math.round(value * 100)}%</span>
        )}
      </div>
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${
            color === 'purple' ? 'from-violet-500 to-purple-500' :
            color === 'yellow' ? 'from-amber-400 to-yellow-500' :
            color === 'blue' ? 'from-blue-400 to-indigo-500' :
            `from-${color}-400 to-${color}-500`
          } rounded-full`}
        />
      </div>
    </div>
  )
}

function StatItem({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 p-2.5 bg-slate-50/50 rounded-lg">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
        color === 'purple' ? 'from-violet-100 to-purple-100 text-violet-600' :
        color === 'yellow' ? 'from-amber-100 to-yellow-100 text-amber-600' :
        color === 'blue' ? 'from-blue-100 to-indigo-100 text-blue-600' :
        'from-slate-100 to-gray-100 text-slate-600'
      } flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function RelationshipLevelBar({ currentLevel }) {
  return (
    <div className="flex items-center justify-center gap-1 py-2">
      {[1, 2, 3, 4, 5].map((level) => {
        const isActive = level <= currentLevel
        const config = Object.values(relationshipConfig)[level - 1]
        return (
          <motion.div
            key={level}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: level * 0.1 }}
            className="relative"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                isActive
                  ? `bg-gradient-to-br ${config.gradient} text-white shadow-md`
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {level}
            </div>
            {level < 5 && (
              <div className={`absolute top-1/2 -right-2 w-2 h-0.5 ${
                level < currentLevel ? 'bg-violet-300' : 'bg-slate-200'
              }`} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export function RelationshipCard({ relationship }) {
  const rel = relationship?.relationship || 'stranger'
  const intimacy = relationship?.intimacy || 0
  const trust = relationship?.trust || 0
  const interactionCount = relationship?.interaction_count || 0
  const lastInteraction = relationship?.last_interaction || Date.now() / 1000

  const relConfig = relationshipConfig[rel] || relationshipConfig.stranger
  const RelIcon = relationshipIcons[rel] || User

  // 计算距离上次互动的时间
  const timeSinceLastInteraction = Math.floor((Date.now() / 1000 - lastInteraction) / 60)
  const timeDisplay = timeSinceLastInteraction < 1
    ? '刚刚'
    : timeSinceLastInteraction < 60
    ? `${timeSinceLastInteraction} 分钟前`
    : timeSinceLastInteraction < 1440
    ? `${Math.floor(timeSinceLastInteraction / 60)} 小时前`
    : `${Math.floor(timeSinceLastInteraction / 1440)} 天前`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${relConfig.gradient} flex items-center justify-center`}>
            <RelIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">关系系统</h3>
            <p className="text-xs text-slate-500">Relationship System</p>
          </div>
        </div>
      </div>

      {/* 当前关系等级 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-slate-500 mb-1">当前关系</p>
            <p className={`text-2xl font-bold ${
              rel === 'intimate' ? 'text-rose-600' :
              rel === 'close' ? 'text-violet-600' :
              rel === 'friend' ? 'text-emerald-600' :
              'text-slate-700'
            }`}>
              {relConfig.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-1">等级</p>
            <p className="text-2xl font-bold text-slate-800">
              {relConfig.level}
              <span className="text-sm font-normal text-slate-400">/5</span>
            </p>
          </div>
        </div>

        {/* 等级进度条 */}
        <RelationshipLevelBar currentLevel={relConfig.level} />
      </div>

      {/* 亲密度和信任度 */}
      <div className="space-y-3 mb-4">
        <ProgressBar
          value={intimacy}
          color="purple"
          label="亲密度"
        />
        <ProgressBar
          value={trust}
          color="yellow"
          label="信任度"
        />
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem
          icon={MessageCircle}
          label="互动次数"
          value={interactionCount}
          color="purple"
        />
        <StatItem
          icon={Clock}
          label="最后互动"
          value={timeDisplay}
          color="blue"
        />
      </div>

      {/* 提示 */}
      <div className="mt-4 pt-3 border-t border-slate-200/50">
        <p className="text-xs text-slate-400">
          {intimacy < 0.2
            ? '关系刚开始，继续互动吧~'
            : intimacy < 0.4
            ? '正在熟悉彼此...'
            : intimacy < 0.6
            ? '已经成为朋友了'
            : intimacy < 0.8
            ? '关系越来越亲密'
            : '是非常重要的存在！'}
        </p>
      </div>
    </motion.div>
  )
}
