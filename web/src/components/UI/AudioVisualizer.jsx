import { motion } from 'framer-motion'

export function AudioVisualizer({ isActive }) {
  const bars = [1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full"
          style={{
            background: `linear-gradient(to top, #ff8ab8, #ff6b9d)`
          }}
          animate={isActive ? {
            height: [
              `${12 + Math.random() * 8}px`,
              `${20 + Math.random() * 8}px`,
              `${10 + Math.random() * 8}px`,
              `${16 + Math.random() * 8}px`,
              `${12 + Math.random() * 8}px`
            ]
          } : {
            height: '4px'
          }}
          transition={{
            duration: 0.4 + Math.random() * 0.2,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}
