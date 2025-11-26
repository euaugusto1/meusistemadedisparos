/**
 * OpenAPI Path Definitions - Admin API Tokens
 *
 * Endpoints for managing API tokens (admin only)
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const adminTokensPaths: PathsObject = {
  '/api/admin/tokens/generate': {
    post: {
      tags: ['Admin'],
      summary: 'Gerar novo token de API',
      description: `
Gera um novo token de API para autenticação em integrações externas.

**Importante**:
- O token completo será exibido apenas uma vez na resposta
- Salve o token imediatamente, pois não será possível recuperá-lo depois
- Tokens têm o formato: \`wpp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\`
- Requer permissão de administrador

**Casos de uso**:
- Integração com sistemas externos (CRM, ERP, etc)
- Automações via N8N ou Zapier
- Scripts e ferramentas de linha de comando
      `,
      security: [{ SupabaseAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  minLength: 3,
                  maxLength: 100,
                  description: 'Nome descritivo do token (ex: "Integração CRM", "Script de backup")',
                  example: 'Integração N8N - Produção'
                },
                description: {
                  type: 'string',
                  maxLength: 500,
                  nullable: true,
                  description: 'Descrição opcional com mais detalhes sobre o uso do token',
                  example: 'Token usado para automações de campanhas via N8N workflow'
                },
                expiresInDays: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 365,
                  nullable: true,
                  description: 'Número de dias até o token expirar. Omitir para token sem expiração.',
                  example: 90
                },
                scopes: {
                  type: 'array',
                  items: { type: 'string' },
                  default: [],
                  description: 'Array de escopos de permissão (ex: ["campaigns:read", "campaigns:write"])',
                  example: ['campaigns:read', 'campaigns:write', 'instances:read']
                }
              }
            },
            examples: {
              'Token permanente': {
                value: {
                  name: 'Integração Principal',
                  description: 'Token para sistema principal de automação',
                  scopes: ['*']
                }
              },
              'Token com expiração': {
                value: {
                  name: 'Token de Teste',
                  description: 'Token temporário para testes',
                  expiresInDays: 30,
                  scopes: ['campaigns:read']
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Token criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['success', 'message', 'token', 'tokenString', 'warning'],
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'API token generated successfully' },
                  token: {
                    $ref: '#/components/schemas/ApiToken',
                    description: 'Dados do token (com valor parcialmente oculto)'
                  },
                  tokenString: {
                    type: 'string',
                    pattern: '^wpp_',
                    description: 'Valor completo do token (exibido apenas uma vez!)',
                    example: 'wpp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4'
                  },
                  warning: {
                    type: 'string',
                    example: "Save this token now. You won't be able to see it again!"
                  }
                }
              },
              example: {
                success: true,
                message: 'API token generated successfully',
                token: {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  user_id: '987f6543-e21a-12d3-a456-426614174000',
                  token: 'wpp_a1b2c3d4************',
                  name: 'Integração N8N - Produção',
                  description: 'Token usado para automações de campanhas via N8N workflow',
                  scopes: ['campaigns:read', 'campaigns:write'],
                  expires_at: '2025-02-23T00:00:00Z',
                  last_used_at: null,
                  is_active: true,
                  created_at: '2025-11-25T00:00:00Z',
                  updated_at: '2025-11-25T00:00:00Z'
                },
                tokenString: 'wpp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4',
                warning: "Save this token now. You won't be able to see it again!"
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': {
              schema: { type: 'integer' },
              description: 'Limite de requisições'
            },
            'X-RateLimit-Remaining': {
              schema: { type: 'integer' },
              description: 'Requisições restantes'
            },
            'X-RateLimit-Reset': {
              schema: { type: 'integer' },
              description: 'Timestamp de reset'
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          $ref: '#/components/responses/ForbiddenError'
        },
        '429': {
          $ref: '#/components/responses/RateLimitError'
        },
        '500': {
          $ref: '#/components/responses/ServerError'
        }
      }
    }
  },

  '/api/admin/tokens': {
    get: {
      tags: ['Admin'],
      summary: 'Listar tokens de API do administrador',
      description: `
Retorna a lista de todos os tokens de API criados pelo administrador autenticado.

**Segurança**:
- Tokens são sanitizados na resposta (apenas primeiros 12 caracteres visíveis)
- Valores completos nunca são retornados após a criação
- Apenas o criador do token pode visualizá-lo

**Filtros disponíveis**:
- \`include_inactive=true\` - Incluir tokens inativos e expirados
      `,
      security: [{ SupabaseAuth: [] }],
      parameters: [
        {
          name: 'include_inactive',
          in: 'query',
          description: 'Incluir tokens inativos e expirados na listagem',
          required: false,
          schema: {
            type: 'boolean',
            default: false
          }
        }
      ],
      responses: {
        '200': {
          description: 'Lista de tokens retornada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['success', 'tokens', 'count'],
                properties: {
                  success: { type: 'boolean', example: true },
                  tokens: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ApiToken'
                    },
                    description: 'Array de tokens (valores parcialmente ocultos)'
                  },
                  count: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Quantidade total de tokens retornados',
                    example: 3
                  }
                }
              },
              example: {
                success: true,
                tokens: [
                  {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    user_id: '987f6543-e21a-12d3-a456-426614174000',
                    token: 'wpp_a1b2c3d4************************************',
                    name: 'Integração N8N - Produção',
                    description: 'Token usado para automações',
                    scopes: ['campaigns:read', 'campaigns:write'],
                    expires_at: '2025-02-23T00:00:00Z',
                    last_used_at: '2025-11-24T15:30:00Z',
                    is_active: true,
                    created_at: '2025-11-25T00:00:00Z',
                    updated_at: '2025-11-25T00:00:00Z'
                  },
                  {
                    id: '456e7890-e12b-34d5-a678-901234567000',
                    user_id: '987f6543-e21a-12d3-a456-426614174000',
                    token: 'wpp_x9y8z7w6************************************',
                    name: 'Script de Backup',
                    description: null,
                    scopes: ['*'],
                    expires_at: null,
                    last_used_at: null,
                    is_active: true,
                    created_at: '2025-11-20T00:00:00Z',
                    updated_at: '2025-11-20T00:00:00Z'
                  }
                ],
                count: 2
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': { schema: { type: 'integer' } },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
            'X-RateLimit-Reset': { schema: { type: 'integer' } }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          $ref: '#/components/responses/ForbiddenError'
        },
        '429': {
          $ref: '#/components/responses/RateLimitError'
        },
        '500': {
          $ref: '#/components/responses/ServerError'
        }
      }
    }
  },

  '/api/admin/tokens/{id}': {
    delete: {
      tags: ['Admin'],
      summary: 'Deletar token de API',
      description: `
Remove permanentemente um token de API.

**Segurança**:
- Apenas o criador do token pode deletá-lo
- A ação é irreversível
- Integrações usando este token deixarão de funcionar imediatamente

**Quando deletar**:
- Token foi comprometido ou vazado
- Integração não é mais necessária
- Token de teste após finalizar testes
      `,
      security: [{ SupabaseAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do token a ser deletado (UUID)',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          example: '550e8400-e29b-41d4-a716-446655440000'
        }
      ],
      responses: {
        '200': {
          description: 'Token deletado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['success', 'message'],
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'API token deleted successfully' }
                }
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': { schema: { type: 'integer' } },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
            'X-RateLimit-Reset': { schema: { type: 'integer' } }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          description: 'Acesso negado. Você só pode deletar seus próprios tokens.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: 'Forbidden: You can only delete your own tokens'
              }
            }
          }
        },
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '429': {
          $ref: '#/components/responses/RateLimitError'
        },
        '500': {
          $ref: '#/components/responses/ServerError'
        }
      }
    },

    patch: {
      tags: ['Admin'],
      summary: 'Atualizar token de API',
      description: `
Atualiza informações de um token de API existente.

**Campos editáveis**:
- Nome e descrição
- Status ativo/inativo
- Escopos de permissão

**Campos NÃO editáveis**:
- Valor do token (imutável)
- Data de criação
- ID do usuário proprietário
      `,
      security: [{ SupabaseAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do token a ser atualizado (UUID)',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          example: '550e8400-e29b-41d4-a716-446655440000'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 3,
                  maxLength: 100,
                  description: 'Novo nome do token',
                  example: 'Integração N8N - Atualizado'
                },
                description: {
                  type: 'string',
                  maxLength: 500,
                  nullable: true,
                  description: 'Nova descrição',
                  example: 'Descrição atualizada do token'
                },
                is_active: {
                  type: 'boolean',
                  description: 'Ativar ou desativar o token',
                  example: false
                },
                scopes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Novos escopos de permissão',
                  example: ['campaigns:read']
                }
              }
            },
            examples: {
              'Desativar token': {
                value: {
                  is_active: false
                }
              },
              'Atualizar nome e descrição': {
                value: {
                  name: 'Integração CRM v2',
                  description: 'Token atualizado para nova versão do CRM'
                }
              },
              'Reduzir permissões': {
                value: {
                  scopes: ['campaigns:read']
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Token atualizado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['success', 'message', 'token'],
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'API token updated successfully' },
                  token: {
                    $ref: '#/components/schemas/ApiToken',
                    description: 'Token atualizado (valor parcialmente oculto)'
                  }
                }
              },
              example: {
                success: true,
                message: 'API token updated successfully',
                token: {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  user_id: '987f6543-e21a-12d3-a456-426614174000',
                  token: 'wpp_a1b2c3d4************************************',
                  name: 'Integração N8N - Atualizado',
                  description: 'Descrição atualizada',
                  scopes: ['campaigns:read'],
                  expires_at: '2025-02-23T00:00:00Z',
                  last_used_at: '2025-11-24T15:30:00Z',
                  is_active: false,
                  created_at: '2025-11-25T00:00:00Z',
                  updated_at: '2025-11-25T12:00:00Z'
                }
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': { schema: { type: 'integer' } },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
            'X-RateLimit-Reset': { schema: { type: 'integer' } }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          description: 'Acesso negado. Você só pode atualizar seus próprios tokens.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: 'Forbidden: You can only update your own tokens'
              }
            }
          }
        },
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '429': {
          $ref: '#/components/responses/RateLimitError'
        },
        '500': {
          $ref: '#/components/responses/ServerError'
        }
      }
    }
  }
}
