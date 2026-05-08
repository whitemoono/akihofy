/**
 * 呼吸情绪卡片 - 情感化设计
 * 带有呼吸动画的情绪状态展示
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Heart, Zap, Crown, Wind } from 'lucide-react'

// 情绪配置
const EMOTION_CONFIG = {
  happy: {
    label: '开心',
    color: 'from-amber-400 to-orange-400',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    icon: Heart,
    mood: '愉悦',
  },
  sad: {
    label: '难过',
    color: 'from-blue-400 to-cyan-400',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    icon: Wind,
    mood: '低落',
  },
  angry: {
    label: '生气',
    color: 'from-rose-400 to-red-400',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    icon: Zap,
    mood: '激动',
  },
  excited: {
    label: '兴奋',
    color: 'from-pink-400 to-purple-400',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    icon: Zap,
    mood: '激活',
  },
  neutral: {
    label: '平静',
    color: 'from-slate-400 to-gray-400',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    icon: Heart,
    mood: '中性',
  },
  positive: {
    label: '积极',
    color: 'from-emerald-400 to-teal-400',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    icon: Heart,
    mood: '愉悦',
  },
  negative: {
    label: '消极',
    color: 'from-violet-400 to-purple-400',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    icon: Wind,
    mood: '压抑',
  },
  mixed: {
    label: '复杂',
    color: 'from-orange-400 to-amber-400',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    icon: Crown,
    mood: '复杂',
  },
}

export function BreathingEmotionCard({ emotion, compact = false }) {
  // 解析情绪数据
  const emotionData = useMemo(() => {
    if (!emotion) {
      return {
        category: 'neutral',
        pleasure: 0.5,
        arousal: 0.3,
        dominance: 0.5,
        intensity: 0.5,
        name: '平静',
        ...EMOTION_CONFIG.neutral,
      }
    }

    const category = emotion.category || emotion.name || 'neutral'
    const config = EMOTION_CONFIG[category] || EMOTION_CONFIG.neutral

    return {
      category,
      pleasure: emotion.pleasure ?? 0.5,
      arousal: emotion.arousal ?? 0.3,
      dominance: emotion.dominance ?? 0.5,
      intensity: emotion.intensity ?? 0.5,
      name: emotion.name || config.label,
      ...config,
    }
  }, [emotion])

  const { pleasure, arousal, dominance, intensity, ...config } = emotionData
  const Icon = config.icon

  // 呼吸动画速度基于唤醒度
  const breathDuration = arousal > 0.6 ? 1.5 : arousal > 0.3 ? 2.5 : 4

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: breathDuration, repeat: Infinity, ease: 'easeInOut' }}
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md`}
        >
          <Icon className="w-4 h-4 text-white" />
        </motion.div>
        <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800">情绪状态</h3>
        </div>
        <div className={`px-3 py-1 rounded-full ${config.bgColor} ${config.textColor} text-sm font-medium`}>
          {config.label}
        </div>
      </div>

      {/* 呼吸动画主体 */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          {/* 外圈呼吸效果 */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: breathDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.color} blur-xl`}
          />

          {/* 中圈 */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: breathDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: breathDuration * 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Icon className="w-12 h-12 text-white" />
            </motion.div>
          </motion.div>

          {/* 心跳脉冲 */}
          {config.category === 'positive' || config.category === 'happy' || config.category === 'excited' ? (
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className={`absolute inset-0 rounded-full border-2 border-white/50`}
            />
          ) : null}
        </div>
      </div>

      {/* PAD 数值 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <PADMeter label="愉悦" value={pleasure} color="amber" />
        <PADMeter label="唤醒" value={arousal} color="orange" />
        <PADMeter label="支配" value={dominance} color="blue" />
      </div>

      {/* 情绪强度 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">情绪强度</span>
          <span className={`font-medium ${intensity > 0.7 ? 'text-rose-600' : intensity > 0.4 ? 'text-amber-600' : 'text-slate-500'}`}>
            {(intensity * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intensity * 100}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full bg-gradient-to-r ${
              intensity > 0.7
                ? 'from-rose-400 to-red-400'
                : intensity > 0.4
                  ? 'from-amber-400 to-orange-400'
                  : 'from-slate-300 to-gray-400'
            }`}
          />
        </div>
      </div>

      {/* 情绪描述 */}
      <div className={`text-center p-3 rounded-xl ${config.bgColor}`}>
        <div className={`text-lg font-bold ${config.textColor}`}>{config.mood}</div>
        <div className="text-xs text-slate-500 mt-1">
          {getEmotionDescription(pleasure, arousal)}
        </div>
      </div>
    </div>
  )
}

// PAD 数值仪表
function PADMeter({ label, value, color }) {
  const colorMap = {
    amber: 'from-amber-400 to-orange-400',
    orange: 'from-orange-400 to-red-400',
    blue: 'from-blue-400 to-cyan-400',
    violet: 'from-violet-400 to-purple-400',
    emerald: 'from-emerald-400 to-teal-400',
  }

  return (
    <div className="text-center">
      <div className="relative w-12 h-12 mx-auto mb-1">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-slate-100"
          />
          <motion.circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className={`text-${color}-500`}
            strokeDasharray={`${((value + 1) / 2) * 125.6} 125.6`}
            initial={{ strokeDasharray: '0 125.6' }}
            animate={{ strokeDasharray: `${((value + 1) / 2) * 125.6} 125.6` }}
            transition={{ duration: 1 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-700">{((value + 1) * 50).toFixed(0)}</span>
        </div>
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

// 获取情绪描述
function getEmotionDescription(pleasure, arousal) {
  if (pleasure > 0.3 && arousal > 0.3) {
    return '愉悦激活状态，适合社交和创造'
  }
  if (pleasure > 0.3 && arousal <= 0.3) {
    return '平静满足状态，适合深度思考'
  }
  if (pleasure <= -0.3 && arousal > 0.3) {
    return '焦虑不安状态，需要情绪调节'
  }
  if (pleasure <= -0.3 && arousal <= -0.3) {
    return '低落平静状态，建议寻求积极互动'
  }
  return '情绪平稳状态'
}
