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
      <Card className="max-w-md w-full">
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
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm">
              Seu plano foi atualizado e os créditos foram adicionados à sua conta.
            </p>
            <p className="text-sm mt-2 text-muted-foreground">
              Você já pode começar a usar os recursos do seu novo plano!
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                Ir para Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/plans">
                Ver Planos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
