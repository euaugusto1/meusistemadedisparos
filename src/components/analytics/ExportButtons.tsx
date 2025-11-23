'use client'

import { Button } from '@/components/ui/button'
import { FileDown, FileText, FileSpreadsheet } from 'lucide-react'
import { exportToPDF, exportToExcel, type ExportPDFParams } from '@/lib/export-reports'
import { useState } from 'react'

interface ExportButtonsProps {
  data: ExportPDFParams
}

export function ExportButtons({ data }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = () => {
    setIsExporting(true)
    try {
      exportToPDF(data)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      setTimeout(() => setIsExporting(false), 500)
    }
  }

  const handleExportExcel = () => {
    setIsExporting(true)
    try {
      exportToExcel(data)
    } catch (error) {
      console.error('Error exporting Excel:', error)
    } finally {
      setTimeout(() => setIsExporting(false), 500)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
        <FileDown className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Exportar:</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={isExporting}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        PDF
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={isExporting}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
    </div>
  )
}
