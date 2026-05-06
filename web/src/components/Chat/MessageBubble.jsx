import { motion } from 'framer-motion'

export function MessageBubble({ message, isTyping }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* 头像 */}
      <div className="flex-shrink-0">
        {isUser ? (
          /* 用户头像 */
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky to-blue-400
                          flex items-center justify-center text-white font-bold shadow-md">
            U
          </div>
        ) : (
          /* AI 头像光环 */
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-primary-200 animate-pulse-soft"
              style={{ animationDuration: '2s' }}
            />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-pink-400
                            flex items-center justify-center text-white font-bold shadow-lg
                            border-2 border-white">
              A
            </div>
          </div>
        )}
      </div>

      {/* 消息内容 */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* 气泡 */}
        <div
          className={`message-bubble ${
            isUser ? 'message-bubble-user' : 'message-bubble-ai'
          }`}
        >
          {isTyping ? (
            <div className="flex gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-current"
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-line">
              {message.content}
            </p>
          )}
        </div>

        {/* 时间 */}
        {!isTyping && (
          <p className="text-xs text-gray-400 mt-1 px-1">
            {formatTime(message.timestamp)}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}
