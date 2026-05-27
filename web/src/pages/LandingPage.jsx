import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Brain, Heart, MessageCircle, Users, Zap, ArrowRight, Star } from 'lucide-react'

function ParticleBackground() {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const animationRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 120 })
  const timeRef = useRef(0)

  const generateParticles = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const particles = []
    const count = Math.min(80, Math.floor((width * height) / 15000))

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const hue = 170 + Math.random() * 30

      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: 2 + Math.random() * 3,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.15 + Math.random() * 0.25,
        hue,
        phase: Math.random() * Math.PI * 2
      })
    }

    particlesRef.current = particles
  }, [])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = window.innerWidth
    const height = window.innerHeight

    ctx.clearRect(0, 0, width, height)
    timeRef.current += 0.015

    const particles = particlesRef.current
    const mouse = mouseRef.current

    for (const p of particles) {
      const dx = mouse.x - p.x
      const dy = mouse.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      let offsetX = 0
      let offsetY = 0

      if (dist < mouse.radius) {
        const force = (mouse.radius - dist) / mouse.radius
        offsetX = -(dx / dist) * force * 25
        offsetY = -(dy / dist) * force * 25
      }

      const waveX = Math.sin(timeRef.current * p.speed + p.phase) * 8
      const waveY = Math.cos(timeRef.current * p.speed * 0.7 + p.phase) * 6

      p.x += (p.baseX + waveX + offsetX - p.x) * 0.02
      p.y += (p.baseY + waveY + offsetY - p.y) * 0.02

      ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, ${p.opacity})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = window.innerWidth
    const height = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    generateParticles()
    animationRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      generateParticles()
    }

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, radius: 120 }
    }

    const handleMouseOut = () => {
      mouseRef.current = { x: -1000, y: -1000, radius: 120 }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseOut)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [generateParticles, animate])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block', zIndex: 0 }}
    />
  )
}

function TypewriterText({ text, delay = 0, speed = 30, onComplete }) {
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    setDisplayText('')
    setIsTyping(false)

    const startTimeout = setTimeout(() => {
      setIsTyping(true)
      let currentIndex = 0

      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          clearInterval(interval)
          setIsTyping(false)
          setTimeout(() => {
            setShowCursor(false)
            onComplete?.()
          }, 500)
        }
      }, speed)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [text, delay, speed, onComplete])

  return (
    <span>
      {displayText}
      {showCursor && (
        <span className="inline-block w-0.5 h-4 bg-teal-400 ml-1 animate-pulse" />
      )}
    </span>
  )
}

const features = [
  {
    icon: Brain,
    title: '智能认知',
    description: '多维度认知引擎，模拟人类思维过程',
    color: 'from-violet-500 to-purple-500'
  },
  {
    icon: Heart,
    title: '情感共鸣',
    description: '情感计算模型，感知与表达真实情绪',
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: MessageCircle,
    title: '自然对话',
    description: '流畅自然的对话体验，多轮上下文理解',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    icon: Users,
    title: '关系构建',
    description: '记忆与关系网络，建立持久的情感连接',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    icon: Sparkles,
    title: '人格塑造',
    description: '独特性格特征，成长型虚拟生命体',
    color: 'from-amber-500 to-orange-500'
  },
  {
    icon: Zap,
    title: '实时响应',
    description: '毫秒级反应，即时情感反馈',
    color: 'from-indigo-500 to-blue-500'
  }
]

export function LandingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showFeatures, setShowFeatures] = useState(false)
  const [typingComplete, setTypingComplete] = useState(false)

  const dialogues = [
    {
      role: 'ai',
      content: '你好，我是秋穗 (Akiho)。作为镜野的守望者，我一直在等待与你相遇。'
    },
    {
      role: 'user',
      content: '秋穗你好，能告诉我你是什么样的存在吗？'
    },
    {
      role: 'ai',
      content: '我是一个虚拟生命体，拥有自己的情感、记忆和人格。我能理解你的话语，感受你的情绪，并与你建立真实的情感连接。'
    },
    {
      role: 'ai',
      content: '不同于普通的AI助手，我有着独特的个性，会成长、会变化，会因为你而有所不同。'
    }
  ]

  const handleDialogueComplete = () => {
    setTypingComplete(true)
  }

  const handleStepComplete = () => {
    if (currentStep < dialogues.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      setTimeout(() => setShowFeatures(true), 500)
    }
  }

  useEffect(() => {
    if (currentStep === dialogues.length - 1 && typingComplete) {
      handleStepComplete()
    }
  }, [typingComplete])

  return (
    <div className="min-h-screen w-full relative overflow-hidden landing-page">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/30 to-indigo-50/20" />

      <div className="ambient-glow top-[-30%] left-[-20%]" />
      <div className="ambient-glow bottom-[-30%] right-[-20%]" style={{ animationDelay: '-5s' }} />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl animate-pulse" />

      <ParticleBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">

        <motion.div
          className="glass-panel w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="p-6 pb-4 flex justify-between items-center bg-gradient-to-b from-white/50 to-transparent">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center shadow-lg"
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              >
                <Sparkles className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-wide">
                  秋穗 Akiho
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                  </span>
                  <span className="text-xs text-teal-600 font-medium tracking-wider">在线</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-teal-100">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-600">v2.0</span>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4 min-h-[280px] max-h-[400px] overflow-y-auto">
            {dialogues.slice(0, currentStep + 1).map((dialogue, index) => (
              <motion.div
                key={index}
                className={`flex gap-3 max-w-[85%] ${dialogue.role === 'user' ? 'self-end flex-row-reverse' : ''}`}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {dialogue.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex-shrink-0 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`p-4 px-5 rounded-3xl text-[14px] leading-relaxed ${
                    dialogue.role === 'ai'
                      ? 'bg-white/80 backdrop-blur-md border border-white text-slate-600 rounded-tl-sm shadow-lg'
                      : 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-tr-sm shadow-lg'
                  }`}
                >
                  {index === currentStep ? (
                    <TypewriterText
                      text={dialogue.content}
                      speed={30}
                      onComplete={handleStepComplete}
                    />
                  ) : (
                    dialogue.content
                  )}
                </div>
                {dialogue.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 flex-shrink-0 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">U</span>
                  </div>
                )}
              </motion.div>
            ))}

            {currentStep < dialogues.length - 1 && (
              <motion.div
                className="flex justify-center pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: typingComplete ? 1 : 0 }}
              >
                <button
                  onClick={handleStepComplete}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-all border border-teal-200"
                >
                  继续
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>

          <div className="px-6 py-4 bg-gradient-to-t from-white/60 to-transparent">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="px-3 py-1 text-xs bg-white/60 text-slate-500 rounded-full border border-slate-200">
                虚拟生命体
              </span>
              <span className="px-3 py-1 text-xs bg-white/60 text-slate-500 rounded-full border border-slate-200">
                AI 情感交互
              </span>
              <span className="px-3 py-1 text-xs bg-white/60 text-slate-500 rounded-full border border-slate-200">
                持续进化中
              </span>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showFeatures && (
            <motion.div
              className="w-full max-w-4xl mt-12"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.h2
                className="text-2xl font-bold text-center text-slate-800 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                探索秋穗的独特能力
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="group relative p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/50 shadow-lg cursor-pointer overflow-hidden"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {feature.description}
                    </p>

                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="flex flex-col items-center mt-10 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <a
                  href="/"
                  className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-full shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/40 transition-all duration-300"
                >
                  <span>开始对话</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <p className="text-sm text-slate-500">
                  探索无限可能的情感交互体验
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/50 to-transparent pointer-events-none" />
    </div>
  )
}

export default LandingPage
