function createClientId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `client-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

export function createApiClient({ onJsonMessage, onBinaryImage, onConnection }) {
  const clientId = createClientId()
  let socket = null

  function toAbsoluteUrl(serverUrl) {
    if (serverUrl.startsWith('http://') || serverUrl.startsWith('https://')) {
      return serverUrl
    }
    if (serverUrl.startsWith('/')) {
      return `${window.location.origin}${serverUrl}`
    }
    return `${window.location.origin}/${serverUrl}`
  }

  function getWsUrl(serverUrl) {
    const base = toAbsoluteUrl(serverUrl).replace(/^http/, 'ws')
    return `${base}/ws?clientId=${clientId}`
  }

  async function queuePrompt(serverUrl, workflow) {
    const baseUrl = toAbsoluteUrl(serverUrl)
    const response = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    })
    if (!response.ok) {
      throw new Error('Failed to queue prompt')
    }
    const data = await response.json()
    return data.prompt_id
  }

  async function fetchModels(serverUrl, folder = 'checkpoints') {
    const baseUrl = toAbsoluteUrl(serverUrl)
    const endpoints = [
      `${baseUrl}/api/etn/model_info/${folder}`,
      `${baseUrl}/models/${folder}`,
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint)
        if (!response.ok) {
          continue
        }
        const data = await response.json()
        const models = normalizeModelResponse(data)
        if (models.length) {
          return models
        }
      } catch (error) {
        continue
      }
    }
    return []
  }

  function normalizeModelResponse(data) {
    if (!data) return []
    if (Array.isArray(data)) {
      return data
    }
    if (typeof data === 'object') {
      const keys = Object.keys(data)
      if (keys.length) {
        return keys
      }
    }
    if (Array.isArray(data.models)) {
      return data.models
    }
    if (Array.isArray(data.items)) {
      return data.items.map((item) => item.name || item.path || item)
    }
    if (Array.isArray(data.files)) {
      return data.files.map((file) => file.name || file)
    }
    return []
  }

  async function uploadImage(serverUrl, dataUrl) {
    const baseUrl = toAbsoluteUrl(serverUrl)
    const blob = await (await fetch(dataUrl)).blob()
    const formData = new FormData()
    formData.append('image', blob, `canvas-${Date.now()}.png`)
    formData.append('type', 'input')
    const response = await fetch(`${baseUrl}/upload/image`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      throw new Error('Failed to upload image')
    }
    return response.json()
  }

  function connect(serverUrl) {
    if (socket) {
      socket.close()
    }
    const url = getWsUrl(serverUrl)
    socket = new WebSocket(url)
    socket.binaryType = 'arraybuffer'

    socket.onopen = () => {
      if (onConnection) onConnection('connected')
    }

    socket.onclose = () => {
      if (onConnection) onConnection('disconnected')
    }

    socket.onerror = () => {
      if (onConnection) onConnection('error')
    }

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data)
        if (onJsonMessage) onJsonMessage(message)
        return
      }

      if (event.data instanceof ArrayBuffer) {
        const buffer = stripComfyHeader(event.data)
        if (onBinaryImage) {
          onBinaryImage(buffer, { contentType: 'image/png' })
        }
      }
    }
  }

  function stripComfyHeader(buffer) {
    if (buffer.byteLength <= 8) {
      return buffer
    }
    return buffer.slice(8)
  }

  return {
    queuePrompt,
    fetchModels,
    uploadImage,
    connect,
  }
}
