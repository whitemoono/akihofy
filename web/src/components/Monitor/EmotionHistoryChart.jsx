/**
 * 情绪历史图表组件
 * 展示情绪变化趋势
 */

import { motion } from 'framer-motion'
import { TrendingUp, Clock } from 'lucide-react'
import { useMemo } from 'react'

// 情绪类型映射
const moodColors = {
  happy: { color: '#10b981', label: '开心' },
  sad: { color: '#3b82f6', label: '难过' },
  angry: { color: '#ef4444', label: '生气' },
  excited: { color: '#f59e0b', label: '兴奋' },
  tired: { color: '#6b7280', label: '疲惫' },
  shy: { color: '#ec4899', label: '害羞' },
  neutral: { color: '#94a3b8', label: '平静' },
}

function MoodDot({ mood, size = 8 }) {
  const config = moodColors[mood] || moodColors.neutral
  return (
    <div
      className="rounded-full border-2 border-white shadow-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: config.color,
      }}
      title={config.label}
    />
  )
}

function SimpleLineChart({ data, height = 120 }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400">
        数据不足
      </div>
    )
  }

  const width = 100 // 百分比宽度
  const padding = 10
  const chartHeight = height - padding * 2
  const chartWidth = width - padding * 2

  const maxIntensity = Math.max(...data.map(d => d.intensity))
  const minIntensity = Math.min(...data.map(d => d.intensity))
  const range = maxIntensity - minIntensity || 1

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((d.intensity - minIntensity) / range) * chartHeight
    return { x, y, ...d }
  })

  // 生成平滑曲线路径
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`
    const prev = points[i - 1]
    const cpx = (prev.x + point.x) / 2
    return `${path} Q ${cpx} ${prev.y}, ${point.x} ${point.y}`
  }, '')

  // 生成填充区域路径
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`

  return (
    <svg width="100%" height={height} className="overflow-visible">
      {/* 网格线 */}
      {[0.25, 0.5, 0.75, 1].map((tick) => (
        <line
          key={tick}
          x1={padding}
          y1={padding + chartHeight * (1 - tick)}
          x2={chartWidth + padding}
          y2={padding + chartHeight * (1 - tick)}
          stroke="#e2e8f0"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      ))}

      {/* 填充区域 */}
      <defs>
        <linearGradient id="emotionGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill="url(#emotionGradient)"
      />

      {/* 线条 */}
      <path
        d={linePath}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 数据点 */}
      {points.map((point, i) => (
        <motion.g
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <circle
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            stroke="#8b5cf6"
            strokeWidth="2"
          />
        </motion.g>
      ))}
    </svg>
  )
}

function MoodDistribution({ history }) {
  const distribution = useMemo(() => {
    if (!history || history.length === 0) return []

    const counts = {}
    history.forEach(h => {
      counts[h.mood] = (counts[h.mood] || 0) + 1
    })

    return Object.entries(counts)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: (count / history.length) * 100,
        ...moodColors[mood],
      }))
      .sort((a, b) => b.count - a.count)
  }, [history])

  if (!distribution || distribution.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-slate-400">
        暂无数据
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {distribution.slice(0, 5).map((item, index) => (
        <div key={item.mood} className="flex items-center gap-2">
          <MoodDot mood={item.mood} size={6} />
          <span className="text-xs text-slate-600 w-12">{item.label}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.percentage}%` }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
            />
          </div>
          <span className="text-xs text-slate-400 w-10 text-right">
            {item.percentage.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export function EmotionHistoryChart({ emotion }) {
  const history = emotion?.history || []

  // 计算统计数据
  const stats = useMemo(() => {
    if (history.length === 0) {
      return {
        total: 0,
        avgIntensity: 0,
        maxIntensity: 0,
        mostCommonMood: null,
      }
    }

    const intensities = history.map(h => h.intensity)
    const moodCounts = {}
    history.forEach(h => {
      moodCounts[h.mood] = (moodCounts[h.mood] || 0) + 1
    })
    const mostCommonMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0]

    return {
      total: history.length,
      avgIntensity: intensities.reduce((a, b) => a + b, 0) / intensities.length,
      maxIntensity: Math.max(...intensities),
      mostCommonMood,
    }
  }, [history])

  // 时间范围标签
  const timeRange = history.length > 0
    ? `${new Date(history[0].timestamp * 1000).toLocaleTimeString()} - ${new Date(history[history.length - 1].timestamp * 1000).toLocaleTimeString()}`
    : '暂无数据'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">情绪历史</h3>
            <p className="text-xs text-slate-500">Emotion History</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{timeRange}</span>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">记录数</p>
          <p className="text-lg font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">平均强度</p>
          <p className="text-lg font-bold text-violet-600">
            {(stats.avgIntensity * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">峰值</p>
          <p className="text-lg font-bold text-emerald-600">
            {(stats.maxIntensity * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">情绪强度趋势</span>
          {stats.mostCommonMood && (
            <div className="flex items-center gap-1">
              <MoodDot mood={stats.mostCommonMood} size={6} />
              <span className="text-xs text-slate-600">
                主要: {moodColors[stats.mostCommonMood]?.label}
              </span>
            </div>
          )}
        </div>
        <SimpleLineChart data={history} height={140} />
      </div>

      {/* 情绪分布 */}
      <div>
        <span className="text-sm font-medium text-slate-700 mb-2 block">情绪分布</span>
        <MoodDistribution history={history} />
      </div>
    </motion.div>
  )
}
