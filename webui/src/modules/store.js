export function createStore(initialState = {}) {
  let state = { ...initialState }
  const listeners = new Set()

  function getState() {
    return state
  }

  function setState(partial) {
    state = { ...state, ...partial }
    listeners.forEach((listener) => listener(state))
  }

  function update(updater) {
    state = updater({ ...state })
    listeners.forEach((listener) => listener(state))
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    getState,
    setState,
    update,
    subscribe,
  }
}
