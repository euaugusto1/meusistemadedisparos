'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  RealtimeMetrics,
  TimeSeriesData,
  CampaignComparison,
  ConversionFunnel,
} from '@/types'

// =====================================================
// PDF EXPORT
// =====================================================

export interface ExportPDFParams {
  realtimeMetrics: RealtimeMetrics
  timeSeriesData: TimeSeriesData[]
  campaignComparison: CampaignComparison[]
  conversionFunnel: ConversionFunnel
  period: { start: Date; end: Date }
  userName: string
}

export function exportToPDF(data: ExportPDFParams) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(37, 99, 235) // Blue
  doc.text('Relatório de Analytics', 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 28)
  doc.text(`Usuário: ${data.userName}`, 14, 33)
  doc.text(
    `Período: ${format(data.period.start, 'dd/MM/yyyy', { locale: ptBR })} - ${format(data.period.end, 'dd/MM/yyyy', { locale: ptBR })}`,
    14,
    38
  )

  // Line separator
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 42, 196, 42)

  let yPos = 50

  // 1. Métricas em Tempo Real
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Métricas em Tempo Real', 14, yPos)
  yPos += 8

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Campanhas Ativas', data.realtimeMetrics.active_campaigns.toString()],
      ['Mensagens Enviadas Hoje', data.realtimeMetrics.messages_sent_today.toLocaleString('pt-BR')],
      ['Mensagens por Hora', data.realtimeMetrics.messages_sent_this_hour.toLocaleString('pt-BR')],
      ['Taxa de Entrega', `${data.realtimeMetrics.current_delivery_rate.toFixed(1)}%`],
      ['Instâncias Ativas', data.realtimeMetrics.active_instances.toString()],
      ['Tempo Médio de Resposta', `${data.realtimeMetrics.avg_response_time_minutes.toFixed(0)} min`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // 2. Funil de Conversão
  doc.setFontSize(14)
  doc.text('Funil de Conversão', 14, yPos)
  yPos += 8

  const funnelData = [
    ['Enviadas', data.conversionFunnel.total_sent.toLocaleString('pt-BR'), '100%'],
    [
      'Entregues',
      data.conversionFunnel.total_delivered.toLocaleString('pt-BR'),
      `${data.conversionFunnel.total_sent > 0 ? ((data.conversionFunnel.total_delivered / data.conversionFunnel.total_sent) * 100).toFixed(1) : 0}%`,
    ],
    [
      'Lidas',
      data.conversionFunnel.total_read.toLocaleString('pt-BR'),
      `${data.conversionFunnel.total_sent > 0 ? ((data.conversionFunnel.total_read / data.conversionFunnel.total_sent) * 100).toFixed(1) : 0}%`,
    ],
    [
      'Respondidas',
      data.conversionFunnel.total_responded.toLocaleString('pt-BR'),
      `${data.conversionFunnel.total_sent > 0 ? ((data.conversionFunnel.total_responded / data.conversionFunnel.total_sent) * 100).toFixed(1) : 0}%`,
    ],
    [
      'Convertidas',
      data.conversionFunnel.total_converted.toLocaleString('pt-BR'),
      `${data.conversionFunnel.total_sent > 0 ? ((data.conversionFunnel.total_converted / data.conversionFunnel.total_sent) * 100).toFixed(1) : 0}%`,
    ],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Estágio', 'Quantidade', 'Taxa']],
    body: funnelData,
    theme: 'grid',
    headStyles: { fillColor: [168, 85, 247] }, // Purple
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // 3. Série Temporal (nova página se necessário)
  if (yPos > 200) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(14)
  doc.text('Desempenho nos Últimos Dias', 14, yPos)
  yPos += 8

  const timeSeriesBody = data.timeSeriesData.map(item => [
    format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR }),
    item.sent.toLocaleString('pt-BR'),
    item.delivered.toLocaleString('pt-BR'),
    item.read.toLocaleString('pt-BR'),
    item.failed.toLocaleString('pt-BR'),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Data', 'Enviadas', 'Entregues', 'Lidas', 'Falhas']],
    body: timeSeriesBody,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }, // Green
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // 4. Comparação de Campanhas (nova página)
  if (data.campaignComparison.length > 0) {
    doc.addPage()
    yPos = 20

    doc.setFontSize(14)
    doc.text('Comparação de Campanhas', 14, yPos)
    yPos += 8

    const campaignBody = data.campaignComparison.map(campaign => [
      campaign.campaign_title.length > 30
        ? campaign.campaign_title.substring(0, 30) + '...'
        : campaign.campaign_title,
      campaign.sent_count.toLocaleString('pt-BR'),
      `${campaign.delivery_rate.toFixed(1)}%`,
      `${campaign.read_rate.toFixed(1)}%`,
      `${campaign.response_rate.toFixed(1)}%`,
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Campanha', 'Enviadas', 'Taxa Entrega', 'Taxa Leitura', 'Taxa Resposta']],
      body: campaignBody,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }, // Orange
    })
  }

  // Footer com marca d'água
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
    doc.text('Gerado por Araujo IA - WhatsApp SaaS', 14, doc.internal.pageSize.height - 10)
  }

  // Save the PDF
  const fileName = `analytics-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`
  doc.save(fileName)
}

