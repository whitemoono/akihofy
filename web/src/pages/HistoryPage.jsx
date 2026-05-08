/**
 * AKIHO 对话历史页面
 * 展示历史会话列表、归档管理和会话详情
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Clock, Search, Archive, Trash2, Star, Pin,
  ChevronDown, ChevronRight, Folder, Calendar, Tag,
  MoreVertical, Edit3, Copy, Download, Filter, X, FolderOpen,
  Sparkles, Heart, Brain, Users
} from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 }
}

// 会话分类
const CATEGORIES = [
  { id: 'all', name: '全部', icon: MessageSquare, count: 24 },
  { id: 'pinned', name: '已收藏', icon: Star, count: 5 },
  { id: 'archived', name: '已归档', icon: Archive, count: 8 },
  { id: 'daily', name: '日常', icon: Calendar, count: 12 },
  { id: 'deep', name: '深度对话', icon: Brain, count: 6 },
  { id: 'emotional', name: '情感交流', icon: Heart, count: 4 },
]

export function HistoryPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [folders, setFolders] = useState([
    { id: 'f1', name: '重要对话', icon: Folder, color: 'amber', count: 3 },
    { id: 'f2', name: '学习笔记', icon: FolderOpen, color: 'violet', count: 2 },
    { id: 'f3', name: '情感记录', icon: Heart, color: 'rose', count: 2 },
  ])

  // 会话数据
  const [sessions, setSessions] = useState([])
  const [sessionMessages, setSessionMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHistory() {
      try {
        const resp = await fetch('/api/history/sessions?user_id=default')
        const json = await resp.json()
        if (json.code === 0 && json.data) {
          setSessions(json.data.sessions || [])
          const total = json.data.sessions?.length || 0
          setFolders([
            { id: 'f1', name: '重要对话', icon: Folder, color: 'amber', count: Math.min(3, total) },
            { id: 'f2', name: '学习笔记', icon: FolderOpen, color: 'violet', count: Math.min(2, total) },
            { id: 'f3', name: '情感记录', icon: Heart, color: 'rose', count: Math.min(2, total) },
          ])
        }
      } catch (e) {
        console.warn('Failed to load history:', e)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  useEffect(() => {
    if (selectedSession) {
      async function loadSessionDetail() {
        try {
          const resp = await fetch(`/api/history/sessions/${selectedSession.id}`)
          const json = await resp.json()
          if (json.code === 0 && json.data) {
            setSessionMessages(json.data.messages || [])
            // Update selectedSession with messages
            setSelectedSession(prev => ({ ...prev, messages: json.data.messages || [] }))
          }
        } catch (e) {
          console.warn('Failed to load session detail:', e)
        }
      }
      loadSessionDetail()
    }
  }, [selectedSession])

  // 过滤会话
  const filteredSessions = useMemo(() => {
    let result = sessions

    // 按分类过滤
    if (selectedCategory === 'pinned') {
      result = result.filter(s => s.pinned)
    } else if (selectedCategory === 'archived') {
      result = result.filter(s => s.archived)
    } else if (selectedCategory !== 'all') {
      result = result.filter(s => s.category === selectedCategory)
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(s =>
        (s.title || '').toLowerCase().includes(query) ||
        (s.preview || '').toLowerCase().includes(query) ||
        (s.tags || []).some(t => t.toLowerCase().includes(query))
      )
    }

    return result
  }, [sessions, selectedCategory, searchQuery])

  // 统计
  const stats = useMemo(() => ({
    total: sessions.length,
    pinned: sessions.filter(s => s.pinned).length,
    archived: sessions.filter(s => s.archived).length,
    thisWeek: sessions.filter(s => {
      const timeAgo = s.timeAgo || ''
      return timeAgo === '刚刚' || (timeAgo.includes('天前') && parseInt(timeAgo) <= 7)
    }).length,
  }), [sessions])

  // 切换收藏
  const togglePin = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      session.pinned = !session.pinned
    }
  }

  // 归档/取消归档
  const toggleArchive = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      session.archived = !session.archived
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-200">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">对话历史</h1>
                <p className="text-xs text-slate-500">管理会话、收藏重要对话、归档整理</p>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-slate-700">{stats.total}</div>
                <div className="text-[10px] text-slate-500">总会话</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-500">{stats.pinned}</div>
                <div className="text-[10px] text-slate-500">已收藏</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-violet-500">{stats.archived}</div>
                <div className="text-[10px] text-slate-500">已归档</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 max-w-7xl">
        <div className="flex gap-6">
          {/* 左侧边栏：分类和文件夹 */}
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-64 flex-shrink-0"
          >
            {/* 分类列表 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                分类筛选
              </h3>
              <div className="space-y-1">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedCategory === category.id
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <category.icon className="w-4 h-4" />
                      {category.name}
                    </div>
                    <span className={`text-xs ${
                      selectedCategory === category.id ? 'text-teal-500' : 'text-slate-400'
                    }`}>
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 文件夹 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-slate-400" />
                  文件夹
                </h3>
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <folder.icon className={`w-4 h-4 text-${folder.color}-500`} />
                      {folder.name}
                    </div>
                    <span className="text-xs text-slate-400">{folder.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>

          {/* 主内容区 */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1"
          >
            {/* 搜索栏 */}
            <motion.div variants={itemVariants} className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索会话标题、内容或标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </motion.div>

            {/* 会话列表 */}
            <motion.div variants={itemVariants} className="space-y-3">
              {filteredSessions.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">没有找到匹配的会话</p>
                </div>
              ) : (
                filteredSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={() => setSelectedSession(session)}
                    onTogglePin={() => togglePin(session.id)}
                    onToggleArchive={() => toggleArchive(session.id)}
                    onDelete={() => {}}
                  />
                ))
              )}
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* 会话详情弹窗 */}
      <AnimatePresence>
        {selectedSession && (
          <SessionDetailModal
            session={selectedSession}
            sessionMessages={sessionMessages}
            onClose={() => setSelectedSession(null)}
            onTogglePin={() => togglePin(selectedSession.id)}
            onToggleArchive={() => toggleArchive(selectedSession.id)}
          />
        )}
      </AnimatePresence>

      {/* 新建文件夹弹窗 */}
      <AnimatePresence>
        {showNewFolderModal && (
          <NewFolderModal
            onClose={() => setShowNewFolderModal(false)}
            onCreate={(name, color) => {
              setFolders([...folders, { id: `f${Date.now()}`, name, color, count: 0 }])
              setShowNewFolderModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// 会话卡片
function SessionCard({ session, onClick, onTogglePin, onToggleArchive, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)

  const moodColors = {
    happy: 'bg-amber-100 text-amber-600',
    excited: 'bg-rose-100 text-rose-600',
    sad: 'bg-blue-100 text-blue-600',
    neutral: 'bg-slate-100 text-slate-600',
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-4 cursor-pointer hover:shadow-xl transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {session.pinned && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
            <h3 className="text-sm font-medium text-slate-800 truncate">{session.title}</h3>
            {session.archived && (
              <Archive className="w-4 h-4 text-violet-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{session.preview}</p>
        </div>

        {/* 操作菜单 */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[140px]">
                <button
                  onClick={() => { onTogglePin(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Star className={`w-4 h-4 ${session.pinned ? 'text-amber-500 fill-amber-500' : ''}`} />
                  {session.pinned ? '取消收藏' : '收藏'}
                </button>
                <button
                  onClick={() => { onToggleArchive(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Archive className={`w-4 h-4 ${session.archived ? 'text-violet-500' : ''}`} />
                  {session.archived ? '取消归档' : '归档'}
                </button>
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4" />
                  复制
                </button>
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 标签 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(session.tags || []).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">
            {tag}
          </span>
        ))}
      </div>

      {/* 元信息 */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {session.timeAgo}
          </span>
          <span>{session.messageCount} 条消息</span>
          <span>{session.duration}</span>
        </div>
        <span className={`px-2 py-0.5 rounded ${moodColors[session.lastMood]}`}>
          {session.lastMood === 'happy' ? '愉快' :
           session.lastMood === 'excited' ? '兴奋' :
           session.lastMood === 'sad' ? '低落' : '平静'}
        </span>
      </div>
    </motion.div>
  )
}

// 会话详情弹窗
function SessionDetailModal({ session, onClose, onTogglePin, onToggleArchive, sessionMessages }) {
  const [activeTab, setActiveTab] = useState('messages')
  const messages = sessionMessages.length > 0 ? sessionMessages : (session.messages || [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{session.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{session.date}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePin}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                session.pinned
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Star className={`w-4 h-4 ${session.pinned ? 'fill-amber-500' : ''}`} />
              {session.pinned ? '已收藏' : '收藏'}
            </button>
            <button
              onClick={onToggleArchive}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                session.archived
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Archive className="w-4 h-4" />
              {session.archived ? '已归档' : '归档'}
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors">
              <Download className="w-4 h-4" />
              导出对话
            </button>
          </div>

          {/* 标签 */}
          <div className="flex items-center gap-2 mt-3">
            {(session.tags || []).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                {tag}
              </span>
            ))}
            <span className="text-xs text-slate-400 ml-2">
              {session.messageCount} 条消息 | {session.duration}
            </span>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'text-teal-600 border-b-2 border-teal-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            对话记录
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'text-teal-600 border-b-2 border-teal-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            会话摘要
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-teal-600 border-b-2 border-teal-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            统计信息
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          {activeTab === 'messages' && (
            <div className="space-y-4">
              {messages.length > 0 ? (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-teal-500/90 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-400 self-end">{msg.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无消息记录</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50 rounded-xl">
                <h4 className="text-sm font-medium text-teal-700 mb-2">会话主题</h4>
                <p className="text-sm text-slate-600">{session.title}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="text-sm font-medium text-slate-700 mb-2">核心内容</h4>
                <p className="text-sm text-slate-600">{session.preview}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <h4 className="text-sm font-medium text-amber-700 mb-2">关键标签</h4>
                <div className="flex flex-wrap gap-2">
                  {(session.tags || []).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-slate-700">{session.messageCount}</div>
                <div className="text-xs text-slate-500">消息总数</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-slate-700">{session.duration}</div>
                <div className="text-xs text-slate-500">对话时长</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-slate-700">{session.date.split(' ')[0]}</div>
                <div className="text-xs text-slate-500">开始日期</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-slate-700">{session.timeAgo}</div>
                <div className="text-xs text-slate-500">最后活动</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// 新建文件夹弹窗
function NewFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('amber')

  const colors = [
    { id: 'amber', class: 'bg-amber-500' },
    { id: 'violet', class: 'bg-violet-500' },
    { id: 'rose', class: 'bg-rose-500' },
    { id: 'teal', class: 'bg-teal-500' },
    { id: 'cyan', class: 'bg-cyan-500' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-4">新建文件夹</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">文件夹名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入文件夹名称..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-2 block">选择颜色</label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-8 h-8 rounded-full ${c.class} ${
                    color === c.id ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => name && onCreate(name, color)}
            className="px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
            disabled={!name}
          >
            创建
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default HistoryPage
