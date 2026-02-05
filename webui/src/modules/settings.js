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
    defaultValue: 'A cinematic sketch of a futuristic city, high detail',
    section: 'prompt',
  },
  {
    id: 'negativePrompt',
    label: 'Negative Prompt',
    type: 'textarea',
    defaultValue: '',
    section: 'prompt',
  },
  {
    id: 'width',
    label: 'Width',
    type: 'number',
    defaultValue: 512,
    min: 256,
    max: 2048,
    step: 64,
    helper: 'Use multiples of 64',
    section: 'generation',
  },
  {
    id: 'height',
    label: 'Height',
    type: 'number',
    defaultValue: 512,
    min: 256,
    max: 2048,
    step: 64,
    helper: 'Use multiples of 64',
    section: 'generation',
  },
  {
    id: 'steps',
    label: 'Steps',
    type: 'number',
    defaultValue: 8,
    min: 1,
    max: 60,
    step: 1,
    section: 'generation',
  },
  {
    id: 'cfg',
    label: 'Prompt Importance (CFG)',
    type: 'number',
    defaultValue: 4,
    min: 1,
    max: 20,
    step: 0.5,
    section: 'generation',
  },
  {
    id: 'strength',
    label: 'Strength',
    type: 'number',
    defaultValue: 0.62,
    min: 0.1,
    max: 1,
    step: 0.01,
    helper: 'Live strength (maps to denoise in Krita workflow)',
    section: 'generation',
  },
  {
    id: 'denoise',
    label: 'Denoise',
    type: 'number',
    defaultValue: 1.0,
    min: 0.1,
    max: 1,
    step: 0.05,
    helper: 'Lower keeps more of the sketch',
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
    defaultValue: 'Hyper-SDXL-8steps-CFG-lora.safetensors',
    helper: 'Krita live preset LoRA',
    section: 'generation',
  },
  {
    id: 'loraStrengthModel',
    label: 'LoRA Strength (Model)',
    type: 'number',
    defaultValue: 1.0,
    min: 0,
    max: 2,
    step: 0.1,
    section: 'generation',
  },
  {
    id: 'loraStrengthClip',
    label: 'LoRA Strength (Clip)',
    type: 'number',
    defaultValue: 1.0,
    min: 0,
    max: 2,
    step: 0.1,
    section: 'generation',
  },
  {
    id: 'seed',
    label: 'Seed (optional)',
    type: 'number',
    defaultValue: '',
    min: 0,
    step: 1,
    section: 'generation',
  },
  {
    id: 'sampler',
    label: 'Sampler',
    type: 'select',
    defaultValue: 'euler',
    options: ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde'],
    section: 'generation',
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    type: 'select',
    defaultValue: 'normal',
    options: ['normal', 'karras', 'exponential', 'simple'],
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
]

const sectionOrder = [
  { id: 'connection', label: 'Connection', open: true },
  { id: 'model', label: 'Model', open: true },
  { id: 'prompt', label: 'Prompt', open: true },
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
      .forEach((setting) => {
        const field = document.createElement('div')
        field.className = 'field'

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
      if (!options.length) {
        const option = document.createElement('option')
        option.value = ''
        option.textContent = 'No models found'
        input.appendChild(option)
        return
      }
      options.forEach((value) => {
        const option = document.createElement('option')
        option.value = value
        option.textContent = value
        input.appendChild(option)
      })
      input.value = store.getState()[id] || options[0]
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
