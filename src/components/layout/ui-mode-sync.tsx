'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  DEFAULT_UI_MODE,
  DESIGNLAB_CLASS,
  isUiMode,
  resolveUiMode,
  UI_MODE_EVENT,
  UI_MODE_STORAGE_KEY,
  type UiMode,
} from '@/lib/ui-mode'

function applyUiModeToDocument(mode: UiMode) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.toggle(DESIGNLAB_CLASS, mode === 'design-lab')
  root.dataset.uiMode = mode
}

export function getUiMode(): UiMode {
  if (typeof window === 'undefined') return DEFAULT_UI_MODE
  return resolveUiMode(window.localStorage.getItem(UI_MODE_STORAGE_KEY))
}

export function setUiMode(mode: UiMode) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode)
  applyUiModeToDocument(mode)
  window.dispatchEvent(new CustomEvent<UiMode>(UI_MODE_EVENT, { detail: mode }))
}

export function useUiMode() {
  const [mode, setModeState] = useState<UiMode>(() => getUiMode())

  useEffect(() => {
    const storedMode = getUiMode()
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, storedMode)
    applyUiModeToDocument(storedMode)

    const handleModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<UiMode>
      const nextMode = isUiMode(customEvent.detail)
        ? customEvent.detail
        : getUiMode()
      setModeState(nextMode)
      applyUiModeToDocument(nextMode)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== UI_MODE_STORAGE_KEY) return
      const nextMode = resolveUiMode(event.newValue)
      setModeState(nextMode)
      applyUiModeToDocument(nextMode)
    }

    window.addEventListener(UI_MODE_EVENT, handleModeChange as EventListener)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(UI_MODE_EVENT, handleModeChange as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const updateMode = useCallback((nextMode: UiMode) => {
    setUiMode(nextMode)
    setModeState(nextMode)
  }, [])

  const toggleMode = useCallback(() => {
    const nextMode: UiMode = mode === 'design-lab' ? 'original' : 'design-lab'
    updateMode(nextMode)
  }, [mode, updateMode])

  return {
    mode,
    isDesignLab: mode === 'design-lab',
    setMode: updateMode,
    toggleMode,
  }
}

export function UiModeSync() {
  useUiMode()
  return null
}
