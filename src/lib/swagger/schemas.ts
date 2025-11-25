/**
 * OpenAPI Schema Definitions
 *
 * Common schemas used across the API
 */

import { SchemaObject } from 'openapi3-ts/oas30'

export const commonSchemas: Record<string, SchemaObject> = {
  // Campaign Schemas
  Campaign: {
    type: 'object',
    required: ['id', 'user_id', 'title', 'message', 'status'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'ID da campanha' },
      user_id: { type: 'string', format: 'uuid', description: 'ID do usuário' },
      instance_id: { type: 'string', format: 'uuid', nullable: true, description: 'ID da instância WhatsApp' },
      title: { type: 'string', description: 'Título da campanha' },
      message: { type: 'string', description: 'Mensagem a ser enviada' },
      status: {
        type: 'string',
        enum: ['draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'paused'],
        description: 'Status da campanha'
      },
      schedule_type: {
        type: 'string',
        enum: ['immediate', 'scheduled', 'recurring', 'smart'],
        nullable: true,
        description: 'Tipo de agendamento'
      },
      scheduled_at: { type: 'string', format: 'date-time', nullable: true, description: 'Data/hora agendada' },
      total_recipients: { type: 'integer', minimum: 0, description: 'Total de destinatários' },
      sent_count: { type: 'integer', minimum: 0, description: 'Mensagens enviadas' },
      failed_count: { type: 'integer', minimum: 0, description: 'Mensagens falhadas' },
      min_delay: { type: 'integer', minimum: 1, description: 'Delay mínimo entre mensagens (segundos)' },
      max_delay: { type: 'integer', minimum: 1, description: 'Delay máximo entre mensagens (segundos)' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },

  // WhatsApp Instance Schemas
  WhatsAppInstance: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'status'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', description: 'Nome da instância' },
      instance_key: { type: 'string', nullable: true, description: 'Chave da instância' },
      phone_number: { type: 'string', nullable: true, description: 'Número do WhatsApp conectado' },
      status: {
        type: 'string',
        enum: ['connected', 'disconnected', 'connecting', 'qr_code'],
        description: 'Status de conexão'
      },
      is_test: { type: 'boolean', description: 'Se é instância de teste (15 dias)' },
      expires_at: { type: 'string', format: 'date-time', nullable: true, description: 'Data de expiração (testes)' },
      created_at: { type: 'string', format: 'date-time' }
    }
  },

  // API Token Schemas
  ApiToken: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'token', 'is_active'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      token: { type: 'string', description: 'Token de API (parcialmente oculto)', pattern: '^wpp_' },
      name: { type: 'string', minLength: 3, maxLength: 100, description: 'Nome do token' },
      description: { type: 'string', nullable: true, description: 'Descrição do token' },
      scopes: { type: 'array', items: { type: 'string' }, description: 'Escopos de permissão' },
      expires_at: { type: 'string', format: 'date-time', nullable: true, description: 'Data de expiração' },
      last_used_at: { type: 'string', format: 'date-time', nullable: true, description: 'Último uso' },
      is_active: { type: 'boolean', description: 'Se o token está ativo' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },

  // Message Template Schemas
  MessageTemplate: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'message'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', description: 'Nome do template' },
      message: { type: 'string', description: 'Mensagem do template' },
      media_id: { type: 'string', format: 'uuid', nullable: true, description: 'ID da mídia anexada' },
      link_url: { type: 'string', format: 'uri', nullable: true, description: 'URL de link' },
      button_type: {
        type: 'string',
        enum: ['button', 'list', 'poll', 'carousel'],
        nullable: true,
        description: 'Tipo de botão interativo'
      },
      is_favorite: { type: 'boolean', description: 'Se é favorito' },
      created_at: { type: 'string', format: 'date-time' }
    }
  },

  // Contact List Schemas
  ContactList: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'contact_count'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', description: 'Nome da lista' },
      description: { type: 'string', nullable: true, description: 'Descrição da lista' },
      contact_count: { type: 'integer', minimum: 0, description: 'Quantidade de contatos' },
      is_favorite: { type: 'boolean', description: 'Se é favorita' },
      created_at: { type: 'string', format: 'date-time' }
    }
  },

  // Analytics Schemas
  AnalyticsData: {
    type: 'object',
    properties: {
      timeSeries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            sent: { type: 'integer' },
            failed: { type: 'integer' },
            total: { type: 'integer' }
          }
        }
      },
      metrics: {
        type: 'object',
        properties: {
          totalCampaigns: { type: 'integer' },
          totalMessages: { type: 'integer' },
          successRate: { type: 'number', format: 'float', minimum: 0, maximum: 100 },
          averageDeliveryTime: { type: 'number', description: 'Em segundos' }
        }
      }
    }
  },

  // Template Schemas
  Template: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'content'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', description: 'Nome do template' },
      content: { type: 'string', description: 'Conteúdo da mensagem' },
      category: { type: 'string', nullable: true, description: 'Categoria do template' },
      mediaUrl: { type: 'string', format: 'uri', nullable: true, description: 'URL da mídia' },
      mediaType: {
        type: 'string',
        enum: ['image', 'video', 'audio', 'document'],
        nullable: true,
        description: 'Tipo de mídia'
      },
      isFavorite: { type: 'boolean', default: false, description: 'Se é favorito' },
      isActive: { type: 'boolean', default: true, description: 'Se está ativo' },
      usageCount: { type: 'integer', minimum: 0, description: 'Vezes que foi usado' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },

  // Contact Schemas
  Contact: {
    type: 'object',
    required: ['id', 'list_id', 'phoneNumber'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      list_id: { type: 'string', format: 'uuid', description: 'ID da lista' },
      phoneNumber: { type: 'string', description: 'Número de telefone' },
      name: { type: 'string', nullable: true, description: 'Nome do contato' },
      email: { type: 'string', format: 'email', nullable: true },
      customData: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Dados dos campos personalizados'
      },
      isActive: { type: 'boolean', default: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },

  // Media File Schemas
  MediaFile: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'url', 'type', 'size'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', description: 'Nome do arquivo' },
      originalName: { type: 'string', description: 'Nome original do upload' },
      url: { type: 'string', format: 'uri', description: 'URL do arquivo' },
      thumbnailUrl: { type: 'string', format: 'uri', nullable: true, description: 'URL do thumbnail' },
      type: {
        type: 'string',
        enum: ['image', 'video', 'audio', 'document'],
        description: 'Tipo de mídia'
      },
      mimeType: { type: 'string', description: 'MIME type', example: 'image/jpeg' },
      size: { type: 'integer', description: 'Tamanho em bytes' },
      sizeFormatted: { type: 'string', description: 'Tamanho formatado', example: '2.5 MB' },
      folder: { type: 'string', nullable: true, description: 'Pasta' },
      description: { type: 'string', nullable: true },
      width: { type: 'integer', nullable: true, description: 'Largura (imagens/vídeos)' },
      height: { type: 'integer', nullable: true, description: 'Altura (imagens/vídeos)' },
      duration: { type: 'number', nullable: true, description: 'Duração em segundos (vídeos/áudios)' },
      created_at: { type: 'string', format: 'date-time' }
    }
  }
}
