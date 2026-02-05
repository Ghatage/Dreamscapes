const settingsSchema = [
  {
    id: 'serverUrl',
    label: 'Server URL',
    type: 'text',
    defaultValue: '/comfy',
    helper: 'Use /comfy for proxy (avoids CORS/adblock)',
    section: 'connection',
  },
  {
    id: 'model',
    label: 'Checkpoint Model',
    type: 'select',
    defaultValue: '',
    options: [],
    helper: 'SDXL checkpoint models',
    section: 'model',
  },
  {
    id: 'prompt',
    label: 'Prompt',
    type: 'textarea',
    defaultValue: 'girl walking on a beach with a dog and tree and sun shine, masterpiece, best quality, recent, newest, absurdres, highres',
    section: 'prompt',
    hideInUi: true,
  },
  {
    id: 'negativePrompt',
    label: 'Negative Prompt',
    type: 'textarea',
    defaultValue: 'nsfw, explicit, worst quality, worst aesthetic, bad quality, average quality, oldest, old, very displeasing, displeasing',
    section: 'prompt',
  },
  {
    id: 'controlNetModel',
    label: 'ControlNet Model',
    type: 'select',
    defaultValue: '',
    options: [],
    helper: 'Scribble ControlNet for structural guidance',
    section: 'controlnet',
  },
  {
    id: 'controlNetPreprocess',
    label: 'ControlNet Preprocess',
    type: 'select',
    defaultValue: 'none',
    options: ['none', 'canny'],
    helper: 'Optional edge pre-process before ControlNet',
    section: 'controlnet',
  },
  {
    id: 'controlNetCannyLow',
    label: 'Canny Low Threshold',
    type: 'number',
    defaultValue: 80,
    min: 1,
    max: 255,
    step: 1,
    showWhen: (state) => state.controlNetPreprocess === 'canny',
    section: 'controlnet',
  },
  {
    id: 'controlNetCannyHigh',
    label: 'Canny High Threshold',
    type: 'number',
    defaultValue: 180,
    min: 1,
    max: 255,
    step: 1,
    showWhen: (state) => state.controlNetPreprocess === 'canny',
    section: 'controlnet',
  },
  {
    id: 'controlNetStrength',
    label: 'ControlNet Strength',
    type: 'number',
    defaultValue: 0.3,
    min: 0.1,
    max: 1.0,
    step: 0.05,
    helper: 'How strongly to follow the sketch lines (0.5 = gentle, 1.0 = strict)',
    section: 'controlnet',
  },
  {
    id: 'controlNetStart',
    label: 'ControlNet Start %',
    type: 'number',
    defaultValue: 0,
    min: 0,
    max: 1,
    step: 0.05,
    helper: 'When ControlNet kicks in (0 = from the start)',
    section: 'controlnet',
  },
  {
    id: 'controlNetEnd',
    label: 'ControlNet End %',
    type: 'number',
    defaultValue: 0.6,
    min: 0,
    max: 1,
    step: 0.05,
    helper: 'When ControlNet stops (1 = through all steps)',
    section: 'controlnet',
  },
  {
    id: 'width',
    label: 'Width',
    type: 'number',
    defaultValue: 500,
    min: 256,
    max: 2048,
    step: 1,
    helper: 'Final output width',
    section: 'generation',
  },
  {
    id: 'height',
    label: 'Height',
    type: 'number',
    defaultValue: 500,
    min: 256,
    max: 2048,
    step: 1,
    helper: 'Final output height',
    section: 'generation',
  },
  {
    id: 'strength',
    label: 'Strength',
    type: 'number',
    defaultValue: 0.7,
    min: 0.1,
    max: 1.0,
    step: 0.02,
    helper: 'How much the prompt transforms the sketch (higher = more creative change)',
    section: 'generation',
  },
  {
    id: 'steps',
    label: 'Steps',
    type: 'number',
    defaultValue: 20,
    min: 4,
    max: 30,
    step: 1,
    helper: 'Match your LoRA (8 for Hyper-SDXL-8steps)',
    section: 'generation',
  },
  {
    id: 'cfg',
    label: 'CFG (Prompt Importance)',
    type: 'number',
    defaultValue: 4.0,
    min: 1,
    max: 8,
    step: 0.5,
    helper: 'How strongly to follow the prompt (4 is a good default)',
    section: 'generation',
  },
  {
    id: 'liveScale',
    label: 'Live Scale Size',
    type: 'number',
    defaultValue: 800,
    min: 256,
    max: 2048,
    step: 64,
    helper: 'Internal live scale (Krita uses 800)',
    section: 'generation',
  },
  {
    id: 'loraName',
    label: 'Live LoRA',
    type: 'text',
    defaultValue: '',
    helper: 'Optional LoRA name (leave empty to disable)',
    section: 'generation',
  },
  {
    id: 'loraStrengthModel',
    label: 'LoRA Strength (Model)',
    type: 'number',
    defaultValue: 1.0,
    min: 0.5,
    max: 1.5,
    step: 0.05,
    section: 'generation',
  },
  {
    id: 'loraStrengthClip',
    label: 'LoRA Strength (Clip)',
    type: 'number',
    defaultValue: 1.0,
    min: 0.5,
    max: 1.5,
    step: 0.05,
    section: 'generation',
  },
  {
    id: 'seed',
    label: 'Seed (optional)',
    type: 'number',
    defaultValue: 900011171,
    min: 0,
    step: 1,
    section: 'generation',
  },
  {
    id: 'sampler',
    label: 'Sampler',
    type: 'select',
    defaultValue: 'euler_ancestral',
    options: ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_sde'],
    section: 'generation',
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    type: 'select',
    defaultValue: 'normal',
    options: ['sgm_uniform', 'normal', 'karras', 'exponential', 'simple'],
    section: 'generation',
  },
  {
    id: 'brushSize',
    label: 'Brush Size',
    type: 'number',
    defaultValue: 18,
    min: 2,
    max: 80,
    step: 1,
    section: 'canvas',
  },
  {
    id: 'brushColor',
    label: 'Brush Color',
    type: 'color',
    defaultValue: '#101820',
    section: 'canvas',
  },
]

