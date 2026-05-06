import { useEffect, useRef, useCallback } from 'react'

export function BackgroundParticles() {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const animationRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 100 })
  const timeRef = useRef(0)

  const generateParticles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = window.innerWidth
    const height = window.innerHeight
    const particles = []

    const cols = Math.floor(width / 25)
    const rows = Math.floor(height / 25)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const baseX = x * 25 + 12
        const baseY = y * 25 + 12

        const hue = 170 + Math.random() * 20
        const lightness = 60 + Math.random() * 20

        particles.push({
          x: baseX,
          y: baseY,
          baseX: baseX,
          baseY: baseY,
          color: `hsla(${hue}, 60%, ${lightness}%, ${0.15 + Math.random() * 0.25})`,
          size: 1.5 + Math.random() * 2,
          density: Math.random() * 15 + 1,
          offsetX: (Math.random() - 0.5) * 10,
          offsetY: (Math.random() - 0.5) * 10
        })
      }
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

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      const dx = mouse.x - p.x
      const dy = mouse.y - p.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      let isMouseAffected = false

      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius
        p.x -= (dx / distance) * force * p.density * 2
        p.y -= (dy / distance) * force * p.density * 2
        isMouseAffected = true
      }

      const targetX = p.baseX + Math.sin(timeRef.current + p.offsetX) * 3
      const targetY = p.baseY + Math.cos(timeRef.current + p.offsetY) * 3

      if (!isMouseAffected) {
        p.x += (targetX - p.x) * 0.05
        p.y += (targetY - p.y) * 0.05
      }

      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  const initCanvas = useCallback(() => {
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

    generateParticles()
  }, [generateParticles])

  useEffect(() => {
    initCanvas()
    animationRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      initCanvas()
    }

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.x, y: e.y, radius: 100 }
    }

    const handleMouseOut = () => {
      mouseRef.current = { x: -1000, y: -1000, radius: 100 }
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
  }, [initCanvas, animate])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        display: 'block',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  )
}

export default BackgroundParticles
