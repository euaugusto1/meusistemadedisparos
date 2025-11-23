'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Sparkles, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
      toast.error('Erro ao enviar email', {
        description: error.message
      })
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    toast.success('Email enviado!', {
      description: 'Verifique sua caixa de entrada para redefinir sua senha.'
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>

              {/* Logo container */}
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700">
                <Mail className="h-12 w-12 stroke-blue-400" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Brand name with gradient */}
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Recuperar Senha
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Digite seu email para receber o link de recuperação
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Link de Recuperação
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <Mail className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-400">
                  Email enviado com sucesso! Verifique sua caixa de entrada e spam.
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                }}
              >
                Enviar novamente
              </Button>
            </div>
          )}

          <div className="mt-6 text-center space-y-2">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
