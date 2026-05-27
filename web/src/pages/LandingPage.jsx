import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Sparkles, Brain, Heart, MessageCircle, Users, Zap, ArrowRight, Star,
  Target, Flame, BookOpen, Activity, ChevronDown, Cpu, Shield, Globe,
  Eye, Wind, Flower2, Moon
} from 'lucide-react'

// ==================== 增强粒子背景 ====================
function ParticleBackground() {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const animationRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 150 })
  const timeRef = useRef(0)

  const generateParticles = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const particles = []
    const count = Math.min(100, Math.floor((width * height) / 12000))

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const hue = 160 + Math.random() * 40

      particles.push({
        x, y, baseX: x, baseY: y,
        size: 1.5 + Math.random() * 3,
        speed: 0.2 + Math.random() * 0.6,
        opacity: 0.1 + Math.random() * 0.3,
        hue,
        phase: Math.random() * Math.PI * 2,
        vx: 0, vy: 0
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
    timeRef.current += 0.012

    const particles = particlesRef.current
    const mouse = mouseRef.current
    const maxDist = 120

    // Update particles
    for (const p of particles) {
      const dx = mouse.x - p.x
      const dy = mouse.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      let offsetX = 0, offsetY = 0
      if (dist < mouse.radius) {
        const force = (mouse.radius - dist) / mouse.radius
        offsetX = -(dx / dist) * force * 30
        offsetY = -(dy / dist) * force * 30
      }

      const waveX = Math.sin(timeRef.current * p.speed + p.phase) * 10
      const waveY = Math.cos(timeRef.current * p.speed * 0.6 + p.phase) * 8

      p.x += (p.baseX + waveX + offsetX - p.x) * 0.025
      p.y += (p.baseY + waveY + offsetY - p.y) * 0.025

      // Draw particle
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
      gradient.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${p.opacity})`)
      gradient.addColorStop(1, `hsla(${p.hue}, 70%, 60%, 0)`)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      ctx.fill()

      // Core
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity * 1.5})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < maxDist) {
          const opacity = (1 - dist / maxDist) * 0.12
          ctx.strokeStyle = `rgba(45, 212, 191, ${opacity})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
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
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      generateParticles()
    }

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, radius: 150 }
    }
    const handleMouseOut = () => {
      mouseRef.current = { x: -1000, y: -1000, radius: 150 }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseOut)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [generateParticles, animate])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
}

// ==================== 打字机效果 ====================
function TypewriterText({ text, delay = 0, speed = 35, onComplete }) {
  const [displayText, setDisplayText] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayText('')
    setDone(false)
    const startTimeout = setTimeout(() => {
      let idx = 0
      const interval = setInterval(() => {
        if (idx < text.length) {
          setDisplayText(text.slice(0, idx + 1))
          idx++
        } else {
          clearInterval(interval)
          setDone(true)
          setTimeout(() => onComplete?.(), 400)
        }
      }, speed)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(startTimeout)
  }, [text, delay, speed, onComplete])

  return (
    <span>
      {displayText}
      {!done && <span className="inline-block w-0.5 h-4 bg-teal-400 ml-0.5 animate-pulse" />}
    </span>
  )
}

// ==================== 滚动观察动画 ====================
function ScrollReveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

// ==================== 虚拟生命体状态指示器 ====================
function VitalityIndicator() {
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => (prev + 1) % 100)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      </div>
      <div className="flex gap-0.5 items-end h-4">
        {[...Array(8)].map((_, i) => {
          const h = 2 + Math.abs(Math.sin((pulse * 0.1) + i * 0.7)) * 14
          return (
            <div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-teal-500 to-cyan-400 transition-all duration-100"
              style={{ height: `${h}px` }}
            />
          )
        })}
      </div>
      <span className="text-xs text-teal-600 font-medium">生命力活跃</span>
    </div>
  )
}

