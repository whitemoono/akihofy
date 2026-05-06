/**
 * 当前生成器信息卡片组件
 * 简洁展示当前使用的生成器，不包含切换功能
 */

import { motion } from 'framer-motion'
import { Cpu, CheckCircle, XCircle, Cloud, Zap, Code } from 'lucide-react'

// 生成器配置
const generatorConfig = {
  rule: {
    label: '规则引擎',
    icon: Code,
    color: 'emerald',
    gradient: 'from-emerald-400 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  local: {
    label: '本地模型',
    icon: Zap,
    color: 'blue',
    gradient: 'from-blue-400 to-indigo-500',
    bgGradient: 'from-blue-50 to-indigo-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  api: {
    label: 'API 模型',
    icon: Cloud,
    color: 'violet',
    gradient: 'from-violet-400 to-purple-500',
    bgGradient: 'from-violet-50 to-purple-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
}

export function GeneratorCard({ currentGenerator, generatorList, onOpenSettings }) {
  const current = generatorConfig[currentGenerator] || generatorConfig.rule
  const Icon = current.icon

  // 获取当前生成器的详细信息
  const currentInfo = generatorList?.[currentGenerator] || {}
  const isAvailable = currentInfo.available ?? false

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${current.gradient} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">当前生成器</h3>
            <p className="text-xs text-slate-500">Active Generator</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isAvailable
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-600'
        }`}>
          {isAvailable ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {isAvailable ? '可用' : '不可用'}
        </div>
      </div>

      {/* 当前生成器详情 */}
      <div className={`bg-gradient-to-r ${current.bgGradient} rounded-xl p-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl bg-white/80 flex items-center justify-center shadow-sm`}>
            <Icon className={`w-7 h-7 ${current.iconColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-slate-800">{current.label}</span>
              <span className="text-xs text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">
                {currentGenerator?.toUpperCase() || 'RULE'}
              </span>
            </div>

            {/* API 模型的额外信息 */}
            {currentGenerator === 'api' && (
              <div className="space-y-1">
                {currentInfo.model && (
                  <p className="text-sm text-slate-600">模型: {currentInfo.model}</p>
                )}
                {currentInfo.provider && (
                  <p className="text-xs text-slate-500">服务商: {currentInfo.provider}</p>
                )}
                {currentInfo.error && (
                  <p className="text-xs text-red-500 mt-1">{currentInfo.error}</p>
                )}
              </div>
            )}

            {currentGenerator === 'local' && (
              <p className="text-sm text-slate-600">
                {currentInfo.model || '本地 LLM'}
              </p>
            )}

            {currentGenerator === 'rule' && (
              <p className="text-sm text-slate-600">基于规则的响应生成</p>
            )}
          </div>
        </div>
      </div>

      {/* 配置提示 */}
      {currentGenerator === 'api' && !isAvailable && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700">
            请在设置中配置 API 密钥
          </p>
        </div>
      )}
    </motion.div>
  )
}
