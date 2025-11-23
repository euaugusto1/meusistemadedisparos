'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, Loader2, MessageSquare, Zap, Shield, ArrowRight, Mail, Lock, CheckCircle2, Eye, EyeOff, Calendar, BarChart3, Library, FileText } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleSignUp = async () => {
    // Validar aceite dos termos
    if (!acceptedTerms) {
      setError('Você deve aceitar os Termos de Uso para criar uma conta.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectUrl}/auth/callback`,
        data: {
          full_name: email.split('@')[0]
        }
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Se usuário foi criado, registrar aceite dos termos
    if (data.user) {
      try {
        const response = await fetch('/api/terms/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          console.error('Failed to register terms acceptance')
        }
      } catch (err) {
        console.error('Error registering terms acceptance:', err)
      }
    }

    setError('Verifique seu email para confirmar o cadastro.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background with floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-2/3 left-1/4 w-2 h-2 bg-purple-400/30 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-pink-400/30 rounded-full animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}></div>

        {/* Moving gradients */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-500/5 to-transparent rounded-full blur-2xl animate-[float_6s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-l from-purple-500/5 to-transparent rounded-full blur-2xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-pink-500/3 via-transparent to-blue-500/3 rounded-full blur-3xl animate-[spin_20s_linear_infinite]"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen max-w-[1600px] mx-auto w-full">
        {/* Left side - Hero */}
        <div className={`flex-1 flex flex-col justify-center px-8 py-16 md:px-16 lg:px-20 xl:px-28 lg:py-0 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          {/* Logo - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block mb-12 animate-in fade-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/30 backdrop-blur-sm border border-slate-800/50 hover:border-slate-700/50 transition-all duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl blur-md opacity-60"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Araujo IA
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-xl space-y-6 md:space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              <span className="text-white">Automatize seu</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                WhatsApp
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-slate-300 leading-relaxed">
              Plataforma completa para gerenciar campanhas, templates personalizados, agendamentos inteligentes e análise de resultados em tempo real.
            </p>

            {/* Features Grid - 2x2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-2 md:pt-4">
              <div className="flex items-center gap-2 md:gap-3 text-slate-300">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                </div>
                <span className="text-xs md:text-sm">Disparos em Massa</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-slate-300">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                </div>
                <span className="text-xs md:text-sm">Agendamento de Envios</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-slate-300">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-pink-400" />
                </div>
                <span className="text-xs md:text-sm">Analytics Detalhado</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-slate-300">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <Library className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                </div>
                <span className="text-xs md:text-sm">Biblioteca Personalizada</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-slate-300">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                </div>
                <span className="text-xs md:text-sm">Templates Rápidos</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-slate-300">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
                </div>
                <span className="text-xs md:text-sm">100% Seguro</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 md:gap-8 pt-4 md:pt-8">
              <div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  10M+
                </div>
                <div className="text-xs md:text-sm text-slate-400">Mensagens enviadas</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  5K+
                </div>
                <div className="text-xs md:text-sm text-slate-400">Clientes ativos</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">
                  99.9%
                </div>
                <div className="text-xs md:text-sm text-slate-400">Uptime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className={`w-full lg:w-[540px] flex items-center justify-center px-8 py-12 md:px-12 md:py-16 lg:py-0 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
          <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl hover:border-slate-700 transition-all duration-300 my-auto">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Araujo IA
                </span>
              </div>

              {/* Toggle entre Login e Cadastro */}
              <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogin(true)
                    setError(null)
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                    showLogin
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogin(false)
                    setError(null)
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                    !showLogin
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Criar Conta
                </button>
              </div>

              <div className="text-center">
                <CardTitle className="text-2xl text-slate-100">
                  {showLogin ? 'Bem-vindo de volta!' : 'Comece gratuitamente'}
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-1">
                  {showLogin ? 'Entre com suas credenciais' : '50 créditos grátis + Sem cartão'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      required
                      className={`bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-4 pr-10 h-12 transition-all duration-200 ${
                        emailFocused ? 'ring-2 ring-blue-500/50 border-blue-500' : ''
                      }`}
                    />
                    {email && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 animate-in fade-in zoom-in duration-300" />
                    )}
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-400" />
                      Senha
                    </Label>
                    {showLogin && (
                      <button
                        type="button"
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push('/forgot-password')
                        }}
                      >
                        Esqueceu sua senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      required
                      className={`bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-4 pr-10 h-12 transition-all duration-200 ${
                        passwordFocused ? 'ring-2 ring-purple-500/50 border-purple-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {!showLogin && password && (
                    <div className="space-y-1 animate-in slide-in-from-top duration-300">
                      <div className="flex gap-1 h-1">
                        <div className={`flex-1 rounded-full ${password.length > 0 ? 'bg-red-500' : 'bg-slate-700'}`}></div>
                        <div className={`flex-1 rounded-full ${password.length > 5 ? 'bg-yellow-500' : 'bg-slate-700'}`}></div>
                        <div className={`flex-1 rounded-full ${password.length > 8 ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {password.length < 6 ? 'Senha fraca' : password.length < 9 ? 'Senha média' : 'Senha forte'}
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <Alert variant={error.includes('Verifique') ? 'default' : 'destructive'} className="animate-in slide-in-from-top duration-300">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Terms Acceptance Checkbox - Only for Sign Up */}
                {!showLogin && (
                  <div className="flex items-start space-x-3 p-4 border border-slate-700 rounded-lg bg-slate-800/50 animate-in slide-in-from-top duration-300">
                    <Checkbox
                      id="terms-landing"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="terms-landing"
                        className="text-sm text-slate-300 leading-relaxed cursor-pointer"
                      >
                        Li e aceito os{' '}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="text-blue-400 hover:text-blue-300 underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Termos de Uso
                        </Link>
                        {' '}da plataforma
                      </label>
                      <p className="text-xs text-slate-500 mt-1">
                        Obrigatório para criar uma nova conta
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  {showLogin ? (
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar na minha conta
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      onClick={handleSignUp}
                      disabled={loading || !acceptedTerms}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Criar minha conta grátis
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>

              {/* Benefits */}
              {!showLogin && (
                <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Incluído no plano grátis</p>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <span>50 créditos grátis para começar</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-blue-500" />
                    </div>
                    <span>Dados protegidos com criptografia</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-purple-500" />
                    </div>
                    <span>Suporte via ticket incluído</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="relative lg:absolute bottom-0 left-0 right-0 z-10 border-t border-slate-800/50 bg-slate-950/30 backdrop-blur-xl mt-8 lg:mt-0">
        <div className="max-w-[1600px] mx-auto px-8 py-4 md:px-12 md:py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-xs md:text-sm text-slate-400">
            <div className="text-center md:text-left">© 2025 Araujo IA. Todos os direitos reservados.</div>
            <div className="flex gap-4 md:gap-6">
              <a href="#" className="hover:text-slate-300 transition-colors">
                Termos
              </a>
              <a href="#" className="hover:text-slate-300 transition-colors">
                Privacidade
              </a>
              <a href="#" className="hover:text-slate-300 transition-colors">
                Suporte
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
