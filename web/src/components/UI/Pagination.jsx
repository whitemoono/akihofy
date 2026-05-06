/**
 * AKIHO 分页组件
 * 简洁美观的分页器
 */

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  showPageSize = true,
  showTotal = true,
  className = '',
}) {
  const pageSizeOptions = [10, 20, 50, 100]

  // 生成页码数组
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }

    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* 左侧信息 */}
      <div className="flex items-center gap-4">
        {showTotal && (
          <span className="text-sm text-slate-500">
            显示 {startItem}-{endItem} 条，共 {totalItems} 条
          </span>
        )}

        {/* 每页条数选择 */}
        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm bg-white border border-slate-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size} 条</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 分页按钮 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* 首页 */}
          <PageButton
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            icon={<ChevronsLeft className="w-4 h-4" />}
            title="首页"
          />

          {/* 上一页 */}
          <PageButton
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            icon={<ChevronLeft className="w-4 h-4" />}
            title="上一页"
          />

          {/* 页码 */}
          <div className="flex items-center gap-0.5 mx-1">
            {getPageNumbers().map((page, i) =>
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1 text-slate-400">...</span>
              ) : (
                <motion.button
                  key={page}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPageChange(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                              ${currentPage === page
                                ? 'bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {page}
                </motion.button>
              )
            )}
          </div>

          {/* 下一页 */}
          <PageButton
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            icon={<ChevronRight className="w-4 h-4" />}
            title="下一页"
          />

          {/* 末页 */}
          <PageButton
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            icon={<ChevronsRight className="w-4 h-4" />}
            title="末页"
          />
        </div>
      )}
    </div>
  )
}

// 分页按钮
function PageButton({ onClick, disabled, icon, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100
                 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {icon}
    </button>
  )
}

// 简洁分页器（用于卡片内）
export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-sm text-slate-600">
        <span className="font-medium">{currentPage}</span>
        <span className="text-slate-400 mx-1">/</span>
        <span className="text-slate-500">{totalPages}</span>
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// 跳转分页器
export function JumpPagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  const [inputValue, setInputValue] = useState('')

  const handleJump = () => {
    const page = parseInt(inputValue)
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
      setInputValue('')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">跳转到</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleJump()}
        className="w-16 px-2 py-1 text-sm text-center bg-white border border-slate-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-violet-200"
      />
      <span className="text-sm text-slate-500">页</span>
      <button
        onClick={handleJump}
        disabled={!inputValue || parseInt(inputValue) < 1 || parseInt(inputValue) > totalPages}
        className="px-3 py-1 text-sm bg-violet-500 text-white rounded-lg
                   hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        跳转
      </button>
    </div>
  )
}

// 无限滚动加载（简化版）
export function InfiniteScrollTrigger({
  hasMore,
  loading,
  onLoadMore,
  children,
}) {
  const [ref, inView] = useInView()

  useEffect(() => {
    if (inView && hasMore && !loading) {
      onLoadMore?.()
    }
  }, [inView, hasMore, loading, onLoadMore])

  return (
    <div>
      {children}
      <div ref={ref} className="py-4 flex justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        )}
        {!hasMore && (
          <span className="text-sm text-slate-400">没有更多了</span>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

// 使用 react-intersection-observer 的 hook
function useInView() {
  const [ref, setRef] = useState(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(ref)

    return () => observer.disconnect()
  }, [ref])

  return [setRef, inView]
}
