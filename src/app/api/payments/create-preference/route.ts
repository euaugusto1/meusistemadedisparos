import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentPreference } from '@/services/mercadopago'
import type { MercadoPagoSettings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get Mercado Pago settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'mercadopago')
      .single()

    console.log('Payment settings query:', { settingsData, settingsError })

    if (!settingsData) {
      return NextResponse.json(
        { error: 'Payment settings not configured' },
        { status: 500 }
      )
    }

    const mpSettings = settingsData.value as MercadoPagoSettings

    if (!mpSettings.is_enabled) {
      return NextResponse.json(
        { error: 'Payment processing is disabled' },
        { status: 403 }
      )
    }

    // Parse request body
    const { planId } = await request.json()

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    // Create payment preference
    const preference = await createPaymentPreference(mpSettings, {
      plan,
      userId: user.id,
      userEmail: user.email || '',
    })

    // Return the checkout URL based on sandbox mode
    const checkoutUrl = mpSettings.use_sandbox
      ? preference.sandbox_init_point
      : preference.init_point

    return NextResponse.json({
      preferenceId: preference.id,
      checkoutUrl,
    })
  } catch (error: any) {
    console.error('[API] Error creating payment preference:', error)
    console.error('[API] Error message:', error?.message)
    console.error('[API] Error stack:', error?.stack)

    // Return the actual error message if available
    const errorMessage = error?.message || 'Failed to create payment preference'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
