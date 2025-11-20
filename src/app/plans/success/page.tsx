import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentSuccessPage({
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
      <Card className="border-green-500">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Pagamento Aprovado!</CardTitle>
          <CardDescription>
            Seu pagamento foi processado com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm">
              Seus créditos serão adicionados automaticamente em instantes.
            </p>
            <p className="text-sm">
              Você receberá um e-mail de confirmação com os detalhes da sua compra.
            </p>
            {searchParams.payment_id && (
              <p className="text-xs text-muted-foreground mt-4">
                ID do Pagamento: {searchParams.payment_id}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">Ir para Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/plans">Ver Planos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
