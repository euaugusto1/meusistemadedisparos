/**
 * OpenAPI 3.0 Configuration
 *
 * Base configuration for Swagger/OpenAPI documentation
 */

import { OpenAPIObject } from 'openapi3-ts/oas30'

const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dev.wpp.sistemabrasil.online'

export const openApiConfig: OpenAPIObject = {
  openapi: '3.0.0',
  info: {
    title: 'Araujo IA API',
    version: '1.0.0',
    description: `
# Araujo IA - API Documentation

API completa para automação de disparos em massa via WhatsApp.

## Recursos Principais

- **Campanhas**: Criar, agendar e gerenciar campanhas de mensagens em massa
- **Instâncias WhatsApp**: Conectar e gerenciar múltiplas instâncias WhatsApp
- **Templates**: Biblioteca de templates de mensagens reutilizáveis
- **Listas de Contatos**: Organizar e gerenciar seus contatos
- **Agendamento Inteligente**: Agendar envios com recorrência e otimização por IA
- **Analytics**: Métricas e relatórios detalhados de campanhas
- **Webhooks**: Receber notificações de eventos em tempo real

## Autenticação

Esta API suporta três métodos de autenticação:

### 1. Supabase Session (Cookie-based)
Para uso na aplicação web. Autenticação via sessão do Supabase.

### 2. Admin API Token
Para integrações externas. Gere tokens na interface admin.

\`\`\`http
Authorization: Bearer wpp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

### 3. N8N API Key
Para integração com N8N (automações).

\`\`\`http
Authorization: Bearer <N8N_API_KEY>
\`\`\`

## Rate Limiting

| Tier | Limite | Janela |
|------|--------|---------|
| PUBLIC | 100 requisições | 15 minutos |
| AUTH | 5 requisições | 15 minutos |
| PAYMENT | 10 requisições | 1 hora |
| DISPATCH | 50 requisições | 1 minuto |
| ADMIN | 200 requisições | 15 minutos |

## Erros Comuns

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido ou ausente |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |
    `
  },
  servers: [
    {
      url: NEXT_PUBLIC_APP_URL,
      description: 'Servidor de Produção'
    },
    {
      url: 'http://localhost:3000',
      description: 'Servidor de Desenvolvimento'
    }
  ],
  tags: [
    {
      name: 'Campaigns',
      description: 'Gerenciamento de campanhas de mensagens'
    },
    {
      name: 'Instances',
      description: 'Gerenciamento de instâncias WhatsApp'
    },
    {
      name: 'Templates',
      description: 'Templates de mensagens reutilizáveis'
    },
    {
      name: 'Contacts',
      description: 'Listas e gerenciamento de contatos'
    },
    {
      name: 'Media',
      description: 'Biblioteca de mídia (imagens, vídeos, etc)'
    },
    {
      name: 'Admin',
      description: 'Operações administrativas (requer permissão admin)'
    },
    {
      name: 'Analytics',
      description: 'Métricas e relatórios de campanhas'
    },
    {
      name: 'Payments',
      description: 'Processamento de pagamentos e planos'
    },
    {
      name: 'Webhooks',
      description: 'Recebimento de webhooks externos'
    },
    {
      name: 'N8N',
      description: 'Endpoints para integração com N8N (automação)'
    },
    {
      name: 'System',
      description: 'Endpoints de sistema (health check, cron, etc)'
    },
    {
      name: 'Messages',
      description: 'Envio de mensagens individuais'
    }
  ],
  components: {
    securitySchemes: {
      SupabaseAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Autenticação via sessão do Supabase (cookie-based). Obtido após login na aplicação web.'
      },
      AdminToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        description: 'Token de API admin gerado na interface de administração. Formato: `wpp_xxxxx...`'
      },
      N8nAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Chave de API N8N para integração com workflows de automação. Definida via variável de ambiente `N8N_API_KEY`.'
      }
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'string',
            description: 'Mensagem de erro',
            example: 'Não autorizado'
          },
          message: {
            type: 'string',
            description: 'Descrição do erro',
            example: 'Token de API inválido ou ausente'
          },
          hint: {
            type: 'string',
            description: 'Dica para resolver o problema',
            example: 'Use Bearer token no header Authorization'
          }
        }
      },
      SuccessMessage: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operação realizada com sucesso'
          }
        }
      },
      PaginationParams: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Número da página'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Quantidade de itens por página'
          }
        }
      },
      // Will be extended by path-specific schemas
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Número da página',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Quantidade de itens por página',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Token de autenticação inválido ou ausente',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Não autorizado',
              message: 'Token de API inválido ou ausente',
              hint: 'Use Bearer token (N8N_API_KEY), API token (wpp_xxx), ou faça login na aplicação'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Sem permissão para acessar este recurso',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Acesso negado',
              message: 'Você não tem permissão para acessar este recurso',
              hint: 'Esta operação requer permissão de administrador'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Recurso não encontrado',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Não encontrado',
              message: 'O recurso solicitado não existe ou foi removido'
            }
          }
        }
      },
      ValidationError: {
        description: 'Erro de validação nos dados enviados',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Erro de validação'
                },
                message: {
                  type: 'string',
                  example: 'Os dados enviados são inválidos'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        example: 'email'
                      },
                      message: {
                        type: 'string',
                        example: 'Formato de email inválido'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      RateLimitError: {
        description: 'Limite de requisições excedido',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Limite excedido',
              message: 'Você excedeu o limite de requisições permitidas',
              hint: 'Aguarde alguns minutos antes de tentar novamente'
            }
          }
        },
        headers: {
          'X-RateLimit-Limit': {
            schema: {
              type: 'integer'
            },
            description: 'Limite total de requisições'
          },
          'X-RateLimit-Remaining': {
            schema: {
              type: 'integer'
            },
            description: 'Requisições restantes'
          },
          'X-RateLimit-Reset': {
            schema: {
              type: 'integer'
            },
            description: 'Timestamp Unix quando o limite será resetado'
          }
        }
      },
      ServerError: {
        description: 'Erro interno do servidor',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Erro interno',
              message: 'Ocorreu um erro inesperado no servidor',
              hint: 'Tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.'
            }
          }
        }
      }
    }
  },
  paths: {
    // Paths will be added from individual path files
  }
}
