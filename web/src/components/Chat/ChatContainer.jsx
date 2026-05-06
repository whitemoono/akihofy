import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageBubble } from './MessageBubble'

export function ChatContainer({ messages, isTyping }) {
  const containerRef = useRef(null)
  const messagesEndRef = useRef(null)

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4
                 scrollbar-thin scrollbar-thumb-primary-200 scrollbar-track-transparent"
    >
      {/* 欢迎消息 */}
      {messages.length === 0 && !isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <p className="text-gray-400 text-sm">
            发送消息开始和 AKIHO 对话吧~
          </p>
        </motion.div>
      )}

      {/* 消息列表 */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* 打字中动画 */}
      {isTyping && (
        <MessageBubble
          message={{ content: '', role: 'assistant' }}
          isTyping={true}
        />
      )}

      {/* 底部锚点 */}
      <div ref={messagesEndRef} />
    </div>
  )
}
