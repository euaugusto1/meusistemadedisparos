'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Users2,
  Kanban,
  Tags,
  TrendingUp,
  UserPlus,
  Zap,
  FileSpreadsheet,
  BarChart3,
  Brain,
  MessageSquare,
  ArrowRight,
  Bell,
  Bot,
  Sparkles,
  GripVertical,
  CheckCircle2,
  Clock,
  Target,
  MessagesSquare,
} from 'lucide-react'

interface CrmClientProps {
  userName: string
}

export function CrmClient({ userName }: CrmClientProps) {
  const features = [
    {
      icon: Kanban,
      title: 'Kanban de Conversas',
      description: 'Quadro visual com colunas personalizáveis para organizar suas conversas.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Tags,
      title: 'Sistema de Tags',
      description: 'Tags coloridas para categorizar clientes: VIP, Urgente, Interessado.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: TrendingUp,
      title: 'Pipeline de Vendas',
      description: 'Funil visual de vendas com métricas de conversão por etapa.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: UserPlus,
      title: 'Múltiplos Atendentes',
      description: 'Atribua e transfira conversas entre atendentes em tempo real.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Zap,
      title: 'Automações',
      description: 'Mova leads automaticamente entre etapas e envie lembretes.',
      color: 'from-yellow-500 to-amber-500',
    },
    {
      icon: FileSpreadsheet,
      title: 'Importação de Contatos',
      description: 'Importe contatos em massa via CSV com mapeamento de campos.',
      color: 'from-teal-500 to-cyan-500',
    },
    {
      icon: BarChart3,
      title: 'Relatórios e Métricas',
      description: 'Taxa de conversão, tempo de resposta e performance por atendente.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Brain,
      title: 'IA Assistente',
      description: 'Sugestões de respostas, análise de sentimento e classificação de leads.',
      color: 'from-pink-500 to-rose-500',
    },
  ]

  const kanbanColumns = [
    { title: 'Novos Leads', count: 12, color: 'bg-blue-500' },
    { title: 'Em Atendimento', count: 8, color: 'bg-yellow-500' },
    { title: 'Proposta Enviada', count: 5, color: 'bg-purple-500' },
    { title: 'Fechado', count: 23, color: 'bg-green-500' },
  ]

  const benefits = [
    {
      icon: MessagesSquare,
      title: 'Histórico Completo',
      description: 'Todas as conversas centralizadas com histórico completo.',
    },
    {
      icon: Target,
      title: 'Foco em Conversões',
      description: 'Priorize leads com maior potencial de fechamento.',
    },
    {
      icon: Clock,
      title: 'Tempo Real',
      description: 'Atualizações instantâneas de todas as interações.',
    },
    {
      icon: CheckCircle2,
      title: 'Organização Total',
      description: 'Nunca perca uma oportunidade de venda.',
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="transition-all duration-300 hover:scale-105 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <div className="text-center space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              <span className="md:hidden">Olá, {userName}</span>
              <span className="hidden md:inline">CRM AraujoIA</span>
            </h1>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg">
              <Bot className="h-3 w-3 mr-1" />
              IA
            </Badge>
            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold shadow-lg">
              Em breve
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto px-2">
            Gerencie suas conversas e clientes do WhatsApp com Inteligência Artificial
          </p>
        </div>
      </div>

      {/* Em Desenvolvimento Banner */}
      <Card className="border-2 border-dashed border-emerald-500/50 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="p-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-full relative">
              <Users2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <div className="absolute -top-1 -right-1 p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h2 className="text-xl sm:text-2xl font-bold">CRM Integrado ao WhatsApp</h2>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Bot className="h-3 w-3 mr-1" />
                  IA
                </Badge>
                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  Em breve
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Estamos desenvolvendo um <strong className="text-foreground">CRM completo</strong> para WhatsApp com{' '}
                <strong className="text-foreground">Inteligência Artificial</strong>. Organize suas conversas em um
                quadro Kanban, classifique clientes com tags, acompanhe o funil de vendas e deixe a IA ajudar nas respostas!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* O que é CRM AraujoIA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-emerald-500" />
            O que é o CRM AraujoIA?
          </CardTitle>
          <CardDescription>
            Sistema completo de gestão de relacionamento com clientes via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <strong className="text-foreground">CRM AraujoIA</strong> é um sistema inteligente de gestão de
            relacionamento que utiliza <strong className="text-emerald-500">Inteligência Artificial</strong> para
            organizar e otimizar todas as suas conversas no WhatsApp. Com um quadro Kanban visual, você acompanha
            cada lead desde o primeiro contato até o fechamento da venda.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Kanban className="h-4 w-4 text-emerald-500" />
                Kanban Visual
              </h4>
              <p className="text-sm text-muted-foreground">
                Arraste e solte conversas entre etapas do seu funil de vendas.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Tags className="h-4 w-4 text-cyan-500" />
                Tags Inteligentes
              </h4>
              <p className="text-sm text-muted-foreground">
                Categorize clientes automaticamente com tags baseadas em comportamento.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                IA Assistente
              </h4>
              <p className="text-sm text-muted-foreground">
                Sugestões de respostas e análise de sentimento em tempo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefícios */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {benefits.map((benefit, index) => (
          <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-3 sm:p-6">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg w-fit mb-2 sm:mb-3">
                <benefit.icon className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold mb-1 text-xs sm:text-base">{benefit.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{benefit.description}</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </Card>
        ))}
      </div>

      {/* Funcionalidades */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Funcionalidades</h2>
          <p className="text-sm text-muted-foreground">
            Conheça todas as funcionalidades que estão sendo desenvolvidas
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-3 sm:p-4">
                <div className={`p-2 sm:p-3 bg-gradient-to-br ${feature.color} rounded-lg w-fit mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-xs sm:text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview do Kanban */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Kanban className="h-5 w-5 text-emerald-500" />
            Preview do Kanban
          </CardTitle>
          <CardDescription>
            Visualização prévia do quadro de gestão de conversas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {kanbanColumns.map((column, index) => (
              <div key={index} className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs sm:text-sm">{column.title}</h4>
                  <Badge variant="secondary" className="text-xs">{column.count}</Badge>
                </div>
                <div className={`h-1 ${column.color} rounded-full`} />
                <div className="space-y-2">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="p-2 sm:p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/50" />
                        <div className="flex-1">
                          <div className="h-2 bg-muted-foreground/20 rounded w-3/4 mb-1.5" />
                          <div className="h-2 bg-muted-foreground/10 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {index < 2 && (
                    <div className="p-2 sm:p-3 bg-muted/30 rounded-lg border border-dashed border-border/50">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/30" />
                        <div className="flex-1">
                          <div className="h-2 bg-muted-foreground/10 rounded w-2/3 mb-1.5" />
                          <div className="h-2 bg-muted-foreground/5 rounded w-1/3" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold">Ajude-nos a Construir!</h2>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Bot className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
            O CRM AraujoIA está em desenvolvimento ativo.
            Suas sugestões são muito importantes para criarmos a melhor experiência possível!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              disabled
              className="bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg gap-2 opacity-50 cursor-not-allowed"
            >
              <Bell className="h-4 w-4" />
              Notificar quando disponível
            </Button>
            <Link href="/support">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg gap-2 transition-all duration-300 hover:scale-105"
              >
                <MessageSquare className="h-4 w-4" />
                Enviar Sugestões
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
