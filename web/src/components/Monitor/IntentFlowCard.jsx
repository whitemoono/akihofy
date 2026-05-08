/**
 * 意图流程卡片 - 情感化设计
 * 展示意图生命周期流程可视化
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Lightbulb, Scale, Rocket, CheckCircle, XCircle, Clock } from 'lucide-react'

// 阶段配置
const STAGE_CONFIG = {
  Desire: {
    icon: Lightbulb,
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    label: '欲望',
    description: '产生行动动机',
  },
  Deliberation: {
    icon: Scale,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    label: '权衡',
    description: '评估可行方案',
  },
  Commitment: {
    icon: Target,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    label: '承诺',
    description: '确定行动目标',
  },
  Execution: {
    icon: Rocket,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    label: '执行',
    description: '实施行动计划',
  },
  Completed: {
    icon: CheckCircle,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    label: '完成',
    description: '目标达成',
  },
  Abandoned: {
    icon: XCircle,
    color: 'from-slate-400 to-gray-500',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-500',
    label: '放弃',
    description: '终止当前意图',
  },
}

export function IntentFlowCard({ intent, compact = false }) {
  // 解析意图数据
  const intentData = useMemo(() => {
    if (!intent) {
      return {
        current_intent: null,
        active_intents: [],
        completed_count: 0,
      }
    }

    return {
      current_intent: intent.current_intent || intent.active_intents?.[0] || null,
      active_intents: intent.active_intents || [],
      completed_count: intent.completed_count || 0,
    }
  }, [intent])

  const { current_intent, active_intents, completed_count } = intentData

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {current_intent ? (
          <CompactIntentBadge intent={current_intent} />
        ) : (
          <span className="text-slate-400 text-sm">无活跃意图</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
            <Target className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="font-semibold text-slate-800">意图系统</h3>
        </div>
        <div className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
          已完成 {completed_count} 个
        </div>
      </div>

      {/* 当前意图 */}
      {current_intent ? (
        <CurrentIntentPanel intent={current_intent} />
      ) : (
        <EmptyIntentState />
      )}

      {/* 活跃意图列表 */}
      {active_intents.length > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">其他活跃意图</div>
          <div className="space-y-2">
            {active_intents.slice(1).map((i, idx) => (
              <IntentItem key={i.id || idx} intent={i} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 当前意图面板
function CurrentIntentPanel({ intent }) {
  const stage = intent.stage || intent.intent_type || 'Desire'
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.Desire
  const Icon = config.icon

  // 阶段进度
  const stages = ['Desire', 'Deliberation', 'Commitment', 'Execution', 'Completed']
  const currentIndex = stages.indexOf(stage)
  const progress = ((currentIndex + 1) / stages.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl ${config.bgColor} relative overflow-hidden`}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${config.color} rounded-full blur-2xl`}
        />
      </div>

      <div className="relative z-10">
        {/* 意图头部 */}
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}
          >
            <Icon className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <div className={`text-sm font-medium ${config.textColor}`}>
              {config.label}阶段
            </div>
            <div className="text-xs text-slate-500">{config.description}</div>
          </div>
        </div>

        {/* 意图描述 */}
        <div className="mb-3">
          <div className="text-sm text-slate-700 font-medium">
            {intent.description || intent.description || '探索新的话题'}
          </div>
          {intent.source_drive && (
            <div className="text-xs text-slate-500 mt-1">
              来自驱动: {intent.source_drive}
            </div>
          )}
        </div>

        {/* 强度和承诺度 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">强度</span>
              <span className="font-medium text-slate-700">
                {((intent.strength || intent.intensity || 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(intent.strength || intent.intensity || 0.5) * 100}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${config.color}`}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">承诺</span>
              <span className="font-medium text-slate-700">
                {((intent.commitment_strength || 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(intent.commitment_strength || 0.5) * 100}%` }}
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-500"
              />
            </div>
          </div>
        </div>

        {/* 阶段进度条 */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">生命周期</span>
            <span className="text-slate-400">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1 bg-white/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full rounded-full bg-gradient-to-r ${config.color}`}
            />
          </div>
        </div>

        {/* 阶段流程 */}
        <div className="flex items-center justify-between mt-3">
          {stages.map((s, idx) => {
            const stageConfig = STAGE_CONFIG[s]
            const isActive = idx === currentIndex
            const isCompleted = idx < currentIndex
            const StageIcon = stageConfig.icon

            return (
              <div key={s} className="flex flex-col items-center">
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                      : isActive
                        ? `bg-gradient-to-br ${stageConfig.color}`
                        : 'bg-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-3 h-3 text-white" />
                  ) : (
                    <StageIcon className={`w-3 h-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </motion.div>
                <span className={`text-[8px] mt-0.5 ${isActive ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                  {stageConfig.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// 空意图状态
function EmptyIntentState() {
  return (
    <div className="text-center py-8">
      <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
      <div className="text-sm text-slate-500">暂无活跃意图</div>
      <div className="text-xs text-slate-400 mt-1">系统正在思考中...</div>
    </div>
  )
}

// 意图项
function IntentItem({ intent, compact = false }) {
  const stage = intent.stage || 'Desire'
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.Desire

  if (compact) {
    return (
      <div className={`px-2 py-1 rounded-lg ${config.bgColor} text-xs ${config.textColor}`}>
        {intent.description?.slice(0, 20) || '...'}
      </div>
    )
  }

  return (
    <div className={`p-3 rounded-lg ${config.bgColor}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${config.textColor}`}>
          {intent.description || '...'}
        </span>
        <span className={`text-xs ${config.textColor}`}>{config.label}</span>
      </div>
    </div>
  )
}

// 紧凑型意图徽章
function CompactIntentBadge({ intent }) {
  const stage = intent.stage || intent.intent_type || 'Desire'
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.Desire

  return (
    <div className={`px-2 py-1 rounded-full ${config.bgColor} ${config.textColor} text-xs flex items-center gap-1`}>
      <config.icon className="w-3 h-3" />
      <span>{intent.description?.slice(0, 15) || config.label}</span>
    </div>
  )
}
