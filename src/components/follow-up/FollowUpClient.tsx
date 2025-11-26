'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  MessageSquare,
  Users,
  Target,
  Zap,
  CheckCircle2,
  ArrowRight,
  Bell,
  Calendar,
  TrendingUp,
  Construction,
  Bot,
  Sparkles,
  Brain,
} from 'lucide-react'

interface FollowUpClientProps {
  userName: string
}

export function FollowUpClient({ userName }: FollowUpClientProps) {
  const examples = [
    {
      title: 'Carrinho Abandonado',
      description: 'Envie lembretes automáticos para clientes que abandonaram o carrinho de compras.',
      icon: Clock,
      color: 'from-orange-500 to-red-500',
      steps: [
        'Cliente abandona carrinho',
        'Após 1h: "Você esqueceu algo?"',
        'Após 24h: "Últimas unidades!"',
        'Após 48h: "Cupom especial para você"',
      ],
    },
    {
      title: 'Pós-Venda',
      description: 'Acompanhe seus clientes após a compra para garantir satisfação e fidelização.',
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
      steps: [
        'Venda realizada',
        'Após 3 dias: "Como foi sua experiência?"',
        'Após 7 dias: "Precisa de ajuda?"',
        'Após 30 dias: "Produtos recomendados"',
      ],
    },
    {
      title: 'Reativação de Clientes',
      description: 'Reconquiste clientes inativos com mensagens personalizadas e ofertas exclusivas.',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      steps: [
        'Cliente inativo há 30 dias',
        'Mensagem: "Sentimos sua falta!"',
        'Após 7 dias: "Novidades para você"',
        'Após 14 dias: "Desconto especial"',
      ],
    },
    {
      title: 'Agendamentos',
      description: 'Lembre seus clientes de consultas, reuniões ou serviços agendados.',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
      steps: [
        'Agendamento criado',
        '3 dias antes: "Confirmação"',
        '1 dia antes: "Lembrete"',
        '2 horas antes: "Estamos te esperando!"',
      ],
    },
  ]

  const benefits = [
    {
      icon: Brain,
      title: 'IA Generativa',
      description: 'Mensagens criadas automaticamente pela IA, personalizadas para cada cliente.',
    },
    {
      icon: Target,
      title: 'Segmentação com IA',
      description: 'A IA identifica padrões e segmenta clientes automaticamente.',
    },
    {
      icon: TrendingUp,
      title: 'Aumento de Conversões',
      description: 'Recupere até 40% das vendas perdidas com follow-ups otimizados por IA.',
    },
    {
      icon: Zap,
      title: 'Aprendizado Contínuo',
      description: 'A IA aprende com cada interação e melhora resultados ao longo do tempo.',
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              <span className="md:hidden">Olá, {userName}</span>
              <span className="hidden md:inline">Follow-Up IA</span>
            </h1>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg">
              <Bot className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto px-2">
            Sistema inteligente de acompanhamento de clientes com Inteligência Artificial
          </p>
        </div>
      </div>

      {/* Em Desenvolvimento Banner */}
      <Card className="border-2 border-dashed border-purple-500/50 bg-gradient-to-br from-purple-500/5 via-cyan-500/5 to-blue-500/5">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="p-4 bg-gradient-to-br from-purple-500 via-cyan-500 to-blue-600 rounded-full relative">
              <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <div className="absolute -top-1 -right-1 p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h2 className="text-xl sm:text-2xl font-bold">Follow-Up com Inteligência Artificial</h2>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Bot className="h-3 w-3 mr-1" />
                  IA
                </Badge>
                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  Em breve
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Estamos desenvolvendo um sistema de Follow-Up revolucionário com <strong className="text-foreground">Inteligência Artificial</strong>.
                A IA irá analisar o comportamento dos seus clientes, criar mensagens personalizadas automaticamente e
                escolher o melhor momento para cada envio, maximizando suas conversões!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* O que é Follow-Up IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            O que é Follow-Up com IA?
          </CardTitle>
          <CardDescription>
            Entenda como a Inteligência Artificial revoluciona o acompanhamento de clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Follow-Up com IA</strong> é um sistema inteligente de acompanhamento
            que utiliza <strong className="text-purple-500">Inteligência Artificial</strong> para enviar mensagens
            personalizadas para seus clientes nos momentos mais estratégicos. A IA analisa o comportamento de cada
            cliente, aprende padrões e otimiza automaticamente suas campanhas para maximizar conversões.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                IA Generativa
              </h4>
              <p className="text-sm text-muted-foreground">
                A IA cria mensagens personalizadas automaticamente baseadas no perfil de cada cliente.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                Timing Inteligente
              </h4>
              <p className="text-sm text-muted-foreground">
                A IA identifica o melhor horário para enviar mensagens a cada cliente individual.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Otimização Contínua
              </h4>
              <p className="text-sm text-muted-foreground">
                O sistema aprende com os resultados e melhora automaticamente suas estratégias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefícios */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((benefit, index) => (
          <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg w-fit mb-3">
                <benefit.icon className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-500" />
              </div>
              <h3 className="font-semibold mb-1 text-sm sm:text-base">{benefit.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{benefit.description}</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </Card>
        ))}
      </div>

      {/* Exemplos de Uso */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Exemplos de Uso</h2>
          <p className="text-sm text-muted-foreground">
            Veja como o Follow-Up pode transformar seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {examples.map((example, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300">
              <CardHeader className={`bg-gradient-to-r ${example.color} text-white p-4 sm:p-6`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <example.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg text-white">{example.title}</CardTitle>
                    <CardDescription className="text-white/80 text-xs sm:text-sm">
                      {example.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Fluxo de mensagens:</h4>
                <div className="space-y-2">
                  {example.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-center gap-3">
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r ${example.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {stepIndex + 1}
                      </div>
                      <span className="text-xs sm:text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-blue-500/10 border-purple-500/20">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold">Ajude-nos a Construir!</h2>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Bot className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
            O sistema de Follow-Up com IA está em desenvolvimento ativo.
            Suas sugestões são muito importantes para criarmos a melhor experiência possível!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              disabled
              className="bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg gap-2 opacity-50 cursor-not-allowed"
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
