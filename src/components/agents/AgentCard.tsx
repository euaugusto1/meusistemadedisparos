'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, Play, Pause, Activity, Clock, TrendingUp, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { N8nWorkflow } from '@/types'

interface AgentCardProps {
  agent: N8nWorkflow & {
    executionCount?: number
    successRate?: number
  }
  onToggle?: () => void
  disabled?: boolean
}

export function AgentCard({ agent, onToggle, disabled = false }: AgentCardProps) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    if (disabled) {
      // Se disabled, chama onToggle (que vai abrir o modal)
      if (onToggle) {
        onToggle()
      }
      return
    }

    setToggling(true)
    try {
      const response = await fetch(`/api/n8n/agents/${agent.id}/toggle`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Falha ao atualizar agente')
      }

      const data = await response.json()
      toast.success(data.message || `Agente ${data.active ? 'ativado' : 'desativado'}`)

      if (onToggle) {
        onToggle()
      }
    } catch (error) {
      toast.error('Erro ao atualizar agente')
      console.error('Error toggling agent:', error)
    } finally {
      setToggling(false)
    }
  }

  const executionCount = agent.executionCount || 0
  const successRate = agent.successRate || 0

  return (
    <Card className={`hover:border-primary/50 transition-all duration-200 ${disabled ? 'opacity-75 cursor-pointer' : ''}`} onClick={disabled ? handleToggle : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${agent.active ? 'bg-blue-500/10' : 'bg-slate-500/10'}`}>
              <Bot className={`h-5 w-5 ${agent.active ? 'text-blue-500' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate" title={agent.name}>
                {agent.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">
                  {new Date(agent.updatedAt).toLocaleDateString('pt-BR')}
                </span>
              </CardDescription>
            </div>
          </div>
          <Badge variant={agent.active ? 'default' : 'secondary'} className="shrink-0">
            {agent.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tags */}
        {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {agent.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
            <Zap className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Execuções</p>
              <p className="text-sm font-semibold">{executionCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
              <p className="text-sm font-semibold">
                {successRate > 0 ? `${successRate.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant={agent.active ? 'destructive' : 'default'}
            onClick={handleToggle}
            disabled={toggling || disabled}
            className="flex-1"
          >
            {toggling ? (
              <>Processando...</>
            ) : disabled ? (
              <>🔒 Plano Gold</>
            ) : agent.active ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Ativar
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            title="Ver execuções"
            disabled
          >
            <Activity className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
