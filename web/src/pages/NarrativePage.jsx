/**
 * AKIHO 人生叙事页面
 * 展示人生故事、转折点、章节管理
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Clock, MapPin, TrendingUp, RefreshCw, ChevronRight, Star, Sparkles } from 'lucide-react'
import { useNarrative } from '../hooks/useMonitor'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export function NarrativePage() {
  const { narrative, loading, refresh } = useNarrative()

  const chapterCount = narrative?.chapter_count || 0
  const currentChapter = narrative?.current_chapter || '暂无篇章'
  const themes = narrative?.themes || []
  const turningPointCount = narrative?.turning_point_count || 0
  const lifeSummary = narrative?.life_summary || ''
  const recentStory = narrative?.recent_story || ''
  const chapters = narrative?.chapters || []
  const turningPoints = narrative?.turning_points || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">人生叙事</h1>
                <p className="text-xs text-slate-500">
                  故事章节、转折点与成长轨迹
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
          {/* 统计概览 */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-lg text-center">
                <BookOpen className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-800">{chapterCount}</div>
                <div className="text-xs text-slate-500">人生篇章</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-lg text-center">
                <MapPin className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-800">{turningPointCount}</div>
                <div className="text-xs text-slate-500">重要转折</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-lg text-center">
                <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-800">{themes.length}</div>
                <div className="text-xs text-slate-500">贯穿主题</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-lg text-center">
                <Star className="w-6 h-6 text-pink-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-800">
                  {turningPoints.filter(t => t.significance > 0.7).length}
                </div>
                <div className="text-xs text-slate-500">重大转折</div>
              </div>
            </div>
          </motion.div>

          {/* 当前篇章 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-500" />
                当前篇章
              </h2>

              {loading ? (
                <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              ) : chapterCount > 0 ? (
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border-2 border-violet-200">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">📖</span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{currentChapter}</h3>
                      <p className="text-sm text-slate-500">
                        正在经历的人生章节
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {chapterCount} 个篇章
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {turningPointCount} 个转折
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>人生篇章尚未开始</p>
                  <p className="text-sm mt-1">与 AKIHO 的互动将成为她的故事</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 人生时间线 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                人生时间线
              </h2>

              {loading ? (
                <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              ) : chapters.length > 0 ? (
                <div className="relative">
                  {/* 时间线 */}
                  <div className="flex items-center justify-between mb-6">
                    {chapters.slice(0, 7).map((chapter, index) => (
                      <div key={chapter.id || index} className="flex flex-col items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === chapters.length - 1
                              ? 'bg-violet-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {index + 1}
                        </motion.div>
                        <span className="text-xs text-slate-500 mt-1 max-w-[60px] text-center truncate">
                          {chapter.title?.substring(0, 8) || '篇章'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 连接线 */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-10" />
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p>暂无章节数据</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 主题分析 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                贯穿主题
              </h2>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : themes.length > 0 ? (
                <div className="space-y-3">
                  {themes.slice(0, 5).map((theme, index) => {
                    const intensity = 0.6 + (index * 0.08) // 模拟强度
                    return (
                      <div key={theme || index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700 font-medium">{theme}</span>
                          <span className="text-slate-500">{(intensity * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${intensity * 100}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p>暂无主题数据</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 转折点 */}
          {turningPointCount > 0 && (
            <motion.div variants={itemVariants}>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  重要转折点
                </h2>

                <div className="space-y-3">
                  {turningPoints.slice(0, 5).map((point, index) => (
                    <div
                      key={point.id || index}
                      className="p-3 bg-amber-50 rounded-xl border border-amber-100"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-medium text-amber-700">
                            {point.event || point.turning_type || '重要事件'}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">
                            {point.impact_description || point.description || '一个改变看法的事件'}
                          </p>
                        </div>
                        {point.significance > 0.7 && (
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-700 text-xs rounded-full">
                            重大
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 人生总结 */}
          {lifeSummary && (
            <motion.div variants={itemVariants}>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 backdrop-blur-xl rounded-2xl p-6 border border-violet-200">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  人生总结
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  {lifeSummary}
                </p>
                {recentStory && (
                  <div className="mt-4 p-3 bg-white/60 rounded-xl">
                    <p className="text-sm text-slate-600 italic">
                      "{recentStory.length > 150 ? recentStory.substring(0, 150) + '...' : recentStory}"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

export default NarrativePage
