'use client'

import { useEffect, useState } from 'react'
import { applyTheme, getStoredTheme } from '@/lib/themes'

export function useTheme() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Apply saved theme on mount
    const savedTheme = getStoredTheme()
    console.log('useTheme: Applying saved theme:', savedTheme)
    applyTheme(savedTheme)

    // Listen for storage changes (when user opens multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme-variant' && e.newValue) {
        console.log('useTheme: Storage changed, applying theme:', e.newValue)
        applyTheme(e.newValue as any)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return mounted
}
