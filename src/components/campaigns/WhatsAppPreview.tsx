'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Check, ChevronLeft, ChevronRight, MoreVertical, Phone, Search, Video, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { ButtonConfig } from '@/types'

interface WhatsAppPreviewProps {
  messages: Array<{
    message: string
    mediaUrl?: string
    mediaType?: 'image' | 'video' | 'document' | 'audio'
    linkUrl?: string
    buttons?: ButtonConfig[]
    templateName?: string
  }>
  recipientName?: string
  currentIndex?: number
  onIndexChange?: (index: number) => void
}

export function WhatsAppPreview({
  messages,
  recipientName = 'Cliente',
  currentIndex = 0,
  onIndexChange
}: WhatsAppPreviewProps) {
  const [localIndex, setLocalIndex] = useState(currentIndex)

  const activeIndex = onIndexChange ? currentIndex : localIndex
  const setActiveIndex = onIndexChange || setLocalIndex

  const currentMessage = messages[activeIndex] || {
    message: '',
    mediaUrl: undefined,
    linkUrl: undefined,
    buttons: []
  }

  const now = new Date()
  const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 overflow-hidden sticky top-4 z-10">
        <div className="p-4">
          {/* WhatsApp Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChevronLeft className="h-5 w-5 text-slate-400" />
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${recipientName}`} />
                <AvatarFallback className="bg-green-600 text-white">
                  {recipientName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium text-sm">{recipientName}</p>
                <p className="text-xs text-slate-400">online</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <Video className="h-5 w-5" />
              <Phone className="h-5 w-5" />
              <MoreVertical className="h-5 w-5" />
            </div>
          </div>

          {/* WhatsApp Messages Area */}
          <div
            className="rounded-lg p-4 min-h-[500px] relative overflow-hidden"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: '#0b141a'
            }}
          >
            {/* Message Bubble */}
            <div className="flex justify-end mb-2">
              <div className="max-w-[85%]">
                {currentMessage.templateName && (
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                      Template: {currentMessage.templateName}
                    </Badge>
                  </div>
                )}

                {/* Media Preview */}
                {currentMessage.mediaUrl && (
                  <div className="bg-[#005c4b] rounded-t-lg overflow-hidden mb-1">
                    {currentMessage.mediaType === 'image' ? (
                      <img
                        src={currentMessage.mediaUrl}
                        alt="Preview"
                        className="w-full max-h-64 object-cover"
                      />
                    ) : currentMessage.mediaType === 'video' ? (
                      <video
                        src={currentMessage.mediaUrl}
                        className="w-full max-h-64 object-cover"
                        controls={false}
                      />
                    ) : (
                      <div className="p-4 flex items-center gap-3 text-white">
                        <div className="bg-[#0b141a]/50 p-3 rounded-lg">
                          📄
                        </div>
                        <div>
                          <p className="text-sm font-medium">Documento</p>
                          <p className="text-xs text-slate-300">Anexado</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div
                  className={`bg-[#005c4b] ${
                    currentMessage.mediaUrl ? 'rounded-b-lg' : 'rounded-lg'
                  } p-3 relative shadow-lg`}
                >
                  {/* Triangle (tail) */}
                  {!currentMessage.mediaUrl && (
                    <div
                      className="absolute top-0 -right-2 w-0 h-0"
                      style={{
                        borderLeft: '8px solid transparent',
                        borderTop: '8px solid #005c4b'
                      }}
                    />
                  )}

                  {/* Message Text */}
                  <p className="text-[#e9edef] text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {currentMessage.message || (
                      <span className="text-[#8696a0] italic">
                        Digite sua mensagem ou selecione um template...
                      </span>
                    )}
                  </p>

                  {/* Link */}
                  {currentMessage.linkUrl && (
                    <a
                      href={currentMessage.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#53bdeb] text-sm hover:underline block mt-2 break-all"
                    >
                      {currentMessage.linkUrl}
                    </a>
                  )}

                  {/* Timestamp and Read Receipts */}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-[#8696a0]">
                      {timeString}
                    </span>
                    <div className="flex">
                      <Check className="h-3 w-3 text-[#53bdeb]" />
                      <Check className="h-3 w-3 text-[#53bdeb] -ml-1.5" />
                    </div>
                  </div>
                </div>

                {/* WhatsApp CTA Buttons (Outside bubble) */}
                {currentMessage.buttons && currentMessage.buttons.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {currentMessage.buttons
                      .filter(b => b.name && b.url)
                      .map((button, idx) => (
                        <div
                          key={idx}
                          className="bg-white/95 border-2 border-[#00a884] rounded-xl px-4 py-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-white transition-colors shadow-sm"
                        >
                          <ExternalLink className="h-4 w-4 text-[#00a884]" />
                          <span className="text-[#00a884] text-sm font-semibold uppercase tracking-wide">
                            {button.name}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Template Navigation */}
      {messages.length > 1 && (
        <Card className="bg-slate-900/50 border-slate-800 p-4 relative z-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-400">
              Preview {activeIndex + 1} de {messages.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="p-1 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 text-slate-400" />
              </button>
              <button
                onClick={() => setActiveIndex(Math.min(messages.length - 1, activeIndex + 1))}
                disabled={activeIndex === messages.length - 1}
                className="p-1 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            {messages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === activeIndex ? 'bg-blue-500 w-6' : 'bg-slate-600 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Character Counter */}
      {currentMessage.message && (
        <Card className="bg-slate-900/50 border-slate-800 p-3 relative z-0">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Caracteres</span>
            <span
              className={
                currentMessage.message.length > 4000
                  ? 'text-red-500 font-medium'
                  : currentMessage.message.length > 3500
                  ? 'text-yellow-500'
                  : 'text-slate-400'
              }
            >
              {currentMessage.message.length}
              <span className="text-slate-600">/4096</span>
            </span>
          </div>
          {currentMessage.message.length > 4000 && (
            <p className="text-xs text-red-500 mt-1">
              ⚠️ Mensagem muito longa. WhatsApp tem limite de 4096 caracteres.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
