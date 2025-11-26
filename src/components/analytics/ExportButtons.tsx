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
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
        <FileDown className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Exportar:</span>
      </div>

      <div className="flex items-center gap-2 flex-1 sm:flex-none">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={isExporting}
          className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
        >
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExporting}
          className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Excel
        </Button>
      </div>
    </div>
  )
}
