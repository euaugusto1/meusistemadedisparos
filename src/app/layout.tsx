import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'WhatsApp SaaS - Automação de Mensagens',
  description: 'Sistema de automação e disparo de mensagens WhatsApp',
}

// Script para aplicar o tema antes do React hidratar (evita flash)
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme-variant') || 'neutral';
    var themes = {
      ocean: { primary: '14 165 233', from: '6 182 212', via: '37 99 235', to: '79 70 229' },
      sunset: { primary: '249 115 22', from: '249 115 22', via: '239 68 68', to: '219 39 119' },
      forest: { primary: '16 185 129', from: '16 185 129', via: '22 163 74', to: '13 148 136' },
      galaxy: { primary: '168 85 247', from: '168 85 247', via: '124 58 237', to: '192 38 211' },
      aurora: { primary: '6 182 212', from: '34 211 238', via: '59 130 246', to: '147 51 234' },
      christmas: { primary: '220 38 38', from: '220 38 38', via: '22 163 74', to: '220 38 38' },
      neutral: { primary: '107 114 128', from: '71 85 105', via: '75 85 99', to: '82 82 91' },
      minimal: { primary: '24 24 27', from: '24 24 27', via: '38 38 38', to: '28 25 23' }
    };
    var t = themes[theme] || themes.neutral;
    var r = document.documentElement;
    r.style.setProperty('--theme-primary', t.primary);
    r.style.setProperty('--theme-primary-foreground', '255 255 255');
    r.style.setProperty('--theme-gradient-from', t.from);
    r.style.setProperty('--theme-gradient-via', t.via);
    r.style.setProperty('--theme-gradient-to', t.to);
    r.style.setProperty('--primary', t.primary);
    r.style.setProperty('--primary-foreground', '255 255 255');
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors expand={false} />
      </body>
    </html>
  )
}
