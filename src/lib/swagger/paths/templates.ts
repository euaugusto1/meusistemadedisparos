/**
 * OpenAPI Path Definitions - Templates
 *
 * Endpoints for message template management
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const templatesPaths: PathsObject = {
  '/api/templates': {
    get: {
      tags: ['Templates'],
      summary: 'Listar templates',
      description: `
Lista todos os templates de mensagens do usuário.

**Filtros disponíveis**:
- Por categoria
- Por tipo de mídia
- Por favoritos
- Por status (ativo/inativo)
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'category',
          in: 'query',
          description: 'Filtrar por categoria',
          schema: { type: 'string', example: 'promocional' }
        },
        {
          name: 'hasMedia',
          in: 'query',
          description: 'Filtrar por templates com mídia',
          schema: { type: 'boolean' }
        },
        {
          name: 'isFavorite',
          in: 'query',
          description: 'Apenas favoritos',
          schema: { type: 'boolean' }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Buscar por nome ou conteúdo',
          schema: { type: 'string' }
        },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de templates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  templates: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Template' }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer', example: 1 },
                      limit: { type: 'integer', example: 20 },
                      total: { type: 'integer', example: 45 },
                      totalPages: { type: 'integer', example: 3 }
                    }
                  }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    },

    post: {
      tags: ['Templates'],
      summary: 'Criar template',
      description: `
Cria um novo template de mensagem.

**Variáveis suportadas**:
- \`{{nome}}\` - Nome do contato
- \`{{telefone}}\` - Telefone do contato
- \`{{empresa}}\` - Nome da empresa
- \`{{data}}\` - Data atual
- Variáveis customizadas definidas na lista de contatos

**Tipos de mídia**:
- \`image\` - Imagens (JPG, PNG, GIF)
- \`video\` - Vídeos (MP4)
- \`audio\` - Áudios (MP3, OGG)
- \`document\` - Documentos (PDF, DOC, XLS)
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'content'],
              properties: {
                name: {
                  type: 'string',
                  minLength: 3,
                  maxLength: 100,
                  description: 'Nome do template',
                  example: 'Boas-vindas Cliente'
                },
                content: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 4096,
                  description: 'Conteúdo da mensagem (suporta variáveis)',
                  example: 'Olá {{nome}}! Seja bem-vindo à {{empresa}}. Estamos felizes em tê-lo conosco!'
                },
                category: {
                  type: 'string',
                  description: 'Categoria do template',
                  example: 'onboarding'
                },
                mediaUrl: {
                  type: 'string',
                  format: 'uri',
                  description: 'URL da mídia anexa'
                },
                mediaType: {
                  type: 'string',
                  enum: ['image', 'video', 'audio', 'document'],
                  description: 'Tipo de mídia'
                },
                isFavorite: {
                  type: 'boolean',
                  default: false,
                  description: 'Marcar como favorito'
                }
              }
            },
            examples: {
              'Texto simples': {
                value: {
                  name: 'Lembrete de Pagamento',
                  content: 'Olá {{nome}}, seu boleto vence em {{data_vencimento}}. Valor: R$ {{valor}}',
                  category: 'cobranca'
                }
              },
              'Com imagem': {
                value: {
                  name: 'Promoção Black Friday',
                  content: '🔥 {{nome}}, aproveite 50% OFF em toda a loja! Use o cupom: BLACKFRIDAY',
                  category: 'promocional',
                  mediaUrl: 'https://exemplo.com/promo.jpg',
                  mediaType: 'image',
                  isFavorite: true
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Template criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Template created successfully' },
                  template: { $ref: '#/components/schemas/Template' }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/templates/{id}': {
    get: {
      tags: ['Templates'],
      summary: 'Obter template por ID',
      description: 'Retorna os detalhes de um template específico.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do template',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Detalhes do template',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  template: { $ref: '#/components/schemas/Template' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    },

    put: {
      tags: ['Templates'],
      summary: 'Atualizar template',
      description: 'Atualiza um template existente.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do template',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 3, maxLength: 100 },
                content: { type: 'string', minLength: 1, maxLength: 4096 },
                category: { type: 'string' },
                mediaUrl: { type: 'string', format: 'uri', nullable: true },
                mediaType: { type: 'string', enum: ['image', 'video', 'audio', 'document'], nullable: true },
                isFavorite: { type: 'boolean' },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Template atualizado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Template updated successfully' },
                  template: { $ref: '#/components/schemas/Template' }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    },

    delete: {
      tags: ['Templates'],
      summary: 'Deletar template',
      description: `
Remove um template permanentemente.

**Atenção**: Templates em uso por campanhas ativas não podem ser deletados.
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do template',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Template deletado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Template deletado com sucesso' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Template em uso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Template em uso', message: 'Este template está sendo usado por campanhas ativas e não pode ser deletado' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/templates/{id}/duplicate': {
    post: {
      tags: ['Templates'],
      summary: 'Duplicar template',
      description: 'Cria uma cópia de um template existente.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do template a duplicar',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Nome do novo template (opcional)',
                  example: 'Boas-vindas Cliente (Cópia)'
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Template duplicado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Template duplicated successfully' },
                  template: { $ref: '#/components/schemas/Template' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  }
}
