import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Endpoint de TESTE para simular processamento de pagamento
 * USE APENAS EM DESENVOLVIMENTO!
 *
 * Para usar:
 * POST /api/webhooks/test-payment
 * Body: { "paymentId": "1340675912438", "userId": "seu-user-id", "planId": "plan-id" }
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentId, userId, planId } = await request.json()

    if (!paymentId || !userId || !planId) {
      return NextResponse.json(
        { error: 'paymentId, userId, and planId are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days)

    // Get current credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    const newCredits = (profile?.credits || 0) + plan.credits

    // Update user profile with new plan
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan_tier: plan.tier,
        credits: newCredits,
        plan_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user plan:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user plan', details: updateError },
        { status: 500 }
      )
    }

    // Create payment record for audit trail
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        plan_tier: plan.tier,
        amount: plan.price,
        credits_added: plan.credits,
        payment_method: 'mercadopago',
        payment_id: paymentId,
        status: 'approved',
        payment_data: {
          status_detail: 'TEST_PAYMENT',
          test: true,
          processed_at: new Date().toISOString(),
        },
      })

    if (paymentError) {
      console.error('Error creating payment transaction:', paymentError)
      // Don't fail, plan was already updated
    }

    console.log(`[TEST PAYMENT] Successfully processed payment for user ${userId}:`)
    console.log(`  - Payment ID: ${paymentId}`)
    console.log(`  - Plan: ${plan.tier}`)
    console.log(`  - Credits added: ${plan.credits}`)
    console.log(`  - New total credits: ${newCredits}`)
    console.log(`  - Expires at: ${expiresAt.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully (TEST)',
      data: {
        userId,
        planTier: plan.tier,
        creditsAdded: plan.credits,
        newTotalCredits: newCredits,
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[TEST PAYMENT] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to get user info for testing
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get available plans
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      plans: plans || [],
      instructions: 'Use POST with { paymentId, userId, planId } to simulate payment',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
