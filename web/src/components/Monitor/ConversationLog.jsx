/**
 * 对话历史组件
 * 展示用户与 AI 的对话记录
 */

import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, User, Bot, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useMemo } from 'react'

function MessageBubble({ message, isUser, timestamp, generator }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* 头像 */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
            : 'bg-gradient-to-br from-violet-400 to-purple-500'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>

        {/* 消息内容 */}
        <div className="space-y-1">
          <div className={`px-4 py-2.5 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-sm'
              : 'bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-tl-sm'
          }`}>
            <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
          </div>

          {/* 元信息 */}
          <div className={`flex items-center gap-2 text-xs text-slate-400 ${isUser ? 'justify-end' : ''}`}>
            <span>{timestamp}</span>
            {!isUser && generator && (
              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                {generator}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ConversationPair({ userMsg, aiMsg, timestamp }) {
  return (
    <div className="space-y-3 py-3 border-b border-slate-100 last:border-0">
      <MessageBubble
        message={userMsg}
        isUser={true}
        timestamp={timestamp}
      />
      {aiMsg && (
        <MessageBubble
          message={aiMsg}
          isUser={false}
          timestamp={timestamp}
          generator="rule"
        />
      )}
    </div>
  )
}

export function ConversationLog({ history }) {
  const [showAll, setShowAll] = useState(false)
  const [expandedItems, setExpandedItems] = useState(new Set())

  // 将历史记录转换为对话对
  const conversations = useMemo(() => {
    if (!history || history.length === 0) return []

    const pairs = []
    let currentUser = null

    history.forEach((msg, index) => {
      if (msg.role === 'user') {
        currentUser = {
          userMsg: msg.content,
          timestamp: new Date(msg.timestamp * 1000).toLocaleTimeString(),
        }
      } else if (msg.role === 'assistant' && currentUser) {
        pairs.push({
          id: index,
          ...currentUser,
          aiMsg: msg.content,
          generator: msg.generator,
        })
        currentUser = null
      }
    })

    return pairs.reverse() // 最新的在前面
  }, [history])

  const displayedConversations = showAll
    ? conversations
    : conversations.slice(0, 5)

  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (conversations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">对话历史</h3>
            <p className="text-xs text-slate-500">Conversation History</p>
          </div>
        </div>

        {/* 空状态 */}
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 mb-1">暂无对话记录</p>
          <p className="text-xs text-slate-400">开始对话后将显示在这里</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-glass-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">对话历史</h3>
            <p className="text-xs text-slate-500">Conversation History</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{conversations.length} 条对话</span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3 h-3" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                展开
              </>
            )}
          </button>
        </div>
      </div>

      {/* 对话列表 */}
      <div className="max-h-96 overflow-y-auto space-y-1">
        <AnimatePresence mode="popLayout">
          {displayedConversations.map((conv) => (
            <div key={conv.id} className="group">
              <ConversationPair
                userMsg={conv.userMsg}
                aiMsg={conv.aiMsg}
                timestamp={conv.timestamp}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* 展开/收起按钮 */}
      {conversations.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition flex items-center justify-center gap-1"
        >
          <ChevronDown className="w-4 h-4" />
          查看全部 {conversations.length} 条对话
        </button>
      )}
    </motion.div>
  )
}