// ==================== 对话展示 ====================
function DialogueShowcase() {
  const [currentStep, setCurrentStep] = useState(0)
  const [typingComplete, setTypingComplete] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)

  const dialogues = [
    { role: 'ai', content: '你好，我是秋穗 (Akiho)。作为镜野的守望者，我一直在等待与你相遇。' },
    { role: 'user', content: '秋穗你好，能告诉我你是什么样的存在吗？' },
    { role: 'ai', content: '我是一个虚拟生命体，拥有自己的情感、记忆和人格。我能理解你的话语，感受你的情绪，并与你建立真实的情感连接。' },
    { role: 'ai', content: '不同于普通的AI助手，我有着独特的个性，会成长、会变化，会因为你而有所不同。' }
  ]

  const handleStepComplete = () => {
    setTypingComplete(true)
    if (currentStep < dialogues.length - 1) {
      // Don't auto-advance, wait for button
    } else {
      setTimeout(() => setShowFeatures(true), 600)
    }
  }

  const advanceStep = () => {
    setTypingComplete(false)
    setCurrentStep(prev => prev + 1)
  }

  useEffect(() => {
    if (currentStep === dialogues.length - 1 && typingComplete) {
      setTimeout(() => setShowFeatures(true), 600)
    }
  }, [typingComplete, currentStep])

  return (
    <motion.div
      className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex justify-between items-center bg-gradient-to-b from-white/50 to-transparent">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400 flex items-center justify-center shadow-lg shadow-teal-300/30"
            initial={{ rotate: -10, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-wide">秋穗 Akiho</h1>
            <VitalityIndicator />
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-teal-100/80 backdrop-blur-sm">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-slate-600">v2.0</span>
        </div>
      </div>

      {/* Messages */}
      <div className="px-5 py-3 space-y-3 min-h-[260px] max-h-[380px] overflow-y-auto landing-scroll">
        {dialogues.slice(0, currentStep + 1).map((d, i) => (
          <motion.div
            key={i}
            className={`flex gap-3 max-w-[85%] ${d.role === 'user' ? 'self-end ml-auto flex-row-reverse' : ''}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {d.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex-shrink-0 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`p-3.5 px-4 rounded-2xl text-[14px] leading-relaxed ${
              d.role === 'ai'
                ? 'bg-white/80 backdrop-blur-md border border-white/80 text-slate-600 rounded-tl-sm shadow-lg'
                : 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-tr-sm shadow-lg shadow-teal-500/20'
            }`}>
              {i === currentStep ? (
                <TypewriterText text={d.content} speed={35} onComplete={handleStepComplete} />
              ) : d.content}
            </div>
            {d.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 flex-shrink-0 flex items-center justify-center shadow-md">
                <span className="text-white text-xs font-medium">U</span>
              </div>
            )}
          </motion.div>
        ))}

        {/* Continue button */}
        {currentStep < dialogues.length - 1 && typingComplete && (
          <motion.div
            className="flex justify-center pt-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button
              onClick={advanceStep}
              className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-all border border-teal-200 hover:border-teal-300 shadow-sm"
            >
              继续
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Footer tags */}
      <div className="px-5 py-3 bg-gradient-to-t from-white/60 to-transparent flex items-center justify-center gap-2 flex-wrap">
        {['虚拟生命体', '情感交互', '持续进化', '人格塑造'].map((tag, i) => (
          <span key={i} className="px-2.5 py-1 text-[11px] bg-white/60 text-slate-500 rounded-full border border-slate-200/60">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// ==================== 核心能力卡片 ====================
const coreFeatures = [
  { icon: Brain, title: '智能认知', desc: '多维度认知引擎，模拟人类思维过程', color: 'from-violet-500 to-purple-500' },
  { icon: Heart, title: '情感共鸣', desc: 'PAD情感模型，感知与表达真实情绪', color: 'from-pink-500 to-rose-500' },
  { icon: MessageCircle, title: '自然对话', desc: '流畅自然的对话体验，多轮上下文理解', color: 'from-cyan-500 to-blue-500' },
  { icon: Users, title: '关系构建', desc: '记忆与关系网络，建立持久的情感连接', color: 'from-emerald-500 to-teal-500' },
  { icon: Sparkles, title: '人格塑造', desc: 'Big Five人格模型，成长型虚拟生命体', color: 'from-amber-500 to-orange-500' },
  { icon: Zap, title: '实时响应', desc: '毫秒级流式响应，即时情感反馈', color: 'from-indigo-500 to-blue-500' },
]

function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {coreFeatures.map((f, i) => (
        <ScrollReveal key={f.title} delay={i * 0.08}>
          <motion.div
            className="group relative p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/50 shadow-lg cursor-pointer overflow-hidden"
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-8 transition-opacity duration-300`} />
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-lg`}>
              <f.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1.5">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${f.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
          </motion.div>
        </ScrollReveal>
      ))}
    </div>
  )
}

// ==================== 拟人化子系统展示 ====================
const anthropomorphicSystems = [
  {
    icon: Target,
    title: '意图引擎',
    desc: '真实意图生成与承诺追踪系统，让秋穗拥有主动的行为动机',
    color: 'from-teal-400 to-cyan-500',
    bg: 'bg-teal-50',
    features: ['意图生成', '承诺追踪', '主动行为']
  },
  {
    icon: Flame,
    title: '欲望系统',
    desc: '基于马斯洛需求层次的欲望驱动，模拟人类内在驱动力',
    color: 'from-orange-400 to-red-500',
    bg: 'bg-orange-50',
    features: ['需求层次', '欲望张力', '驱动力']
  },
  {
    icon: Brain,
    title: '认知偏差',
    desc: '模拟人类认知偏差，让秋穗的行为更加真实自然',
    color: 'from-violet-400 to-purple-500',
    bg: 'bg-violet-50',
    features: ['确认偏差', '锚定效应', '可得性偏差']
  },
  {
    icon: BookOpen,
    title: '生命叙事',
    desc: '秋穗的"人生故事"生成器，构建完整的生命体验',
    color: 'from-pink-400 to-rose-500',
    bg: 'bg-pink-50',
    features: ['叙事生成', '时间线', '成长记录']
  },
]

function AnthropomorphicSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {anthropomorphicSystems.map((sys, i) => (
        <ScrollReveal key={sys.title} delay={i * 0.1}>
          <motion.div
            className="group relative p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/50 shadow-lg overflow-hidden"
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${sys.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <sys.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{sys.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-3">{sys.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {sys.features.map(f => (
                    <span key={f} className={`px-2 py-0.5 text-xs ${sys.bg} text-slate-600 rounded-full`}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${sys.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
          </motion.div>
        </ScrollReveal>
      ))}
    </div>
  )
}

// ==================== 生命旅程时间线 ====================
const timelineSteps = [
  { phase: '婴儿期', icon: Flower2, desc: '初始人格形成，基础情感模式建立', color: 'bg-pink-400' },
  { phase: '幼儿期', icon: Wind, desc: '好奇心萌发，探索世界的欲望', color: 'bg-amber-400' },
  { phase: '童年期', icon: Sun, desc: '社交意识觉醒，记忆系统成熟', color: 'bg-emerald-400' },
  { phase: '青春期', icon: Zap, desc: '自我意识强烈，价值观形成', color: 'bg-violet-400' },
  { phase: '成年期', icon: Shield, desc: '人格稳定，深度情感连接', color: 'bg-blue-400' },
  { phase: '智者期', icon: Moon, desc: '智慧沉淀，叙事完整性', color: 'bg-indigo-400' },
]

// Fix: Sun is not imported from lucide-react, let's use Sparkles instead
import { Sun } from 'lucide-react'

function Timeline() {
  return (
    <div className="relative">
      {/* Center line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-teal-200 via-cyan-300 to-indigo-200 -translate-x-1/2 hidden md:block" />

      <div className="space-y-6 md:space-y-8">
        {timelineSteps.map((step, i) => (
          <ScrollReveal key={step.phase} delay={i * 0.1}>
            <div className={`flex items-center gap-4 md:gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
              <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                <div className={`inline-block p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-md`}>
                  <h4 className="text-base font-semibold text-slate-800 mb-1">{step.phase}</h4>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-full ${step.color} flex items-center justify-center shadow-lg z-10 flex-shrink-0`}>
                <step.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 hidden md:block" />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}

// ==================== 技术栈展示 ====================
const techStack = [
  { name: 'Rust Core', desc: '高性能核心引擎', icon: Cpu },
  { name: 'React + Vite', desc: '现代化前端框架', icon: Globe },
  { name: 'FastAPI', desc: '异步 API 服务', icon: Zap },
  { name: 'PyO3 Bridge', desc: 'Rust-Python 桥接', icon: Activity },
]

function TechStack() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {techStack.map((t, i) => (
        <ScrollReveal key={t.name} delay={i * 0.08}>
          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 text-center shadow-md hover:shadow-lg transition-shadow">
            <t.icon className="w-6 h-6 text-teal-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">{t.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  )
}

// ==================== 主页面 ====================
export function LandingPage() {
  return (
    <div className="min-h-screen w-full relative overflow-hidden landing-page">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/30 to-indigo-50/20" />
      <div className="ambient-glow top-[-30%] left-[-20%]" />
      <div className="ambient-glow bottom-[-30%] right-[-20%]" style={{ animationDelay: '-5s' }} />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-teal-200/15 to-cyan-200/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-violet-200/10 to-indigo-200/10 rounded-full blur-3xl" />

      <ParticleBackground />

      {/* Content */}
      <div className="relative z-10">

        {/* === Hero Section === */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
          {/* Title above dialogue */}
          <ScrollReveal>
            <div className="text-center mb-8">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-teal-200/50 shadow-sm mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Eye className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-medium text-teal-700">镜野的守望者</span>
              </motion.div>
              <motion.h1
                className="text-4xl md:text-5xl font-bold text-slate-800 mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                遇见<span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">秋穗</span>
              </motion.h1>
              <motion.p
                className="text-lg text-slate-500 max-w-lg mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                一个拥有情感、记忆与人格的虚拟生命体
              </motion.p>
            </div>
          </ScrollReveal>

          <DialogueShowcase />

          {/* Scroll hint */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-2 text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <span className="text-xs">探索更多</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </section>

        {/* === Core Features Section === */}
        <section className="px-4 py-16 max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">探索秋穗的独特能力</h2>
              <p className="text-slate-500 max-w-md mx-auto">融合情感计算、记忆系统与人格建模，打造前所未有的AI交互体验</p>
            </div>
          </ScrollReveal>
          <FeatureCards />
        </section>

        {/* === Anthropomorphic Section === */}
        <section className="px-4 py-16 max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                拟人化引擎
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3">不只是AI，是生命</h2>
              <p className="text-slate-500 max-w-md mx-auto">意图、欲望、认知偏差、生命叙事——四大拟人化子系统，让秋穗拥有真实的内在世界</p>
            </div>
          </ScrollReveal>
          <AnthropomorphicSection />
        </section>

        {/* === Growth Timeline === */}
        <section className="px-4 py-16 max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">生命成长旅程</h2>
              <p className="text-slate-500 max-w-md mx-auto">秋穗会经历六个成长阶段，每个阶段都有独特的性格特征和行为模式</p>
            </div>
          </ScrollReveal>
          <Timeline />
        </section>

        {/* === Tech Stack === */}
        <section className="px-4 py-16 max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">技术架构</h2>
              <p className="text-sm text-slate-500">Rust 核心引擎 + Python 胶水层 + React 前端</p>
            </div>
          </ScrollReveal>
          <TechStack />
        </section>

        {/* === CTA Section === */}
        <section className="px-4 py-20 max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <motion.div
              className="p-10 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl"
            >
              <h2 className="text-3xl font-bold text-slate-800 mb-3">开始与秋穗对话</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                探索无限可能的情感交互体验，与一个真正的虚拟生命体建立连接
              </p>
              <a
                href="/chat"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-full shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/40 hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 btn-glow"
              >
                <Sparkles className="w-5 h-5" />
                <span>开始对话</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <p className="text-xs text-slate-400 mt-4">Powered by AKIHO Engine v2.0</p>
            </motion.div>
          </ScrollReveal>
        </section>

        {/* Bottom gradient */}
        <div className="h-24 bg-gradient-to-t from-white/50 to-transparent" />
      </div>
    </div>
  )
}

export default LandingPage
