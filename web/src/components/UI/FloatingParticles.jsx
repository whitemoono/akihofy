import { motion } from 'framer-motion'
import { Sparkles, Star, Heart } from 'lucide-react'

const PARTICLES = [
  { icon: Sparkles, size: 16, duration: 15, delay: 0, color: 'text-pink-400' },
  { icon: Star, size: 14, duration: 18, delay: 2, color: 'text-amber-400' },
  { icon: Sparkles, size: 18, duration: 20, delay: 4, color: 'text-purple-400' },
  { icon: Heart, size: 16, duration: 16, delay: 1, color: 'text-rose-400' },
  { icon: Star, size: 14, duration: 17, delay: 3, color: 'text-yellow-400' },
  { icon: Sparkles, size: 12, duration: 19, delay: 5, color: 'text-emerald-400' },
]

export function FloatingParticles() {
  return (
    <div className="floating-particles">
      {PARTICLES.map((particle, index) => {
        const Icon = particle.icon
        return (
          <motion.div
            key={index}
            className="floating-particle"
            style={{
              left: `${(index + 1) * 12}%`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
            initial={{ y: '100vh', opacity: 0 }}
            animate={{ y: '-100px', opacity: [0, 0.6, 0.6, 0] }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'linear'
            }}
          >
            <Icon size={particle.size} className={particle.color} />
          </motion.div>
        )
      })}

      {/* 云朵装饰 */}
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />

      {/* 彩虹装饰 */}
      <motion.div
        className="absolute bottom-0 left-0 w-full h-32 opacity-10"
        style={{
          background: 'linear-gradient(to top, rgba(255,107,157,0.3), transparent)'
        }}
        animate={{ opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </div>
  )
}
