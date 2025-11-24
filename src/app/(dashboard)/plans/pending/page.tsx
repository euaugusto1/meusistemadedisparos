import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentPending() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative group max-w-md w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
        <Card className="relative border-2 border-yellow-500/50 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-yellow-500 to-orange-600 p-4 rounded-full">
                  <Clock className="h-16 w-16 text-white animate-pulse" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Pagamento Pendente
            </CardTitle>
            <CardDescription className="text-base">
              Seu pagamento está sendo processado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl text-center">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Estamos aguardando a confirmação do pagamento.
              </p>
              <p className="text-sm mt-2 text-yellow-700 dark:text-yellow-300">
                Você receberá uma notificação assim que o pagamento for confirmado.
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
