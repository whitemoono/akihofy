/**
 * AKIHO 意图卡片组件
 * 展示当前意图状态、强度和承诺度
 */

import { motion } from 'framer-motion'
import { Target, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react'

export function IntentCard({ intent, loading }) {
  const currentIntent = intent?.current_intent
  const activeIntents = intent?.active_intents || []

  // 意图类型映射
  const intentTypeLabels = {
    want: { label: '想要', color: 'teal' },
    need: { label: '需要', color: 'amber' },
    should: { label: '应该', color: 'violet' },
    curious: { label: '好奇', color: 'sky' },
    connect: { label: '连接', color: 'pink' },
  }

  const typeInfo = currentIntent
    ? intentTypeLabels[currentIntent.intent_type] || intentTypeLabels.want
    : null

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
          <Target className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-slate-800">意图状态</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : currentIntent ? (
        <div className="space-y-4">
          {/* 当前意图详情 */}
          <div className="p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${typeInfo.color}-100 text-${typeInfo.color}-600`}>
                {typeInfo?.label}
              </span>
            </div>
            <div className="text-sm text-slate-700 font-medium">
              {currentIntent.target || '暂无目标'}
            </div>
          </div>

          {/* 强度和承诺 */}
          <div className="space-y-2">
            <IntentBar
              label="意图强度"
              value={currentIntent.intensity}
              color="teal"
              icon={<TrendingUp className="w-3 h-3" />}
            />
            <IntentBar
              label="承诺强度"
              value={currentIntent.commitment_strength}
              color="amber"
              icon={<CheckCircle className="w-3 h-3" />}
            />
          </div>

          {/* 创建时间 */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            <span>
              {currentIntent.created_at
                ? new Date(currentIntent.created_at).toLocaleString('zh-CN')
                : '未知'}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无活跃意图</p>
        </div>
      )}

      {/* 活跃意图列表 */}
      {activeIntents.length > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">其他活跃意图</p>
          <div className="flex flex-wrap gap-1">
            {activeIntents.slice(1, 4).map((intent, index) => (
              <span
                key={intent.id || index}
                className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full"
              >
                {intent.target || intent.intent_type}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function IntentBar({ label, value, color, icon }) {
  const colors = {
    teal: { bg: 'bg-teal-100', fill: 'bg-gradient-to-r from-teal-400 to-cyan-500' },
    amber: { bg: 'bg-amber-100', fill: 'bg-gradient-to-r from-amber-400 to-orange-500' },
    violet: { bg: 'bg-violet-100', fill: 'bg-gradient-to-r from-violet-400 to-purple-500' },
    pink: { bg: 'bg-pink-100', fill: 'bg-gradient-to-r from-pink-400 to-rose-500' },
  }

  const c = colors[color] || colors.teal

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500 flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="font-medium text-slate-700">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className={`h-2 ${c.bg} rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value || 0) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full ${c.fill} rounded-full`}
        />
      </div>
    </div>
  )
}

export default IntentCard
