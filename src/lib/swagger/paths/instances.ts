/**
 * OpenAPI Path Definitions - WhatsApp Instances
 *
 * Endpoints for WhatsApp instance management
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const instancesPaths: PathsObject = {
  '/api/instances/{id}': {
    get: {
      tags: ['Instances'],
      summary: 'Obter detalhes da instância',
      description: `
Retorna informações detalhadas de uma instância WhatsApp.

**Informações incluídas**:
- Status de conexão
- Número conectado
- Estatísticas de uso
- Configurações
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da instância',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Detalhes da instância',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  instance: { $ref: '#/components/schemas/WhatsAppInstance' }
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

  '/api/instances/{id}/qrcode': {
    get: {
      tags: ['Instances'],
      summary: 'Obter QR Code para conexão',
      description: `
Gera um QR Code para conectar o WhatsApp na instância.

**Fluxo de conexão**:
1. Chame este endpoint para obter o QR Code
2. Escaneie com o WhatsApp do celular
3. A instância será conectada automaticamente
4. O status mudará para \`connected\`

**Validade do QR Code**: 60 segundos

**Importante**: Só funciona se a instância estiver desconectada.
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da instância',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'QR Code gerado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  qrcode: {
                    type: 'string',
                    description: 'QR Code em base64 (data:image/png;base64,...)',
                    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
                  },
                  expiresIn: {
                    type: 'integer',
                    description: 'Segundos até expirar',
                    example: 60
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Instância já conectada ou erro ao gerar QR',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Instância já conectada', message: 'Esta instância já está conectada. Desconecte primeiro se desejar gerar novo QR Code.' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/instances/{id}/status': {
    get: {
      tags: ['Instances'],
      summary: 'Verificar status da instância',
      description: `
Verifica o status atual de conexão da instância WhatsApp.

**Status possíveis**:
- \`connected\` - WhatsApp conectado e funcionando
- \`disconnected\` - WhatsApp desconectado
- \`connecting\` - Em processo de conexão
- \`qr_code\` - Aguardando escaneamento do QR Code
- \`error\` - Erro de conexão
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da instância',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Status da instância',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  status: {
                    type: 'string',
                    enum: ['connected', 'disconnected', 'connecting', 'qr_code', 'error'],
                    example: 'connected'
                  },
                  phoneNumber: {
                    type: 'string',
                    nullable: true,
                    description: 'Número conectado (se conectado)',
                    example: '+5511999999999'
                  },
                  lastSeen: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    description: 'Última atividade'
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

  '/api/instances/{id}/groups': {
    get: {
      tags: ['Instances'],
      summary: 'Listar grupos do WhatsApp',
      description: `
Lista todos os grupos do WhatsApp conectados à instância.

**Informações retornadas por grupo**:
- ID do grupo
- Nome do grupo
- Quantidade de participantes
- Descrição
- Se o usuário é admin
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da instância',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Lista de grupos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  groups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '120363123456789@g.us' },
                        name: { type: 'string', example: 'Grupo de Vendas' },
                        participantsCount: { type: 'integer', example: 150 },
                        description: { type: 'string', nullable: true },
                        isAdmin: { type: 'boolean', example: true }
                      }
                    }
                  },
                  count: { type: 'integer', example: 15 }
                }
              }
            }
          }
        },
        '400': {
          description: 'Instância não conectada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Instância não conectada', message: 'Conecte o WhatsApp primeiro para listar os grupos' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/instances/{id}/disconnect': {
    post: {
      tags: ['Instances'],
      summary: 'Desconectar instância',
      description: `
Desconecta o WhatsApp da instância.

**Comportamento**:
- Encerra a sessão do WhatsApp
- O número ficará disponível para conectar novamente
- Campanhas em andamento serão pausadas
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da instância',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Instância desconectada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Instância desconectada com sucesso' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Instância já desconectada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Instância já desconectada', message: 'Esta instância já está desconectada' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/instances/test': {
    get: {
      tags: ['Instances'],
      summary: 'Testar conexão com API de instâncias',
      description: `
Endpoint de teste para verificar se a API de gerenciamento de instâncias está funcionando.

**Uso**: Diagnóstico e health check
      `,
      security: [{ SupabaseAuth: [] }],
      responses: {
        '200': {
          description: 'API funcionando',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Instance API is working' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  }
}
