import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentFailure() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative group max-w-md w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
        <Card className="relative border-2 border-red-500/50 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-br from-red-500 to-orange-600 p-4 rounded-full">
                  <XCircle className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Pagamento Não Aprovado
            </CardTitle>
            <CardDescription className="text-base">
              Não foi possível processar seu pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-center">
              <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                Houve um problema ao processar seu pagamento.
              </p>
              <p className="text-sm mt-2 text-red-700 dark:text-red-300">
                Por favor, verifique seus dados de pagamento e tente novamente.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                <Link href="/plans">
                  Tentar Novamente
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-md">
                <Link href="/dashboard">
                  Voltar ao Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
