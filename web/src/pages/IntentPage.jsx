/**
 * AKIHO 意图系统页面
 * 展示意图引擎详情、意图历史、承诺追踪
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Target, Clock, TrendingUp, CheckCircle, XCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useIntent } from '../hooks/useMonitor'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export function IntentPage() {
  const { intent, loading, refresh } = useIntent()

  const currentIntent = intent?.current_intent
  const activeIntents = intent?.active_intents || []
  const intentHistory = intent?.intent_history || []

  // 意图类型配置
  const intentTypeConfig = {
    want: { label: '想要', color: 'teal', bg: 'bg-teal-50', border: 'border-teal-200' },
    need: { label: '需要', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200' },
    should: { label: '应该', color: 'violet', bg: 'bg-violet-50', border: 'border-violet-200' },
    curious: { label: '好奇', color: 'sky', bg: 'bg-sky-50', border: 'border-sky-200' },
    connect: { label: '连接', color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200' },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-200">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">意图引擎</h1>
                <p className="text-xs text-slate-500">
                  真实意图生成与承诺追踪
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
          {/* 当前意图详情 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-500" />
                当前意图
              </h2>

              {loading ? (
                <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
              ) : currentIntent ? (
                <div className={`p-4 rounded-xl ${intentTypeConfig[currentIntent.intent_type]?.bg || 'bg-slate-50'} ${intentTypeConfig[currentIntent.intent_type]?.border || 'border-slate-200'} border`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        intentTypeConfig[currentIntent.intent_type]?.bg || 'bg-slate-100'
                      } ${intentTypeConfig[currentIntent.intent_type]?.color ? `text-${intentTypeConfig[currentIntent.intent_type].color}-600` : 'text-slate-600'}`}>
                        {intentTypeConfig[currentIntent.intent_type]?.label || '未知'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {currentIntent.created_at
                        ? new Date(currentIntent.created_at).toLocaleString('zh-CN')
                        : '未知时间'}
                    </div>
                  </div>

                  <div className="text-xl font-medium text-slate-800 mb-4">
                    {currentIntent.target || '暂无具体目标'}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">意图强度</span>
                        <span className="font-medium text-slate-700">
                          {(currentIntent.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${currentIntent.intensity * 100}%` }}
                          className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">承诺强度</span>
                        <span className="font-medium text-slate-700">
                          {((currentIntent.commitment_strength || currentIntent.commitment?.strength || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentIntent.commitment_strength || currentIntent.commitment?.strength || 0) * 100}%` }}
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无活跃意图</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 活跃意图列表 */}
          {activeIntents.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-slate-500" />
                  活跃意图 ({activeIntents.length})
                </h2>
                <div className="space-y-3">
                  {activeIntents.map((item, index) => {
                    const config = intentTypeConfig[item.intent_type] || intentTypeConfig.want
                    return (
                      <div
                        key={item.id || index}
                        className={`p-3 rounded-xl ${config.bg} ${config.border} border`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`text-sm font-medium text-${config.color}-600`}>
                              {config.label}
                            </span>
                            <p className="text-sm text-slate-700 mt-1">
                              {item.target || '无目标'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-700">
                              {(item.intensity * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-slate-500">强度</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* 承诺追踪 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-slate-500" />
                承诺追踪
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-emerald-600">
                    {intent?.completed_count || 0}
                  </div>
                  <div className="text-xs text-slate-500">已完成</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                  <RefreshCw className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-600">
                    {activeIntents.length}
                  </div>
                  <div className="text-xs text-slate-500">进行中</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">
                    {intent?.abandoned_count || 0}
                  </div>
                  <div className="text-xs text-slate-500">已放弃</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 意图历史 */}
          {intentHistory.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-500" />
                  意图历史
                </h2>
                <div className="space-y-2">
                  {intentHistory.slice(0, 10).map((item, index) => {
                    const config = intentTypeConfig[item.intent_type] || intentTypeConfig.want
                    return (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full bg-${config.color}-400`} />
                          <span className="text-sm text-slate-700">
                            {item.target || item.intent_type}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString('zh-CN')
                            : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

export default IntentPage
