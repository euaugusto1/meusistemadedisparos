import { AgentsList } from '@/components/agents/AgentsList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agentes IA - Dashboard',
  description: 'Gerencie seus agentes de inteligência artificial e automações n8n',
}

export default function AgentsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <Bot className="h-8 w-8 text-blue-500" />
            </div>
            Agentes IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus agentes de inteligência artificial e automações n8n
          </p>
        </div>

        {/* Badge Beta */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-500">Beta</span>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blue-500" />
            Sobre os Agentes IA
          </CardTitle>
          <CardDescription>
            Conecte e gerencie workflows de IA criados no n8n
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Os agentes listados abaixo são workflows do n8n que utilizam nós de inteligência artificial
            como LangChain, OpenAI, ou outros modelos de chat.
          </p>
          <p>
            Você pode ativar ou desativar agentes diretamente desta interface para controlar quando
            eles devem responder a triggers e webhooks.
          </p>
        </CardContent>
      </Card>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle>Agentes Disponíveis</CardTitle>
          <CardDescription>
            Lista de todos os agentes de IA configurados no n8n
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentsList />
        </CardContent>
      </Card>
    </div>
  )
}
