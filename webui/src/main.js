import './style.css'
import { createStore } from './modules/store.js'
import { getDefaultSettings, initSettings } from './modules/settings.js'
import { initCanvas } from './modules/canvas.js'
import { initOutput } from './modules/output.js'
import { createApiClient } from './modules/api.js'
import { buildWorkflow } from './modules/workflow.js'
import { initQuickSettings } from './modules/quickSettings.js'

const CONTROL_PRESETS = {
  loose: { strength: 0.82, cfg: 4.5, steps: 18 },
  balanced: { strength: 0.7, cfg: 4, steps: 20 },
  strict: { strength: 0.52, cfg: 3.5, steps: 22 },
}

const app = document.querySelector('#app')
app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <h1>Dreamscapes Paint</h1>
        <p class="subtitle">Sketch-to-image workspace</p>
      </div>
    </header>

    <main class="paint-layout">
      <section class="panel top-controls-panel">
        <div class="controls-grid">
          <div class="controls-left">
            <button id="run-btn" class="primary">Run</button>
            <button id="cn-toggle-btn" title="Toggle ControlNet on/off">CN: Off</button>
            <button id="seed-lock-btn" title="Lock seed for consistent comparisons">Seed: Locked</button>
            <button id="new-seed-btn" title="Generate a new random seed">New Seed</button>
            <label class="toggle">
              <input id="live-toggle" type="checkbox" checked />
              <span>Live</span>
            </label>
            <button id="advanced-toggle-btn" class="subtle" title="Toggle advanced settings">
              Advanced
            </button>
            <span id="status-top" class="status-pill">Idle</span>
          </div>

          <div class="controls-right">
            <button id="clear-btn">Clear</button>
          </div>
        </div>

        <div class="prompt-block">
          <div class="prompt-head">
            <label for="prompt-inline">Prompt</label>
            <button id="neg-toggle-btn" class="subtle" type="button">Negative</button>
          </div>
          <textarea id="prompt-inline" rows="1"></textarea>
          <div class="neg-wrap" data-neg-wrap hidden>
            <label for="negative-inline">Negative prompt</label>
            <textarea id="negative-inline" rows="1"></textarea>
          </div>
        </div>

        <div class="controls-bottom">
          <div class="quick-settings" data-quick-settings></div>
          <div class="control-presets">
            <span class="hint">Preset</span>
            <div class="brush-tools" aria-label="Brush tools">
              <button id="brush-mode-btn" title="Toggle eraser mode">Eraser: Off</button>
              <label class="brush-size-wrap" title="Brush size">
                <span>Size</span>
                <input id="brush-size-picker" type="range" min="2" max="80" step="1" />
                <span id="brush-size-value">18</span>
              </label>
              <label class="brush-color-wrap" title="Brush color">
                <span>Color</span>
                <input id="brush-color-picker" type="color" />
              </label>
            </div>
            <div class="preset-buttons" role="group" aria-label="Control preset">
              <button data-control-preset="loose">Loose</button>
              <button data-control-preset="balanced">Balanced</button>
              <button data-control-preset="strict">Strict</button>
            </div>
          </div>
        </div>

      </section>

      <section class="workspace-grid" data-workspace-grid>
        <aside class="panel advanced-rail" data-advanced-sidebar>
          <div class="rail-top">
            <button id="advanced-rail-toggle" class="rail-toggle" type="button" aria-label="Collapse advanced settings" title="Collapse advanced settings">
              <span class="rail-toggle-icon" aria-hidden="true"></span>
            </button>
            <div class="rail-title">
              <div class="rail-title-main">Advanced</div>
              <div class="rail-title-sub">Settings</div>
            </div>
          </div>
          <div class="rail-content">
            <div data-settings></div>
          </div>
        </aside>

        <section class="panel canvas-panel">
          <div class="panel-header">
            <h2>Canvas</h2>
          </div>
          <div class="canvas-wrap">
            <canvas id="sketch-canvas" width="500" height="500"></canvas>
          </div>
        </section>

        <section class="panel output-panel">
          <div class="panel-header">
            <h2>Output</h2>
            <span id="status" class="status">Idle</span>
          </div>
          <div class="output-wrap output-single">
            <img id="output-image" alt="Rendered output" />
            <div id="output-placeholder" class="output-placeholder">Waiting for output...</div>
          </div>
        </section>
      </section>
    </main>
  </div>
