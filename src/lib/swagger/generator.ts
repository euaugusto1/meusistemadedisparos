/**
 * OpenAPI Specification Generator
 *
 * Combines configuration, schemas, and path definitions into a complete OpenAPI 3.0 spec
 */

import { OpenAPIObject } from 'openapi3-ts/oas30'
import { openApiConfig } from './config'
import { commonSchemas } from './schemas'
import { adminTokensPaths } from './paths/admin-tokens'
import { campaignsPaths } from './paths/campaigns'
import { instancesPaths } from './paths/instances'
import { n8nPaths } from './paths/n8n'
import { othersPaths } from './paths/others'
import { templatesPaths } from './paths/templates'
import { contactsPaths } from './paths/contacts'
import { mediaPaths } from './paths/media'

/**
 * Generates the complete OpenAPI specification
 *
 * @returns Complete OpenAPI 3.0 object ready for consumption by Swagger UI
 */
export function generateOpenApiSpec(): OpenAPIObject {
  return {
    ...openApiConfig,
    components: {
      ...openApiConfig.components,
      schemas: {
        ...openApiConfig.components!.schemas,
        ...commonSchemas
      }
    },
    paths: {
      // Admin endpoints
      ...adminTokensPaths,

      // Campaign management
      ...campaignsPaths,

      // WhatsApp Instances
      ...instancesPaths,

      // N8N Integration
      ...n8nPaths,

      // Templates
      ...templatesPaths,

      // Contacts & Lists
      ...contactsPaths,

      // Media Library
      ...mediaPaths,

      // Analytics, Payments, Webhooks, Health, Messages
      ...othersPaths
    }
  }
}

/**
 * Validates the generated OpenAPI spec
 *
 * Performs basic validation to ensure the spec is well-formed
 *
 * @returns Object with validation result and any errors
 */
export function validateOpenApiSpec(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    const spec = generateOpenApiSpec()

    // Check required fields
    if (!spec.openapi) {
      errors.push('Missing required field: openapi')
    }

    if (!spec.info) {
      errors.push('Missing required field: info')
    }

    if (!spec.info?.title) {
      errors.push('Missing required field: info.title')
    }

    if (!spec.info?.version) {
      errors.push('Missing required field: info.version')
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      errors.push('No paths defined in specification')
    }

    // Validate OpenAPI version format
    if (spec.openapi && !spec.openapi.match(/^3\.0\.\d+$/)) {
      errors.push(`Invalid OpenAPI version: ${spec.openapi}. Expected format: 3.0.x`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      valid: false,
      errors
    }
  }
}

/**
 * Gets statistics about the API documentation
 *
 * @returns Object with counts of various API elements
 */
export function getApiStats() {
  const spec = generateOpenApiSpec()

  const paths = spec.paths || {}
  const pathCount = Object.keys(paths).length

  let operationCount = 0
  const tagCounts: Record<string, number> = {}

  // Count operations and group by tags
  Object.values(paths).forEach((pathItem) => {
    if (!pathItem) return

    const operations = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const
    operations.forEach((method) => {
      const operation = pathItem[method]
      if (operation) {
        operationCount++

        // Count by tag
        if (operation.tags) {
          operation.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        }
      }
    })
  })

  const schemaCount = Object.keys(spec.components?.schemas || {}).length
  const securitySchemeCount = Object.keys(spec.components?.securitySchemes || {}).length

  return {
    version: spec.info.version,
    paths: pathCount,
    operations: operationCount,
    schemas: schemaCount,
    securitySchemes: securitySchemeCount,
    tags: Object.keys(tagCounts).length,
    operationsByTag: tagCounts
  }
}