// =====================================================
// EXCEL EXPORT
// =====================================================

export function exportToExcel(data: ExportPDFParams) {
  const workbook = XLSX.utils.book_new()

  // 1. Métricas em Tempo Real
  const metricsData = [
    ['MÉTRICAS EM TEMPO REAL'],
    [''],
    ['Métrica', 'Valor'],
    ['Campanhas Ativas', data.realtimeMetrics.active_campaigns],
    ['Mensagens Enviadas Hoje', data.realtimeMetrics.messages_sent_today],
    ['Mensagens por Hora', data.realtimeMetrics.messages_sent_this_hour],
    ['Taxa de Entrega (%)', Number(data.realtimeMetrics.current_delivery_rate.toFixed(1))],
    ['Instâncias Ativas', data.realtimeMetrics.active_instances],
    ['Tempo Médio de Resposta (min)', Number(data.realtimeMetrics.avg_response_time_minutes.toFixed(0))],
  ]

  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData)
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Métricas')

  // 2. Funil de Conversão
  const funnelData = [
    ['FUNIL DE CONVERSÃO'],
    [''],
    ['Estágio', 'Quantidade', 'Taxa (%)'],
    ['Enviadas', data.conversionFunnel.total_sent, 100],
    [
      'Entregues',
      data.conversionFunnel.total_delivered,
      data.conversionFunnel.total_sent > 0
        ? Number(((data.conversionFunnel.total_delivered / data.conversionFunnel.total_sent) * 100).toFixed(1))
        : 0,
    ],
    [
      'Lidas',
      data.conversionFunnel.total_read,
      data.conversionFunnel.total_sent > 0
        ? Number(((data.conversionFunnel.total_read / data.conversionFunnel.total_sent) * 100).toFixed(1))
        : 0,
    ],
    [
      'Respondidas',
      data.conversionFunnel.total_responded,
      data.conversionFunnel.total_sent > 0
        ? Number(((data.conversionFunnel.total_responded / data.conversionFunnel.total_sent) * 100).toFixed(1))
        : 0,
    ],
    [
      'Convertidas',
      data.conversionFunnel.total_converted,
      data.conversionFunnel.total_sent > 0
        ? Number(((data.conversionFunnel.total_converted / data.conversionFunnel.total_sent) * 100).toFixed(1))
        : 0,
    ],
  ]

  const funnelSheet = XLSX.utils.aoa_to_sheet(funnelData)
  XLSX.utils.book_append_sheet(workbook, funnelSheet, 'Funil')

  // 3. Série Temporal
  const timeSeriesData = [
    ['DESEMPENHO DIÁRIO'],
    [''],
    ['Data', 'Enviadas', 'Entregues', 'Lidas', 'Falhas'],
    ...data.timeSeriesData.map(item => [
      format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR }),
      item.sent,
      item.delivered,
      item.read,
      item.failed,
    ]),
  ]

  const timeSeriesSheet = XLSX.utils.aoa_to_sheet(timeSeriesData)
  XLSX.utils.book_append_sheet(workbook, timeSeriesSheet, 'Performance Diária')

  // 4. Campanhas
  if (data.campaignComparison.length > 0) {
    const campaignsData = [
      ['COMPARAÇÃO DE CAMPANHAS'],
      [''],
      ['Campanha', 'Enviadas', 'Taxa Entrega (%)', 'Taxa Leitura (%)', 'Taxa Resposta (%)'],
      ...data.campaignComparison.map(campaign => [
        campaign.campaign_title,
        campaign.sent_count,
        Number(campaign.delivery_rate.toFixed(1)),
        Number(campaign.read_rate.toFixed(1)),
        Number(campaign.response_rate.toFixed(1)),
      ]),
    ]

    const campaignsSheet = XLSX.utils.aoa_to_sheet(campaignsData)
    XLSX.utils.book_append_sheet(workbook, campaignsSheet, 'Campanhas')
  }

  // Save the Excel file
  const fileName = `analytics-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
