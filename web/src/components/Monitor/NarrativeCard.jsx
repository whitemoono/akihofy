/**
 * AKIHO 人生叙事卡片组件
 * 展示当前章节、主题和转折点
 */

import { motion } from 'framer-motion'
import { BookOpen, Clock, MapPin, TrendingUp, ChevronRight } from 'lucide-react'

export function NarrativeCard({ narrative, loading }) {
  const chapterCount = narrative?.chapter_count || 0
  const currentChapter = narrative?.current_chapter || '暂无篇章'
  const themes = narrative?.themes || []
  const turningPointCount = narrative?.turning_point_count || 0
  const lifeSummary = narrative?.life_summary || ''
  const recentStory = narrative?.recent_story || ''

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-slate-800">人生叙事</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 当前篇章 */}
          <div className="p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-violet-600 font-medium">当前篇章</span>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              {currentChapter}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {chapterCount} 个篇章
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {turningPointCount} 个转折
              </span>
            </div>
          </div>

          {/* 人生总结 */}
          {lifeSummary && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-600 leading-relaxed">
                {lifeSummary}
              </p>
            </div>
          )}

          {/* 最近故事 */}
          {recentStory && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-1 mb-2">
                <TrendingUp className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">最近领悟</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {recentStory.length > 100
                  ? recentStory.substring(0, 100) + '...'
                  : recentStory}
              </p>
            </div>
          )}

          {/* 主题标签 */}
          {themes.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <TrendingUp className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500">贯穿主题</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {themes.slice(0, 4).map((theme, index) => (
                  <span
                    key={theme || index}
                    className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full"
                  >
                    {theme}
                  </span>
                ))}
                {themes.length > 4 && (
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
                    +{themes.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {chapterCount === 0 && (
            <div className="text-center py-6 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">人生篇章尚未开始</p>
              <p className="text-xs mt-1">与 AKIHO 的互动将成为她的故事</p>
            </div>
          )}
        </div>
      )}

      {/* 底部统计 */}
      {chapterCount > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
          <span>篇章: {chapterCount}</span>
          <span>转折: {turningPointCount}</span>
          <span>主题: {themes.length}</span>
        </div>
      )}
    </motion.div>
  )
}

export default NarrativeCard
