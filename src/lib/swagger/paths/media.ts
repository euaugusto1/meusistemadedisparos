/**
 * OpenAPI Path Definitions - Media Library
 *
 * Endpoints for media file management
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const mediaPaths: PathsObject = {
  '/api/media': {
    get: {
      tags: ['Media'],
      summary: 'Listar arquivos de mídia',
      description: `
Lista todos os arquivos de mídia do usuário.

**Tipos de mídia**:
- \`image\` - Imagens (JPG, PNG, GIF, WebP)
- \`video\` - Vídeos (MP4, WebM)
- \`audio\` - Áudios (MP3, OGG, WAV)
- \`document\` - Documentos (PDF, DOC, XLS, etc.)

**Filtros**:
- Por tipo de mídia
- Por pasta/categoria
- Por nome
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'type',
          in: 'query',
          description: 'Filtrar por tipo de mídia',
          schema: { type: 'string', enum: ['image', 'video', 'audio', 'document'] }
        },
        {
          name: 'folder',
          in: 'query',
          description: 'Filtrar por pasta',
          schema: { type: 'string' }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Buscar por nome do arquivo',
          schema: { type: 'string' }
        },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de arquivos de mídia',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  files: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/MediaFile' }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' }
                    }
                  },
                  storage: {
                    type: 'object',
                    properties: {
                      used: { type: 'integer', description: 'Bytes utilizados', example: 104857600 },
                      limit: { type: 'integer', description: 'Limite em bytes', example: 1073741824 },
                      usedFormatted: { type: 'string', example: '100 MB' },
                      limitFormatted: { type: 'string', example: '1 GB' }
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
      tags: ['Media'],
      summary: 'Upload de arquivo de mídia',
      description: `
Faz upload de um novo arquivo de mídia.

**Limite de tamanho**: 50 MB (todos os tipos)

**Formatos suportados**:
| Tipo | Formatos |
|------|----------|
| Imagem | JPG, PNG, GIF, WebP |
| Vídeo | MP4, WebM |
| Áudio | MP3, OGG, WAV |
| Documento | PDF, DOC, DOCX, XLS, XLSX |

**Observação**: Apenas o proprietário do arquivo ou admin podem renomear/excluir
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Arquivo a ser enviado'
                },
                name: {
                  type: 'string',
                  description: 'Nome personalizado do arquivo (opcional)',
                  example: 'promo-black-friday'
                },
                folder: {
                  type: 'string',
                  description: 'Pasta de destino (opcional)',
                  example: 'promocoes'
                },
                description: {
                  type: 'string',
                  description: 'Descrição do arquivo (opcional)'
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Upload realizado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'File uploaded successfully' },
                  file: { $ref: '#/components/schemas/MediaFile' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Arquivo inválido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                'Formato inválido': { value: { error: 'Formato de arquivo inválido', message: 'Apenas JPG, PNG, GIF, WebP, MP4, WebM, MP3, OGG, WAV, PDF, DOC, DOCX, XLS, XLSX são permitidos' } },
                'Muito grande': { value: { error: 'Arquivo muito grande', message: 'O tamanho máximo permitido é 50MB' } },
                'Sem espaço': { value: { error: 'Limite de armazenamento', message: 'Você atingiu o limite de armazenamento do seu plano' } }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/media/{id}': {
    get: {
      tags: ['Media'],
      summary: 'Obter arquivo de mídia',
      description: 'Retorna os detalhes de um arquivo de mídia específico.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do arquivo (UUID)',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: '550e8400-e29b-41d4-a716-446655440000'
        }
      ],
      responses: {
        '200': {
          description: 'Detalhes do arquivo',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  file: { $ref: '#/components/schemas/MediaFile' }
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
      tags: ['Media'],
      summary: 'Atualizar arquivo de mídia',
      description: 'Atualiza os metadados de um arquivo de mídia.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do arquivo (UUID)',
          required: true,
          schema: { type: 'string', format: 'uuid' },
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
                  description: 'Novo nome do arquivo'
                },
                folder: {
                  type: 'string',
                  description: 'Nova pasta'
                },
                description: {
                  type: 'string',
                  description: 'Nova descrição'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Arquivo atualizado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'File updated successfully' },
                  file: { $ref: '#/components/schemas/MediaFile' }
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
      tags: ['Media'],
      summary: 'Deletar arquivo de mídia',
      description: `
Remove um arquivo de mídia permanentemente.

**Atenção**: Arquivos em uso por templates não podem ser deletados.
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID do arquivo (UUID)',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: '550e8400-e29b-41d4-a716-446655440000'
        }
      ],
      responses: {
        '200': {
          description: 'Arquivo deletado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'File deleted successfully' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Arquivo em uso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Arquivo em uso', message: 'Este arquivo está sendo usado por templates ou campanhas e não pode ser deletado' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/media/folders': {
    get: {
      tags: ['Media'],
      summary: 'Listar pastas',
      description: 'Retorna a lista de pastas da biblioteca de mídia.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      responses: {
        '200': {
          description: 'Lista de pastas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  folders: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: 'promocoes' },
                        fileCount: { type: 'integer', example: 15 },
                        totalSize: { type: 'integer', description: 'Bytes', example: 52428800 }
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
    },

    post: {
      tags: ['Media'],
      summary: 'Criar pasta',
      description: 'Cria uma nova pasta para organizar arquivos.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
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
                  pattern: '^[a-z0-9-]+$',
                  minLength: 2,
                  maxLength: 50,
                  description: 'Nome da pasta (apenas letras minúsculas, números e hífens)',
                  example: 'black-friday-2024'
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Pasta criada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Folder created successfully' },
                  folder: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'black-friday-2024' },
                      fileCount: { type: 'integer', example: 0 }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Nome inválido ou pasta já existe',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                'Já existe': { value: { error: 'Pasta já existe', message: 'Já existe uma pasta com este nome' } },
                'Nome inválido': { value: { error: 'Nome inválido', message: 'Use apenas letras minúsculas, números e hífens no nome da pasta' } }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/media/folders/{name}': {
    delete: {
      tags: ['Media'],
      summary: 'Deletar pasta',
      description: `
Remove uma pasta e move os arquivos para a raiz.

**Comportamento**: Os arquivos dentro da pasta não são deletados, apenas movidos para a raiz.
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'name',
          in: 'path',
          description: 'Nome da pasta',
          required: true,
          schema: { type: 'string' },
          example: 'promocoes-2024'
        }
      ],
      responses: {
        '200': {
          description: 'Pasta deletada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Folder deleted successfully' },
                  movedFiles: { type: 'integer', description: 'Arquivos movidos para raiz', example: 5 }
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

  '/api/media/bulk-delete': {
    post: {
      tags: ['Media'],
      summary: 'Deletar múltiplos arquivos',
      description: `
Remove múltiplos arquivos de uma vez.

**Limite**: Máximo 100 arquivos por requisição.
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['ids'],
              properties: {
                ids: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid' },
                  maxItems: 100,
                  description: 'IDs dos arquivos a deletar'
                }
              }
            },
            example: {
              ids: [
                '123e4567-e89b-12d3-a456-426614174001',
                '123e4567-e89b-12d3-a456-426614174002',
                '123e4567-e89b-12d3-a456-426614174003'
              ]
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Arquivos deletados',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  deleted: { type: 'integer', example: 3 },
                  failed: { type: 'integer', example: 0 },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
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
          description: 'Requisição inválida',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Limite excedido', message: 'Máximo de 100 arquivos por requisição' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  }
}
