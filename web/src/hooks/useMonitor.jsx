
//监控面板 API Hook


import { useState, useEffect, useCallback } from 'react'

const API_BASE = '' // 空字符串，使用相对路径，由 Vite 代理到后端

// API 请求封装
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  const data = await response.json()
  if (data.code !== 0) {
    throw new Error(data.message || 'Request failed')
  }
  return data.data
}

// 获取引擎状态
export function useEngineState() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchState = useCallback(async () => {
    try {
      const data = await apiRequest('/api/state')
      setState(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 2000)
    return () => clearInterval(interval)
  }, [fetchState])

  return { state, loading, error, refresh: fetchState }
}

// WebSocket 连接
export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'state') {
        onMessage(data.data)
      }
    }

    return () => ws.close()
  }, [onMessage])

  return connected
}

// 生成器管理
export function useGenerator() {
  const [current, setCurrent] = useState(null)
  const [list, setList] = useState({})

  const fetchInfo = useCallback(async () => {
    try {
      const data = await apiRequest('/api/generator/info')
      setCurrent(data)
    } catch (err) {
      console.error('Failed to fetch generator info:', err)
    }
  }, [])

  const fetchList = useCallback(async () => {
    try {
      const data = await apiRequest('/api/generator/list')
      setList(data.generators)
    } catch (err) {
      console.error('Failed to fetch generator list:', err)
    }
  }, [])

  const switchGenerator = useCallback(async (type, config = {}) => {
    const data = await apiRequest('/api/generator/switch', {
      method: 'POST',
      body: JSON.stringify({ generator: type, config }),
    })
    setCurrent(data)
    return data
  }, [])

  useEffect(() => {
    fetchInfo()
    fetchList()
  }, [fetchInfo, fetchList])

  return {
    current,
    list,
    switchGenerator,
    refresh: () => { fetchInfo(); fetchList() },
  }
}

// 对比测试
export function useComparison() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const runComparison = useCallback(async (message, generators = ['rule', 'local', 'api']) => {
    setLoading(true)
    try {
      const data = await apiRequest('/api/compare', {
        method: 'POST',
        body: JSON.stringify({ message, generators }),
      })
      setResults(data)
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, loading, runComparison }
}

// 快速对话
export function useQuickChat() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const send = useCallback(async (message) => {
    setLoading(true)
    try {
      const data = await apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      })
      setResult(data)
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, loading, send }
}

// ==================== 拟人化系统 Hooks ====================

// 获取意图状态
export function useIntent() {
  const [intent, setIntent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchIntent = useCallback(async () => {
    try {
      const data = await apiRequest('/api/intent')
      setIntent(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntent()
    const interval = setInterval(fetchIntent, 5000)
    return () => clearInterval(interval)
  }, [fetchIntent])

  return { intent, loading, error, refresh: fetchIntent }
}

// 获取欲望列表
export function useDesires() {
  const [desires, setDesires] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDesires = useCallback(async () => {
    try {
      const data = await apiRequest('/api/desires')
      setDesires(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDesires()
    const interval = setInterval(fetchDesires, 3000)
    return () => clearInterval(interval)
  }, [fetchDesires])

  return { desires, loading, error, refresh: fetchDesires }
}

// 获取认知偏差
export function useCognitiveBias() {
  const [bias, setBias] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBias = useCallback(async () => {
    try {
      const data = await apiRequest('/api/cognitive-bias')
      setBias(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBias()
    const interval = setInterval(fetchBias, 5000)
    return () => clearInterval(interval)
  }, [fetchBias])

  return { bias, loading, error, refresh: fetchBias }
}

// 获取人生叙事
export function useNarrative() {
  const [narrative, setNarrative] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNarrative = useCallback(async () => {
    try {
      const data = await apiRequest('/api/narrative')
      setNarrative(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNarrative()
    const interval = setInterval(fetchNarrative, 10000) // 叙事更新较慢
    return () => clearInterval(interval)
  }, [fetchNarrative])

  return { narrative, loading, error, refresh: fetchNarrative }
}

// 综合拟人化状态 Hook
export function useAnthropomorphic() {
  const intentHook = useIntent()
  const desiresHook = useDesires()
  const biasHook = useCognitiveBias()
  const narrativeHook = useNarrative()

  return {
    intent: intentHook.intent,
    desires: desiresHook.desires,
    cognitiveBias: biasHook.bias,
    narrative: narrativeHook.narrative,
    loading: intentHook.loading || desiresHook.loading || biasHook.loading || narrativeHook.loading,
    error: intentHook.error || desiresHook.error || biasHook.error || narrativeHook.error,
    refresh: () => {
      intentHook.refresh()
      desiresHook.refresh()
      biasHook.refresh()
      narrativeHook.refresh()
    },
  }
}

// 监控面板专用 Hook - 组合引擎状态和 WebSocket
export function useMonitor() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchState = useCallback(async () => {
    try {
      const data = await apiRequest('/api/state')
      setState(data)
      setLastUpdate(new Date().toLocaleTimeString())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchState()
  }, [fetchState])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 5000)
    return () => clearInterval(interval)
  }, [fetchState])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'state' || data.type === 'state_update') {
          setState(data.data)
          setLastUpdate(new Date().toLocaleTimeString())
        }
      } catch (e) {
        console.error('WebSocket parse error:', e)
      }
    }

    return () => ws.close()
  }, [])

  return { state, loading, error, connected, refresh, lastUpdate }
}
