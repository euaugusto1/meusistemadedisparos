/**
 * OpenAPI Path Definitions - N8N Integration
 *
 * Endpoints for N8N workflow automation integration
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const n8nPaths: PathsObject = {
  '/api/n8n/scheduled-campaigns': {
    get: {
      tags: ['N8N'],
      summary: 'Listar campanhas agendadas',
      description: `
Retorna campanhas agendadas prontas para processamento.

**Uso no N8N**:
- Polling periódico para buscar campanhas a processar
- Filtra campanhas com \`schedule_type\` = 'scheduled'
- Retorna apenas campanhas cuja hora de envio já chegou
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'limit',
          in: 'query',
          description: 'Limite de campanhas a retornar',
          schema: { type: 'integer', default: 10, maximum: 50 }
        }
      ],
      responses: {
        '200': {
          description: 'Lista de campanhas agendadas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  campaigns: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Campaign' }
                  },
                  count: { type: 'integer', example: 3 }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/n8n/test-campaigns': {
    get: {
      tags: ['N8N'],
      summary: 'Listar campanhas de teste',
      description: `
Retorna campanhas em modo de teste para processamento.

**Uso**: Validar fluxo antes de envio em massa
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
      responses: {
        '200': {
          description: 'Lista de campanhas de teste',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  campaigns: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Campaign' }
                  }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/n8n/agents': {
    get: {
      tags: ['N8N'],
      summary: 'Listar agentes de disparo',
      description: `
Lista todos os agentes (instâncias) disponíveis para disparo de mensagens.

**Informações por agente**:
- Status de conexão
- Capacidade de envio
- Campanhas em andamento
- Métricas de desempenho
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
      responses: {
        '200': {
          description: 'Lista de agentes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  agents: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Agente Principal' },
                        status: { type: 'string', enum: ['active', 'inactive', 'busy'] },
                        instanceId: { type: 'string', format: 'uuid' },
                        currentCampaigns: { type: 'integer', example: 2 },
                        messagesPerMinute: { type: 'integer', example: 30 }
                      }
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
    }
  },

  '/api/n8n/agents/{id}/toggle': {
    post: {
      tags: ['N8N'],
      summary: 'Ativar/desativar agente',
      description: `
Alterna o status de um agente de disparo.

**Comportamento**:
- Agentes inativos não processam novas campanhas
- Campanhas em andamento continuam até finalizar
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do agente',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Status do agente alterado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  agent: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      status: { type: 'string', enum: ['active', 'inactive'] },
                      toggledAt: { type: 'string', format: 'date-time' }
                    }
                  }
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

  '/api/n8n/campaigns/{id}/items': {
    get: {
      tags: ['N8N'],
      summary: 'Obter itens da campanha para processamento',
      description: `
Retorna os itens (destinatários) de uma campanha para envio de mensagens.

**Paginação**:
- Use \`offset\` e \`limit\` para processar em lotes
- Recomendado: lotes de 100-500 itens

**Filtros**:
- \`status\`: pending, sent, failed
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da campanha',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'status',
          in: 'query',
          description: 'Filtrar por status',
          schema: { type: 'string', enum: ['pending', 'sent', 'failed'] }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Limite de itens',
          schema: { type: 'integer', default: 100, maximum: 500 }
        },
        {
          name: 'offset',
          in: 'query',
          description: 'Offset para paginação',
          schema: { type: 'integer', default: 0 }
        }
      ],
      responses: {
        '200': {
          description: 'Itens da campanha',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        phoneNumber: { type: 'string', example: '+5511999999999' },
                        name: { type: 'string', nullable: true, example: 'João Silva' },
                        status: { type: 'string', enum: ['pending', 'sent', 'failed'] },
                        variables: { type: 'object', additionalProperties: { type: 'string' } }
                      }
                    }
                  },
                  total: { type: 'integer', example: 1500 },
                  hasMore: { type: 'boolean', example: true }
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

  '/api/n8n/campaigns/{id}/status': {
    post: {
      tags: ['N8N'],
      summary: 'Atualizar status da campanha',
      description: `
Atualiza o status de uma campanha durante o processamento.

**Transições válidas**:
- \`scheduled\` → \`processing\`
- \`processing\` → \`completed\`
- \`processing\` → \`failed\`
- \`processing\` → \`paused\`
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
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
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['processing', 'completed', 'failed', 'paused'],
                  example: 'processing'
                },
                reason: {
                  type: 'string',
                  description: 'Motivo (para failed)',
                  example: 'Instance disconnected'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Status atualizado',
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
        '400': {
          description: 'Transição de status inválida',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/n8n/campaigns/{id}/counters': {
    post: {
      tags: ['N8N'],
      summary: 'Atualizar contadores da campanha',
      description: `
Atualiza os contadores de uma campanha durante o processamento.

**Contadores**:
- \`sent_count\` - Mensagens enviadas com sucesso
- \`failed_count\` - Mensagens que falharam
- \`total_recipients\` - Total de destinatários
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
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
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                sent_count: { type: 'integer', minimum: 0, example: 150 },
                failed_count: { type: 'integer', minimum: 0, example: 5 },
                increment: {
                  type: 'boolean',
                  description: 'Se true, incrementa valores ao invés de substituir',
                  default: false
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Contadores atualizados',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  counters: {
                    type: 'object',
                    properties: {
                      sent_count: { type: 'integer', example: 150 },
                      failed_count: { type: 'integer', example: 5 },
                      total_recipients: { type: 'integer', example: 1000 },
                      progress: { type: 'number', example: 15.5 }
                    }
                  }
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

  '/api/n8n/campaigns/{id}/complete': {
    post: {
      tags: ['N8N'],
      summary: 'Finalizar campanha',
      description: `
Marca uma campanha como concluída após processamento.

**Ações executadas**:
- Atualiza status para \`completed\`
- Calcula estatísticas finais
- Envia notificação ao usuário (se configurado)
- Registra log de conclusão
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
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
                finalStats: {
                  type: 'object',
                  properties: {
                    totalSent: { type: 'integer', example: 950 },
                    totalFailed: { type: 'integer', example: 50 },
                    duration: { type: 'integer', description: 'Duração em segundos', example: 3600 }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Campanha finalizada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Campaign completed successfully' },
                  campaign: { $ref: '#/components/schemas/Campaign' },
                  stats: {
                    type: 'object',
                    properties: {
                      successRate: { type: 'number', example: 95.0 },
                      averageDeliveryTime: { type: 'number', example: 2.5 }
                    }
                  }
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

  '/api/n8n/campaign-items/{id}/status': {
    post: {
      tags: ['N8N'],
      summary: 'Atualizar status de item da campanha',
      description: `
Atualiza o status de um item específico da campanha (destinatário).

**Status possíveis**:
- \`pending\` - Aguardando envio
- \`sent\` - Enviado com sucesso
- \`failed\` - Falha no envio
- \`delivered\` - Entregue ao destinatário
- \`read\` - Lido pelo destinatário
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do item da campanha',
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
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'sent', 'failed', 'delivered', 'read'],
                  example: 'sent'
                },
                messageId: {
                  type: 'string',
                  description: 'ID da mensagem no WhatsApp',
                  example: 'ABCD1234567890'
                },
                errorMessage: {
                  type: 'string',
                  description: 'Mensagem de erro (se failed)',
                  example: 'Number not registered on WhatsApp'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Status do item atualizado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  item: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      status: { type: 'string' },
                      updatedAt: { type: 'string', format: 'date-time' }
                    }
                  }
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

  '/api/n8n/update-message-status': {
    post: {
      tags: ['N8N'],
      summary: 'Atualizar status de mensagem em lote',
      description: `
Atualiza o status de múltiplas mensagens de uma vez.

**Uso**: Processamento em lote para melhor performance

**Limite**: Máximo 100 itens por requisição
      `,
      security: [{ N8nAuth: [] }, { AdminToken: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['updates'],
              properties: {
                updates: {
                  type: 'array',
                  maxItems: 100,
                  items: {
                    type: 'object',
                    required: ['itemId', 'status'],
                    properties: {
                      itemId: { type: 'string', format: 'uuid' },
                      status: { type: 'string', enum: ['sent', 'failed', 'delivered', 'read'] },
                      messageId: { type: 'string' },
                      errorMessage: { type: 'string' }
                    }
                  }
                }
              }
            },
            example: {
              updates: [
                { itemId: '123e4567-e89b-12d3-a456-426614174001', status: 'sent', messageId: 'MSG001' },
                { itemId: '123e4567-e89b-12d3-a456-426614174002', status: 'sent', messageId: 'MSG002' },
                { itemId: '123e4567-e89b-12d3-a456-426614174003', status: 'failed', errorMessage: 'Invalid number' }
              ]
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Status atualizados em lote',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  processed: { type: 'integer', example: 3 },
                  failed: { type: 'integer', example: 0 },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        itemId: { type: 'string' },
                        error: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Dados inválidos ou limite excedido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  }
}
