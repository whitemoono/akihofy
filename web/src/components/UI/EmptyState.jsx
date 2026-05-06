/**
 * AKIHO 空状态组件
 * 用于表格、列表等无数据时的展示
 */

import { motion } from 'framer-motion'
import {
  FileText, Search, Inbox, Clock, AlertCircle, Database,
  MessageSquare, Heart, Users, Filter, FolderOpen
} from 'lucide-react'

const iconMap = {
  default: FileText,
  search: Search,
  inbox: Inbox,
  clock: Clock,
  alert: AlertCircle,
  database: Database,
  message: MessageSquare,
  heart: Heart,
  users: Users,
  filter: Filter,
  folder: FolderOpen,
}

export function EmptyState({
  icon = 'default',
  title = '暂无数据',
  description = '',
  action = null,
  className = '',
}) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon] || FileText : icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4"
      >
        <IconComponent className="w-10 h-10 text-slate-400" />
      </motion.div>

      <h3 className="text-lg font-medium text-slate-700 mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}

// 预设空状态

// 表格空状态
export function TableEmpty({ searchQuery, onClearSearch }) {
  return (
    <EmptyState
      icon="table"
      title={searchQuery ? '没有找到匹配的记录' : '暂无数据'}
      description={searchQuery ? `没有找到包含"${searchQuery}"的记录` : '开始添加数据后将显示在这里'}
      action={searchQuery && (
        <button
          onClick={onClearSearch}
          className="px-4 py-2 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition"
        >
          清除搜索
        </button>
      )}
    />
  )
}

// 搜索空状态
export function SearchEmpty({ query }) {
  return (
    <EmptyState
      icon="search"
      title="没有找到结果"
      description={`没有找到与"${query}"相关的内容`}
    />
  )
}

// 列表空状态
export function ListEmpty({ type = 'default' }) {
  const configs = {
    default: { title: '列表为空', description: '暂无内容' },
    messages: { title: '暂无消息', description: '还没有消息记录' },
    notifications: { title: '暂无通知', description: '暂无新通知' },
    users: { title: '暂无用户', description: '还没有用户数据' },
    memories: { title: '暂无记忆', description: '开始对话后将自动创建记忆' },
    logs: { title: '暂无日志', description: '暂无日志记录' },
    activities: { title: '暂无活动', description: '暂无活动记录' },
  }

  const config = configs[type] || configs.default

  return (
    <EmptyState
      icon={type === 'messages' ? 'message' : 'inbox'}
      title={config.title}
      description={config.description}
    />
  )
}

// 加载错误状态
export function ErrorState({
  message = '加载失败',
  description = '请稍后重试',
  onRetry,
}) {
  return (
    <EmptyState
      icon="alert"
      title={message}
      description={description}
      action={onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
        >
          重试
        </button>
      )}
    />
  )
}

// 权限不足状态
export function PermissionState({ message = '权限不足' }) {
  return (
    <EmptyState
      icon="lock"
      title={message}
      description="您没有访问此内容的权限"
    />
  )
}

// 骨架屏组件
export function Skeleton({
  type = 'card',
  count = 3,
  className = '',
}) {
  if (type === 'card') {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-xl border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* 表头 */}
        <div className="flex gap-4 p-3 bg-slate-50 rounded-lg">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-200 rounded animate-pulse flex-1" />
          ))}
        </div>
        {/* 行 */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b border-slate-100">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 bg-slate-100 rounded animate-pulse flex-1" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-end gap-2 h-40">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-200 rounded-t animate-pulse"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between px-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day} className="text-xs text-slate-400">{day}</span>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// 数字统计骨架屏
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-xl border border-slate-100">
          <div className="h-8 bg-slate-200 rounded animate-pulse mb-2 w-1/2" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
        </div>
      ))}
    </div>
  )
}

// 导入必要的图标
import { Lock } from 'lucide-react'
