import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentSuccess() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative group max-w-md w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
        <Card className="relative border-2 border-green-500/50 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-full">
                  <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Pagamento Aprovado!
            </CardTitle>
            <CardDescription className="text-base">
              Seu pagamento foi processado com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 p-4 rounded-xl text-center">
              <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                Seu plano foi atualizado e os créditos foram adicionados à sua conta.
              </p>
              <p className="text-sm mt-2 text-green-700 dark:text-green-300">
                Você já pode começar a usar os recursos do seu novo plano!
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                <Link href="/dashboard">
                  Ir para Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-md">
                <Link href="/plans">
                  Ver Planos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
