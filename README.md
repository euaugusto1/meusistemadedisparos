# 🚀 WhatsApp SaaS - Sistema de Disparos em Massa

Sistema completo de automação e disparo de mensagens WhatsApp com agendamento inteligente e integração de pagamentos.

## 🎯 Principais Recursos

- ✅ Autenticação e Dashboard (Supabase)
- ✅ Instâncias WhatsApp (UAZAPI)
- ✅ Campanhas com disparo em massa
- ✅ **Agendamento inteligente** (integração n8n)
- ✅ Listas de contatos e templates
- ✅ Sistema de planos e créditos
- ✅ Pagamentos (Mercado Pago)

## 🛠️ Stack

Next.js 14 • TypeScript • Supabase • Mercado Pago • UAZAPI • Tailwind CSS

## 🚀 Quick Start

```bash
# 1. Instalar
npm install

# 2. Configurar .env.local
# (Supabase, Mercado Pago, UAZAPI)

# 3. Aplicar migration
# Supabase Dashboard > SQL Editor
# Execute: supabase/migrations/20250122_add_smart_scheduling.sql

# 4. Rodar
npm run dev
```

Acesse: **http://localhost:3000**

## 🔗 Integração n8n

### Endpoints para processamento automático de campanhas:

**Buscar campanhas agendadas:**

```
GET /api/n8n/scheduled-campaigns
```

**Atualizar status:**

```
POST /api/n8n/update-message-status
```

Ver documentação completa em: **temp/docs/**

## 📁 Estrutura

```
zero/
├── src/
│   ├── app/              # Pages (App Router)
│   ├── components/       # Componentes React
│   ├── lib/              # Utilities
│   └── services/         # API calls
├── supabase/
│   └── migrations/       # SQL migrations
├── temp/
│   ├── docs/            # Documentação completa
│   ├── scripts/         # Scripts utilitários
│   └── sql-old/         # SQL scripts antigos
└── public/              # Assets estáticos
```

## 📚 Documentação Completa

Toda documentação está organizada em **[temp/docs/](temp/docs/)**:

- Setup e configuração
- Integrações (n8n, Mercado Pago)
- Webhooks e segurança
- Workflows completos

---

**Desenvolvido com Next.js 14 e Supabase**