const sectionOrder = [
  { id: 'connection', label: 'Connection', open: true },
  { id: 'model', label: 'Model', open: true },
  { id: 'prompt', label: 'Prompt', open: true },
  { id: 'controlnet', label: 'ControlNet (Sketch Guidance)', open: true },
  { id: 'generation', label: 'Generation', open: false },
  { id: 'canvas', label: 'Canvas', open: false },
]

export function getDefaultSettings() {
  const defaults = {}
  settingsSchema.forEach((setting) => {
    defaults[setting.id] = setting.defaultValue
  })
  return defaults
}

export function initSettings(container, store) {
  const inputMap = new Map()
  const conditionalFields = []
  container.innerHTML = ''

  sectionOrder.forEach((section) => {
    const block = document.createElement('details')
    block.className = 'settings-section'
    if (section.open) {
      block.open = true
    }

    const heading = document.createElement('summary')
    heading.className = 'settings-summary'
    heading.textContent = section.label
    block.appendChild(heading)

    settingsSchema
      .filter((setting) => setting.section === section.id)
      .filter((setting) => !setting.hideInUi)
      .forEach((setting) => {
        const field = document.createElement('div')
        field.className = 'field'
        if (setting.type === 'textarea') {
          field.classList.add('span-2')
        }

        const label = document.createElement('label')
        label.textContent = setting.label
        label.htmlFor = `setting-${setting.id}`

        const input = buildInput(setting)
        input.id = `setting-${setting.id}`
        input.value = store.getState()[setting.id] ?? setting.defaultValue ?? ''

        input.addEventListener('input', (event) => {
          const nextValue = parseValue(setting, event.target.value)
          store.setState({ [setting.id]: nextValue })
        })

        field.appendChild(label)
        field.appendChild(input)

        if (setting.helper) {
          const helper = document.createElement('p')
          helper.className = 'helper'
          helper.textContent = setting.helper
          field.appendChild(helper)
        }

        block.appendChild(field)
        inputMap.set(setting.id, input)

        if (setting.showWhen) {
          conditionalFields.push({ field, showWhen: setting.showWhen })
        }
      })

    container.appendChild(block)
  })

  function applyVisibility() {
    const state = store.getState()
    conditionalFields.forEach(({ field, showWhen }) => {
      if (showWhen(state)) {
        field.classList.remove('hidden')
      } else {
        field.classList.add('hidden')
      }
    })
  }

  store.subscribe(() => applyVisibility())
  applyVisibility()

  return {
    setOptions(id, options) {
      const input = inputMap.get(id)
      if (!input || input.tagName !== 'SELECT') {
        return
      }
      input.innerHTML = ''
      if (id === 'controlNetModel') {
        const offOption = document.createElement('option')
        offOption.value = ''
        offOption.textContent = 'Off'
        input.appendChild(offOption)
      }
      if (!options.length) {
        if (id !== 'controlNetModel') {
          const option = document.createElement('option')
          option.value = ''
          option.textContent = 'No models found'
          input.appendChild(option)
        }
        return
      }
      options.forEach((value) => {
        const option = document.createElement('option')
        option.value = value
        option.textContent = value
        input.appendChild(option)
      })
      if (id === 'controlNetModel') {
        input.value = store.getState()[id] || ''
      } else {
        input.value = store.getState()[id] || options[0]
      }
      store.setState({ [id]: input.value })
    },
  }
}

function buildInput(setting) {
  if (setting.type === 'textarea') {
    const textarea = document.createElement('textarea')
    textarea.rows = 3
    return textarea
  }
  if (setting.type === 'select') {
    const select = document.createElement('select')
    setting.options?.forEach((optionValue) => {
      const option = document.createElement('option')
      option.value = optionValue
      option.textContent = optionValue
      select.appendChild(option)
    })
    return select
  }
  const input = document.createElement('input')
  input.type = setting.type || 'text'
  if (setting.min !== undefined) input.min = setting.min
  if (setting.max !== undefined) input.max = setting.max
  if (setting.step !== undefined) input.step = setting.step
  return input
}

function parseValue(setting, rawValue) {
  if (setting.type === 'number') {
    if (rawValue === '') {
      return ''
    }
    const parsed = Number(rawValue)
    return Number.isNaN(parsed) ? setting.defaultValue : parsed
  }
  return rawValue
}
