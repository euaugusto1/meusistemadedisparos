/**
 * OpenAPI Path Definitions - Contacts
 *
 * Endpoints for contact lists and contact management
 */

import { PathsObject } from 'openapi3-ts/oas30'

export const contactsPaths: PathsObject = {
  '/api/lists': {
    get: {
      tags: ['Contacts'],
      summary: 'Listar listas de contatos',
      description: `
Lista todas as listas de contatos do usuário.

**Informações por lista**:
- Nome e descrição
- Quantidade de contatos
- Data de criação/atualização
- Status (ativa/inativa)
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'search',
          in: 'query',
          description: 'Buscar por nome',
          schema: { type: 'string' }
        },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de listas de contatos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  lists: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ContactList' }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' }
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
      tags: ['Contacts'],
      summary: 'Criar lista de contatos',
      description: `
Cria uma nova lista de contatos.

**Campos personalizados**:
Defina campos adicionais para armazenar dados específicos dos contatos (ex: empresa, cargo, cidade).
      `,
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
                  minLength: 3,
                  maxLength: 100,
                  description: 'Nome da lista',
                  example: 'Clientes VIP'
                },
                description: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Descrição da lista',
                  example: 'Lista de clientes premium com compras acima de R$ 1000'
                },
                customFields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'empresa' },
                      type: { type: 'string', enum: ['text', 'number', 'date', 'email'], example: 'text' },
                      required: { type: 'boolean', default: false }
                    }
                  },
                  description: 'Campos personalizados da lista'
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Lista criada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Contact list created successfully' },
                  list: { $ref: '#/components/schemas/ContactList' }
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

  '/api/lists/{id}': {
    get: {
      tags: ['Contacts'],
      summary: 'Obter lista por ID',
      description: 'Retorna os detalhes de uma lista de contatos específica.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da lista',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Detalhes da lista',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  list: { $ref: '#/components/schemas/ContactList' }
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
      tags: ['Contacts'],
      summary: 'Atualizar lista',
      description: 'Atualiza uma lista de contatos existente.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da lista',
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
                description: { type: 'string', maxLength: 500 },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Lista atualizada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Contact list updated successfully' },
                  list: { $ref: '#/components/schemas/ContactList' }
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
      tags: ['Contacts'],
      summary: 'Deletar lista',
      description: `
Remove uma lista de contatos permanentemente.

**Atenção**:
- Todos os contatos da lista serão removidos
- Listas em uso por campanhas ativas não podem ser deletadas
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da lista',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Lista deletada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Contact list deleted successfully' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Lista em uso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'List is being used by active campaigns' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  '/api/lists/{id}/contacts': {
    get: {
      tags: ['Contacts'],
      summary: 'Listar contatos de uma lista',
      description: 'Retorna todos os contatos de uma lista específica.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da lista',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Buscar por nome ou telefone',
          schema: { type: 'string' }
        },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        '200': {
          description: 'Lista de contatos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  contacts: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Contact' }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' }
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
    },

    post: {
      tags: ['Contacts'],
      summary: 'Adicionar contato à lista',
      description: `
Adiciona um novo contato a uma lista.

**Formato do telefone**:
- Com código do país: +5511999999999
- Apenas números: 5511999999999
- Formato brasileiro: (11) 99999-9999

O sistema normaliza automaticamente para o formato internacional.
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da lista',
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
              required: ['phoneNumber'],
              properties: {
                phoneNumber: {
                  type: 'string',
                  description: 'Número de telefone',
                  example: '+5511999999999'
                },
                name: {
                  type: 'string',
                  description: 'Nome do contato',
                  example: 'João Silva'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email do contato'
                },
                customData: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  description: 'Dados dos campos personalizados',
                  example: { empresa: 'Acme Corp', cargo: 'Gerente' }
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Contato adicionado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Contact added successfully' },
                  contact: { $ref: '#/components/schemas/Contact' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Dados inválidos ou contato duplicado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                'Duplicado': { value: { error: 'Contact already exists in this list' } },
                'Telefone inválido': { value: { error: 'Invalid phone number format' } }
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

  '/api/lists/{listId}/contacts/{contactId}': {
    put: {
      tags: ['Contacts'],
      summary: 'Atualizar contato',
      description: 'Atualiza os dados de um contato específico.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'listId',
          in: 'path',
          description: 'ID da lista',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'contactId',
          in: 'path',
          description: 'ID do contato',
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
                phoneNumber: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                customData: { type: 'object', additionalProperties: { type: 'string' } },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Contato atualizado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Contact updated successfully' },
                  contact: { $ref: '#/components/schemas/Contact' }
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
      tags: ['Contacts'],
      summary: 'Remover contato da lista',
      description: 'Remove um contato de uma lista.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'listId',
          in: 'path',
          description: 'ID da lista',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'contactId',
          in: 'path',
          description: 'ID do contato',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Contato removido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Contact removed successfully' }
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

  '/api/lists/{id}/import': {
    post: {
      tags: ['Contacts'],
      summary: 'Importar contatos de arquivo',
      description: `
Importa contatos de um arquivo CSV ou Excel.

**Formatos suportados**:
- CSV (separado por vírgula ou ponto-e-vírgula)
- XLSX (Excel)

**Colunas obrigatórias**:
- \`telefone\` ou \`phone\` ou \`celular\`

**Colunas opcionais**:
- \`nome\` ou \`name\`
- \`email\`
- Qualquer campo personalizado da lista

**Limites**:
- Máximo 10.000 contatos por importação
- Arquivo máximo de 5MB
      `,
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da lista',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
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
                  description: 'Arquivo CSV ou XLSX'
                },
                skipDuplicates: {
                  type: 'boolean',
                  default: true,
                  description: 'Ignorar contatos duplicados'
                },
                updateExisting: {
                  type: 'boolean',
                  default: false,
                  description: 'Atualizar contatos existentes'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Importação concluída',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Import completed successfully' },
                  stats: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer', example: 1000 },
                      imported: { type: 'integer', example: 980 },
                      duplicates: { type: 'integer', example: 15 },
                      errors: { type: 'integer', example: 5 }
                    }
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        row: { type: 'integer' },
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
          description: 'Arquivo inválido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                'Formato inválido': { value: { error: 'Invalid file format. Use CSV or XLSX' } },
                'Arquivo muito grande': { value: { error: 'File too large. Maximum 5MB' } },
                'Coluna obrigatória ausente': { value: { error: 'Required column "telefone" not found' } }
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

  '/api/lists/{id}/export': {
    get: {
      tags: ['Contacts'],
      summary: 'Exportar contatos',
      description: 'Exporta todos os contatos de uma lista para CSV.',
      security: [{ SupabaseAuth: [] }, { AdminToken: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID da lista',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'format',
          in: 'query',
          description: 'Formato de exportação',
          schema: { type: 'string', enum: ['csv', 'xlsx'], default: 'csv' }
        }
      ],
      responses: {
        '200': {
          description: 'Arquivo de exportação',
          content: {
            'text/csv': {
              schema: { type: 'string', format: 'binary' }
            },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
              schema: { type: 'string', format: 'binary' }
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
