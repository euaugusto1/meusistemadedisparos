'use client'

import { useEffect } from 'react'
import { applyTheme, getStoredTheme } from '@/lib/themes'

export function useTheme() {
  useEffect(() => {
    // Apply saved theme on mount
    const savedTheme = getStoredTheme()
    applyTheme(savedTheme)
  }, [])
}
