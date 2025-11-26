import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSystemLog, extractRequestInfo, LogAction, LogLevel } from '@/lib/system-logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { action, level = 'info', details = {} } = body as {
      action: LogAction
      level?: LogLevel
      details?: Record<string, unknown>
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const { ipAddress, userAgent } = extractRequestInfo(request)

    await createSystemLog({
      userId: user?.id,
      action,
      level,
      details,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating system log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
