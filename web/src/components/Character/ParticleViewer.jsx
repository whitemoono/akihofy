import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

export function ParticleViewer({ mood, isSpeaking, settings }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const particlesRef = useRef([])
  const animationRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 80 })
  const timeRef = useRef(0)
  const isInitializedRef = useRef(false)

  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState(null)

  const aiState = isSpeaking ? 'speaking' : (mood === 'thinking' ? 'thinking' : 'idle')

  const particleConfig = useMemo(() => ({
    step: settings?.particle?.step ?? 3,
    particleSize: settings?.particle?.particleSize ?? 3.2,
    repelForce: settings?.particle?.repelForce ?? 80,
    offsetX: settings?.particle?.offsetX ?? 0,
    offsetY: settings?.particle?.offsetY ?? 0
  }), [
    settings?.particle?.step,
    settings?.particle?.particleSize,
    settings?.particle?.repelForce,
    settings?.particle?.offsetX,
    settings?.particle?.offsetY
  ])

  const imageUrl = settings?.character?.particleImage || ''

  // 检查 URL 是否是 base64 或 data URL
  const isDataUrl = (url) => {
    return url && url.startsWith('data:')
  }

  // 检查 URL 是否有效
  const isValidUrl = (url) => {
    if (!url) return false
    if (isDataUrl(url)) return true
    if (url.startsWith('blob:')) return false
    return true
  }

  // 生成粒子
  const generateParticles = (img) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight

    const offCanvas = document.createElement('canvas')
    offCanvas.width = width * dpr
    offCanvas.height = height * dpr
    const offCtx = offCanvas.getContext('2d')

    // 计算图片居中绘制
    const scale = Math.min(width / img.width, height / img.height) * 0.9
    const drawW = img.width * scale
    const drawH = img.height * scale
    const baseOffsetX = (width - drawW) / 2
    const baseOffsetY = (height - drawH) / 2

    offCtx.drawImage(img, baseOffsetX, baseOffsetY, drawW, drawH)

    const imageData = offCtx.getImageData(0, 0, width, height).data
    const particles = []

    for (let y = 0; y < height; y += particleConfig.step) {
      for (let x = 0; x < width; x += particleConfig.step) {
        const index = (y * width + x) * 4
        const alpha = imageData[index + 3]

        if (alpha > 80) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            baseX: x,
            baseY: y,
            color: `rgba(${imageData[index]}, ${imageData[index + 1]}, ${imageData[index + 2]}, ${Math.min(1, alpha / 200)})`,
            size: particleConfig.particleSize,
            density: Math.random() * 30 + 1
          })
        }
      }
    }

    particlesRef.current = particles
    setLoading(false)
    setLoadingStep('')
  }

  // 生成默认粒子（用于没有图片时）
  const generateDefaultParticles = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = window.innerWidth
    const height = window.innerHeight
    const particles = []

    // 生成一个简单的粒子网格作为默认效果
    const cols = Math.floor(width / 20)
    const rows = Math.floor(height / 20)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const baseX = x * 20 + 10
        const baseY = y * 20 + 10

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseX: baseX,
          baseY: baseY,
          color: `rgba(45, 164, 168, ${Math.random() * 0.5 + 0.2})`,
          size: particleConfig.particleSize * 0.8,
          density: Math.random() * 20 + 1
        })
      }
    }

    particlesRef.current = particles
    setLoading(false)
    setLoadingStep('')
  }

  // 加载图片并生成粒子
  const loadImage = (url) => {
    if (!isValidUrl(url)) {
      generateDefaultParticles()
      return
    }

    setLoading(true)
    setLoadingStep('加载图片...')

    const img = new Image()

    if (!isDataUrl(url)) {
      img.crossOrigin = 'Anonymous'
    }

    img.onload = () => {
      setLoadingStep('生成粒子...')
      generateParticles(img)
    }

    img.onerror = () => {
      setError('图片加载失败')
      setLoading(false)
      generateDefaultParticles()
    }

    img.src = url
  }

  // 动画循环
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = window.innerWidth
    const height = window.innerHeight

    ctx.clearRect(0, 0, width, height)
    timeRef.current += aiState === 'thinking' ? 0.08 : 0.02

    const particles = particlesRef.current
    const mouse = mouseRef.current

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      let dx = mouse.x - p.x
      let dy = mouse.y - p.y
      let distance = Math.sqrt(dx * dx + dy * dy)
      let isMouseAffected = false

      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius
        p.x -= (dx / distance) * force * p.density * (particleConfig.repelForce / 10)
        p.y -= (dy / distance) * force * p.density * (particleConfig.repelForce / 10)
        isMouseAffected = true
      }

      let targetX = p.baseX + particleConfig.offsetX
      let targetY = p.baseY + particleConfig.offsetY

      if (aiState === 'thinking') {
        targetX += (Math.random() - 0.5) * 3
        targetY += (Math.random() - 0.5) * 3
      } else if (aiState === 'speaking') {
        const pulse = Math.sin(timeRef.current * 3 + p.baseY * 0.02) * 2
        targetY -= pulse
      } else {
        // 空闲状态 - 丝绸律动效果
        const waveX = Math.sin(timeRef.current + p.baseY * 0.008) * 1.5
        const waveY = Math.cos(timeRef.current + p.baseX * 0.008) * 1.5
        const breath = Math.sin(timeRef.current * 1.2) * 2

        targetX = p.baseX + particleConfig.offsetX + waveX
        targetY = p.baseY + particleConfig.offsetY + waveY + breath
      }

      if (!isMouseAffected) {
        p.x += (targetX - p.x) * 0.08
        p.y += (targetY - p.y) * 0.08
      }

      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [aiState, particleConfig])

  // 初始化画布
  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
  }

  // 初始化
  useEffect(() => {
    // 防止重复初始化
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    initCanvas()
    // 初始化时生成默认粒子
    generateDefaultParticles()

    // 开始动画
    animationRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      initCanvas()
      if (imageUrl) {
        loadImage(imageUrl)
      }
    }

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.x, y: e.y, radius: 80 }
    }

    const handleMouseOut = () => {
      mouseRef.current = { x: -1000, y: -1000, radius: 80 }
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
      isInitializedRef.current = false
    }
  }, [animate])

  // 当图片 URL 或粒子参数变化时重新加载
  useEffect(() => {
    if (!isInitializedRef.current) return
    if (imageUrl) {
      loadImage(imageUrl)
    } else {
      generateDefaultParticles()
    }
  }, [imageUrl, particleConfig])

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          display: 'block',
          zIndex: 0,
          imageRendering: 'pixelated'
        }}
      />

      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="text-center">
            <motion.div
              className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-teal-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-teal-600 text-xs">{loadingStep}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/50">
          <div className="text-center text-red-500 p-4">
            <p className="text-sm font-medium">加载失败</p>
            <p className="text-xs mt-1 opacity-70">{error}</p>
          </div>
        </div>
      )}

      <FloatingSparkles />
    </div>
  )
}

