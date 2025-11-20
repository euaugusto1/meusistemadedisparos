'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsAppInstance } from '@/types'

export function useInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchInstances = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInstances(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar instâncias')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchInstances()

    // Subscribe to instance changes
    const channel = supabase
      .channel('instance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_instances',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInstances(prev => [payload.new as WhatsAppInstance, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setInstances(prev =>
              prev.map(i => i.id === payload.new.id ? payload.new as WhatsAppInstance : i)
            )
          } else if (payload.eventType === 'DELETE') {
            setInstances(prev => prev.filter(i => i.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchInstances])

  const createInstance = async (name: string, instanceKey: string, token: string) => {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        name,
        instance_key: instanceKey,
        token,
        status: 'disconnected',
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { data }
  }

  const updateInstance = async (id: string, updates: Partial<WhatsAppInstance>) => {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { data }
  }

  const deleteInstance = async (id: string) => {
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', id)

    if (error) return { error: error.message }
    return { success: true }
  }

  const connectedInstances = instances.filter(i => i.status === 'connected')

  return {
    instances,
    connectedInstances,
    loading,
    error,
    createInstance,
    updateInstance,
    deleteInstance,
    refresh: fetchInstances,
  }
}
