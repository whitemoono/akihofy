/**
 * AKIHO 侧边导航栏组件 - 图标+文字模式
 */

import { NavLink } from 'react-router-dom'
import { MessageCircle, Activity, User, Heart, Settings, Database, FileText, Sparkles, History, Target, Flame, Brain, BookOpen, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { to: '/', icon: MessageCircle, label: '聊天', color: 'teal' },
  { to: '/monitor', icon: Activity, label: '监控', color: 'teal' },
  { to: '/personality', icon: User, label: '人格', color: 'teal' },
  { to: '/relationship', icon: Heart, label: '关系', color: 'teal' },
  { to: '/memory', icon: Database, label: '记忆', color: 'teal' },
  { to: '/social', icon: Globe, label: '社交', color: 'teal' },
  { to: '/history', icon: History, label: '历史', color: 'teal' },
  { to: '/logs', icon: FileText, label: '日志', color: 'teal' },
]

// 拟人化系统导航
const anthropomorphicNavItems = [
  { to: '/intent', icon: Target, label: '意图', color: 'indigo' },
  { to: '/desires', icon: Flame, label: '欲望', color: 'indigo' },
  { to: '/cognition', icon: Brain, label: '认知', color: 'indigo' },
  { to: '/narrative', icon: BookOpen, label: '叙事', color: 'indigo' },
]

// 图标颜色配置
const colorConfig = {
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    indicator: 'from-teal-500 to-cyan-500',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    indicator: 'from-indigo-500 to-violet-500',
  },
}

function NavItem({ to, icon: Icon, label, color }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl transition-all duration-200 ${
          isActive
            ? `${color.bg} ${color.text}`
            : `text-slate-400 hover:text-slate-600 hover:bg-slate-50`
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* 活跃指示条 */}
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              className={`absolute left-0 inset-y-1 w-0.5 bg-gradient-to-b ${color.indicator} rounded-full`}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          {/* 图标 */}
          <Icon className="w-5 h-5" />
          {/* 文字标签 */}
          <span className="text-[10px] font-medium truncate w-full text-center leading-tight">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-full w-20 bg-white/60 backdrop-blur-xl border-r border-white/30 shadow-lg z-50 flex flex-col py-4"
    >
      {/* Logo 区域 */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-200/50 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* 导航项 */}
      <div className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            color={colorConfig[item.color]}
          />
        ))}

        {/* 分隔线 */}
        <div className="my-3 mx-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* 拟人化系统导航 */}
        <div className="flex flex-col gap-1">
          {anthropomorphicNavItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              color={colorConfig[item.color]}
            />
          ))}
        </div>
      </div>

      {/* 底部信息 */}
      <div className="px-2 pt-4 border-t border-white/30">
        <NavItem
          to="/settings"
          icon={Settings}
          label="设置"
          color={colorConfig.teal}
        />
      </div>
    </motion.nav>
  )
}

export default Sidebar
