import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function ThoughtBubble({ content, isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && content && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="absolute top-8 left-1/2 -translate-x-1/2 z-10"
        >
          {/* 气泡 */}
          <div className="relative px-4 py-2 bg-white/90 backdrop-blur-md
                          rounded-2xl shadow-lg border border-primary-100">
            {/* 小三角 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2
                            w-0 h-0
                            border-l-[10px] border-l-transparent
                            border-r-[10px] border-r-transparent
                            border-t-[10px] border-t-white/90" />

            {/* 内容 */}
            <p className="text-sm text-gray-700 whitespace-nowrap">
              {content}
            </p>

            {/* 装饰 */}
            <div className="absolute -top-1 -right-1">
              <Sparkles size={12} className="text-amber-400 animate-pulse" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
