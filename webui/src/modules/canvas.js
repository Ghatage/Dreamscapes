export function initCanvas(canvas, store, { onDraw } = {}) {
  const ctx = canvas.getContext('2d')
  let isDrawing = false
  let hasContent = false

  function getBrushSize() {
    return store.getState().brushSize || 10
  }

  function applySize(width, height) {
    const ratio = window.devicePixelRatio || 1
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    fillBackground()
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

  function drawLine(from, to) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#101820'
    ctx.lineWidth = getBrushSize()
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  let lastPos = null

  canvas.addEventListener('pointerdown', (event) => {
    isDrawing = true
    lastPos = getPos(event)
    hasContent = true
    canvas.setPointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointermove', (event) => {
    if (!isDrawing) return
    const nextPos = getPos(event)
    drawLine(lastPos, nextPos)
    lastPos = nextPos
    if (onDraw) {
      onDraw()
    }
  })

  canvas.addEventListener('pointerup', (event) => {
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
    applySize(width, height)
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
