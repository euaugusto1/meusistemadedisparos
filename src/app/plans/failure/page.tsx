import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentFailurePage({
  searchParams,
}: {
  searchParams: { payment_id?: string; preference_id?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card className="border-destructive">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Pagamento Não Aprovado</CardTitle>
          <CardDescription>
            Não foi possível processar seu pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm">
              Seu pagamento não foi aprovado. Isso pode ter ocorrido por diversos motivos:
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 ml-2">
              <li>Saldo insuficiente</li>
              <li>Dados do cartão incorretos</li>
              <li>Cartão bloqueado ou expirado</li>
              <li>Limite de crédito excedido</li>
            </ul>
            <p className="text-sm mt-4">
              Você pode tentar novamente com outro método de pagamento.
            </p>
            {searchParams.payment_id && (
              <p className="text-xs text-muted-foreground mt-4">
                ID do Pagamento: {searchParams.payment_id}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/plans">Tentar Novamente</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Voltar ao Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
