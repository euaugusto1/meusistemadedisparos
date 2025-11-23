import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { N8nWorkflow } from '@/types'

const N8N_API_URL = process.env.N8N_API_URL || ''
const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function GET(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!N8N_API_URL || !N8N_API_KEY) {
      console.error('N8N environment variables not configured')
      return NextResponse.json(
        {
          error: 'Configuração do n8n ausente',
          details: 'As variáveis de ambiente N8N_API_URL e N8N_API_KEY não estão configuradas no servidor.'
        },
        { status: 500 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Todos os usuários autenticados podem ver os agentes
    // A restrição de uso será feita no frontend baseado no plano

    // Fetch workflows from n8n
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`)
      return NextResponse.json(
        { error: `Erro ao conectar com n8n: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Filter AI agents (workflows with langchain, chat, or AI-related nodes)
    const agents: N8nWorkflow[] = data.data
      .filter((workflow: any) => {
        if (workflow.isArchived) return false

        // Check if workflow has AI-related nodes
        const hasAINodes = workflow.nodes?.some((node: any) => {
          const nodeType = node.type.toLowerCase()
          return (
            nodeType.includes('langchain') ||
            nodeType.includes('chat') ||
            nodeType.includes('openai') ||
            nodeType.includes('ai') ||
            nodeType.includes('agent')
          )
        })

        return hasAINodes
      })
      .map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        isArchived: workflow.isArchived,
        tags: Array.isArray(workflow.tags)
          ? workflow.tags.map((tag: any) => typeof tag === 'string' ? tag : tag?.name || '')
          : [],
        triggerCount: workflow.triggerCount || 0,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        nodes: workflow.nodes,
      }))

    // Get execution stats for each agent
    const executionsResponse = await fetch(
      `${N8N_API_URL}/executions?limit=100`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      }
    )

    let executionsMap: Record<string, { count: number; successful: number }> = {}

    if (executionsResponse.ok) {
      const executionsData = await executionsResponse.json()

      // Calculate stats per workflow
      executionsData.data.forEach((execution: any) => {
        if (!executionsMap[execution.workflowId]) {
          executionsMap[execution.workflowId] = { count: 0, successful: 0 }
        }
        executionsMap[execution.workflowId].count++
        if (execution.status === 'success') {
          executionsMap[execution.workflowId].successful++
        }
      })
    }

    // Enhance agents with stats
    const agentsWithStats = agents.map(agent => {
      const stats = executionsMap[agent.id] || { count: 0, successful: 0 }
      return {
        ...agent,
        executionCount: stats.count,
        successRate: stats.count > 0 ? (stats.successful / stats.count) * 100 : 0,
      }
    })

    return NextResponse.json({
      success: true,
      agents: agentsWithStats,
      count: agentsWithStats.length,
    })
  } catch (error) {
    console.error('Error fetching n8n agents:', error)
    return NextResponse.json(
      {
        error: 'Falha ao buscar agentes',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
