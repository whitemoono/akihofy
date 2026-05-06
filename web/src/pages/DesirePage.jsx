/**
 * AKIHO 欲望系统页面
 * 展示欲望详情、欲望冲突可视化
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, AlertTriangle, RefreshCw, TrendingUp, Sparkles, HelpCircle, Users, Moon, Zap, BookOpen, Compass, Trophy, Heart, Circle } from 'lucide-react'
import { useDesires } from '../hooks/useMonitor'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// 欲望类型配置
const desireTypeConfig = {
  curious: { label: '好奇', color: 'sky', bg: 'bg-sky-50', border: 'border-sky-200' },
  social: { label: '社交', color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200' },
  rest: { label: '休息', color: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  create: { label: '创造', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200' },
  learn: { label: '学习', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  explore: { label: '探索', color: 'violet', bg: 'bg-violet-50', border: 'border-violet-200' },
  achieve: { label: '成就', color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200' },
  affiliation: { label: '归属', color: 'rose', bg: 'bg-rose-50', border: 'border-rose-200' },
}

const desireIcons = {
  curious: HelpCircle,
  social: Users,
  rest: Moon,
  create: Zap,
  learn: BookOpen,
  explore: Compass,
  achieve: Trophy,
  affiliation: Heart,
}

export function DesirePage() {
  const { desires, loading, refresh } = useDesires()

  const activeDesires = desires?.active_desires || []
  const dominantDesire = desires?.dominant_desire

  // 排序欲望
  const sortedDesires = [...activeDesires].sort((a, b) => b.intensity - a.intensity)

  // 检测欲望冲突
  const hasConflict = sortedDesires.length > 1 &&
    sortedDesires[0].intensity - (sortedDesires[1]?.intensity || 0) < 0.2

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">欲望系统</h1>
                <p className="text-xs text-slate-500">
                  内在驱动力与欲望冲突
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition text-slate-600"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">刷新</span>
            </motion.button>
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
          {/* 主导欲望 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                主导欲望
              </h2>

              {loading ? (
                <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
              ) : sortedDesires.length > 0 && sortedDesires[0] ? (
                <div className="relative">
                  <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
                    <div className="flex items-center gap-4 mb-4">
                      {(() => {
                        const Icon = desireIcons[sortedDesires[0].name] || Circle
                        return (
                          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                            desireTypeConfig[sortedDesires[0].name]?.color === 'sky' ? 'from-sky-400 to-blue-500' :
                            desireTypeConfig[sortedDesires[0].name]?.color === 'pink' ? 'from-pink-400 to-rose-500' :
                            desireTypeConfig[sortedDesires[0].name]?.color === 'indigo' ? 'from-indigo-400 to-purple-500' :
                            desireTypeConfig[sortedDesires[0].name]?.color === 'amber' ? 'from-amber-400 to-orange-500' :
                            desireTypeConfig[sortedDesires[0].name]?.color === 'emerald' ? 'from-emerald-400 to-teal-500' :
                            desireTypeConfig[sortedDesires[0].name]?.color === 'violet' ? 'from-violet-400 to-purple-500' :
                            desireTypeConfig[sortedDesires[0].name]?.color === 'rose' ? 'from-rose-400 to-pink-500' :
                            'from-orange-400 to-red-500'
                          } flex items-center justify-center`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                        )
                      })()}
                      <div>
                        <span className="text-2xl font-bold text-orange-600">
                          {desireTypeConfig[sortedDesires[0].name]?.label || sortedDesires[0].name}
                        </span>
                        <p className="text-sm text-slate-500 mt-1">
                          当前最强烈的欲望
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-3xl font-bold text-orange-600">
                          {(sortedDesires[0].intensity * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-slate-500">强度</div>
                      </div>
                    </div>
                    <div className="h-4 bg-orange-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${sortedDesires[0].intensity * 100}%` }}
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无活跃欲望</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 欲望冲突检测 */}
          {hasConflict && (
            <motion.div variants={itemVariants}>
              <div className="bg-amber-50 backdrop-blur-xl rounded-2xl p-4 border-2 border-amber-300">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">欲望冲突检测</span>
                </div>
                <p className="text-sm text-amber-600 mt-2">
                  当前存在多个强度相近的欲望，可能会产生决策冲突。
                  主要冲突：{desireTypeConfig[sortedDesires[0]?.name]?.label} vs {desireTypeConfig[sortedDesires[1]?.name]?.label}
                </p>
              </div>
            </motion.div>
          )}

          {/* 欲望冲突图 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                欲望强度对比
              </h2>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : sortedDesires.length > 0 ? (
                <div className="space-y-4">
                  {sortedDesires.map((desire, index) => {
                    const config = desireTypeConfig[desire.name] || {
                      label: desire.name,
                      color: 'slate',
                      bg: 'bg-slate-50',
                      border: 'border-slate-200',
                    }
                    const Icon = desireIcons[desire.name] || Circle
                    return (
                      <div key={desire.name || index} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg bg-${config.color}-100 flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 text-${config.color}-600`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className={`text-sm font-medium text-${config.color}-600`}>
                              {config.label}
                            </span>
                            <span className="text-sm text-slate-500">
                              {(desire.intensity * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className={`h-3 ${config.bg} rounded-full overflow-hidden`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${desire.intensity * 100}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                              className={`h-full bg-gradient-to-r ${
                                index === 0
                                  ? 'from-orange-400 to-red-500'
                                  : `from-${config.color}-400 to-${config.color}-500`
                              } rounded-full`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>暂无欲望数据</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 欲望详情列表 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-slate-500" />
                欲望详情
              </h2>

              {sortedDesires.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedDesires.map((desire, index) => {
                    const config = desireTypeConfig[desire.name] || desireTypeConfig.curious
                    const Icon = desireIcons[desire.name] || Circle
                    return (
                      <div
                        key={desire.name || index}
                        className={`p-4 rounded-xl ${config.bg} ${config.border} border`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-lg bg-white/50 flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 text-${config.color}-600`} />
                          </div>
                          <div>
                            <span className={`text-lg font-semibold text-${config.color}-700`}>
                              {config.label}
                            </span>
                            <p className="text-xs text-slate-500">
                              {index === 0 ? '主导欲望' : `第 ${index + 1} 强烈`}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-slate-500">强度</span>
                            <div className="font-medium">{(desire.intensity * 100).toFixed(0)}%</div>
                          </div>
                          <div>
                            <span className="text-slate-500">紧迫度</span>
                            <div className="font-medium">{(desire.urgency * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>暂无欲望数据</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

export default DesirePage
