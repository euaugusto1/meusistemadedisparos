import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  processPaymentNotification,
  validateWebhookSignature,
  type PaymentNotification,
} from '@/services/mercadopago'
import type { MercadoPagoSettings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    console.log('[WEBHOOK] Received Mercado Pago notification')

    const supabase = createAdminClient()

    // Get Mercado Pago settings
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'mercadopago')
      .single()

    if (!settingsData) {
      console.error('[WEBHOOK] Mercado Pago settings not configured')
      return NextResponse.json(
        { error: 'Payment settings not configured' },
        { status: 500 }
      )
    }

    console.log('[WEBHOOK] Settings loaded successfully')

    const mpSettings = settingsData.value as MercadoPagoSettings

    if (!mpSettings.is_enabled) {
      console.error('Mercado Pago is not enabled')
      return NextResponse.json(
        { error: 'Payment processing is disabled' },
        { status: 403 }
      )
    }

    // Validate webhook signature
    const signature = request.headers.get('x-signature')
    const requestId = request.headers.get('x-request-id')

    if (!validateWebhookSignature(signature, requestId, mpSettings.webhook_secret)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse notification
    const notification: PaymentNotification = await request.json()

    // Only process payment notifications
    if (notification.type !== 'payment') {
      return NextResponse.json({ status: 'ignored' })
    }

    // Process payment notification
    const paymentData = await processPaymentNotification(mpSettings, notification)

    // Only update user plan if payment is approved
    if (paymentData.status === 'approved' && paymentData.externalReference) {
      const { user_id, plan_tier, credits, duration_days } = paymentData.externalReference

      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + duration_days)

      // Get current credits of the user
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits, email, full_name')
        .eq('id', user_id)
        .single()

      const newCredits = (profile?.credits || 0) + credits

      // Buscar admin para descontar créditos
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id, credits, email')
        .eq('role', 'admin')
        .single()

      if (adminProfile) {
        const adminCredits = adminProfile.credits || 0

        // Verificar se o admin tem créditos suficientes
        if (adminCredits >= credits) {
          // Descontar créditos do admin
          const { error: adminUpdateError } = await supabase
            .from('profiles')
            .update({
              credits: adminCredits - credits,
              updated_at: new Date().toISOString(),
            })
            .eq('id', adminProfile.id)

          if (adminUpdateError) {
            console.error('[WEBHOOK] Error deducting credits from admin:', adminUpdateError)
          } else {
            console.log(`[WEBHOOK] Deducted ${credits} credits from admin (${adminProfile.email})`)
            console.log(`  - Admin credits before: ${adminCredits}`)
            console.log(`  - Admin credits after: ${adminCredits - credits}`)

            // Registrar log de transferência de créditos
            await supabase
              .from('system_logs')
              .insert({
                user_id: adminProfile.id,
                action: 'credit_transfer',
                level: 'info',
                details: {
                  type: 'payment_plan_upgrade',
                  from_user_id: adminProfile.id,
                  from_user_email: adminProfile.email,
                  to_user_id: user_id,
                  to_user_email: profile?.email,
                  credits_transferred: credits,
                  admin_credits_before: adminCredits,
                  admin_credits_after: adminCredits - credits,
                  user_credits_before: profile?.credits || 0,
                  user_credits_after: newCredits,
                  plan_tier,
                  payment_id: paymentData.paymentId,
                  payment_amount: paymentData.amount,
                },
              })
          }
        } else {
          console.warn(`[WEBHOOK] Admin has insufficient credits (${adminCredits}) for transfer of ${credits}`)
          // Registrar log de alerta
          await supabase
            .from('system_logs')
            .insert({
              user_id: adminProfile.id,
              action: 'credit_transfer_failed',
              level: 'warning',
              details: {
                type: 'insufficient_admin_credits',
                admin_credits: adminCredits,
                credits_required: credits,
                to_user_id: user_id,
                plan_tier,
                payment_id: paymentData.paymentId,
              },
            })
        }
      } else {
        console.warn('[WEBHOOK] No admin found to deduct credits from')
      }

      // Update user profile with new plan
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan_tier,
          credits: newCredits,
          plan_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user_id)

      if (updateError) {
        console.error('Error updating user plan:', updateError)
        return NextResponse.json(
          { error: 'Failed to update user plan' },
          { status: 500 }
        )
      }

      // Create payment record for audit trail
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id,
          plan_tier,
          amount: paymentData.amount,
          credits_added: credits,
          payment_method: 'mercadopago',
          payment_id: paymentData.paymentId?.toString(),
          status: paymentData.status,
          payment_data: {
            status_detail: paymentData.statusDetail,
            payer_email: paymentData.payerEmail,
            date_approved: paymentData.dateApproved,
          },
        })

      if (paymentError) {
        console.error('Error creating payment transaction record:', paymentError)
        // Don't fail the webhook, plan was already updated
      }

      // Registrar log de upgrade de plano
      await supabase
        .from('system_logs')
        .insert({
          user_id: user_id,
          action: 'plan_upgraded',
          level: 'success',
          details: {
            plan_tier,
            credits_added: credits,
            total_credits: newCredits,
            expires_at: expiresAt.toISOString(),
            payment_id: paymentData.paymentId,
            payment_amount: paymentData.amount,
            payer_email: paymentData.payerEmail,
          },
        })

      console.log(`[WEBHOOK] Successfully processed payment for user ${user_id}:`)
      console.log(`  - Plan: ${plan_tier}`)
      console.log(`  - Credits added: ${credits}`)
      console.log(`  - New total credits: ${newCredits}`)
      console.log(`  - Expires at: ${expiresAt.toISOString()}`)
    } else {
      console.log(`[WEBHOOK] Payment status: ${paymentData.status} - No action taken`)
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('[WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mercado Pago requires a GET endpoint for webhook configuration
export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhook: 'mercadopago',
  })
}
