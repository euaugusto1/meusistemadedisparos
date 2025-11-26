'use client'

export function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>&copy; {currentYear}</span>
          <span className="font-medium text-foreground/80">Araujo IA Solutions</span>
          <span>- Todos os direitos reservados</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Versão</span>
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {version}
          </span>
        </div>
      </div>
    </footer>
  )
}
