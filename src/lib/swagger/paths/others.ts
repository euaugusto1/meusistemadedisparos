/**
 * OpenAPI Path Definitions - Other Endpoints
 *
 * Analytics, Payments, Webhooks, Health, and misc endpoints
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const othersPaths: PathsObject = {
  // ============ ANALYTICS ============
  '/api/analytics/data': {
    get: {
      tags: ['Analytics'],
      summary: 'Obter dados de analytics',
      description: `
Retorna métricas e estatísticas de campanhas.

**Métricas disponíveis**:
- Taxa de entrega
- Taxa de leitura
- Taxa de resposta
- Mensagens por período
- Performance por campanha

**Filtros**:
- Período (data início/fim)
- Campanhas específicas
- Tipo de métrica
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'startDate',
          in: 'query',
          description: 'Data início (ISO 8601)',
          schema: { type: 'string', format: 'date' }
        },
        {
          name: 'endDate',
          in: 'query',
          description: 'Data fim (ISO 8601)',
          schema: { type: 'string', format: 'date' }
        },
        {
          name: 'campaignId',
          in: 'query',
          description: 'Filtrar por campanha específica',
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'metrics',
          in: 'query',
          description: 'Métricas a retornar (separadas por vírgula)',
          schema: { type: 'string', example: 'deliveryRate,readRate,responseRate' }
        }
      ],
      responses: {
        '200': {
          description: 'Dados de analytics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      period: {
                        type: 'object',
                        properties: {
                          start: { type: 'string', format: 'date' },
                          end: { type: 'string', format: 'date' }
                        }
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          totalCampaigns: { type: 'integer', example: 25 },
                          totalMessages: { type: 'integer', example: 15000 },
                          deliveryRate: { type: 'number', example: 98.5 },
                          readRate: { type: 'number', example: 67.3 },
                          responseRate: { type: 'number', example: 12.8 }
                        }
                      },
                      timeSeries: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: { type: 'string', format: 'date' },
                            sent: { type: 'integer' },
                            delivered: { type: 'integer' },
                            read: { type: 'integer' }
                          }
                        }
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

  // ============ PAYMENTS ============
  '/api/payments/create-preference': {
    post: {
      tags: ['Payments'],
      summary: 'Criar preferência de pagamento',
      description: `
Cria uma preferência de pagamento no Mercado Pago.

**Uso**:
- Gerar link de pagamento para planos
- Comprar créditos adicionais

**Retorno**:
- URL de checkout do Mercado Pago
- ID da preferência para tracking
      `,
      security: [{ SupabaseAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['planId'],
              properties: {
                planId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID do plano a comprar'
                },
                quantity: {
                  type: 'integer',
                  minimum: 1,
                  default: 1,
                  description: 'Quantidade de meses'
                },
                couponCode: {
                  type: 'string',
                  description: 'Código de cupom de desconto'
                }
              }
            },
            example: {
              planId: '123e4567-e89b-12d3-a456-426614174000',
              quantity: 1
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Preferência criada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  preferenceId: { type: 'string', example: '123456789-abcd-efgh-ijkl' },
                  checkoutUrl: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789'
                  },
                  expiresAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Plano inválido ou dados incorretos',
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
  },

  // ============ WEBHOOKS ============
  '/api/webhooks/mercadopago': {
    post: {
      tags: ['Webhooks'],
      summary: 'Webhook do Mercado Pago',
      description: `
Endpoint para receber notificações do Mercado Pago.

**Eventos processados**:
- \`payment.created\` - Pagamento criado
- \`payment.approved\` - Pagamento aprovado
- \`payment.rejected\` - Pagamento rejeitado
- \`payment.refunded\` - Pagamento estornado

**Segurança**:
- Validação de assinatura do Mercado Pago
- Verificação de IP de origem
      `,
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                action: { type: 'string', example: 'payment.approved' },
                api_version: { type: 'string', example: 'v1' },
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '123456789' }
                  }
                },
                date_created: { type: 'string', format: 'date-time' },
                id: { type: 'integer', example: 12345678901 },
                live_mode: { type: 'boolean', example: true },
                type: { type: 'string', example: 'payment' },
                user_id: { type: 'string', example: '123456789' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Webhook processado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Webhook processed successfully' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Payload inválido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/webhooks/test-payment': {
    post: {
      tags: ['Webhooks'],
      summary: 'Testar webhook de pagamento',
      description: `
Endpoint para testar o fluxo de webhook de pagamento em ambiente de desenvolvimento.

**Uso**: Simular eventos do Mercado Pago sem fazer pagamentos reais
      `,
      security: [{ SupabaseAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                eventType: {
                  type: 'string',
                  enum: ['payment.approved', 'payment.rejected', 'payment.refunded'],
                  example: 'payment.approved'
                },
                userId: { type: 'string', format: 'uuid' },
                planId: { type: 'string', format: 'uuid' },
                amount: { type: 'number', example: 99.90 }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Teste executado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Test payment processed' },
                  result: { type: 'object' }
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

  // ============ HEALTH & MISC ============
  '/api/health': {
    get: {
      tags: ['System'],
      summary: 'Health check da API',
      description: `
Verifica se a API está funcionando corretamente.

**Verificações**:
- Status do servidor
- Conexão com banco de dados
- Serviços externos

**Uso**: Monitoramento e load balancers
      `,
      security: [],
      responses: {
        '200': {
          description: 'API funcionando normalmente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'healthy' },
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: '1.0.0' },
                  services: {
                    type: 'object',
                    properties: {
                      database: { type: 'string', example: 'connected' },
                      whatsapp: { type: 'string', example: 'connected' },
                      mercadopago: { type: 'string', example: 'connected' }
                    }
                  }
                }
              }
            }
          }
        },
        '503': {
          description: 'Serviço indisponível',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'unhealthy' },
                  error: { type: 'string', example: 'Database connection failed' }
                }
              }
            }
          }
        }
      }
    }
  },

  '/api/send-message': {
    post: {
      tags: ['Messages'],
      summary: 'Enviar mensagem individual',
      description: `
Envia uma mensagem individual para um número específico.

**Tipos de mensagem**:
- Texto simples
- Texto com mídia (imagem, vídeo, áudio, documento)
- Template com variáveis

**Importante**: Requer instância WhatsApp conectada
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['instanceId', 'to', 'message'],
              properties: {
                instanceId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID da instância WhatsApp'
                },
                to: {
                  type: 'string',
                  description: 'Número do destinatário (com código do país)',
                  example: '+5511999999999'
                },
                message: {
                  type: 'string',
                  description: 'Texto da mensagem',
                  example: 'Olá! Esta é uma mensagem de teste.'
                },
                mediaUrl: {
                  type: 'string',
                  format: 'uri',
                  description: 'URL da mídia a enviar (opcional)'
                },
                mediaType: {
                  type: 'string',
                  enum: ['image', 'video', 'audio', 'document'],
                  description: 'Tipo de mídia'
                },
                fileName: {
                  type: 'string',
                  description: 'Nome do arquivo (para documentos)'
                }
              }
            },
            examples: {
              'Texto simples': {
                value: {
                  instanceId: '123e4567-e89b-12d3-a456-426614174000',
                  to: '+5511999999999',
                  message: 'Olá! Tudo bem?'
                }
              },
              'Com imagem': {
                value: {
                  instanceId: '123e4567-e89b-12d3-a456-426614174000',
                  to: '+5511999999999',
                  message: 'Confira nossa promoção!',
                  mediaUrl: 'https://example.com/promo.jpg',
                  mediaType: 'image'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Mensagem enviada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  messageId: { type: 'string', example: 'ABCD1234567890' },
                  to: { type: 'string', example: '+5511999999999' },
                  sentAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Dados inválidos ou instância não conectada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                'Instância desconectada': {
                  value: { error: 'Instance not connected' }
                },
                'Número inválido': {
                  value: { error: 'Invalid phone number format' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  }
}
