/**
 * 情绪系统卡片组件
 * 展示情绪状态、PAD模型、历史变化
 */

import { motion } from 'framer-motion'
import { Brain, TrendingUp, TrendingDown, Minus, Smile, Frown, Angry, Sparkles, Moon, Heart } from 'lucide-react'

// 情绪类型映射
const moodConfig = {
  happy: { label: '开心', color: 'emerald', gradient: 'from-emerald-400 to-teal-500' },
  sad: { label: '难过', color: 'blue', gradient: 'from-blue-400 to-indigo-500' },
  angry: { label: '生气', color: 'red', gradient: 'from-red-400 to-orange-500' },
  excited: { label: '兴奋', color: 'yellow', gradient: 'from-yellow-400 to-amber-500' },
  tired: { label: '疲惫', color: 'slate', gradient: 'from-slate-400 to-gray-500' },
  shy: { label: '害羞', color: 'pink', gradient: 'from-pink-400 to-rose-500' },
  neutral: { label: '平静', color: 'gray', gradient: 'from-gray-400 to-slate-500' },
}

const moodIcons = {
  happy: Smile,
  sad: Frown,
  angry: Angry,
  excited: Sparkles,
  tired: Moon,
  shy: Heart,
  neutral: Minus,
}

// PAD 维度配置
const padConfig = {
  pleasure: { label: '愉悦度', desc: '正面/负面情感', min: -1, max: 1 },
  arousal: { label: '激活度', desc: '兴奋/平静状态', min: 0, max: 1 },
  dominance: { label: '控制感', desc: '主导/顺从态度', min: 0, max: 1 },
}

function PadBar({ label, desc, value, min, max }) {
  const percentage = ((value - min) / (max - min)) * 100
  const isPositive = value > 0

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">{desc}</span>
      </div>
      <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
        {/* 中心线 */}
        <div
          className="absolute top-0 bottom-0 w-px bg-slate-400/50"
          style={{ left: '50%' }}
        />
        {/* 值指示器 */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.abs(percentage - 50)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`absolute top-0 bottom-0 rounded-full ${
            isPositive ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
          style={{
            left: isPositive ? '50%' : `${percentage}%`,
          }}
        />
        {/* 刻度 */}
        <div className="absolute inset-0 flex justify-between px-1">
          <span className="text-[8px] text-slate-400 self-start">{min}</span>
          <span className="text-[8px] text-slate-400 self-start">{(min + max) / 2}</span>
          <span className="text-[8px] text-slate-400 self-start">{max}</span>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-sm font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {value.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

function MoodTrendIndicator({ history }) {
  if (!history || history.length < 2) {
    return <Minus className="w-4 h-4 text-slate-400" />
  }

  const recent = history.slice(-3)
  const first = recent[0]?.intensity || 0.5
  const last = recent[recent.length - 1]?.intensity || 0.5
  const diff = last - first

  if (diff > 0.1) {
    return <TrendingUp className="w-4 h-4 text-emerald-500" />
  } else if (diff < -0.1) {
    return <TrendingDown className="w-4 h-4 text-rose-500" />
  }
  return <Minus className="w-4 h-4 text-slate-400" />
}

export function EmotionCard({ emotion }) {
  const moodKey = emotion?.mood || 'neutral'
  const mood = moodConfig[moodKey] || moodConfig.neutral
  const MoodIcon = moodIcons[moodKey] || Minus
  const intensity = emotion?.intensity || 0
  const pad = emotion?.pad || { pleasure: 0, arousal: 0.5, dominance: 0.5 }
  const history = emotion?.history || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${mood.gradient} flex items-center justify-center`}>
            <MoodIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">情绪系统</h3>
            <p className="text-xs text-slate-500">Emotion System</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <MoodTrendIndicator history={history} />
          <span className="text-xs text-slate-500">情绪趋势</span>
        </div>
      </div>

      {/* 当前情绪 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">当前状态</p>
            <p className="text-2xl font-bold" style={{ color: `var(--${mood.color}-600)` }}>
              {mood.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-1">情绪强度</p>
            <p className="text-2xl font-bold text-slate-800">
              {(intensity * 100).toFixed(0)}
              <span className="text-sm font-normal text-slate-400">%</span>
            </p>
          </div>
        </div>

        {/* 强度条 */}
        <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intensity * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${mood.gradient} rounded-full`}
          />
        </div>
      </div>

      {/* PAD 模型 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">PAD 情感模型</span>
        </div>

        <PadBar
          label={padConfig.pleasure.label}
          desc={padConfig.pleasure.desc}
          value={pad.pleasure}
          min={padConfig.pleasure.min}
          max={padConfig.pleasure.max}
        />

        <PadBar
          label={padConfig.arousal.label}
          desc={padConfig.arousal.desc}
          value={pad.arousal}
          min={padConfig.arousal.min}
          max={padConfig.arousal.max}
        />

        <PadBar
          label={padConfig.dominance.label}
          desc={padConfig.dominance.desc}
          value={pad.dominance}
          min={padConfig.dominance.min}
          max={padConfig.dominance.max}
        />
      </div>

      {/* 历史记录数 */}
      {history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200/50">
          <p className="text-xs text-slate-400">
            历史记录: {history.length} 条
            {history.length >= 50 && ' (已满)'}
          </p>
        </div>
      )}
    </motion.div>
  )
}
