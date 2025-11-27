import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Usar URL de produção para redirecionamento (não confiar no origin da request)
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dev.wpp.sistemabrasil.online'

  // Fluxo de recuperação de senha
  if (token_hash && type === 'recovery') {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })

    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  // Fluxo normal: signup/login
  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  // Redirecionar para erro
  return NextResponse.redirect(`${siteUrl}/auth/error`)
}
