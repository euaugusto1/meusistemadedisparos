/**
 * Swagger UI Client Component
 *
 * Client-side Swagger UI rendering with dark mode
 */

'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Key, Shield, ExternalLink, Copy, Check } from 'lucide-react'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then((mod) => {
    require('swagger-ui-react/swagger-ui.css')
    return mod
  }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Carregando documentacao...</p>
        </div>
      </div>
    )
  }
)

interface SwaggerUIClientProps {
  userName?: string
  userEmail?: string
}

export default function SwaggerUIClient({ userName, userEmail }: SwaggerUIClientProps) {
  const [mounted, setMounted] = useState(false)
  const [showTip, setShowTip] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Hide tip after 10 seconds
    const timer = setTimeout(() => setShowTip(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  const copyExample = () => {
    navigator.clipboard.writeText('wpp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[#0d1117]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#58a6ff] border-t-transparent mx-auto mb-3"></div>
          <p className="text-[#8b949e] text-sm">Carregando documentacao...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="swagger-dark-theme min-h-screen bg-[#0d1117]" suppressHydrationWarning>
      {/* Compact Header Bar */}
      <div className="sticky top-0 z-50 bg-[#161b22]/95 backdrop-blur-sm border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: User Info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-[#f0f6fc]">{userName || 'Administrador'}</p>
                <p className="text-xs text-[#8b949e]">{userEmail}</p>
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="flex items-center gap-2">
              {showTip && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#58a6ff]/10 border border-[#58a6ff]/20 rounded-lg">
                  <Key className="w-3.5 h-3.5 text-[#58a6ff]" />
                  <span className="text-xs text-[#c9d1d9]">
                    Clique em <strong className="text-[#f0f6fc]">Authorize</strong> para testar
                  </span>
                  <button
                    onClick={() => setShowTip(false)}
                    className="ml-1 text-[#58a6ff] hover:text-[#79c0ff]"
                  >
                    ×
                  </button>
                </div>
              )}

              <a
                href="/admin/api-tokens"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tokens</span>
              </a>

              <a
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium rounded-lg transition-colors border border-[#30363d]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Auth Guide - Collapsible */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <details className="group bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#21262d] transition-colors">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#58a6ff]" />
              <span className="text-sm font-medium text-[#c9d1d9]">Guia Rapido de Autenticacao</span>
            </div>
            <span className="text-[#8b949e] text-xs group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="px-4 py-3 border-t border-[#30363d] bg-[#0d1117]">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-[#58a6ff]">1. AdminToken</h4>
                <p className="text-[#8b949e] text-xs">Para integracoes externas</p>
                <div className="flex items-center gap-2 bg-[#21262d] rounded px-2 py-1.5">
                  <code className="text-xs text-[#3fb950] flex-1 truncate">wpp_xxxx...xxxx</code>
                  <button
                    onClick={copyExample}
                    className="text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-[#a371f7]">2. N8nAuth</h4>
                <p className="text-[#8b949e] text-xs">Para workflows N8N</p>
                <div className="bg-[#21262d] rounded px-2 py-1.5">
                  <code className="text-xs text-[#a371f7]">N8N_API_KEY</code>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-[#d29922]">3. SupabaseAuth</h4>
                <p className="text-[#8b949e] text-xs">Sessao do navegador (automatico)</p>
                <div className="bg-[#21262d] rounded px-2 py-1.5">
                  <code className="text-xs text-[#d29922]">JWT Cookie</code>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Swagger UI Container */}
      <div className="swagger-ui-container max-w-7xl mx-auto px-4 py-4" suppressHydrationWarning>
        <SwaggerUI
          url="/api/swagger"
          docExpansion="list"
          defaultModelsExpandDepth={0}
          defaultModelExpandDepth={1}
          displayRequestDuration={true}
          filter={true}
          showExtensions={true}
          showCommonExtensions={true}
          tryItOutEnabled={true}
          persistAuthorization={true}
          deepLinking={true}
          supportedSubmitMethods={['get', 'post', 'put', 'patch', 'delete']}
        />
      </div>
    </div>
  )
}
