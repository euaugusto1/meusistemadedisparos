/**
 * API Documentation Layout
 *
 * Dark theme layout for Swagger UI
 * Admin-only access
 */

import { Metadata } from 'next'
import './swagger-dark.css'

export const metadata: Metadata = {
  title: 'API Documentation - Araujo IA',
  description: 'Documentação completa da API Araujo IA para automação de disparos em massa via WhatsApp.',
  robots: 'noindex, nofollow'
}

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="api-docs-root" suppressHydrationWarning>
      {children}
    </div>
  )
}
