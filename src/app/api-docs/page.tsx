/**
 * Swagger UI Page (Server Component)
 *
 * Interactive API documentation powered by Swagger UI
 * Restricted to admin users only
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SwaggerUIClient from './SwaggerUIClient'

export default async function ApiDocsPage() {
  const supabase = createClient()

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?redirect=/api-docs&message=Faça login para acessar a documentação da API')
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/dashboard?error=Erro ao verificar permissões')
  }

  if (profile.role !== 'admin') {
    redirect('/dashboard?error=Acesso negado. Somente administradores podem acessar a documentação da API.')
  }

  // User is authenticated and is admin - render Swagger UI
  return (
    <SwaggerUIClient
      userName={profile.full_name || undefined}
      userEmail={user.email}
    />
  )
}
