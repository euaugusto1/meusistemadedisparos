'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CampaignsList } from '@/components/campaigns/CampaignsList'
import { ScheduledCampaignsDashboard } from '@/components/campaigns/ScheduledCampaignsDashboard'
import { CampaignNavigation } from '@/components/campaigns/CampaignNavigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Campaign, WhatsAppInstance, MediaFile } from '@/types'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<(Campaign & { instance?: WhatsAppInstance | null; media?: MediaFile | null })[]>([])
  const [loading, setLoading] = useState(true)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchCampaigns = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('campaigns')
      .select(`
        *,
        instance:whatsapp_instances(id, name, phone_number, status, api_token, is_test),
        media:media_files(id, public_url, original_name, mime_type, storage_path)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setCampaigns(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCampaigns()

    // Subscribe to realtime updates on campaigns table
    const supabase = createClient()
    let debounceTimer: NodeJS.Timeout | null = null

    const channel = supabase
      .channel('campaigns-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'campaigns'
        },
        (payload) => {
          console.log('[Realtime] Campaign change:', payload.eventType, payload)

          // Debounce to avoid excessive re-renders
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          debounceTimer = setTimeout(() => {
            fetchCampaigns()
          }, 500) // Wait 500ms before fetching
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      supabase.removeChannel(channel)
    }
  }, [fetchCampaigns])

  // Polling agressivo para campanhas em processamento
  const hasProcessing = campaigns.some(c => c.status === 'processing')

  useEffect(() => {
    if (hasProcessing) {
      // Polling a cada 2 segundos quando há campanhas em processamento
      pollingRef.current = setInterval(() => {
        fetchCampaigns()
      }, 2000)
    } else {
      // Limpar polling quando não há campanhas em processamento
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [hasProcessing, fetchCampaigns])

  if (loading) {
    return (
      <>
        <CampaignNavigation />
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header - Premium Style */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Histórico
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Acompanhe o histórico e status das suas campanhas
            </p>
          </div>
          <div className="text-center py-12">Carregando...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <CampaignNavigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header - Premium Style */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Histórico
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Acompanhe o histórico e status das suas campanhas
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todas as Campanhas</TabsTrigger>
            <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <CampaignsList campaigns={campaigns || []} />
          </TabsContent>

          <TabsContent value="scheduled">
            <ScheduledCampaignsDashboard
              campaigns={campaigns || []}
              onCampaignUpdate={fetchCampaigns}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
