import './style.css'
import { createStore } from './modules/store.js'
import { getDefaultSettings, initSettings } from './modules/settings.js'
import { initCanvas } from './modules/canvas.js'
import { initOutput } from './modules/output.js'
import { createApiClient } from './modules/api.js'
import { buildWorkflow } from './modules/workflow.js'
import { initQuickSettings } from './modules/quickSettings.js'

const app = document.querySelector('#app')
app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div>
        <h1>Comfy Sketch UI</h1>
        <p class="subtitle">Prompt + model + sketch canvas + live stream output</p>
      </div>
      <div class="header-actions">
        <button id="run-btn" class="primary">Run</button>
        <label class="toggle">
          <input id="live-toggle" type="checkbox" checked />
          <span>Stream mode</span>
        </label>
      </div>
    </header>
    <main class="app-grid">
      <section class="panel panel-left">
        <div class="panel-block">
          <h2>Prompt + Model</h2>
          <div data-settings></div>
        </div>
        <div class="panel-block">
          <h2>Layers</h2>
          <ul class="layer-list">
            <li class="layer-item active">Layer 1 (static)</li>
            <li class="layer-item">Layer 2</li>
            <li class="layer-item">Layer 3</li>
          </ul>
        </div>
      </section>
      <section class="panel panel-center">
        <div class="panel-block">
          <div class="panel-header">
            <h2>Canvas</h2>
            <div class="panel-actions">
              <span class="hint">Sketch to drive output</span>
              <button id="clear-btn">Clear Canvas</button>
            </div>
          </div>
          <div class="quick-settings" data-quick-settings></div>
          <div class="canvas-wrap">
            <canvas id="sketch-canvas" width="512" height="512"></canvas>
          </div>
        </div>
      </section>
      <section class="panel panel-right">
        <div class="panel-block">
          <div class="panel-header">
            <h2>Output</h2>
            <span id="status" class="status">Idle</span>
          </div>
          <div class="output-wrap">
            <img id="output-image" alt="Output" />
            <div class="output-placeholder">Waiting for output…</div>
          </div>
        </div>
      </section>
    </main>
  </div>
