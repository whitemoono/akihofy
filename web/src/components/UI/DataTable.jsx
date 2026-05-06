/**
 * AKIHO 统一数据表格组件
 * 玻璃拟态设计风格，支持排序、筛选、分页、行展开等
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, Filter, X, MoreHorizontal,
  CheckSquare, Square, Eye, Copy, ExternalLink
} from 'lucide-react'

// 列配置类型:
// {
//   key: string,
//   title: string,
//   width?: string,
//   align?: 'left' | 'center' | 'right',
//   sortable?: boolean,
//   filterable?: boolean,
//   render?: (value, row, index) => ReactNode,
//   filterOptions?: { label: string, value: string }[]
// }

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyText = '暂无数据',
  emptyIcon: EmptyIcon = null,
  searchable = true,
  filterable = true,
  pagination = true,
  pageSize = 10,
  selectable = false,
  expandable = false,
  expandRender = null,
  onSelectionChange,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  rowClassName = '',
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [filters, setFilters] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [expandedRows, setExpandedRows] = useState(new Set())

  // 过滤数据
  const filteredData = useMemo(() => {
    let result = [...data]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key]
          return value !== null && value !== undefined &&
            String(value).toLowerCase().includes(query)
        })
      )
    }

    // 列过滤
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(row => {
          const rowValue = row[key]
          return String(rowValue) === String(value)
        })
      }
    })

    return result
  }, [data, searchQuery, filters, columns])

  // 排序数据
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      let comparison = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else {
        comparison = String(aVal).localeCompare(String(bVal))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortConfig])

  // 分页数据
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, pagination, currentPage, pageSize])

  // 总页数
  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / pageSize)
  }, [sortedData.length, pageSize])

  // 处理排序
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // 处理筛选
  const handleFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1)
  }

  // 处理行选择
  const handleRowSelect = (id) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      if (onSelectionChange) {
        onSelectionChange(Array.from(next))
      }
      return next
    })
  }

  // 处理全选
  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
      if (onSelectionChange) onSelectionChange([])
    } else {
      const newSelected = new Set(paginatedData.map(row => row.id || row.key || paginatedData.indexOf(row)))
      setSelectedRows(newSelected)
      if (onSelectionChange) onSelectionChange(Array.from(newSelected))
    }
  }

  // 处理行展开
  const handleRowExpand = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 清除所有筛选
  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery || Object.values(filters).some(v => v && v !== 'all')

  // 加载状态
  if (loading) {
    return (
      <div className={`bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg overflow-hidden ${className}`}>
        <TableSkeleton columns={columns.length} rows={5} />
      </div>
    )
  }

  return (
    <div className={`bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg overflow-hidden ${className}`}>
      {/* 工具栏 */}
      {(searchable || filterable) && (
        <div className="p-4 border-b border-white/50 bg-white/30">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 搜索框 */}
            {searchable && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white/80 border border-slate-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300
                             placeholder-slate-400 transition"
                />
              </div>
            )}

            {/* 筛选器 */}
            {filterable && columns.filter(col => col.filterable).map(col => (
              <select
                key={col.key}
                value={filters[col.key] || 'all'}
                onChange={(e) => handleFilter(col.key, e.target.value)}
                className="px-3 py-2 text-sm bg-white/80 border border-slate-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
              >
                <option value="all">全部 {col.title}</option>
                {col.filterOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ))}

            {/* 清除筛选 */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700
                           bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <X className="w-4 h-4" />
                清除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-slate-50/50 ${headerClassName}`}>
            <tr>
              {/* 展开列 */}
              {expandable && <th className="w-10 px-3 py-3" />}

              {/* 选择列 */}
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 hover:bg-slate-200 rounded transition"
                  >
                    {selectedRows.size === paginatedData.length && paginatedData.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-violet-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
              )}

              {/* 数据列 */}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider
                              ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                              ${col.sortable !== false ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <span>{col.title}</span>
                    {col.sortable !== false && (
                      <span className="text-slate-300">
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {/* 操作列 */}
              {columns.some(col => col.actions) && (
                <th className="w-16 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                  操作
                </th>
              )}
            </tr>
          </thead>

          <tbody className={`divide-y divide-slate-100 ${bodyClassName}`}>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + (columns.some(col => col.actions) ? 1 : 0)}
                    className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center text-slate-400">
                    {EmptyIcon && <EmptyIcon className="w-12 h-12 mb-3 opacity-50" />}
                    <p className="text-sm">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowId = row.id || row.key || rowIndex
                const isSelected = selectedRows.has(rowId)
                const isExpanded = expandedRows.has(rowId)

                return (
                  <Fragment key={rowId}>
                    <tr
                      className={`${rowClassName} transition-colors
                                  ${isSelected ? 'bg-violet-50/50' : 'hover:bg-slate-50/50'}
                                  ${expandable || selectable ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (expandable) handleRowExpand(rowId)
                        if (selectable) handleRowSelect(rowId)
                      }}
                    >
                      {/* 展开按钮 */}
                      {expandable && (
                        <td className="px-3 py-3">
                          <button className="p-1 hover:bg-slate-200 rounded transition">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* 选择框 */}
                      {selectable && (
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRowSelect(rowId) }}
                            className="p-1 hover:bg-slate-200 rounded transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-violet-500" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* 数据列 */}
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm text-slate-700
                                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                          {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                        </td>
                      ))}

                      {/* 操作列 */}
                      {columns.some(col => col.actions) && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {columns.find(col => col.actions)?.actions(row)?.map((action, i) => (
                              <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); action.onClick(row) }}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 transition ${action.className || ''}`}
                                title={action.label}
                              >
                                {action.icon || <MoreHorizontal className="w-4 h-4" />}
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* 展开行 */}
                    {expandable && isExpanded && expandRender && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + (columns.some(col => col.actions) ? 1 : 0)}
                            className="px-4 py-4">
                          {expandRender(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页器 */}
      {pagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-white/50 bg-white/30 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedData.length)} 条，
            共 {sortedData.length} 条
          </div>

          <div className="flex items-center gap-2">
            {/* 每页条数 */}
            <select
              value={pageSize}
              onChange={(e) => {
                setCurrentPage(1)
              }}
              className="px-2 py-1 text-sm bg-white border border-slate-200 rounded-lg"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} 条/页</option>
              ))}
            </select>

            {/* 分页按钮 */}
            <div className="flex items-center gap-1">
              <PageButton
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                icon={<ChevronsLeft className="w-4 h-4" />}
              />
              <PageButton
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              />

              {/* 页码 */}
              {getPageNumbers(currentPage, totalPages).map((page, i) => (
                page === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1 text-slate-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition
                                ${currentPage === page
                                  ? 'bg-violet-500 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {page}
                  </button>
                )
              ))}

              <PageButton
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                icon={<ChevronRight className="w-4 h-4" />}
              />
              <PageButton
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                icon={<ChevronsRight className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      )}

      {/* 选中行统计 */}
      {selectable && selectedRows.size > 0 && (
        <div className="px-4 py-2 bg-violet-50 border-t border-violet-100 flex items-center justify-between">
          <span className="text-sm text-violet-700">
            已选择 {selectedRows.size} 项
          </span>
          <button
            onClick={() => { setSelectedRows(new Set()); onSelectionChange?.([]) }}
            className="text-sm text-violet-600 hover:text-violet-800"
          >
            清除选择
          </button>
        </div>
      )}
    </div>
  )
}

// 分页按钮组件
function PageButton({ onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {icon}
    </button>
  )
}

// 获取页码数组
function getPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total]
  }

  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, '...', current - 1, current, current + 1, '...', total]
}

// 骨架屏加载状态
function TableSkeleton({ columns, rows }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 bg-slate-200 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

// 辅助组件：单元格渲染

// 文本单元格
export function TextCell({ value, className = '' }) {
  return <span className={className}>{value}</span>
}

// 徽章单元格
export function BadgeCell({ value, color = 'slate', size = 'sm' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
    pink: 'bg-pink-100 text-pink-700',
    cyan: 'bg-cyan-100 text-cyan-700',
  }

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors[color] || colors.slate} ${sizes[size] || sizes.sm}`}>
      {value}
    </span>
  )
}

// 进度条单元格
export function ProgressCell({ value, max = 100, showLabel = true, color = 'violet' }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const colors = {
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors[color] || colors.violet}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 w-10 text-right">{percentage.toFixed(0)}%</span>
      )}
    </div>
  )
}

// 图标徽章单元格
export function IconBadgeCell({ icon: Icon, label, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
    pink: 'bg-pink-100 text-pink-700',
    cyan: 'bg-cyan-100 text-cyan-700',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${colors[color] || colors.slate}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>
  )
}

// 操作按钮单元格
export function ActionsCell({ actions }) {
  return (
    <div className="flex items-center gap-1 justify-center">
      {actions?.map((action, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); action.onClick?.() }}
          className={`p-1.5 rounded-lg hover:bg-slate-100 transition ${action.className || ''}`}
          title={action.label}
        >
          {action.icon || action.label}
        </button>
      ))}
    </div>
  )
}

// 导入 Fragment
import { Fragment } from 'react'
