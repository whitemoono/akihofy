import { motion, AnimatePresence } from 'framer-motion'

export function Toast({ message, isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="px-6 py-3 bg-gray-800/90 backdrop-blur-md text-white
                          rounded-full shadow-lg">
            <span className="text-sm">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
