/**
 * OpenAPI Path Definitions - Campaigns
 *
 * Endpoints for campaign management
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const campaignsPaths: PathsObject = {
  '/api/campaigns/{id}/pause': {
    post: {
      tags: ['Campaigns'],
      summary: 'Pausar campanha',
      description: `
Pausa uma campanha em execução.

**Comportamento**:
- Campanhas pausadas mantêm seu progresso atual
- Mensagens já enviadas não são afetadas
- Use o endpoint /resume para retomar

**Estados válidos para pausar**:
- \`processing\` → \`paused\`
- \`scheduled\` → \`paused\`
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da campanha',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Campanha pausada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Campaign paused successfully' },
                  campaign: { $ref: '#/components/schemas/Campaign' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Campanha não pode ser pausada (estado inválido)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Campaign cannot be paused in current state' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/campaigns/{id}/resume': {
    post: {
      tags: ['Campaigns'],
      summary: 'Retomar campanha pausada',
      description: `
Retoma uma campanha que foi pausada.

**Comportamento**:
- Continua do ponto onde parou
- Mensagens pendentes serão processadas
- Respeita configurações de delay entre mensagens

**Estados válidos para retomar**:
- \`paused\` → \`processing\`
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da campanha',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Campanha retomada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Campaign resumed successfully' },
                  campaign: { $ref: '#/components/schemas/Campaign' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Campanha não pode ser retomada (estado inválido)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Campaign cannot be resumed in current state' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/campaigns/{id}/cancel': {
    post: {
      tags: ['Campaigns'],
      summary: 'Cancelar campanha',
      description: `
Cancela uma campanha permanentemente.

**Comportamento**:
- Ação irreversível
- Mensagens já enviadas não são afetadas
- Mensagens pendentes não serão enviadas
- Créditos não utilizados serão restaurados

**Estados válidos para cancelar**:
- \`draft\` → \`cancelled\`
- \`scheduled\` → \`cancelled\`
- \`processing\` → \`cancelled\`
- \`paused\` → \`cancelled\`
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da campanha',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Campanha cancelada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Campaign cancelled successfully' },
                  campaign: { $ref: '#/components/schemas/Campaign' },
                  creditsRestored: { type: 'integer', description: 'Créditos restaurados', example: 150 }
                }
              }
            }
          }
        },
        '400': {
          description: 'Campanha não pode ser cancelada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Campaign cannot be cancelled in current state' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/campaigns/{id}/suggest-time': {
    post: {
      tags: ['Campaigns'],
      summary: 'Sugerir melhor horário para envio',
      description: `
Usa IA para sugerir o melhor horário de envio da campanha.

**Fatores considerados**:
- Histórico de taxas de abertura
- Tipo de público-alvo
- Dia da semana
- Fuso horário dos destinatários

**Retorno**:
- Lista de horários sugeridos com pontuação de confiança
- Justificativa da recomendação
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da campanha',
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
                timezone: {
                  type: 'string',
                  description: 'Fuso horário para sugestões',
                  example: 'America/Sao_Paulo'
                },
                preferredDays: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Dias preferidos da semana',
                  example: ['monday', 'tuesday', 'wednesday']
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Sugestões de horário geradas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        datetime: { type: 'string', format: 'date-time' },
                        score: { type: 'number', minimum: 0, maximum: 100 },
                        reason: { type: 'string' }
                      }
                    }
                  },
                  bestTime: { type: 'string', format: 'date-time' }
                }
              },
              example: {
                success: true,
                suggestions: [
                  {
                    datetime: '2025-11-26T10:00:00-03:00',
                    score: 95,
                    reason: 'Horário comercial com alta taxa de abertura histórica'
                  },
                  {
                    datetime: '2025-11-26T14:30:00-03:00',
                    score: 87,
                    reason: 'Pós-almoço, bom engajamento em campanhas similares'
                  }
                ],
                bestTime: '2025-11-26T10:00:00-03:00'
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
