export function initQuickSettings(container, store, config) {
  const inputs = new Map()
  container.innerHTML = ''

  config.forEach((item) => {
    const field = document.createElement('div')
    field.className = 'quick-field'

    const label = document.createElement('label')
    label.textContent = item.label
    label.htmlFor = `quick-${item.id}`

    const input = document.createElement('input')
    input.id = `quick-${item.id}`
    input.type = item.type || 'number'
    if (item.min !== undefined) input.min = item.min
    if (item.max !== undefined) input.max = item.max
    if (item.step !== undefined) input.step = item.step
    input.value = store.getState()[item.id] ?? ''

    const valueBadge = document.createElement('span')
    valueBadge.className = 'quick-value'

    const updateBadge = (value) => {
      valueBadge.textContent = value === '' ? '-' : value
    }
    updateBadge(input.value)

    input.addEventListener('input', (event) => {
      const value = parseValue(item, event.target.value)
      store.setState({ [item.id]: value })
      updateBadge(value)
    })

    field.appendChild(label)
    field.appendChild(input)
    field.appendChild(valueBadge)
    container.appendChild(field)
    inputs.set(item.id, { input, updateBadge })
  })

  store.subscribe((state) => {
    config.forEach((item) => {
      const current = inputs.get(item.id)
      if (!current) return
      const nextValue = state[item.id]
      if (current.input.value !== String(nextValue)) {
        current.input.value = nextValue
        current.updateBadge(nextValue)
      }
    })
  })
}

function parseValue(item, rawValue) {
  if (item.type === 'number' || item.type === 'range') {
    if (rawValue === '') {
      return ''
    }
    const parsed = Number(rawValue)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return rawValue
}