`

const store = createStore({
  ...getDefaultSettings(),
  liveMode: true,
  status: 'idle',
  wsStatus: 'disconnected',
})

const settingsRoot = document.querySelector('[data-settings]')
const settingsUi = initSettings(settingsRoot, store)
initQuickSettings(document.querySelector('[data-quick-settings]'), store, [
  { id: 'cfg', label: 'Prompt', type: 'range', min: 1, max: 20, step: 0.5 },
  { id: 'steps', label: 'Steps', type: 'number', min: 1, max: 60, step: 1 },
  { id: 'strength', label: 'Strength', type: 'range', min: 0.1, max: 1, step: 0.01 },
  { id: 'loraStrengthModel', label: 'LoRA', type: 'range', min: 0, max: 2, step: 0.1 },
  { id: 'loraStrengthClip', label: 'LoRA Clip', type: 'range', min: 0, max: 2, step: 0.1 },
])
const canvas = initCanvas(document.querySelector('#sketch-canvas'), store, {
  onDraw: () => scheduleLiveRun(),
})
const output = initOutput(
  document.querySelector('#output-image'),
  document.querySelector('.output-placeholder')
)

const statusEl = document.querySelector('#status')
const api = createApiClient({
  onJsonMessage: handleWsMessage,
  onBinaryImage: (buffer, meta) => output.setImageFromArrayBuffer(buffer, meta),
  onConnection: (state) => {
    store.setState({ wsStatus: state })
  },
})

let activePromptId = null
let runQueued = false
let liveTimer = null

const runButton = document.querySelector('#run-btn')
const clearButton = document.querySelector('#clear-btn')
const liveToggle = document.querySelector('#live-toggle')

runButton.addEventListener('click', () => triggerRun({ reason: 'manual' }))
clearButton.addEventListener('click', () => canvas.clear())
liveToggle.addEventListener('change', (event) => {
  store.setState({ liveMode: event.target.checked })
  if (event.target.checked) {
    scheduleLiveRun()
  }
})

function setStatus(message) {
  statusEl.textContent = message
}

function scheduleLiveRun() {
  const state = store.getState()
  if (!state.liveMode) {
    return
  }
  if (liveTimer) {
    clearTimeout(liveTimer)
  }
  liveTimer = setTimeout(() => {
    triggerRun({ reason: 'live' })
  }, 900)
}

async function triggerRun({ reason }) {
  const state = store.getState()
  if (!state.model) {
    setStatus('Select a checkpoint model')
    return
  }
  if (activePromptId) {
    runQueued = true
    return
  }

  let imageName = null
  if (canvas.hasContent()) {
    try {
      const upload = await api.uploadImage(state.serverUrl, canvas.getBase64())
      imageName = upload?.name || null
    } catch (error) {
      setStatus('Image upload failed')
      console.error(error)
      return
    }
  }

  const workflow = buildWorkflow(state, imageName)

  try {
    setStatus(reason === 'live' ? 'Streaming…' : 'Running…')
    activePromptId = await api.queuePrompt(state.serverUrl, workflow)
  } catch (error) {
    activePromptId = null
    setStatus('Failed to queue prompt')
    console.error(error)
  }
}

function handleWsMessage(message) {
  if (message.type === 'executing') {
    const data = message.data || {}
    if (activePromptId && data.prompt_id === activePromptId && data.node === null) {
      activePromptId = null
      if (runQueued) {
        runQueued = false
        triggerRun({ reason: 'live' })
      } else {
        setStatus(store.getState().liveMode ? 'Streaming…' : 'Idle')
      }
    }
  }
  if (message.type === 'execution_error') {
    setStatus('Execution error')
    activePromptId = null
  }
  if (message.type === 'status') {
    setStatus(store.getState().liveMode ? 'Streaming…' : 'Idle')
  }
}

async function loadModels() {
  const state = store.getState()
  try {
    setStatus('Loading models…')
    const checkpoints = await api.fetchModels(state.serverUrl, 'checkpoints')
    settingsUi.setOptions('model', checkpoints)
    if (!state.model && checkpoints.length) {
      store.setState({ model: checkpoints[0] })
    }
    setStatus(store.getState().liveMode ? 'Streaming…' : 'Idle')
  } catch (error) {
    setStatus('Failed to load models')
    console.error(error)
  }
}

function connectWebSocket() {
  const { serverUrl } = store.getState()
  api.connect(serverUrl)
}

let lastServerUrl = store.getState().serverUrl
let lastSize = `${store.getState().width}x${store.getState().height}`
let lastLiveControls = JSON.stringify({
  cfg: store.getState().cfg,
  steps: store.getState().steps,
  strength: store.getState().strength,
  loraStrengthModel: store.getState().loraStrengthModel,
  loraStrengthClip: store.getState().loraStrengthClip,
  prompt: store.getState().prompt,
  negativePrompt: store.getState().negativePrompt,
  model: store.getState().model,
})

store.subscribe((state) => {
  if (state.serverUrl !== lastServerUrl) {
    lastServerUrl = state.serverUrl
    connectWebSocket()
    loadModels()
  }

  const nextSize = `${state.width}x${state.height}`
  if (nextSize !== lastSize) {
    lastSize = nextSize
    canvas.resize(state.width, state.height)
  }

  const nextControls = JSON.stringify({
    cfg: state.cfg,
    steps: state.steps,
    strength: state.strength,
    loraStrengthModel: state.loraStrengthModel,
    loraStrengthClip: state.loraStrengthClip,
    prompt: state.prompt,
    negativePrompt: state.negativePrompt,
    model: state.model,
  })
  if (nextControls !== lastLiveControls) {
    lastLiveControls = nextControls
    scheduleLiveRun()
  }

  const statusParts = []
  if (state.wsStatus) {
    statusParts.push(state.wsStatus)
  }
  if (state.liveMode) {
    statusParts.push('streaming')
  }
  if (!activePromptId && !statusParts.length) {
    statusParts.push('idle')
  }
  if (statusParts.length && !activePromptId) {
    setStatus(statusParts.join(' • '))
  }
})

connectWebSocket()
loadModels()
canvas.clear()
