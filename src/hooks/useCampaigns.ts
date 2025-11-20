'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, CampaignStatus } from '@/types'

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCampaigns()

    // Subscribe to campaign changes
    const channel = supabase
      .channel('campaign-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCampaigns(prev => [payload.new as Campaign, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCampaigns(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new as Campaign : c)
            )
          } else if (payload.eventType === 'DELETE') {
            setCampaigns(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchCampaigns])

  const getCampaignsByStatus = (status: CampaignStatus | CampaignStatus[]) => {
    const statuses = Array.isArray(status) ? status : [status]
    return campaigns.filter(c => statuses.includes(c.status))
  }

  const updateCampaignStatus = async (id: string, status: CampaignStatus) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { data }
  }

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)

    if (error) return { error: error.message }
    return { success: true }
  }

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    processing: campaigns.filter(c => c.status === 'processing').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    failed: campaigns.filter(c => c.status === 'failed').length,
    totalSent: campaigns.reduce((acc, c) => acc + c.sent_count, 0),
    totalFailed: campaigns.reduce((acc, c) => acc + c.failed_count, 0),
  }

  return {
    campaigns,
    loading,
    error,
    stats,
    getCampaignsByStatus,
    updateCampaignStatus,
    deleteCampaign,
    refresh: fetchCampaigns,
  }
}
