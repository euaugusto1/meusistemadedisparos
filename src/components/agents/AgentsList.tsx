'use client'

import { useState, useEffect } from 'react'
import { AgentCard } from './AgentCard'
import { UpgradeModal } from './UpgradeModal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bot, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { N8nWorkflow } from '@/types'

interface Agent extends N8nWorkflow {
  executionCount?: number
  successRate?: number
}

export function AgentsList() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasGoldPlan, setHasGoldPlan] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/n8n/agents')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao carregar agentes')
      }

      const data = await response.json()

      if (data.success) {
        setAgents(data.agents || [])
      } else {
        throw new Error(data.error || 'Erro desconhecido')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar agentes'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error fetching agents:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkUserPlan = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Buscar o plano e role do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_tier, role')
        .eq('id', user.id)
        .single()

      // Admins têm acesso total, ou usuários com plano gold
      const hasAccess = profile?.role === 'admin' || profile?.plan_tier === 'gold'
      setHasGoldPlan(hasAccess)
    } catch (err) {
      console.error('Error checking user plan:', err)
    }
  }

  useEffect(() => {
    checkUserPlan()
    fetchAgents()
  }, [])

  const handleRefresh = () => {
    fetchAgents()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando agentes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        <div className="p-4 rounded-full bg-slate-800/50">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Nenhum agente encontrado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Configure seus agentes de IA no n8n para começar
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>
    )
  }

  const handleAgentClick = () => {
    if (!hasGoldPlan) {
      setShowUpgradeModal(true)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {agents.length} {agents.length === 1 ? 'agente encontrado' : 'agentes encontrados'}
          </p>
          <Button onClick={handleRefresh} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Agents grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggle={hasGoldPlan ? fetchAgents : handleAgentClick}
              disabled={!hasGoldPlan}
            />
          ))}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  )
}
