import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

// 默认模型路径
const DEFAULT_MODEL_PATH = '/models/yachiyo/八千代辉夜姬.model3.json'

// 全局初始化状态
let globalInitPromise = null
let globalInitialized = false
let globalApp = null
let globalModel = null
let globalCancelled = false  // 共享的取消状态
let globalCurrentPath = null  // 当前加载的模型路径

// 导出重置函数供外部调用
export function resetLive2DGlobal() {
  globalInitPromise = null
  globalInitialized = false
  globalApp = null
  globalModel = null
  globalCancelled = false
  globalCurrentPath = null
  console.log('[Live2D] 全局状态已重置')
}

// 重置全局状态用于重新加载模型
function resetGlobalForReload() {
  globalInitPromise = null
  globalInitialized = false
  globalApp = null
  globalModel = null
  globalCancelled = true
  // 等待一下再重置
  return new Promise(resolve => setTimeout(() => {
    globalCancelled = false
    resolve()
  }, 100))
}

export function Live2DViewer({ mood, isSpeaking, settings }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState('等待 Cubism Core...')
  const [error, setError] = useState(null)
  const lastBlinkRef = useRef(Date.now())
  const isBlinkingRef = useRef(false)
  const isMountedRef = useRef(true)
  const modelPathRef = useRef(DEFAULT_MODEL_PATH)

  // 从设置中读取模型路径
  const modelPath = settings?.model?.path || settings?.character?.modelPath || DEFAULT_MODEL_PATH
  const scale = settings?.model?.scale || 1.0
  const offsetX = settings?.model?.offsetX || 0
  const offsetY = settings?.model?.offsetY || 0
  const autoBlink = settings?.interaction?.autoBlink !== false

  // 当模型路径变化时更新 ref
  useEffect(() => {
    modelPathRef.current = modelPath
  }, [modelPath])

  // 初始化 Live2D
  useEffect(() => {
    isMountedRef.current = true
    // Reset cancellation flag for new init attempt
    globalCancelled = false
    // Note: doInit uses globalCancelled directly

    async function initLive2D() {
      console.log('[Live2D] initLive2D 开始, globalInitialized:', globalInitialized, 'globalCancelled:', globalCancelled)

      if (globalCancelled) return

      // 检查是否需要重新加载模型（路径变化）
      const needsReload = globalInitialized && globalCurrentPath !== modelPathRef.current

      if (globalInitialized && globalApp && globalModel && !needsReload) {
        console.log('[Live2D] 使用已初始化的全局实例')
        if (containerRef.current && !containerRef.current.contains(globalApp.canvas)) {
          containerRef.current.appendChild(globalApp.canvas)
        }
        setLoading(false)
        return
      }

      // 如果需要重新加载，先销毁旧实例
      if (needsReload) {
        console.log('[Live2D] 模型路径变化，需要重新加载')
        await resetGlobalForReload()
      }

      if (globalInitPromise) {
        console.log('[Live2D] 等待全局初始化...')
        try {
          // Add timeout to avoid waiting forever
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Init timeout')), 30000)
          )
          await Promise.race([globalInitPromise, timeout])
          if (!globalCancelled && isMountedRef.current && containerRef.current && globalApp) {
            if (!containerRef.current.contains(globalApp.canvas)) {
              containerRef.current.appendChild(globalApp.canvas)
            }
            setLoading(false)
          }
        } catch (err) {
          console.error('[Live2D] 等待超时或失败:', err)
          if (!globalCancelled && isMountedRef.current) {
            // Reset and retry
            globalInitPromise = null
            console.log('[Live2D] 重试初始化...')
            globalInitPromise = doInit()
            await globalInitPromise
            if (!globalCancelled && isMountedRef.current) {
              setLoading(false)
            }
          }
        }
        return
      }

      globalInitPromise = doInit()

      try {
        await globalInitPromise
        if (!globalCancelled && isMountedRef.current) {
          appendCanvas()
          setLoading(false)
        }
      } catch (err) {
        console.error('[Live2D] 初始化失败:', err)
        if (!globalCancelled && isMountedRef.current) {
          setError(err.message || '加载失败')
          setLoading(false)
        }
      } finally {
        // Reset for next init cycle
        globalCancelled = false
      }
    }

    function doInit() {
      return (async () => {
        console.log('[Live2D] 开始全局初始化')
        const currentPath = modelPathRef.current  // 获取当前路径

        setLoadingStep('检查 Cubism Core...')
        let attempts = 0
        while (typeof window.Live2DCubismCore === 'undefined' && attempts < 100) {
          await new Promise(r => setTimeout(r, 100))
          attempts++
        }

        if (typeof window.Live2DCubismCore === 'undefined') {
          throw new Error('Live2D Cubism Core 未加载')
        }
        console.log('[Live2D] Cubism Core 已就绪')

        setLoadingStep('加载 PIXI...')
        const PIXI = await import('pixi.js')
        console.log('[Live2D] PIXI 版本:', PIXI.VERSION)

        setLoadingStep('加载引擎...')
        console.log('[Live2D] Step: Loading Live2D Engine...')
        const live2d = await import('untitled-pixi-live2d-engine/cubism')
        console.log('[Live2D] Step: Live2D Engine imported')
        const { configureCubismSDK, startUpCubism, Live2DModel } = live2d
        console.log('[Live2D] Step: Live2D Engine ready')

        setLoadingStep('配置中...')
        console.log('[Live2D] Step: Configuring SDK...')
        configureCubismSDK({ memorySizeMB: 32 })
        startUpCubism()
        console.log('[Live2D] Step: SDK configured')

        setLoadingStep('创建画布...')
        console.log('[Live2D] Step: Creating PIXI App...')
        const container = containerRef.current
        const appWidth = container?.clientWidth || window.innerWidth
        const appHeight = container?.clientHeight || window.innerHeight
        const pixiApp = new PIXI.Application()
        await pixiApp.init({
          width: appWidth,
          height: appHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true
        })
        console.log('[Live2D] Step: PIXI App initialized, size:', appWidth, 'x', appHeight)

        globalApp = pixiApp

        setLoadingStep('加载模型...')
        console.log('[Live2D] Step: Loading model from:', currentPath)
        console.log('[Live2D] Step: Creating Live2DModel...')
        let model
        try {
          model = await Live2DModel.from(currentPath, {
            autoInteract: false
          })
          console.log('[Live2D] Step: Live2DModel.from() returned')
        } catch (err) {
          console.error('[Live2D] ERROR in Live2DModel.from():', err)
          throw err
        }

        globalModel = model
        globalCurrentPath = currentPath  // 保存当前路径

        console.log('[Live2D] Step: Model loaded, dimensions:', model.width, 'x', model.height)
        const baseScale = Math.min(appWidth / model.width, appHeight / model.height) * 0.85
        const finalScale = baseScale * scale
        model.anchor.set(0.5, 1)
        model.x = appWidth / 2 + offsetX
        model.y = appHeight + offsetY
        model.scale.set(finalScale)
        console.log('[Live2D] Step: Model properties set, position:', model.x, model.y)

        pixiApp.stage.addChild(model)
        model.eventMode = 'static'
        model.interactive = false
        console.log('[Live2D] Step: Model added to stage')

        startRenderLoop(pixiApp)
        console.log('[Live2D] Step: Render loop started')

        globalInitialized = true
        console.log('[Live2D] Global initialization complete!')
      })()
    }

    function appendCanvas() {
      if (containerRef.current && globalApp && !containerRef.current.contains(globalApp.canvas)) {
        containerRef.current.appendChild(globalApp.canvas)
      }
    }

    function startRenderLoop(app) {
      app.ticker.add(() => {
        if (!globalModel) return
        updateBlink()
      })
    }

    function updateBlink() {
      if (!globalModel) return
      if (!autoBlink) return
      const now = Date.now()
      if (now - lastBlinkRef.current > 3000 + Math.random() * 3000) {
        if (!isBlinkingRef.current) {
          isBlinkingRef.current = true
          animateBlink()
        }
        lastBlinkRef.current = now
      }
    }

    async function animateBlink() {
      if (!globalModel) return
      try {
        const eyeOpen = globalModel.getParamIndex('ParamEyeLOpen')
        if (eyeOpen !== undefined) {
          globalModel.setParamFloatById(eyeOpen, 0)
          const rightEye = globalModel.getParamIndex('ParamEyeROpen')
          if (rightEye !== undefined) {
            globalModel.setParamFloatById(rightEye, 0)
          }
          await new Promise(r => setTimeout(r, 100))
          globalModel.setParamFloatById(eyeOpen, 1)
          if (rightEye !== undefined) {
            globalModel.setParamFloatById(rightEye, 1)
          }
        }
      } catch (e) {}
      isBlinkingRef.current = false
    }

    initLive2D()

    return () => {
      isMountedRef.current = false
      globalCancelled = true
      // If we're still waiting for init, reset so next instance can retry
      if (!globalInitialized) {
        globalInitPromise = null
        console.log('[Live2D] Cleanup: reset globalInitPromise')
      }
      console.log('[Live2D] 组件卸载（不销毁全局实例）')
    }
  }, [modelPath])

  // 监听设置变化更新模型
  useEffect(() => {
    if (globalModel) {
      const baseScale = Math.min(400 / globalModel.width, 600 / globalModel.height) * 0.8
      globalModel.x = 200 + offsetX
      globalModel.y = 600 + offsetY
      globalModel.scale.set(baseScale * scale)
    }
  }, [scale, offsetX, offsetY])

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

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
