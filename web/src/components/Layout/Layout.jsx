/**
 * AKIHO 布局容器组件
 * 包含侧边栏和主内容区
 */

import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex`}>
      {/* 侧边栏 - 落地页不显示 */}
      {!isLandingPage && <Sidebar />}

      {/* 主内容区 */}
      <main className={`flex-1 overflow-y-auto ${isLandingPage ? 'ml-0' : 'ml-16'}`}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
