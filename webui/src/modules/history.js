const MAX_NODES = 50

export function initHistory(container, { onRestore }) {
  const nodes = new Map()
  let nextId = 1
  let currentHeadId = null
  let sidebarOpen = false
  let modalNodeId = null

  // ── Tree Utilities ──────────────────────────────────────────────────

  function getChildren(nodeId) {
    const children = []
    nodes.forEach((node) => {
      if (node.parentId === nodeId) children.push(node)
    })
    children.sort((a, b) => a.id - b.id)
    return children
  }

  function getAncestryPath(nodeId) {
    const path = []
    let id = nodeId
    while (id !== null) {
      const node = nodes.get(id)
      if (!node) break
      path.unshift(node)
      id = node.parentId
    }
    return path
  }

  function evictIfNeeded() {
    if (nodes.size < MAX_NODES) return
    const activeIds = new Set()
    if (currentHeadId !== null) {
      getAncestryPath(currentHeadId).forEach((n) => activeIds.add(n.id))
    }
    let candidate = null
    nodes.forEach((node) => {
      if (activeIds.has(node.id)) return
      if (getChildren(node.id).length === 0) {
        if (!candidate || node.id < candidate.id) candidate = node
      }
    })
    if (candidate) {
      nodes.delete(candidate.id)
    } else {
      let oldest = null
      nodes.forEach((node) => {
        if (!oldest || node.id < oldest.id) oldest = node
      })
      if (oldest) nodes.delete(oldest.id)
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  function capturePreState(canvasBase64, prompt) {
    return {
      inputDataURL: canvasBase64,
      prompt,
      timestamp: Date.now(),
      parentId: currentHeadId,
    }
  }

  function finalizeNode(partial, outputDataURL) {
    evictIfNeeded()
    const node = {
      id: nextId++,
      parentId: partial.parentId,
      inputDataURL: partial.inputDataURL,
      outputDataURL,
      prompt: partial.prompt,
      timestamp: partial.timestamp,
    }
    nodes.set(node.id, node)
    currentHeadId = node.id
    if (sidebarOpen) renderTree()
  }

  // ── DOM: Sidebar ────────────────────────────────────────────────────

  const sidebar = document.createElement('div')
  sidebar.className = 'history-sidebar'

  const sidebarHeader = document.createElement('div')
  sidebarHeader.className = 'history-sidebar-header'
  const sidebarTitle = document.createElement('span')
  sidebarTitle.textContent = 'History'
  const closeBtn = document.createElement('button')
  closeBtn.className = 'history-sidebar-close'
  closeBtn.textContent = '\u00D7'
  closeBtn.addEventListener('click', () => closeSidebar())
  sidebarHeader.appendChild(sidebarTitle)
  sidebarHeader.appendChild(closeBtn)
  sidebar.appendChild(sidebarHeader)

  const treeContainer = document.createElement('div')
  treeContainer.className = 'history-tree-container'
  sidebar.appendChild(treeContainer)

  container.appendChild(sidebar)

  // ── DOM: Modal ──────────────────────────────────────────────────────

  const backdrop = document.createElement('div')
  backdrop.className = 'history-modal-backdrop'

  const modal = document.createElement('div')
  modal.className = 'history-modal'

  const modalHeader = document.createElement('div')
  modalHeader.className = 'history-modal-header'
  const modalTitle = document.createElement('span')
  modalTitle.textContent = 'Generation Details'
  const modalCloseBtn = document.createElement('button')
  modalCloseBtn.textContent = '\u00D7'
  modalCloseBtn.addEventListener('click', () => closeModal())
  modalHeader.appendChild(modalTitle)
  modalHeader.appendChild(modalCloseBtn)
  modal.appendChild(modalHeader)

  const modalBody = document.createElement('div')
  modalBody.className = 'history-modal-body'

  const modalImages = document.createElement('div')
  modalImages.className = 'history-modal-images'

  const inputWrapper = document.createElement('div')
  inputWrapper.className = 'history-modal-image-wrapper'
  const inputLabel = document.createElement('label')
  inputLabel.textContent = 'Input'
  const modalInputImg = document.createElement('img')
  modalInputImg.alt = 'Input'
  inputWrapper.appendChild(inputLabel)
  inputWrapper.appendChild(modalInputImg)

  const outputWrapper = document.createElement('div')
  outputWrapper.className = 'history-modal-image-wrapper'
  const outputLabel = document.createElement('label')
  outputLabel.textContent = 'Output'
  const modalOutputImg = document.createElement('img')
  modalOutputImg.alt = 'Output'
  outputWrapper.appendChild(outputLabel)
  outputWrapper.appendChild(modalOutputImg)

  modalImages.appendChild(inputWrapper)
  modalImages.appendChild(outputWrapper)
  modalBody.appendChild(modalImages)

  const promptSection = document.createElement('div')
  promptSection.className = 'history-modal-prompt-section'
  const promptLabel = document.createElement('label')
  promptLabel.textContent = 'Prompt'
  const promptPre = document.createElement('pre')
  promptSection.appendChild(promptLabel)
  promptSection.appendChild(promptPre)
  modalBody.appendChild(promptSection)
  modal.appendChild(modalBody)

  const modalFooter = document.createElement('div')
  modalFooter.className = 'history-modal-footer'
  const restoreBtn = document.createElement('button')
  restoreBtn.className = 'history-modal-restore'
  restoreBtn.textContent = 'Restore'
  restoreBtn.addEventListener('click', () => {
    if (modalNodeId === null) return
    const node = nodes.get(modalNodeId)
    if (!node) return
    currentHeadId = node.id
    closeModal()
    if (sidebarOpen) renderTree()
    if (onRestore) onRestore(node)
  })
  modalFooter.appendChild(restoreBtn)
  modal.appendChild(modalFooter)

  backdrop.appendChild(modal)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal()
  })
  container.appendChild(backdrop)

  // ── Keyboard ────────────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalNodeId !== null) {
        closeModal()
      } else if (sidebarOpen) {
        closeSidebar()
      }
    }
  })

  // ── Sidebar/Modal Controls ──────────────────────────────────────────

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen
    sidebar.classList.toggle('visible', sidebarOpen)
    if (sidebarOpen) renderTree()
  }

  function closeSidebar() {
    sidebarOpen = false
    sidebar.classList.remove('visible')
  }

  function openModal(nodeId) {
    const node = nodes.get(nodeId)
    if (!node) return
    modalNodeId = nodeId
    modalInputImg.src = node.inputDataURL
    modalOutputImg.src = node.outputDataURL
    promptPre.textContent = node.prompt
    backdrop.classList.add('visible')
  }

  function closeModal() {
    modalNodeId = null
    backdrop.classList.remove('visible')
  }

  // ── Tree Rendering ──────────────────────────────────────────────────

  function renderTree() {
    treeContainer.textContent = ''

    if (nodes.size === 0) {
      const emptyDiv = document.createElement('div')
      emptyDiv.className = 'history-empty'
      emptyDiv.textContent = 'No generations yet'
      treeContainer.appendChild(emptyDiv)
      return
    }

    const activeIds = new Set()
    if (currentHeadId !== null) {
      getAncestryPath(currentHeadId).forEach((n) => activeIds.add(n.id))
    }

    const roots = []
    nodes.forEach((node) => {
      if (node.parentId === null || !nodes.has(node.parentId)) {
        roots.push(node)
      }
    })
    roots.sort((a, b) => a.id - b.id)

    roots.forEach((root) => {
      treeContainer.appendChild(buildBranchDOM(root, activeIds))
    })

    const currentEl = treeContainer.querySelector('.history-node.current')
    if (currentEl) {
      currentEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  function buildBranchDOM(startNode, activeIds) {
    const chain = []
    let node = startNode
    while (node) {
      chain.push(node)
      const children = getChildren(node.id)
      if (children.length === 1) {
        node = children[0]
      } else {
        break
      }
    }

    const isActive = activeIds.has(startNode.id)
    const branchDiv = document.createElement('div')
    branchDiv.className = 'history-branch' + (isActive ? '' : ' inactive')

    const lastNode = chain[chain.length - 1]
    const forkChildren = getChildren(lastNode.id)

    if (forkChildren.length > 1) {
      forkChildren.sort((a, b) => {
        const aActive = activeIds.has(a.id) ? 0 : 1
        const bActive = activeIds.has(b.id) ? 0 : 1
        if (aActive !== bActive) return aActive - bActive
        return b.id - a.id
      })
      forkChildren.forEach((child) => {
        const label = document.createElement('div')
        label.className = 'history-fork-label'
        label.textContent = 'Branch'
        branchDiv.appendChild(label)
        branchDiv.appendChild(buildBranchDOM(child, activeIds))
      })
    }

    for (let i = chain.length - 1; i >= 0; i--) {
      branchDiv.appendChild(buildNodeDOM(chain[i]))
    }

    return branchDiv
  }

  function buildNodeDOM(node) {
    const isCurrent = node.id === currentHeadId
    const div = document.createElement('div')
    div.className = 'history-node' + (isCurrent ? ' current' : '')
    div.dataset.nodeId = node.id

    const thumbsDiv = document.createElement('div')
    thumbsDiv.className = 'history-node-thumbs'
    const imgInput = document.createElement('img')
    imgInput.className = 'thumb-input'
    imgInput.src = node.inputDataURL
    imgInput.alt = 'Input'
    const imgOutput = document.createElement('img')
    imgOutput.className = 'thumb-output'
    imgOutput.src = node.outputDataURL
    imgOutput.alt = 'Output'
    thumbsDiv.appendChild(imgInput)
    thumbsDiv.appendChild(imgOutput)
    div.appendChild(thumbsDiv)

    const time = new Date(node.timestamp)
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const timeDiv = document.createElement('div')
    timeDiv.className = 'history-node-time'
    timeDiv.textContent = '#' + node.id + ' \u00B7 ' + timeStr
    div.appendChild(timeDiv)

    const promptDiv = document.createElement('div')
    promptDiv.className = 'history-node-prompt'
    promptDiv.textContent = node.prompt.length > 30 ? node.prompt.substring(0, 30) + '...' : node.prompt
    div.appendChild(promptDiv)

    div.addEventListener('click', () => openModal(node.id))

    return div
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  function destroy() {
    sidebar.remove()
    backdrop.remove()
  }

  return {
    capturePreState,
    finalizeNode,
    toggleSidebar,
    destroy,
  }
}
