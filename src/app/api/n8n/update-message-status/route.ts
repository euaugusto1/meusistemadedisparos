import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

interface UpdateStatusRequest {
  campaignItemId: string
  status: 'sent' | 'failed'
  errorMessage?: string
  sentAt?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação N8N
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!apiKey || apiKey !== N8N_API_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const body: UpdateStatusRequest = await request.json()
    const { campaignItemId, status, errorMessage, sentAt } = body

    if (!campaignItemId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignItemId, status' },
        { status: 400 }
      )
    }

    // Update campaign item status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'sent') {
      updateData.sent_at = sentAt || new Date().toISOString()
    } else if (status === 'failed') {
      updateData.error_message = errorMessage || 'Unknown error'
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('campaign_items')
      .update(updateData)
      .eq('id', campaignItemId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating campaign item:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Get campaign to update counters
    const { data: campaign, error: campaignError } = await supabase
      .from('campaign_items')
      .select('campaign_id')
      .eq('id', campaignItemId)
      .single()

    if (!campaignError && campaign) {
      // Count sent and failed
      const { count: sentCount } = await supabase
        .from('campaign_items')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.campaign_id)
        .eq('status', 'sent')

      const { count: failedCount } = await supabase
        .from('campaign_items')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.campaign_id)
        .eq('status', 'failed')

      const { count: totalCount } = await supabase
        .from('campaign_items')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.campaign_id)

      // Update campaign counters
      await supabase
        .from('campaigns')
        .update({
          sent_count: sentCount || 0,
          failed_count: failedCount || 0,
          status: (sentCount || 0) + (failedCount || 0) >= (totalCount || 0) ? 'completed' : 'processing'
        })
        .eq('id', campaign.campaign_id)
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: `Message marked as ${status}`
    })

  } catch (error) {
    console.error('Error in /api/n8n/update-message-status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
