'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CampaignsList } from '@/components/campaigns/CampaignsList'
import { ScheduledCampaignsDashboard } from '@/components/campaigns/ScheduledCampaignsDashboard'
import { CampaignNavigation } from '@/components/campaigns/CampaignNavigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Campaign, WhatsAppInstance, MediaFile } from '@/types'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<(Campaign & { instance?: WhatsAppInstance | null; media?: MediaFile | null })[]>([])
  const [loading, setLoading] = useState(true)

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
          // Refetch all campaigns to get updated data with relations
          fetchCampaigns()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCampaigns])

  if (loading) {
    return (
      <>
        <CampaignNavigation />
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Histórico</h1>
            <p className="text-muted-foreground">
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
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico</h1>
          <p className="text-muted-foreground">
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
