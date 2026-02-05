export function initCanvas(canvas, store, { onDraw } = {}) {
  const ctx = canvas.getContext('2d')
  let isDrawing = false
  let hasContent = false
  // Prevent page scrolling/zoom gestures from interfering with drawing on touch devices (iPad + Pencil).
  canvas.style.touchAction = 'none'

  function getBrushSize() {
    return store.getState().brushSize || 10
  }

  function getBrushColor() {
    return store.getState().brushColor || '#101820'
  }

  function isEraserMode() {
    return store.getState().brushMode === 'erase'
  }

  function applySize(width, height, { preserve = false } = {}) {
    let previousImage = null
    if (preserve && canvas.width > 0 && canvas.height > 0) {
      previousImage = document.createElement('canvas')
      previousImage.width = canvas.width
      previousImage.height = canvas.height
      previousImage.getContext('2d').drawImage(canvas, 0, 0)
    }

    const ratio = window.devicePixelRatio || 1
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    fillBackground()

    if (previousImage) {
      // Redraw in pixel space so prior sketch survives canvas resize.
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(previousImage, 0, 0, canvas.width, canvas.height)
      ctx.restore()
    }
  }

  function fillBackground() {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  function getPos(event) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function drawLine(from, to, { pressure = 1 } = {}) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = isEraserMode() ? '#ffffff' : getBrushColor()
    // Use pointer pressure when available (Apple Pencil / stylus), but keep it subtle.
    const base = getBrushSize()
    const p = Math.min(1, Math.max(0.15, Number.isFinite(pressure) ? pressure : 1))
    ctx.lineWidth = base * (0.55 + 0.45 * p)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  let lastPos = null

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    isDrawing = true
    lastPos = getPos(event)
    hasContent = true
    canvas.setPointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointermove', (event) => {
    if (!isDrawing) return
    event.preventDefault()
    const nextPos = getPos(event)
    drawLine(lastPos, nextPos, { pressure: event.pressure })
    lastPos = nextPos
    if (onDraw) {
      onDraw()
    }
  })

  canvas.addEventListener('pointerup', (event) => {
    event.preventDefault()
    isDrawing = false
    lastPos = null
    canvas.releasePointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointerleave', () => {
    isDrawing = false
    lastPos = null
  })

  function clear() {
    fillBackground()
    hasContent = false
  }

  function resize(width, height) {
    applySize(width, height, { preserve: true })
  }

  function getBase64() {
    return canvas.toDataURL('image/png')
  }

  function hasDrawn() {
    return hasContent
  }

  return {
    clear,
    resize,
    getBase64,
    hasContent: hasDrawn,
  }
}
