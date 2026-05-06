/**
 * 生理系统卡片组件
 * 展示能量、疲劳、活力状态
 */

import { motion } from 'framer-motion'
import { Zap, Battery, Moon, Coffee, Activity, AlertCircle, Smile, Meh, Frown } from 'lucide-react'

// 状态等级
function getEnergyStatus(energy) {
  if (energy > 0.8) return { label: '精力充沛', color: 'emerald', gradient: 'from-emerald-400 to-teal-500' }
  if (energy > 0.6) return { label: '状态良好', color: 'teal', gradient: 'from-teal-400 to-cyan-500' }
  if (energy > 0.4) return { label: '有些疲惫', color: 'yellow', gradient: 'from-yellow-400 to-amber-500' }
  if (energy > 0.2) return { label: '需要休息', color: 'orange', gradient: 'from-orange-400 to-red-400' }
  return { label: '精疲力竭', color: 'red', gradient: 'from-red-400 to-rose-500' }
}

function getEnergyIcon(energy) {
  if (energy > 0.8) return Zap
  if (energy > 0.6) return Smile
  if (energy > 0.4) return Meh
  if (energy > 0.2) return Frown
  return Moon
}

function getFatigueStatus(fatigue) {
  if (fatigue < 0.2) return { label: '神清气爽', color: 'emerald' }
  if (fatigue < 0.4) return { label: '略有倦意', color: 'yellow' }
  if (fatigue < 0.6) return { label: '比较疲惫', color: 'orange' }
  if (fatigue < 0.8) return { label: '非常疲倦', color: 'red' }
  return { label: '极度疲劳', color: 'rose' }
}

function ProgressCircle({ value, size = 80, strokeWidth = 8, color, label, sublabel }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - value)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200"
        />
        {/* 进度圆环 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-800">{Math.round(value * 100)}%</span>
        {label && <span className="text-xs text-slate-500">{label}</span>}
      </div>
    </div>
  )
}

function StatusBadge({ icon: Icon, label, color, bgColor }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  )
}

function AdviceCard({ icon: Icon, text, color }) {
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg ${
      color === 'emerald' ? 'bg-emerald-50' :
      color === 'yellow' ? 'bg-yellow-50' :
      color === 'orange' ? 'bg-orange-50' :
      color === 'red' ? 'bg-red-50' :
      'bg-slate-50'
    }`}>
      <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
      <span className={`text-xs ${color.replace('text-', 'text-').replace('400', '600').replace('500', '700')}`}>
        {text}
      </span>
    </div>
  )
}

export function PhysiologyCard({ physiological }) {
  const energy = physiological?.energy || 1
  const fatigue = physiological?.fatigue || 0

  const energyStatus = getEnergyStatus(energy)
  const fatigueStatus = getFatigueStatus(fatigue)
  const EnergyIcon = getEnergyIcon(energy)

  // 根据状态给出建议
  const getAdvice = () => {
    if (energy > 0.8) {
      return <AdviceCard icon={Zap} text="状态极佳！可以多聊一会~" color="text-emerald-600" />
    } else if (energy > 0.6) {
      return <AdviceCard icon={Activity} text="状态不错，继续保持~" color="text-teal-600" />
    } else if (energy > 0.4) {
      return <AdviceCard icon={Coffee} text="有些累了，建议休息一下" color="text-yellow-600" />
    } else if (energy > 0.2) {
      return <AdviceCard icon={Moon} text="很疲惫了，真的需要休息了" color="text-orange-600" />
    } else {
      return <AdviceCard icon={AlertCircle} text="能量耗尽！请立即休息！" color="text-red-600" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${energyStatus.gradient} flex items-center justify-center`}>
            <EnergyIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">生理系统</h3>
            <p className="text-xs text-slate-500">Physiological System</p>
          </div>
        </div>
      </div>

      {/* 状态概览 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-center gap-6">
          <ProgressCircle
            value={energy}
            size={90}
            strokeWidth={8}
            color="text-emerald-500"
            label="能量"
          />
          <ProgressCircle
            value={fatigue}
            size={90}
            strokeWidth={8}
            color="text-orange-500"
            label="疲劳"
          />
        </div>
      </div>

      {/* 状态标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge
          icon={Battery}
          label={energyStatus.label}
          color={`text-${energyStatus.color}-600`}
          bgColor={`bg-${energyStatus.color}-50`}
        />
        <StatusBadge
          icon={Moon}
          label={fatigueStatus.label}
          color={`text-${fatigueStatus.color}-600`}
          bgColor={`bg-${fatigueStatus.color}-50`}
        />
      </div>

      {/* 能量条详情 */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">能量水平</span>
          <span className="text-slate-700 font-medium">
            {(energy * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${energy * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${
              energy > 0.6 ? 'from-emerald-400 to-teal-500' :
              energy > 0.3 ? 'from-yellow-400 to-orange-500' :
              'from-orange-400 to-red-500'
            } rounded-full`}
          />
        </div>

        <div className="flex justify-between text-sm mt-3">
          <span className="text-slate-600">疲劳程度</span>
          <span className="text-slate-700 font-medium">
            {(fatigue * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fatigue * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
          />
        </div>
      </div>

      {/* 恢复建议 */}
      <div className="border-t border-slate-200/50 pt-3">
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <Coffee className="w-3 h-3" />
          恢复建议
        </p>
        {getAdvice()}
      </div>
    </motion.div>
  )
}
