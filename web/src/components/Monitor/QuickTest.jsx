/**
 * 快速测试模块组件
 * 用于测试生成器和对话
 */

import { motion } from 'framer-motion'
import { Send, Sparkles, Loader2, Check, X, AlertCircle, Zap, Code, Cloud } from 'lucide-react'
import { useState, useCallback } from 'react'

// 预设测试问题
const presetQuestions = [
  { label: '打招呼', message: '你好呀！' },
  { label: '询问心情', message: '今天心情怎么样？' },
  { label: '表达喜欢', message: '你真可爱~' },
  { label: '讨论兴趣', message: '你喜欢做什么？' },
  { label: '道别', message: '再见啦~' },
]

// 生成器图标
const generatorIcons = {
  rule: Code,
  local: Zap,
  api: Cloud,
}

function GeneratorComparisonResult({ results, loading }) {
  if (!results && !loading) return null

  return (
    <div className="space-y-3 mt-4">
      <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-500" />
        生成器对比结果
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          <span className="ml-2 text-sm text-slate-500">对比中...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(results).map(([genType, result]) => {
            const Icon = generatorIcons[genType] || Code
            const isSuccess = result.success

            return (
              <motion.div
                key={genType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border ${
                  isSuccess
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-red-50/50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {genType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-600">
                          {(result.response_time_ms || 0).toFixed(0)}ms
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-500">失败</span>
                      </>
                    )}
                  </div>
                </div>

                {isSuccess ? (
                  <p className="text-sm text-slate-600">{result.response}</p>
                ) : (
                  <p className="text-sm text-red-500">{result.error || '未知错误'}</p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QuickChatResult({ result, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">思考中...</span>
      </div>
    )
  }

  if (!result) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 rounded-xl border border-violet-100"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">回复</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {result.generator?.toUpperCase() || 'RULE'}
          </span>
          <span className="text-xs text-slate-400">
            {(result.response_time_ms || 0).toFixed(0)}ms
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{result.response}</p>
      {!result.success && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" />
          {result.error || '生成失败'}
        </div>
      )}
    </motion.div>
  )
}

export function QuickTest({ onSendMessage, onCompareGenerators }) {
  const [input, setInput] = useState('')
  const [quickResult, setQuickResult] = useState(null)
  const [compareResults, setCompareResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareMode, setCompareMode] = useState(false)

  const handleSend = useCallback(async (message) => {
    if (!message.trim() || loading) return

    setLoading(true)
    setQuickResult(null)
    setCompareResults(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await response.json()
      if (data.code === 0) {
        setQuickResult(data.data)
      } else {
        setQuickResult({
          success: false,
          error: data.message || '请求失败',
        })
      }
    } catch (err) {
      setQuickResult({
        success: false,
        error: err.message || '网络错误',
      })
    } finally {
      setLoading(false)
    }
  }, [loading])

  const handleCompare = useCallback(async (message) => {
    if (!message.trim()) return

    setCompareLoading(true)
    setCompareResults(null)
    setCompareMode(true)

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          generators: ['rule', 'local', 'api'],
        }),
      })
      const data = await response.json()
      if (data.code === 0) {
        setCompareResults(data.data.results)
      }
    } catch (err) {
      console.error('Compare failed:', err)
    } finally {
      setCompareLoading(false)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (compareMode) {
      handleCompare(input)
    } else {
      handleSend(input)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">快速测试</h3>
            <p className="text-xs text-slate-500">Quick Test</p>
          </div>
        </div>
      </div>

      {/* 预设问题 */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2">预设问题</p>
        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((q) => (
            <button
              key={q.label}
              onClick={() => handleSend(q.message)}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入测试消息..."
            className="flex-1 px-4 py-2.5 bg-slate-100/50 border-0 rounded-xl focus:ring-2 focus:ring-violet-200 focus:bg-white transition text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm">{compareMode ? '对比' : '发送'}</span>
          </button>
        </div>
      </form>

      {/* 模式切换 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-500">模式:</span>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setCompareMode(false)}
            className={`px-3 py-1 text-xs rounded-md transition ${
              !compareMode
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            单次
          </button>
          <button
            onClick={() => setCompareMode(true)}
            className={`px-3 py-1 text-xs rounded-md transition ${
              compareMode
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            对比
          </button>
        </div>
        <span className="text-xs text-slate-400">
          {compareMode ? '同时测试所有生成器' : '测试当前生成器'}
        </span>
      </div>

      {/* 结果展示 */}
      {compareMode ? (
        <GeneratorComparisonResult results={compareResults} loading={compareLoading} />
      ) : (
        <QuickChatResult result={quickResult} loading={loading} />
      )}
    </motion.div>
  )
}