function FloatingSparkles() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-teal-300/60"
          initial={{
            x: `${20 + (i * 10)}%`,
            y: `${40 + (i * 5)}%`,
            opacity: 0
          }}
          animate={{
            y: ['40%', '20%'],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut'
          }}
        />
      ))}
    </>
  )
}

// 上传图片转换为粒子效果的组件
export function ParticleImageUploader({ value, onChange, onUpload }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      return
    }

    setIsUploading(true)

    try {
      // 转换为 base64 以便持久化存储
      const base64 = await fileToBase64(file)
      onChange(base64)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  // 将文件转换为 base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
  }

  // 检查 URL 是否有效（blob URL 可能在页面刷新后失效）
  const isValidUrl = (url) => {
    if (!url) return false
    if (url.startsWith('data:')) return true  // base64 总是有效
    if (url.startsWith('blob:')) {
      // blob URL 需要检查是否有效
      return false
    }
    return true
  }

  const displayValue = isValidUrl(value) ? value : ''

  return (
    <div className="space-y-3">
      {/* 图片预览 */}
      {displayValue && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
          <img
            src={displayValue}
            alt="粒子效果预览"
            className="w-full h-full object-contain"
            onError={(e) => {
              // 如果图片加载失败，清除无效的 URL
              e.target.style.display = 'none'
            }}
          />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <span className="text-xs">×</span>
          </button>
        </div>
      )}

      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-teal-500 bg-teal-50'
            : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-sm text-slate-500">上传中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {displayValue ? (
              <>
                <ImageIcon className="w-8 h-8 text-teal-500" />
                <p className="text-sm text-slate-600">点击或拖拽更换图片</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400" />
                <p className="text-sm text-slate-600">点击或拖拽上传 PNG/JPG 图片</p>
                <p className="text-xs text-slate-400">图片将转换为粒子效果</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ParticleViewer
