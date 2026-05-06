/**
 * AKIHO 欲望卡片组件
 * 展示当前活跃的欲望列表和主导欲望
 */

import { motion } from 'framer-motion'
import { Flame, AlertTriangle, Sparkles } from 'lucide-react'

export function DesireCard({ desires, loading }) {
  const activeDesires = desires?.active_desires || []
  const dominantDesire = desires?.dominant_desire

  // 欲望类型映射
  const desireTypeConfig = {
    curious: { label: '好奇', color: 'sky', priority: 1 },
    social: { label: '社交', color: 'pink', priority: 2 },
    rest: { label: '休息', color: 'indigo', priority: 3 },
    create: { label: '创造', color: 'amber', priority: 4 },
    learn: { label: '学习', color: 'emerald', priority: 5 },
    explore: { label: '探索', color: 'violet', priority: 6 },
    achieve: { label: '成就', color: 'orange', priority: 7 },
    affiliation: { label: '归属', color: 'rose', priority: 8 },
  }

  // 排序欲望
  const sortedDesires = [...activeDesires].sort((a, b) => b.intensity - a.intensity)

  // 检测欲望冲突
  const hasConflict = sortedDesires.length > 1 &&
    sortedDesires[0].intensity - (sortedDesires[1]?.intensity || 0) < 0.2

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
          <Flame className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-slate-800">欲望状态</h3>
        {hasConflict && (
          <div className="ml-auto flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>冲突中</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : sortedDesires.length > 0 ? (
        <div className="space-y-3">
          {/* 主导欲望 */}
          {sortedDesires[0] && (
            <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {desireTypeConfig[sortedDesires[0].name]?.label || sortedDesires[0].name}
                </span>
                <span className="ml-auto text-xs px-2 py-0.5 bg-orange-200 text-orange-700 rounded-full">
                  主导
                </span>
              </div>
              <DesireBar
                value={sortedDesires[0].intensity}
                color="orange"
              />
            </div>
          )}

          {/* 其他欲望列表 */}
          {sortedDesires.slice(1, 5).map((desire, index) => {
            const config = desireTypeConfig[desire.name] || { label: desire.name, color: 'slate' }
            return (
              <div key={desire.name || index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{config.label}</span>
                    <span className="text-slate-500">{(desire.intensity * 100).toFixed(0)}%</span>
                  </div>
                  <DesireBar value={desire.intensity} color={config.color} compact />
                </div>
              </div>
            )
          })}

          {/* 欲望冲突提示 */}
          {hasConflict && (
            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                当前存在多个强度相近的欲望，可能会产生决策冲突
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无活跃欲望</p>
        </div>
      )}

      {/* 欲望统计 */}
      {sortedDesires.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
          <span>活跃欲望: {sortedDesires.length}</span>
          <span>主导: {desireTypeConfig[sortedDesires[0]?.name]?.label || '未知'}</span>
        </div>
      )}
    </motion.div>
  )
}

function DesireBar({ value, color, compact = false }) {
  const colors = {
    orange: { bg: 'bg-orange-100', fill: 'bg-gradient-to-r from-orange-400 to-red-500' },
    pink: { bg: 'bg-pink-100', fill: 'bg-gradient-to-r from-pink-400 to-rose-500' },
    indigo: { bg: 'bg-indigo-100', fill: 'bg-gradient-to-r from-indigo-400 to-purple-500' },
    amber: { bg: 'bg-amber-100', fill: 'bg-gradient-to-r from-amber-400 to-orange-500' },
    emerald: { bg: 'bg-emerald-100', fill: 'bg-gradient-to-r from-emerald-400 to-teal-500' },
    violet: { bg: 'bg-violet-100', fill: 'bg-gradient-to-r from-violet-400 to-purple-500' },
    slate: { bg: 'bg-slate-100', fill: 'bg-gradient-to-r from-slate-400 to-slate-500' },
  }

  const c = colors[color] || colors.orange

  return (
    <div className={`h-2 ${c.bg} rounded-full overflow-hidden ${compact ? '' : ''}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${(value || 0) * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full ${c.fill} rounded-full`}
      />
    </div>
  )
}

export default DesireCard
