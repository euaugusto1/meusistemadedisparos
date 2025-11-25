/**
 * OpenAPI Path Definitions - Campaigns
 *
 * Endpoints for campaign management
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const campaignsPaths: PathsObject = {
  '/api/campaigns': {
    get: {
      tags: ['Campaigns'],
      summary: 'Listar campanhas',
      description: `
Lista todas as campanhas do usuário autenticado.

**Filtros disponíveis**:
- \`status\`: Filtrar por status da campanha
- \`search\`: Buscar por título
- \`limit\`: Limitar número de resultados
- \`offset\`: Paginação

**Ordenação**:
- Por padrão, ordena por data de criação (mais recente primeiro)
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          description: 'Filtrar por status',
          required: false,
          schema: {
            type: 'string',
            enum: ['draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'paused']
          }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Buscar por título da campanha',
          required: false,
          schema: { type: 'string' }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Número máximo de resultados',
          required: false,
          schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 }
        },
        {
          name: 'offset',
          in: 'query',
          description: 'Offset para paginação',
          required: false,
          schema: { type: 'integer', default: 0, minimum: 0 }
        }
      ],
      responses: {
        '200': {
          description: 'Lista de campanhas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  count: { type: 'integer', description: 'Total de campanhas encontradas' },
                  campaigns: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Campaign' }
                  }
                }
              },
              example: {
                success: true,
                count: 3,
                campaigns: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    title: 'Black Friday 2025',
                    status: 'scheduled',
                    schedule_type: 'scheduled',
                    scheduled_at: '2025-11-29T10:00:00Z',
                    total_recipients: 1500,
                    sent_count: 0,
                    failed_count: 0,
                    created_at: '2025-11-25T14:30:00Z'
                  }
                ]
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/campaigns/scheduled': {
    get: {
      tags: ['Campaigns'],
      summary: 'Listar campanhas agendadas',
      description: `
Lista todas as campanhas com status \`scheduled\` que estão prontas para processamento.

**Retorno**:
- Campanhas com status \`scheduled\`
- Inclui informações da instância WhatsApp associada
- Inclui lista de destinatários pendentes
- Inclui mídia (se houver)

**Uso típico**:
- Endpoint usado pelo N8N para buscar campanhas prontas para disparo
- Verifica se a instância está conectada e com token válido
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      responses: {
        '200': {
          description: 'Lista de campanhas agendadas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  count: { type: 'integer', description: 'Total de campanhas agendadas' },
                  campaigns: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        campaignId: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        status: { type: 'string', enum: ['scheduled'] },
                        scheduledAt: { type: 'string', format: 'date-time', nullable: true },
                        scheduleType: { type: 'string', enum: ['immediate', 'scheduled', 'recurring', 'smart'] },
                        instance: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            instanceKey: { type: 'string' },
                            phoneNumber: { type: 'string', nullable: true },
                            apiToken: { type: 'string' },
                            apiUrl: { type: 'string' },
                            apiHeaderName: { type: 'string', enum: ['apikey', 'token'] },
                            sendTextEndpoint: { type: 'string' },
                            sendMediaEndpoint: { type: 'string' },
                            status: { type: 'string' },
                            isTest: { type: 'boolean' }
                          }
                        },
                        recipients: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              phoneNumber: { type: 'string' },
                              status: { type: 'string', enum: ['pending', 'sent', 'failed'] }
                            }
                          }
                        },
                        totalRecipients: { type: 'integer' },
                        media: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            fileName: { type: 'string' },
                            mimeType: { type: 'string' },
                            fileSize: { type: 'integer' },
                            base64: { type: 'string' }
                          }
                        },
                        throttling: {
                          type: 'object',
                          properties: {
                            enabled: { type: 'boolean' },
                            messagesPerMinute: { type: 'integer', nullable: true },
                            delayBetweenMessages: { type: 'integer', nullable: true },
                            minDelay: { type: 'integer' },
                            maxDelay: { type: 'integer' }
                          }
                        }
                      }
                    }
                  },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              },
              example: {
                success: true,
                count: 1,
                campaigns: [
                  {
                    campaignId: '550e8400-e29b-41d4-a716-446655440000',
                    title: 'Promoção Black Friday',
                    message: 'Aproveite 50% de desconto!',
                    status: 'scheduled',
                    scheduledAt: '2025-11-29T10:00:00Z',
                    scheduleType: 'scheduled',
                    instance: {
                      id: '123e4567-e89b-12d3-a456-426614174000',
                      name: 'instancia-principal',
                      instanceKey: 'instancia-principal',
                      phoneNumber: '5511999999999',
                      apiToken: 'token_secreto',
                      apiUrl: 'https://monitor-grupo.uazapi.com',
                      apiHeaderName: 'token',
                      sendTextEndpoint: '/send/text',
                      sendMediaEndpoint: '/send/media',
                      status: 'connected',
                      isTest: false
                    },
                    recipients: [
                      { id: 'abc123', phoneNumber: '5511988887777', status: 'pending' }
                    ],
                    totalRecipients: 150,
                    media: null,
                    throttling: {
                      enabled: true,
                      messagesPerMinute: 30,
                      delayBetweenMessages: 2000,
                      minDelay: 1000,
                      maxDelay: 3000
                    }
                  }
                ],
                timestamp: '2025-11-25T21:30:00Z'
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/campaigns/{id}': {
    get: {
      tags: ['Campaigns'],
      summary: 'Obter detalhes de uma campanha',
      description: `
Retorna todos os detalhes de uma campanha específica.

**Inclui**:
- Dados completos da campanha
- Status atual
- Contadores de envio
- Configurações de agendamento
- Informações da instância associada
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
          description: 'Detalhes da campanha',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  campaign: { $ref: '#/components/schemas/Campaign' }
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
  },

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
