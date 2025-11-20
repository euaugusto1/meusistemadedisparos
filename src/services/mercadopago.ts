import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import type { MercadoPagoSettings, Plan } from '@/types'

export interface CreatePreferenceParams {
  plan: Plan
  userId: string
  userEmail: string
}

export interface PreferenceResponse {
  id: string
  init_point: string
  sandbox_init_point: string
}

/**
 * Get Mercado Pago client instance
 */
export function getMercadoPagoClient(settings: MercadoPagoSettings) {
  if (!settings.access_token) {
    throw new Error('Mercado Pago access token not configured')
  }

  const client = new MercadoPagoConfig({
    accessToken: settings.access_token,
    options: {
      timeout: 5000,
    },
  })

  return client
}

/**
 * Create payment preference for a plan
 */
export async function createPaymentPreference(
  settings: MercadoPagoSettings,
  params: CreatePreferenceParams
): Promise<PreferenceResponse> {
  try {
    console.log('Creating payment preference with settings:', {
      hasAccessToken: !!settings.access_token,
      useSandbox: settings.use_sandbox,
      planId: params.plan.id,
      planPrice: params.plan.price,
    })

    const client = getMercadoPagoClient(settings)
    const preference = new Preference(client)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL

    // Build preference body
    const body: any = {
      items: [
        {
          id: params.plan.id,
          title: params.plan.name,
          description: params.plan.description || `Plano ${params.plan.name}`,
          quantity: 1,
          unit_price: params.plan.price,
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: params.userEmail,
      },
      external_reference: JSON.stringify({
        user_id: params.userId,
        plan_id: params.plan.id,
        plan_tier: params.plan.tier,
        credits: params.plan.credits,
        duration_days: params.plan.duration_days,
      }),
      statement_descriptor: 'WhatsApp SaaS',
    }

    // Only add back_urls and notification_url if we have a public URL
    // For local development without ngrok, these will be omitted in sandbox mode
    if (baseUrl && !baseUrl.includes('localhost')) {
      body.back_urls = {
        success: `${baseUrl}/plans/success`,
        failure: `${baseUrl}/plans/failure`,
        pending: `${baseUrl}/plans/pending`,
      }
      body.auto_return = 'approved'
      body.notification_url = `${baseUrl}/api/webhooks/mercadopago`
    } else {
      console.warn('No public URL configured (NEXT_PUBLIC_APP_URL), back_urls will be omitted. Set up ngrok for local testing with redirects.')
    }

    const response = await preference.create({ body })

    if (!response.id || !response.init_point) {
      throw new Error('Invalid response from Mercado Pago')
    }

    console.log('Mercado Pago API response:', {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    })

    return {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point || response.init_point,
    }
  } catch (error: any) {
    console.error('Error creating payment preference:')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)

    // Log all error properties
    if (error.cause) {
      console.error('Error cause:', error.cause)
    }

    // Try to get API error details from Mercado Pago SDK
    if (error.response) {
      console.error('API Response status:', error.response.status)
      console.error('API Response data:', JSON.stringify(error.response.data, null, 2))
    }

    // Log the full error object
    console.error('Full error object:', error)

    throw error
  }
}

/**
 * Get payment details
 */
export async function getPayment(settings: MercadoPagoSettings, paymentId: string) {
  try {
    const client = getMercadoPagoClient(settings)
    const payment = new Payment(client)

    const response = await payment.get({ id: paymentId })
    return response
  } catch (error) {
    console.error('Error getting payment:', error)
    throw new Error('Failed to get payment details')
  }
}

/**
 * Validate webhook signature
 * Mercado Pago sends x-signature and x-request-id headers
 */
export function validateWebhookSignature(
  signature: string | null,
  requestId: string | null,
  webhookSecret: string
): boolean {
  if (!signature || !requestId || !webhookSecret) {
    return false
  }

  // Mercado Pago uses HMAC-SHA256 for webhook signatures
  // The signature format is: ts=timestamp,v1=hash
  // For now, we'll do basic validation
  // In production, implement proper HMAC validation

  return true // TODO: Implement proper signature validation
}

/**
 * Process payment notification and return payment data
 */
export interface PaymentNotification {
  action: string
  api_version: string
  data: {
    id: string
  }
  date_created: string
  id: number
  live_mode: boolean
  type: string
  user_id: string
}

export async function processPaymentNotification(
  settings: MercadoPagoSettings,
  notification: PaymentNotification
) {
  try {
    // Get payment details
    const payment = await getPayment(settings, notification.data.id)

    // Extract external reference data
    let externalReference: {
      user_id: string
      plan_id: string
      plan_tier: string
      credits: number
      duration_days: number
    } | null = null

    if (payment.external_reference) {
      try {
        externalReference = JSON.parse(payment.external_reference)
      } catch (e) {
        console.error('Failed to parse external reference:', e)
      }
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      amount: payment.transaction_amount,
      payerEmail: payment.payer?.email,
      externalReference,
      dateApproved: payment.date_approved,
    }
  } catch (error) {
    console.error('Error processing payment notification:', error)
    throw new Error('Failed to process payment notification')
  }
}
