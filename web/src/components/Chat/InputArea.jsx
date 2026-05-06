import { useState, useRef, useEffect } from 'react'
import { Send, Mic, Smile } from 'lucide-react'
import { motion } from 'framer-motion'

export function InputArea({ onSend, disabled }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="card p-3">
        <div className="flex items-end gap-3">
          {/* 文本输入 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="和 AKIHO 说点什么..."
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 pr-12
                         bg-white/50 backdrop-blur-sm
                         rounded-2xl
                         border-2 border-transparent
                         text-gray-700 placeholder-gray-400
                         resize-none
                         focus:outline-none focus:border-primary-300 focus:bg-white/80
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-300"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />

            {/* 表情按钮 */}
            <motion.button
              className="absolute right-3 bottom-3 p-1.5 rounded-full
                         text-gray-400 hover:text-primary-500 hover:bg-primary-50
                         transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="表情"
            >
              <Smile className="w-5 h-5" />
            </motion.button>
          </div>

          {/* 语音按钮 */}
          <motion.button
            className="p-3 rounded-full
                       bg-white/80 border border-primary-100
                       text-gray-500 hover:text-primary-500 hover:bg-primary-50
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="语音输入"
          >
            <Mic className="w-5 h-5" />
          </motion.button>

          {/* 发送按钮 */}
          <motion.button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={`p-3 rounded-full shadow-lg transition-all
                       ${message.trim() && !disabled
                         ? 'bg-gradient-to-r from-primary-400 to-pink-400 text-white hover:shadow-xl'
                         : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                       }`}
            whileHover={message.trim() && !disabled ? { scale: 1.05 } : {}}
            whileTap={message.trim() && !disabled ? { scale: 0.95 } : {}}
            title="发送"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* 提示 */}
        <p className="text-xs text-gray-400 text-center mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  )
}