`

function generateSeed() {
  return Math.floor(Math.random() * 1_000_000_000)
}

function approxEqual(a, b, epsilon = 0.0001) {
  return Math.abs(Number(a) - Number(b)) <= epsilon
}

function detectPreset(state) {
  return Object.entries(CONTROL_PRESETS).find(([, values]) => (
    approxEqual(state.strength, values.strength)
    && approxEqual(state.cfg, values.cfg)
    && approxEqual(state.steps, values.steps)
  ))?.[0] || null
}

const defaults = getDefaultSettings()
const store = createStore({
  ...defaults,
  seed: Number(defaults.seed) || 900011171,
  seedLocked: true,
  brushMode: 'draw',
  liveMode: true,
  status: 'idle',
  wsStatus: 'disconnected',
})

const settingsRoot = document.querySelector('[data-settings]')
const settingsUi = initSettings(settingsRoot, store)
initQuickSettings(document.querySelector('[data-quick-settings]'), store, [
  { id: 'strength', label: 'Strength', type: 'range', min: 0.1, max: 1, step: 0.02 },
  { id: 'cfg', label: 'CFG', type: 'range', min: 1, max: 8, step: 0.5 },
  { id: 'steps', label: 'Steps', type: 'number', min: 4, max: 30, step: 1 },
])

const canvas = initCanvas(document.querySelector('#sketch-canvas'), store, {
  onDraw: () => scheduleLiveRun(),
})

const output = initOutput(
  document.querySelector('#output-image'),
  document.querySelector('#output-placeholder')
)

const statusEl = document.querySelector('#status')
const statusTopEl = document.querySelector('#status-top')
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
let availableControlNets = []
let lastEnabledControlNetModel = ''

const runButton = document.querySelector('#run-btn')
const cnToggleButton = document.querySelector('#cn-toggle-btn')
const seedLockButton = document.querySelector('#seed-lock-btn')
const newSeedButton = document.querySelector('#new-seed-btn')
const brushModeButton = document.querySelector('#brush-mode-btn')
const brushSizePicker = document.querySelector('#brush-size-picker')
const brushSizeValue = document.querySelector('#brush-size-value')
const clearButton = document.querySelector('#clear-btn')
const brushColorPicker = document.querySelector('#brush-color-picker')
const liveToggle = document.querySelector('#live-toggle')
const promptInline = document.querySelector('#prompt-inline')
const negativeInline = document.querySelector('#negative-inline')
const negToggleBtn = document.querySelector('#neg-toggle-btn')
const negWrap = document.querySelector('[data-neg-wrap]')
const presetButtons = [...document.querySelectorAll('[data-control-preset]')]

brushColorPicker.value = store.getState().brushColor || '#101820'
brushColorPicker.addEventListener('input', (event) => {
  store.setState({ brushColor: event.target.value })
})
brushSizePicker.value = String(store.getState().brushSize || 18)
brushSizeValue.textContent = String(store.getState().brushSize || 18)
brushSizePicker.addEventListener('input', (event) => {
  store.setState({ brushSize: Number(event.target.value) })
})
promptInline.value = store.getState().prompt || ''
promptInline.addEventListener('input', (event) => {
  store.setState({ prompt: event.target.value })
})

negativeInline.value = store.getState().negativePrompt || ''
negativeInline.addEventListener('input', (event) => {
  store.setState({ negativePrompt: event.target.value })
})

negToggleBtn.addEventListener('click', () => {
  const isHidden = negWrap.hasAttribute('hidden')
  if (isHidden) {
    negWrap.removeAttribute('hidden')
  } else {
    negWrap.setAttribute('hidden', '')
  }
})

const workspaceGrid = document.querySelector('[data-workspace-grid]')
const advancedSidebar = document.querySelector('[data-advanced-sidebar]')
const advancedToggleTop = document.querySelector('#advanced-toggle-btn')
const advancedToggleRail = document.querySelector('#advanced-rail-toggle')
const ADVANCED_KEY = 'dreamscapes.advanced.collapsed'

function setAdvancedCollapsed(collapsed) {
  workspaceGrid.classList.toggle('is-advanced-collapsed', collapsed)
  advancedSidebar.classList.toggle('is-collapsed', collapsed)
  try {
    localStorage.setItem(ADVANCED_KEY, collapsed ? '1' : '0')
  } catch {
    // ignore
  }
}

function getAdvancedCollapsed() {
  try {
    const raw = localStorage.getItem(ADVANCED_KEY)
    // Default to collapsed to keep the main workspace large.
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

setAdvancedCollapsed(getAdvancedCollapsed())
advancedToggleTop.addEventListener('click', () => {
  setAdvancedCollapsed(!workspaceGrid.classList.contains('is-advanced-collapsed'))
})
advancedToggleRail.addEventListener('click', () => {
  setAdvancedCollapsed(!workspaceGrid.classList.contains('is-advanced-collapsed'))
})

runButton.addEventListener('click', () => triggerRun({ reason: 'manual' }))
cnToggleButton.addEventListener('click', () => {
  const state = store.getState()
  const current = state.controlNetModel || ''
  const fallback = lastEnabledControlNetModel || availableControlNets[0] || ''
  if (current) {
    lastEnabledControlNetModel = current
    store.setState({ controlNetModel: '' })
    return
  }
  if (!fallback) {
    setStatus('No ControlNet models available')
    return
  }
  store.setState({ controlNetModel: fallback })
})
seedLockButton.addEventListener('click', () => {
  store.setState({ seedLocked: !store.getState().seedLocked })
})
newSeedButton.addEventListener('click', () => {
  store.setState({ seed: generateSeed() })
})
brushModeButton.addEventListener('click', () => {
  store.setState({ brushMode: store.getState().brushMode === 'erase' ? 'draw' : 'erase' })
})
clearButton.addEventListener('click', () => {
  canvas.clear()
  setStatus('Idle')
})
liveToggle.addEventListener('change', (event) => {
  store.setState({ liveMode: event.target.checked })
  if (event.target.checked) scheduleLiveRun()
})

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const preset = button.dataset.controlPreset
    if (!preset || !CONTROL_PRESETS[preset]) return
    store.setState({ ...CONTROL_PRESETS[preset] })
  })
})

function setStatus(message) {
  statusEl.textContent = message
  if (statusTopEl) statusTopEl.textContent = message
}

function syncPresetButtons(state) {
  const active = detectPreset(state)
  presetButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.controlPreset === active)
  })
}

function scheduleLiveRun() {
  if (!store.getState().liveMode) return
  if (liveTimer) clearTimeout(liveTimer)
  liveTimer = setTimeout(() => triggerRun({ reason: 'live' }), 900)
}

async function triggerRun({ reason }) {
  const state = store.getState()
  if (!state.model) {
    setStatus('Select a checkpoint model')
    return
  }
  if (!canvas.hasContent()) {
    if (reason === 'live') return
    setStatus('Draw something on the canvas first')
    return
  }
  if (activePromptId) {
    runQueued = true
    return
  }

  const runState = state.seedLocked ? state : { ...state, seed: generateSeed() }

  let imageName = null
  try {
    const upload = await api.uploadImage(runState.serverUrl, canvas.getBase64())
    imageName = upload?.name || null
  } catch (error) {
    setStatus('Image upload failed')
    console.error(error)
    return
  }

  const workflow = buildWorkflow(runState, imageName)
  try {
    setStatus(reason === 'live' ? 'Streaming...' : 'Running...')
    activePromptId = await api.queuePrompt(runState.serverUrl, workflow)
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
        setStatus(store.getState().liveMode ? 'Streaming...' : 'Idle')
      }
    }
  }
  if (message.type === 'execution_error') {
    setStatus('Execution error')
    activePromptId = null
  }
  if (message.type === 'status') {
    setStatus(store.getState().liveMode ? 'Streaming...' : 'Idle')
  }
}

async function loadModels() {
  const state = store.getState()
  try {
    setStatus('Loading models...')
    const [checkpoints, controlnets] = await Promise.all([
      api.fetchModels(state.serverUrl, 'checkpoints'),
      api.fetchModels(state.serverUrl, 'controlnet'),
    ])
    availableControlNets = controlnets

    settingsUi.setOptions('model', checkpoints)
    if (!state.model && checkpoints.length) {
      const preferredModel = checkpoints.find((name) => name === 'novaAnimeXL_ilV125.safetensors')
        || checkpoints.find((name) => name.toLowerCase().includes('novaanimexl_ilv125'))
      store.setState({ model: preferredModel || checkpoints[0] })
    }

    const currentCnModel = store.getState().controlNetModel
    if (currentCnModel && !controlnets.includes(currentCnModel)) {
      store.setState({ controlNetModel: '' })
    }
    settingsUi.setOptions('controlNetModel', controlnets)

    if (store.getState().controlNetModel) {
      lastEnabledControlNetModel = store.getState().controlNetModel
    }

    setStatus(store.getState().liveMode ? 'Streaming...' : 'Idle')
  } catch (error) {
    setStatus('Failed to load models')
    console.error(error)
  }
}

function connectWebSocket() {
  api.connect(store.getState().serverUrl)
}

let lastServerUrl = store.getState().serverUrl
let lastSize = `${store.getState().width}x${store.getState().height}`
let lastLiveControls = JSON.stringify({ ...store.getState() })

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
    scheduleLiveRun()
  }

  const nextControls = JSON.stringify({ ...state })
  if (nextControls !== lastLiveControls) {
    lastLiveControls = nextControls
    scheduleLiveRun()
  }

  if (!activePromptId) {
    const statusParts = []
    if (state.wsStatus) statusParts.push(state.wsStatus)
    if (state.liveMode) statusParts.push('streaming')
    if (!statusParts.length) statusParts.push('idle')
    setStatus(statusParts.join(' • '))
  }

  cnToggleButton.textContent = state.controlNetModel ? 'CN: On' : 'CN: Off'
  if (state.controlNetModel) lastEnabledControlNetModel = state.controlNetModel
  seedLockButton.textContent = state.seedLocked ? 'Seed: Locked' : 'Seed: Random'
  brushModeButton.textContent = state.brushMode === 'erase' ? 'Eraser: On' : 'Eraser: Off'
  brushModeButton.classList.toggle('active', state.brushMode === 'erase')

  const nextBrushSize = String(state.brushSize || 18)
  if (brushSizePicker.value !== nextBrushSize) brushSizePicker.value = nextBrushSize
  if (brushSizeValue.textContent !== nextBrushSize) brushSizeValue.textContent = nextBrushSize

  const nextBrushColor = state.brushColor || '#101820'
  if (brushColorPicker.value !== nextBrushColor) brushColorPicker.value = nextBrushColor

  if (promptInline.value !== (state.prompt || '')) {
    promptInline.value = state.prompt || ''
  }
  if (negativeInline.value !== (state.negativePrompt || '')) {
    negativeInline.value = state.negativePrompt || ''
  }

  syncPresetButtons(state)
})

connectWebSocket()
loadModels()
canvas.clear()
syncPresetButtons(store.getState())
