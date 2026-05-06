/**
 * AKIHO 认知偏差卡片组件
 * 展示当前活跃的认知偏差和偏差倾向
 */

import { motion } from 'framer-motion'
import { Brain, Eye, AlertCircle, TrendingDown } from 'lucide-react'

export function CognitiveBiasCard({ bias, loading }) {
  const activeBiases = bias?.active_biases || []
  const tendencies = bias?.bias_tendencies || {}

  // 偏差类型映射
  const biasTypeConfig = {
    confirmation: {
      label: '确认偏差',
      description: '倾向于寻找支持自己观点的证据',
      color: 'amber',
    },
    anchoring: {
      label: '锚定效应',
      description: '过度依赖第一个获得的信息',
      color: 'violet',
    },
    recency: {
      label: '近因效应',
      description: '最近发生的事情影响更大',
      color: 'sky',
    },
    availability: {
      label: '可得性启发',
      description: '容易想到的就是可能的',
      color: 'teal',
    },
    optimism: {
      label: '乐观偏差',
      description: '过高估计积极结果的可能性',
      color: 'emerald',
    },
    sunk_cost: {
      label: '沉没成本',
      description: '因为已投入而难以放弃',
      color: 'rose',
    },
    halo: {
      label: '光环效应',
      description: '一个优点影响对整体的判断',
      color: 'pink',
    },
    hindsight: {
      label: '后见之明',
      description: '事后认为结果显而易见',
      color: 'indigo',
    },
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-slate-800">认知偏差</h3>
        {activeBiases.length > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
            {activeBiases.length} 个活跃
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : activeBiases.length > 0 ? (
        <div className="space-y-3">
          {/* 当前活跃偏差 */}
          {activeBiases.map((biasItem, index) => {
            const config = biasTypeConfig[biasItem.type] || {
              label: biasItem.type,
              description: '未知偏差',
              color: 'slate',
            }
            return (
              <div
                key={biasItem.type || index}
                className="p-3 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div>
                    <span className="text-sm font-medium text-slate-700">{config.label}</span>
                    <p className="text-xs text-slate-500">{config.description}</p>
                  </div>
                </div>
                <BiasBar value={biasItem.intensity} color={config.color} />
                {biasItem.triggered_by && (
                  <p className="text-xs text-slate-400 mt-2">
                    触发: {biasItem.triggered_by}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无活跃偏差</p>
          <p className="text-xs mt-1">推理过程正常</p>
        </div>
      )}

      {/* 偏差倾向（认知指纹） */}
      {Object.keys(tendencies).length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1 mb-2">
            <Eye className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-500">认知指纹</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(tendencies).map(([type, value]) => {
              const config = biasTypeConfig[type] || { label: type, color: 'slate' }
              return (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 truncate">{config.label}</span>
                  <div className="ml-auto flex-1 max-w-[60px]">
                    <BiasBar value={value} color={config.color} compact />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function BiasBar({ value, color, compact = false }) {
  const colors = {
    amber: { bg: 'bg-amber-100', fill: 'bg-gradient-to-r from-amber-400 to-orange-500' },
    violet: { bg: 'bg-violet-100', fill: 'bg-gradient-to-r from-violet-400 to-purple-500' },
    sky: { bg: 'bg-sky-100', fill: 'bg-gradient-to-r from-sky-400 to-blue-500' },
    teal: { bg: 'bg-teal-100', fill: 'bg-gradient-to-r from-teal-400 to-cyan-500' },
    emerald: { bg: 'bg-emerald-100', fill: 'bg-gradient-to-r from-emerald-400 to-teal-500' },
    rose: { bg: 'bg-rose-100', fill: 'bg-gradient-to-r from-rose-400 to-pink-500' },
    pink: { bg: 'bg-pink-100', fill: 'bg-gradient-to-r from-pink-400 to-rose-500' },
    indigo: { bg: 'bg-indigo-100', fill: 'bg-gradient-to-r from-indigo-400 to-purple-500' },
    slate: { bg: 'bg-slate-100', fill: 'bg-gradient-to-r from-slate-400 to-slate-500' },
  }

  const c = colors[color] || colors.slate

  return (
    <div className={`h-1.5 ${c.bg} rounded-full overflow-hidden`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${(value || 0) * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full ${c.fill} rounded-full`}
      />
    </div>
  )
}

export default CognitiveBiasCard
