/**
 * 驱动张力卡片 - 情感化设计
 * 展示5种驱动系统的实时张力状态
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Users, Trophy, Compass, Star } from 'lucide-react'

// 驱动类型配置
const DRIVE_CONFIG = {
  '好奇心': {
    icon: Sparkles,
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    description: '对新事物和知识的渴望',
  },
  '归属需求': {
    icon: Users,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    description: '与他人建立联系的渴望',
  },
  '能力需求': {
    icon: Trophy,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    description: '展示技能和获得成就',
  },
  '自主需求': {
    icon: Compass,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    description: '独立决策和控制环境',
  },
  '意义需求': {
    icon: Star,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    description: '追求人生意义和价值',
  },
}

// 简化名称映射
const NAME_MAP = {
  '好奇心': '好奇心',
  '归属需求': '归属',
  '能力需求': '成就',
  '自主需求': '自主',
  '意义需求': '意义',
}

export function DriveTensionCard({ drives, compact = false }) {
  // 解析驱动数据
  const driveList = useMemo(() => {
    if (!drives) {
      return Object.keys(DRIVE_CONFIG).map((name, i) => ({
        name,
        tension: 0.3 + Math.random() * 0.3,
        triggered: false,
      }))
    }

    const tensions = drives.tensions || {}
    const triggered = drives.triggered || []
    const triggeredNames = triggered.map((t) => t.name || t)

    return Object.keys(DRIVE_CONFIG).map((name) => ({
      name,
      tension: tensions[name] ?? tensions[NAME_MAP[name]] ?? 0.3,
      triggered: triggeredNames.includes(name) || triggeredNames.includes(NAME_MAP[name]),
    }))
  }, [drives])

  // 计算总张力
  const totalTension = useMemo(() => {
    if (drives?.total_tension !== undefined) {
      return drives.total_tension
    }
    return driveList.reduce((sum, d) => sum + d.tension, 0) / driveList.length
  }, [driveList, drives])

  // 找到主导驱动
  const dominantDrive = useMemo(() => {
    if (drives?.dominant) {
      return drives.dominant
    }
    return driveList.reduce((max, d) => (d.tension > max.tension ? d : max), driveList[0])?.name
  }, [driveList, drives])

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {driveList.slice(0, 3).map((drive) => (
          <CompactDriveBar key={drive.name} drive={drive} />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="font-semibold text-slate-800">驱动系统</h3>
        </div>
        {dominantDrive && (
          <div className="px-2 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-medium">
            主导: {NAME_MAP[dominantDrive] || dominantDrive}
          </div>
        )}
      </div>

      {/* 总张力进度条 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">整体张力</span>
          <span className={`font-medium ${totalTension > 0.6 ? 'text-rose-600' : 'text-slate-600'}`}>
            {(totalTension * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalTension * 100}%` }}
            className={`h-full rounded-full ${
              totalTension > 0.7
                ? 'bg-gradient-to-r from-rose-400 to-orange-400'
                : totalTension > 0.5
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                  : 'bg-gradient-to-r from-emerald-400 to-teal-400'
            }`}
          />
        </div>
      </div>

      {/* 驱动列表 */}
      <div className="space-y-3">
        {driveList.map((drive, index) => {
          const config = DRIVE_CONFIG[drive.name]
          const Icon = config.icon
          const isTriggered = drive.tension >= 0.6

          return (
            <motion.div
              key={drive.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-xl ${config.bgColor} ${
                isTriggered ? 'ring-2 ring-rose-300' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.textColor}`} />
                  <span className={`font-medium ${config.textColor}`}>
                    {NAME_MAP[drive.name] || drive.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {drive.triggered && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-xs animate-pulse">
                      触发
                    </span>
                  )}
                  <span className={`text-sm font-bold ${config.textColor}`}>
                    {(drive.tension * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* 张力进度条 */}
              <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${drive.tension * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                  className={`h-full rounded-full bg-gradient-to-r ${config.color}`}
                />
              </div>

              {/* 描述 */}
              <div className="mt-1 text-xs text-slate-500">{config.description}</div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// 紧凑型驱动条
function CompactDriveBar({ drive }) {
  const config = DRIVE_CONFIG[drive.name]
  const NAME_MAP_LOCAL = {
    '好奇心': '好奇',
    '归属需求': '归属',
    '能力需求': '成就',
    '自主需求': '自主',
    '意义需求': '意义',
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center`}>
        <span className="text-white text-xs">{(drive.tension * 100).toFixed(0)}</span>
      </div>
    </div>
  )
}
