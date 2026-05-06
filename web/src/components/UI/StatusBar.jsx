import { Heart, Settings, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export function StatusBar({ moodInfo, energy, onSettingsClick }) {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative z-20 px-6 py-4"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* 左侧状态 */}
        <div className="flex items-center gap-4">
          {/* 情绪状态 */}
          <motion.div
            className="status-badge"
            key={moodInfo.text}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <span className="text-lg">{moodInfo.icon}</span>
            <span className={moodInfo.color}>{moodInfo.text}</span>
          </motion.div>

          {/* 能量条 */}
          <div className="flex items-center gap-2 status-badge">
            <Zap className="w-4 h-4 text-yellow-500" />
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${energy}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-sm text-gray-500">{energy}%</span>
          </div>
        </div>

        {/* 中间标题 */}
        <motion.h1
          className="text-2xl font-bold gradient-text text-shadow"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          AKIHO
        </motion.h1>

        {/* 右侧按钮 */}
        <motion.button
          onClick={onSettingsClick}
          className="p-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/50
                     hover:bg-white/80 hover:shadow-soft
                     active:scale-95 transition-all duration-300"
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          title="设置"
        >
          <Settings className="w-5 h-5 text-primary-500" />
        </motion.button>
      </div>
    </motion.header>
  )
}
