export function initOutput(imageEl, placeholderEl) {
  function setImageFromArrayBuffer(buffer, meta = {}) {
    const bytes = new Uint8Array(buffer)
    const contentType = meta.contentType || 'image/png'
    const blob = new Blob([bytes], { type: contentType })
    const url = URL.createObjectURL(blob)
    imageEl.src = url
    imageEl.onload = () => URL.revokeObjectURL(url)
    imageEl.classList.add('visible')
    if (placeholderEl) {
      placeholderEl.classList.add('hidden')
    }
  }

  return {
    setImageFromArrayBuffer,
  }
}
