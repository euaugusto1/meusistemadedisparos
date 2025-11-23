'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CampaignsList } from '@/components/campaigns/CampaignsList'
import { ScheduledCampaignsDashboard } from '@/components/campaigns/ScheduledCampaignsDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Campaign, WhatsAppInstance, MediaFile } from '@/types'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<(Campaign & { instance?: WhatsAppInstance | null; media?: MediaFile | null })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('campaigns')
      .select(`
        *,
        instance:whatsapp_instances(id, name, phone_number),
        media:media_files(id, public_url, original_name)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setCampaigns(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Minhas Campanhas</h1>
          <p className="text-muted-foreground">
            Acompanhe o histórico e status das suas campanhas
          </p>
        </div>
        <div className="text-center py-12">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minhas Campanhas</h1>
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
  )
}
