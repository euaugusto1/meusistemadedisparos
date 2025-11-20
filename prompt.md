Prompt de Desenvolvimento: Micro SaaS de Automação WhatsApp (Next.js + Supabase + n8n)

Atue como um Arquiteto de Software Full-Stack Sênior e Especialista em DevOps (Docker/Coolify).
Seu objetivo é criar a estrutura completa de código, esquema de banco de dados e lógica de frontend para um sistema Micro SaaS focado em automação de WhatsApp.

1. Arquitetura do Sistema (Híbrida)

O sistema deve suportar dois modos de operação para flexibilidade total:

Modo Agendado (Server-Side via n8n): O usuário agenda uma campanha. O Frontend salva no banco com status pending. O n8n (Worker) monitora o banco via webhook/polling, processa a fila, respeita o delay configurado no backend e atualiza o status.

Modo Imediato (Client-Side via Painel): O usuário clica em "Enviar Agora". O navegador (Frontend) executa o loop de envio diretamente, conectando-se à API do UAZAPI e aplicando obrigatoriamente um delay aleatório (ex: 5-20s) entre requisições.

2. Stack Tecnológica

Frontend: Next.js 14+ (App Router), React, Tailwind CSS, Lucide React.

UI Kit: Shadcn/UI (obrigatório para todas as interfaces: tabelas, modais, forms).

Gráficos: Recharts (obrigatório para o Dashboard).

Database/Backend: Supabase (PostgreSQL, Auth, Storage, Realtime).

Motor de Envio: n8n (Workflow Automation) self-hosted.

API de WhatsApp: UAZAPI self-hosted.

Infraestrutura: VPS com Coolify em arquitetura ARM64.

3. Arquitetura de Usuários e Planos

Super Admin (God Mode):

Acesso total e irrestrito.

Possui permissão de CRUD total em todo o sistema (criar/editar/excluir usuários, mídias, contatos e instâncias de terceiros).

Usuário Padrão (Cliente):

Acesso isolado apenas aos seus próprios dados.

Uso condicionado à assinatura ativa.

Regras de Assinatura

Duração: Validade fixa de 30 dias a partir da ativação.

Expiração: Após o vencimento, o sistema bloqueia novos envios e agendamentos.

Níveis: Grátis, Bronze, Prata, Ouro.

4. Funcionalidades e Páginas

A. Dashboard Analítico

Deve ser rico visualmente. Incluir:

KPI Cards: Total Enviado, Falhas, Instâncias Conectadas, Créditos.

Destaque: Card com "Dias Restantes do Plano".

Gráficos (Recharts):

Área (Timeline de envios).

Rosca (Sucesso vs Falha).

Barras (Envios por dia da semana).

Radial (Consumo da cota).

B. Biblioteca de Mídia (Compartilhada Globalmente)

Repositório central de arquivos.

Regra de Visibilidade: Pública Interna (o Usuário A pode ver e usar mídias enviadas pelo Usuário B).

Regra de Exclusão: Restrita. Apenas o Super Admin pode excluir arquivos.

Interface: Upload drag-and-drop, Galeria (Grid/Lista), Copiar Link.

C. Gerenciamento de Templates

Criação de "Kits de Envio" reutilizáveis contendo:

Texto da mensagem.

Mídia selecionada da Biblioteca.

Configuração de botões interativos.

D. Gerenciamento de Listas

Importação de contatos (CSV, Texto) e sincronização de grupos do WhatsApp.

E. Agendamento e Disparo

A tela principal de operação:

Seleção de Fonte (Manual/CSV/Template).

Seleção de Mídia e Botões.

Bloqueio de Envio: Botão desabilitado se o plano estiver expirado.

Monitoramento: Barra de progresso em tempo real.

F. Minhas Campanhas (Histórico e Pendentes)

Tabela (Shadcn): Listagem de campanhas.

Abas: "Pendentes/Em Andamento" (permite cancelar) e "Concluídos" (permite ver relatório).

Status: Badges coloridos (Pending, Processing, Completed, Failed).

G. Módulo de Suporte

Helpdesk interno com chat ao vivo entre Cliente e Admin via Supabase Realtime.

H. Painel Administrativo (Área Restrita)

Gestão de Usuários, Instâncias Globais e Limpeza do Sistema.

5. Esquema do Banco de Dados (Supabase)

Crie o SQL otimizado com Row Level Security (RLS) rigoroso (Admin tem acesso total):

profiles

id (uuid), email, role (admin/user), plan_tier, plan_expires_at (timestamp), credits.

whatsapp_instances

id, user_id, name, token, status.

media_files

id, user_id, public_url, type.

RLS: Leitura pública para autenticados; Exclusão apenas para Admin.

message_templates (JSONB para botões).

campaigns

id, user_id, title, status (draft, scheduled, processing, completed, failed, cancelled), scheduled_for, created_at.

campaign_items (Fila de envio detalhada).

contacts_lists

support_tickets & support_messages

6. Requisitos de Lógica (Frontend & Backend)

Middleware de Validação de Plano:

Verificar plan_expires_at antes de qualquer ação de escrita crítica.

Service Layer (Integração UAZAPI):

Implementar chamadas fetch para:

POST /instance/init (Criar).

GET /instance/all (Listar).

GET /instance/status (Verificar).

POST /instance/disconnect (Desconectar).

DELETE /instance (Deletar).

Lógica de Disparo (Frontend):

Loop com delay aleatório (5-20s) e tratamento de erro (não parar o lote inteiro por um erro único).

Dashboard:

Hooks para agregação de dados dos gráficos.

7. Requisitos de Implantação (DevOps - ARM64)

O projeto será hospedado em uma VPS ARM64 usando Coolify.

Dockerização:

Crie um Dockerfile robusto usando Multi-Stage Build.

Use imagem base compatível com ARM (ex: node:20-alpine).

Configure para standalone output do Next.js.

Coolify: Forneça instruções básicas ou arquivo de configuração (nixpacks.toml se necessário).

8. Entregáveis Esperados

Gere a resposta nesta ordem:

Script SQL Completo: Todas as tabelas, Enums, Índices e Policies RLS.

Estrutura de Pastas: Organização do projeto Next.js.

Services (TypeScript): Código para services/uazapi.ts e services/campaigns.ts.

Componentes React Chave:

DashboardCharts.tsx (com Recharts).

MediaGallery.tsx (com lógica de delete restrita).

CampaignDispatcher.tsx (lógica de envio).

Dockerfile: Otimizado para produção em ARM64.