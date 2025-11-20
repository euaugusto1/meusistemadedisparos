'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setProfile(null)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (payload.new.id === profile?.id) {
            setProfile(payload.new as Profile)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, profile?.id])

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return { error: 'No profile' }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single()

    if (error) return { error: error.message }

    setProfile(data)
    return { data }
  }

  const isAdmin = profile?.role === 'admin'
  const isPlanActive = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at) > new Date()
    : true

  return {
    profile,
    loading,
    error,
    isAdmin,
    isPlanActive,
    updateProfile,
  }
}
