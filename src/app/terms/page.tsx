import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Shield,
  AlertTriangle,
  FileText,
  Scale,
  UserCheck,
  Lock,
  Ban,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Home
} from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso - WhatsApp SaaS',
  description: 'Termos de Uso e Política de Uso Responsável da Plataforma',
}

export default function TermsPage() {
  const lastUpdate = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Documento Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Termos de Uso
          </h1>
          <p className="text-slate-400 text-lg">
            Plataforma de Disparos em Massa para WhatsApp
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Última atualização: {lastUpdate}
          </p>
        </div>

        {/* Warning Card */}
        <Card className="bg-yellow-500/10 border-yellow-500/30 mb-8">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-500 mb-2">Aviso Importante</h3>
                <p className="text-sm text-yellow-200/90">
                  Ao utilizar esta plataforma, você concorda integralmente com todos os termos e condições aqui descritos.
                  O uso inadequado pode resultar em suspensão de conta, banimento do WhatsApp e responsabilização legal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* 1. Aceitação dos Termos */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle>1. Aceitação dos Termos</CardTitle>
                  <CardDescription>Concordância com os termos de uso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p>
                Ao criar uma conta e utilizar os serviços desta plataforma, você declara que:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Leu, compreendeu e concorda com todos os termos aqui estabelecidos</li>
                <li>Tem capacidade legal para firmar este acordo</li>
                <li>Utilizará a plataforma de forma ética e legal</li>
                <li>É responsável por todas as ações realizadas em sua conta</li>
              </ul>
            </CardContent>
          </Card>

          {/* 2. Descrição do Serviço */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle>2. Descrição do Serviço</CardTitle>
                  <CardDescription>Funcionalidades da plataforma</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p>Esta plataforma oferece:</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm">✓ Gerenciamento de instâncias WhatsApp</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm">✓ Envio de mensagens em massa</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm">✓ Gerenciamento de listas de contatos</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm">✓ Templates de mensagens</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm">✓ Sistema de créditos e planos</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm">✓ Biblioteca de mídia</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Uso Responsável */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <UserCheck className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle>3. Política de Uso Responsável</CardTitle>
                  <CardDescription>Diretrizes obrigatórias de utilização</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h4 className="font-semibold text-green-400 mb-2">✓ Uso Permitido</h4>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Marketing com consentimento prévio dos destinatários</li>
                  <li>Comunicação com clientes existentes</li>
                  <li>Notificações de serviços contratados</li>
                  <li>Suporte ao cliente</li>
                  <li>Campanhas promocionais opt-in</li>
                </ul>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">✗ Uso Proibido</h4>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>SPAM ou mensagens não solicitadas</li>
                  <li>Disseminação de conteúdo ilegal, ofensivo ou fraudulento</li>
                  <li>Phishing, scams ou tentativas de fraude</li>
                  <li>Violação de direitos autorais ou propriedade intelectual</li>
                  <li>Assédio, ameaças ou intimidação</li>
                  <li>Conteúdo adulto, violento ou discriminatório</li>
                  <li>Compartilhamento de malware ou vírus</li>
                  <li>Violação das políticas do WhatsApp</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 4. Limitação de Responsabilidade */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Shield className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <CardTitle>4. Limitação de Responsabilidade</CardTitle>
                  <CardDescription>Isenção de responsabilidade da plataforma</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <div className="p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-lg">
                <p className="font-semibold text-orange-400 mb-3">IMPORTANTE:</p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>Responsabilidade do Usuário:</strong> Você é o único responsável pelo conteúdo,
                    frequência e destinatários de suas mensagens.
                  </li>
                  <li>
                    <strong>Banimento do WhatsApp:</strong> O uso inadequado pode resultar no bloqueio ou
                    banimento permanente de sua conta WhatsApp. A plataforma NÃO se responsabiliza por isso.
                  </li>
                  <li>
                    <strong>Conformidade Legal:</strong> Você deve estar em conformidade com todas as leis
                    aplicáveis, incluindo LGPD, GDPR e outras regulamentações de proteção de dados.
                  </li>
                  <li>
                    <strong>Consentimento:</strong> Você garante ter o consentimento legal de todos os
                    destinatários antes de enviar mensagens.
                  </li>
                  <li>
                    <strong>Disponibilidade:</strong> Não garantimos disponibilidade 100% do serviço.
                    Manutenções e falhas podem ocorrer.
                  </li>
                  <li>
                    <strong>Integração com WhatsApp:</strong> Somos uma plataforma independente e não
                    oficial. Não temos vínculos com o WhatsApp Inc.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 5. Proteção de Dados */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Lock className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle>5. Proteção de Dados e Privacidade</CardTitle>
                  <CardDescription>Conformidade com LGPD</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p>Em conformidade com a Lei Geral de Proteção de Dados (LGPD):</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Coletamos apenas dados necessários para o funcionamento do serviço</li>
                <li>Seus dados são armazenados de forma segura e criptografada</li>
                <li>Não compartilhamos seus dados com terceiros sem consentimento</li>
                <li>Você pode solicitar a exclusão de seus dados a qualquer momento</li>
                <li>Implementamos medidas de segurança técnicas e administrativas</li>
                <li>Você é responsável pela proteção dos dados de seus contatos</li>
              </ul>
            </CardContent>
          </Card>

          {/* 6. Planos e Pagamentos */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <CardTitle>6. Planos, Créditos e Pagamentos</CardTitle>
                  <CardDescription>Políticas financeiras</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Os planos são válidos pelo período contratado</li>
                <li>Créditos não utilizados expiram junto com o plano</li>
                <li>Reembolsos são analisados caso a caso</li>
                <li>Pagamentos são processados via Mercado Pago</li>
                <li>Suspensão por falta de pagamento pode ocorrer</li>
                <li>Upgrades e downgrades seguem regras específicas</li>
              </ul>
            </CardContent>
          </Card>

          {/* 7. Penalidades e Suspensão */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Ban className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <CardTitle>7. Penalidades e Suspensão de Conta</CardTitle>
                  <CardDescription>Consequências do uso inadequado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p className="font-semibold text-red-400">
                Reservamos o direito de suspender ou encerrar contas que:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violem estes Termos de Uso</li>
                <li>Pratiquem atividades ilegais ou antiéticas</li>
                <li>Abusem do sistema ou prejudiquem outros usuários</li>
                <li>Forneçam informações falsas ou fraudulentas</li>
                <li>Violem as políticas do WhatsApp</li>
              </ul>
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mt-4">
                <p className="text-sm">
                  <strong className="text-red-400">Aviso:</strong> Suspensões e banimentos são definitivos
                  e não geram direito a reembolso. A plataforma se reserva o direito de tomar ações legais
                  em casos graves.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 8. Modificações dos Termos */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <CardTitle>8. Modificações dos Termos</CardTitle>
                  <CardDescription>Atualizações e alterações</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p>
                Podemos modificar estes termos a qualquer momento. Alterações significativas serão
                comunicadas por e-mail ou notificação no sistema. O uso continuado após as alterações
                constitui aceitação dos novos termos.
              </p>
            </CardContent>
          </Card>

          {/* 9. Lei Aplicável */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <Scale className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <CardTitle>9. Lei Aplicável e Foro</CardTitle>
                  <CardDescription>Jurisdição legal</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p>
                Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
                será resolvida no foro da comarca da sede da empresa, com exclusão de qualquer outro,
                por mais privilegiado que seja.
              </p>
            </CardContent>
          </Card>

          {/* 10. Contato */}
          <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-bold text-lg mb-2">Dúvidas sobre os Termos?</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Entre em contato através do suporte técnico na plataforma
                </p>
                <Badge variant="outline" className="text-primary border-primary/50">
                  Disponível 24/7
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <Separator className="my-8 bg-slate-800" />
        <div className="text-center text-slate-500 text-sm space-y-4">
          <p>Ao utilizar esta plataforma, você declara ter lido e concordado com estes Termos de Uso.</p>
          <p className="mt-2">Documento válido a partir de {lastUpdate}</p>

          {/* Back to Dashboard Button */}
          <div className="pt-6">
            <Link href="/dashboard">
              <Button className="gap-2" size="lg">
                <Home className="h-5 w-5" />
                Voltar ao Sistema
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
