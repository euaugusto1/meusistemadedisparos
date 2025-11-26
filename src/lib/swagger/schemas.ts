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
      id: { type: 'string', format: 'uuid', description: 'ID da campanha', example: '550e8400-e29b-41d4-a716-446655440000' },
      user_id: { type: 'string', format: 'uuid', description: 'ID do usuário', example: '660e8400-e29b-41d4-a716-446655440001' },
      instance_id: { type: 'string', format: 'uuid', nullable: true, description: 'ID da instância WhatsApp', example: '770e8400-e29b-41d4-a716-446655440002' },
      title: { type: 'string', description: 'Título da campanha', example: 'Promoção Black Friday 2025' },
      message: { type: 'string', description: 'Mensagem a ser enviada', example: 'Olá {{nome}}! Aproveite nossa promoção especial com 50% OFF!' },
      status: {
        type: 'string',
        enum: ['draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'paused'],
        description: 'Status da campanha',
        example: 'scheduled'
      },
      schedule_type: {
        type: 'string',
        enum: ['immediate', 'scheduled', 'recurring', 'smart'],
        nullable: true,
        description: 'Tipo de agendamento',
        example: 'scheduled'
      },
      scheduled_at: { type: 'string', format: 'date-time', nullable: true, description: 'Data/hora agendada', example: '2025-01-25T10:00:00Z' },
      total_recipients: { type: 'integer', minimum: 0, description: 'Total de destinatários', example: 1500 },
      sent_count: { type: 'integer', minimum: 0, description: 'Mensagens enviadas', example: 750 },
      failed_count: { type: 'integer', minimum: 0, description: 'Mensagens falhadas', example: 12 },
      min_delay: { type: 'integer', minimum: 1, description: 'Delay mínimo entre mensagens (segundos)', example: 3 },
      max_delay: { type: 'integer', minimum: 1, description: 'Delay máximo entre mensagens (segundos)', example: 10 },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
      updated_at: { type: 'string', format: 'date-time', example: '2025-01-20T14:45:00Z' }
    }
  },

  // WhatsApp Instance Schemas
  WhatsAppInstance: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'status'],
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      user_id: { type: 'string', format: 'uuid', example: '660e8400-e29b-41d4-a716-446655440001' },
      name: { type: 'string', description: 'Nome da instância', example: 'Vendas Principal' },
      instance_key: { type: 'string', nullable: true, description: 'Chave da instância', example: 'vendas-principal-abc123' },
      phone_number: { type: 'string', nullable: true, description: 'Número do WhatsApp conectado', example: '+5511999999999' },
      status: {
        type: 'string',
        enum: ['connected', 'disconnected', 'connecting', 'qr_code'],
        description: 'Status de conexão',
        example: 'connected'
      },
      is_test: { type: 'boolean', description: 'Se é instância de teste (15 dias)', example: false },
      expires_at: { type: 'string', format: 'date-time', nullable: true, description: 'Data de expiração (testes)', example: '2025-02-15T23:59:59Z' },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' }
    }
  },

  // API Token Schemas
  ApiToken: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'token', 'is_active'],
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      user_id: { type: 'string', format: 'uuid', example: '660e8400-e29b-41d4-a716-446655440001' },
      token: { type: 'string', description: 'Token de API (parcialmente oculto)', pattern: '^wpp_', example: 'wpp_a1b2c3d4************************************' },
      name: { type: 'string', minLength: 3, maxLength: 100, description: 'Nome do token', example: 'Integração N8N - Produção' },
      description: { type: 'string', nullable: true, description: 'Descrição do token', example: 'Token usado para automações de campanhas via N8N' },
      scopes: { type: 'array', items: { type: 'string' }, description: 'Escopos de permissão', example: ['campaigns:read', 'campaigns:write'] },
      expires_at: { type: 'string', format: 'date-time', nullable: true, description: 'Data de expiração', example: '2025-06-30T23:59:59Z' },
      last_used_at: { type: 'string', format: 'date-time', nullable: true, description: 'Último uso', example: '2025-01-20T14:45:00Z' },
      is_active: { type: 'boolean', description: 'Se o token está ativo', example: true },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
      updated_at: { type: 'string', format: 'date-time', example: '2025-01-20T14:45:00Z' }
    }
  },

  // Message Template Schemas
  MessageTemplate: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'message'],
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      user_id: { type: 'string', format: 'uuid', example: '660e8400-e29b-41d4-a716-446655440001' },
      name: { type: 'string', description: 'Nome do template', example: 'Boas-vindas Cliente' },
      message: { type: 'string', description: 'Mensagem do template', example: 'Olá {{nome}}! Seja bem-vindo à nossa plataforma. Estamos felizes em tê-lo conosco!' },
      media_id: { type: 'string', format: 'uuid', nullable: true, description: 'ID da mídia anexada', example: '770e8400-e29b-41d4-a716-446655440002' },
      link_url: { type: 'string', format: 'uri', nullable: true, description: 'URL de link', example: 'https://www.exemplo.com.br/promocao' },
      button_type: {
        type: 'string',
        enum: ['button', 'list', 'poll', 'carousel'],
        nullable: true,
        description: 'Tipo de botão interativo',
        example: 'button'
      },
      is_favorite: { type: 'boolean', description: 'Se é favorito', example: true },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' }
    }
  },

  // Contact List Schemas
  ContactList: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'contact_count'],
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      user_id: { type: 'string', format: 'uuid', example: '660e8400-e29b-41d4-a716-446655440001' },
      name: { type: 'string', description: 'Nome da lista', example: 'Clientes VIP' },
      description: { type: 'string', nullable: true, description: 'Descrição da lista', example: 'Lista de clientes premium com alto engajamento' },
      contact_count: { type: 'integer', minimum: 0, description: 'Quantidade de contatos', example: 1250 },
      is_favorite: { type: 'boolean', description: 'Se é favorita', example: true },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' }
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
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      user_id: { type: 'string', format: 'uuid', example: '660e8400-e29b-41d4-a716-446655440001' },
      name: { type: 'string', description: 'Nome do template', example: 'Promoção Black Friday' },
      content: { type: 'string', description: 'Conteúdo da mensagem', example: '🔥 Olá {{nome}}! Aproveite nossa super promoção de Black Friday com até 70% de desconto!' },
      category: { type: 'string', nullable: true, description: 'Categoria do template', example: 'promocional' },
      mediaUrl: { type: 'string', format: 'uri', nullable: true, description: 'URL da mídia', example: 'https://storage.exemplo.com/media/promo-blackfriday.jpg' },
      mediaType: {
        type: 'string',
        enum: ['image', 'video', 'audio', 'document'],
        nullable: true,
        description: 'Tipo de mídia',
        example: 'image'
      },
      isFavorite: { type: 'boolean', default: false, description: 'Se é favorito', example: true },
      isActive: { type: 'boolean', default: true, description: 'Se está ativo', example: true },
      usageCount: { type: 'integer', minimum: 0, description: 'Vezes que foi usado', example: 245 },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
      updated_at: { type: 'string', format: 'date-time', example: '2025-01-20T14:45:00Z' }
    }
  },

  // Contact Schemas
  Contact: {
    type: 'object',
    required: ['id', 'list_id', 'phoneNumber'],
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      list_id: { type: 'string', format: 'uuid', description: 'ID da lista', example: '660e8400-e29b-41d4-a716-446655440001' },
      phoneNumber: { type: 'string', description: 'Número de telefone', example: '+5511999999999' },
      name: { type: 'string', nullable: true, description: 'Nome do contato', example: 'João Silva' },
      email: { type: 'string', format: 'email', nullable: true, example: 'joao.silva@email.com' },
      customData: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Dados dos campos personalizados',
        example: { empresa: 'Tech Corp', cargo: 'Gerente' }
      },
      isActive: { type: 'boolean', default: true, example: true },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
      updated_at: { type: 'string', format: 'date-time', example: '2025-01-20T14:45:00Z' }
    }
  },

  // Media File Schemas
  MediaFile: {
    type: 'object',
    required: ['id', 'user_id', 'name', 'url', 'type', 'size'],
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      user_id: { type: 'string', format: 'uuid', example: '660e8400-e29b-41d4-a716-446655440001' },
      name: { type: 'string', description: 'Nome do arquivo', example: 'promo-black-friday' },
      originalName: { type: 'string', description: 'Nome original do upload', example: 'promocao_blackfriday_2025.jpg' },
      url: { type: 'string', format: 'uri', description: 'URL do arquivo', example: 'https://storage.exemplo.com/media/promo-black-friday.jpg' },
      thumbnailUrl: { type: 'string', format: 'uri', nullable: true, description: 'URL do thumbnail', example: 'https://storage.exemplo.com/thumbs/promo-black-friday.jpg' },
      type: {
        type: 'string',
        enum: ['image', 'video', 'audio', 'document'],
        description: 'Tipo de mídia',
        example: 'image'
      },
      mimeType: { type: 'string', description: 'MIME type', example: 'image/jpeg' },
      size: { type: 'integer', description: 'Tamanho em bytes', example: 2621440 },
      sizeFormatted: { type: 'string', description: 'Tamanho formatado', example: '2.5 MB' },
      folder: { type: 'string', nullable: true, description: 'Pasta', example: 'promocoes' },
      description: { type: 'string', nullable: true, example: 'Banner da promoção Black Friday 2025' },
      width: { type: 'integer', nullable: true, description: 'Largura (imagens/vídeos)', example: 1920 },
      height: { type: 'integer', nullable: true, description: 'Altura (imagens/vídeos)', example: 1080 },
      duration: { type: 'number', nullable: true, description: 'Duração em segundos (vídeos/áudios)', example: 30.5 },
      created_at: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' }
    }
  }
}
