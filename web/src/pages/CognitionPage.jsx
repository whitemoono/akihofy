/**
 * AKIHO 认知系统页面
 * 展示认知偏差详情、元认知状态、意图推断
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Eye, AlertCircle, RefreshCw, Lightbulb, MessageCircle } from 'lucide-react'
import { useCognitiveBias } from '../hooks/useMonitor'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// 偏差类型配置
const biasTypeConfig = {
  confirmation: {
    label: '确认偏差',
    description: '倾向于寻找支持自己观点的证据',
    color: 'amber',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  anchoring: {
    label: '锚定效应',
    description: '过度依赖第一个获得的信息',
    color: 'violet',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  recency: {
    label: '近因效应',
    description: '最近发生的事情影响更大',
    color: 'sky',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  availability: {
    label: '可得性启发',
    description: '容易想到的就是可能的',
    color: 'teal',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  optimism: {
    label: '乐观偏差',
    description: '过高估计积极结果的可能性',
    color: 'emerald',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  sunk_cost: {
    label: '沉没成本',
    description: '因为已投入而难以放弃',
    color: 'rose',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  halo: {
    label: '光环效应',
    description: '一个优点影响对整体的判断',
    color: 'pink',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
  },
  hindsight: {
    label: '后见之明',
    description: '事后认为结果显而易见',
    color: 'indigo',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
}

export function CognitionPage() {
  const { bias, loading, refresh } = useCognitiveBias()

  const activeBiases = bias?.active_biases || []
  const tendencies = bias?.bias_tendencies || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">认知系统</h1>
                <p className="text-xs text-slate-500">
                  认知偏差、元认知与意图推断
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
          {/* 认知偏差概览 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-500" />
                活跃认知偏差
                {activeBiases.length > 0 && (
                  <span className="ml-2 text-sm px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                    {activeBiases.length} 个
                  </span>
                )}
              </h2>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : activeBiases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeBiases.map((biasItem, index) => {
                    const config = biasTypeConfig[biasItem.type] || {
                      label: biasItem.type,
                      description: '未知偏差',
                      color: 'slate',
                      bg: 'bg-slate-50',
                      border: 'border-slate-200',
                    }
                    return (
                      <div
                        key={biasItem.type || index}
                        className={`p-4 rounded-xl ${config.bg} ${config.border} border`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-semibold text-${config.color}-700`}>
                                {config.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                强度: {(biasItem.intensity * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                              {config.description}
                            </p>
                            <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${biasItem.intensity * 100}%` }}
                                className={`h-full bg-${config.color}-400 rounded-full`}
                              />
                            </div>
                            {biasItem.triggered_by && (
                              <p className="text-xs text-slate-400 mt-2">
                                触发: {biasItem.triggered_by}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无活跃认知偏差</p>
                  <p className="text-sm mt-1">推理过程正常</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 认知指纹 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-slate-500" />
                认知指纹
                <span className="ml-2 text-xs text-slate-400">个人化的思维倾向</span>
              </h2>

              {Object.keys(tendencies).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(tendencies).map(([type, value]) => {
                    const config = biasTypeConfig[type] || {
                      label: type,
                      color: 'slate',
                    }
                    return (
                      <div
                        key={type}
                        className="p-3 bg-slate-50 rounded-xl text-center"
                      >
                        <div className="text-sm font-medium text-slate-700">
                          {config.label}
                        </div>
                        <div className="text-xs text-slate-500 mb-2">倾向</div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value * 100}%` }}
                            className={`h-full bg-${config.color}-400 rounded-full`}
                          />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {(value * 100).toFixed(0)}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p>暂无认知指纹数据</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 元认知状态 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                元认知状态
                <span className="ml-2 text-xs text-slate-400">思考自己的思考</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">自我觉知</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(bias?.self_awareness || 0.7) * 100}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    对自身认知过程的监控能力
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">推理信心</div>
                  <div className="text-2xl font-bold text-green-600">
                    {(bias?.reasoning_confidence || 0.8) * 100}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    对自身推理能力的信心
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">思考策略</div>
                  <div className="text-lg font-bold text-purple-600">
                    {bias?.thinking_strategy || '谨慎'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    当前采用的思考方式
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 意图推断说明 */}
          <motion.div variants={itemVariants}>
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-slate-500" />
                意图推断
                <span className="ml-2 text-xs text-slate-400">理解"为什么说"而非"说什么"</span>
              </h2>

              <div className="bg-white/60 rounded-xl p-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>意图推断</strong>是认知系统的高级功能，能够从表层信息推断深层意图：
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-indigo-500 font-bold">1.</span>
                    <div>
                      <span className="text-sm font-medium text-slate-700">表层分析</span>
                      <p className="text-xs text-slate-500">理解用户明确表达的内容</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-indigo-500 font-bold">2.</span>
                    <div>
                      <span className="text-sm font-medium text-slate-700">深层推断</span>
                      <p className="text-xs text-slate-500">识别隐藏的真实意图和需求</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-indigo-500 font-bold">3.</span>
                    <div>
                      <span className="text-sm font-medium text-slate-700">关系感知</span>
                      <p className="text-xs text-slate-500">根据亲密度调整推断深度</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

export default CognitionPage
