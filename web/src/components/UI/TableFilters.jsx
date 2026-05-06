/**
 * AKIHO 表格筛选工具栏组件
 * 提供搜索、筛选、导出等功能的统一工具栏
 */

import { motion } from 'framer-motion'
import {
  Search, Filter, Download, RefreshCw, X, ChevronDown,
  FileText, Calendar, SortAsc, SortDesc
} from 'lucide-react'
import { useState } from 'react'

export function TableToolbar({
  searchPlaceholder = '搜索...',
  searchValue = '',
  onSearchChange = () => {},
  filters = [],
  activeFilters = {},
  onFilterChange = () => {},
  onClearFilters = () => {},
  exportOptions = [],
  onExport = () => {},
  onRefresh = null,
  refreshLoading = false,
  selectedCount = 0,
  onClearSelection = () => {},
  bulkActions = [],
  className = '',
}) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'all')
  const hasSearch = searchValue && searchValue.length > 0

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 主工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/80 border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300
                       placeholder-slate-400 transition"
          />
          {(hasSearch || hasActiveFilters) && (
            <button
              onClick={() => { onSearchChange(''); onClearFilters() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* 筛选按钮 */}
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition
                        ${showFilters || hasActiveFilters
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Filter className="w-4 h-4" />
            筛选
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 bg-violet-500 text-white text-xs rounded-full">
                {Object.values(activeFilters).filter(v => v && v !== 'all').length}
              </span>
            )}
          </button>
        )}

        {/* 刷新按钮 */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-600
                       rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshLoading ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* 导出按钮 */}
        {exportOptions.length > 0 && (
          <ExportDropdown options={exportOptions} onExport={onExport} />
        )}

        {/* 右侧插槽 */}
        <div className="ml-auto">
          {/* 可以放其他按钮 */}
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && filters.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="p-4 bg-slate-50/50 rounded-xl border border-slate-200"
        >
          <div className="flex items-center gap-3 flex-wrap">
            {filters.map(filter => (
              <div key={filter.key} className="min-w-[150px]">
                <label className="block text-xs text-slate-500 mb-1">{filter.label}</label>
                <select
                  value={activeFilters[filter.key] || 'all'}
                  onChange={(e) => onFilterChange(filter.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
                >
                  <option value="all">全部</option>
                  {filter.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}

            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="self-end px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
              >
                清除筛选
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* 批量操作栏 */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg border border-violet-200"
        >
          <span className="text-sm text-violet-700">
            已选择 <span className="font-semibold">{selectedCount}</span> 项
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition
                            ${action.variant === 'danger'
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <button
              onClick={onClearSelection}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              取消选择
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// 导出下拉菜单
function ExportDropdown({ options, onExport }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-600
                   rounded-lg hover:bg-slate-200 transition"
      >
        <Download className="w-4 h-4" />
        导出
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-slate-200
                       py-1 min-w-[140px] overflow-hidden"
          >
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => { onExport(opt.format); setOpen(false) }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600
                           hover:bg-slate-50 transition text-left"
              >
                {opt.icon || <FileText className="w-4 h-4" />}
                {opt.label}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}

// 排序按钮组件
export function SortButton({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey
  const Icon = isActive && currentSort.direction === 'desc' ? SortDesc : SortAsc

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition
                  ${isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {label}
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

// 时间范围选择器
export function TimeRangeSelector({ value, onChange, className = '' }) {
  const ranges = [
    { label: '全部', value: 'all' },
    { label: '今天', value: 'today' },
    { label: '本周', value: 'week' },
    { label: '本月', value: 'month' },
    { label: '自定义', value: 'custom' },
  ]

  return (
    <div className={`flex items-center gap-1 p-1 bg-slate-100 rounded-lg ${className}`}>
      {ranges.map(range => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition
                      ${value === range.value
                        ? 'bg-white text-slate-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'}`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

// 快速时间导航
export function QuickTimeNav({ onSelect }) {
  const options = [
    { label: '1小时内', value: '1h' },
    { label: '6小时内', value: '6h' },
    { label: '24小时内', value: '24h' },
    { label: '7天内', value: '7d' },
    { label: '30天内', value: '30d' },
  ]

  return (
    <div className="flex items-center gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="px-2 py-1 text-xs text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded transition"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
