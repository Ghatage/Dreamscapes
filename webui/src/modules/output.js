function setImage(imageEl, placeholderEl, src) {
  if (!imageEl) return
  imageEl.src = src
  imageEl.classList.add('visible')
  if (placeholderEl) {
    placeholderEl.classList.add('hidden')
  }
}

function clearImage(imageEl, placeholderEl) {
  if (!imageEl) return
  imageEl.src = ''
  imageEl.classList.remove('visible')
  if (placeholderEl) {
    placeholderEl.classList.remove('hidden')
  }
}

function snapshotToDataUrl(imageEl) {
  if (!imageEl?.src || !imageEl.naturalWidth || !imageEl.naturalHeight) {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = imageEl.naturalWidth
  canvas.height = imageEl.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageEl, 0, 0)
  return canvas.toDataURL('image/png')
}

export function initOutput(liveImageEl, livePlaceholderEl, options = {}) {
  const referenceImageEl = options.referenceImageEl || null
  const referencePlaceholderEl = options.referencePlaceholderEl || null
  let liveObjectUrl = null

  function setImageFromArrayBuffer(buffer, meta = {}) {
    const bytes = new Uint8Array(buffer)
    const contentType = meta.contentType || 'image/png'
    const blob = new Blob([bytes], { type: contentType })
    const url = URL.createObjectURL(blob)

    if (liveObjectUrl && liveObjectUrl !== url) {
      URL.revokeObjectURL(liveObjectUrl)
    }
    liveObjectUrl = url
    setImage(liveImageEl, livePlaceholderEl, url)
  }

  function freezeReference() {
    if (!referenceImageEl) return false
    const snapshot = snapshotToDataUrl(liveImageEl)
    if (!snapshot) return false
    setImage(referenceImageEl, referencePlaceholderEl, snapshot)
    return true
  }

  function setReferenceFromDataUrl(dataUrl) {
    if (!referenceImageEl || !dataUrl) return false
    setImage(referenceImageEl, referencePlaceholderEl, dataUrl)
    return true
  }

  function clearReference() {
    clearImage(referenceImageEl, referencePlaceholderEl)
  }

  function clear() {
    if (liveObjectUrl) {
      URL.revokeObjectURL(liveObjectUrl)
      liveObjectUrl = null
    }
    clearImage(liveImageEl, livePlaceholderEl)
    clearReference()
  }

  return {
    setImageFromArrayBuffer,
    freezeReference,
    setReferenceFromDataUrl,
    clearReference,
    clear,
  }
}
