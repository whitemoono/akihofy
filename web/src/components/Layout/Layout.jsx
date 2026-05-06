/**
 * AKIHO 布局容器组件
 * 包含侧边栏和主内容区
 */

import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 - 偏移侧边栏宽度，可滚动 */}
      <main className="flex-1 ml-16 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
