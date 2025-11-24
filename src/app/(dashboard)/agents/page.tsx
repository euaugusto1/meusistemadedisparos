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
    <div className="flex flex-col gap-8">
      {/* Page Header - Premium Style */}
      <div className="text-center space-y-3 relative">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
              <Bot className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Agentes IA
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Gerencie seus agentes de inteligência artificial e automações n8n
        </p>

        {/* Badge Beta */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 shadow-md">
          <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
          <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Beta</span>
        </div>
      </div>

      {/* Info Card - Premium Style */}
      <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            Sobre os Agentes IA
          </CardTitle>
          <CardDescription className="text-base">
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

      {/* Agents List - Premium Style */}
      <Card className="transition-all duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Agentes Disponíveis</CardTitle>
          <CardDescription className="text-base">
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
