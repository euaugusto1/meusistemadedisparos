# Evolution API v2 - Estrutura de Envio de Mídia

Guia completo para envio de arquivos de mídia via Evolution API v2.

---

## Configuração Base

```
Base URL: https://{seu-servidor-evolution}
Header: apikey: {token-da-instancia}
Content-Type: application/json
```

---

## Endpoint Principal

```http
POST /message/sendMedia/{instanceName}
```

---

## 1. Envio de Imagem

### Com URL Pública

```json
{
  "number": "5511999998888",
  "mediatype": "image",
  "mimetype": "image/png",
  "caption": "Legenda da imagem (opcional)",
  "media": "https://exemplo.com/imagem.png",
  "delay": 1200
}
```

### Com Base64

```json
{
  "number": "5511999998888",
  "mediatype": "image",
  "mimetype": "image/jpeg",
  "caption": "Foto do produto",
  "media": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

### MIME Types Suportados

| Extensão | MIME Type |
|----------|-----------|
| .png | image/png |
| .jpg/.jpeg | image/jpeg |
| .gif | image/gif |
| .webp | image/webp |

---

## 2. Envio de Vídeo

```json
{
  "number": "5511999998888",
  "mediatype": "video",
  "mimetype": "video/mp4",
  "caption": "Vídeo promocional",
  "media": "https://exemplo.com/video.mp4",
  "delay": 1200
}
```

### MIME Types Suportados

| Extensão | MIME Type |
|----------|-----------|
| .mp4 | video/mp4 |
| .3gp | video/3gpp |
| .mov | video/quicktime |

**Limite:** Vídeos de até 16MB são suportados.

---

## 3. Envio de Documento

```json
{
  "number": "5511999998888",
  "mediatype": "document",
  "mimetype": "application/pdf",
  "caption": "Contrato para assinatura",
  "media": "https://exemplo.com/contrato.pdf",
  "fileName": "Contrato_2024.pdf",
  "delay": 1200
}
```

### MIME Types Comuns

| Extensão | MIME Type |
|----------|-----------|
| .pdf | application/pdf |
| .doc | application/msword |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| .xls | application/vnd.ms-excel |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| .ppt | application/vnd.ms-powerpoint |
| .pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |
| .txt | text/plain |
| .zip | application/zip |
| .rar | application/x-rar-compressed |

**Importante:** O campo `fileName` define o nome que aparecerá para o destinatário.

---

## 4. Envio de Áudio

### Áudio como Arquivo

```json
{
  "number": "5511999998888",
  "mediatype": "audio",
  "mimetype": "audio/mpeg",
  "media": "https://exemplo.com/audio.mp3",
  "delay": 1200
}
```

### Áudio como Mensagem de Voz (PTT)

Endpoint específico para áudio tipo "mensagem de voz":

```http
POST /message/sendWhatsAppAudio/{instanceName}
```

```json
{
  "number": "5511999998888",
  "audio": "https://exemplo.com/audio.ogg",
  "delay": 1200
}
```

### MIME Types Suportados

| Extensão | MIME Type |
|----------|-----------|
| .mp3 | audio/mpeg |
| .ogg | audio/ogg |
| .m4a | audio/mp4 |
| .opus | audio/opus |

**Nota:** Para PTT (Push to Talk), prefira formato `.ogg` com codec Opus.

---

## 5. Envio para Grupos

Para enviar mídia para grupos, use o JID do grupo:

```json
{
  "number": "120363123456789@g.us",
  "mediatype": "image",
  "mimetype": "image/png",
  "caption": "Imagem para o grupo",
  "media": "https://exemplo.com/imagem.png"
}
```

**Formato do JID de Grupo:** `{id}@g.us`

---

## 6. Campos da Requisição

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `number` | string | Sim | Número do destinatário ou JID do grupo |
| `mediatype` | string | Sim | Tipo: `image`, `video`, `audio`, `document` |
| `mimetype` | string | Sim | MIME type do arquivo |
| `media` | string | Sim | URL pública ou Base64 do arquivo |
| `caption` | string | Não | Legenda (não disponível para áudio) |
| `fileName` | string | Não | Nome do arquivo (recomendado para documentos) |
| `delay` | number | Não | Delay em ms antes de enviar |

---

## 7. Resposta de Sucesso

```json
{
  "key": {
    "remoteJid": "5511999998888@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5F5A632EAE722"
  },
  "message": {
    "imageMessage": {
      "url": "https://mmg.whatsapp.net/...",
      "mimetype": "image/png",
      "caption": "Legenda da imagem",
      "fileSha256": "...",
      "fileLength": "123456"
    }
  },
  "messageTimestamp": "1717775575",
  "status": "PENDING"
}
```

---

## 8. Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Requisição inválida (campos faltando ou inválidos) |
| 401 | API Key inválida |
| 404 | Instância não encontrada |
| 415 | Tipo de mídia não suportado |
| 500 | Erro interno do servidor |

---

## 9. Boas Práticas

### URLs de Mídia

- Use URLs públicas acessíveis (sem autenticação)
- URLs devem retornar o arquivo diretamente (não páginas HTML)
- Prefira HTTPS para segurança
- Evite URLs com caracteres especiais não codificados

### Base64

- Use para arquivos pequenos (< 5MB)
- Formato: `data:{mimetype};base64,{conteudo}`
- Mais lento que URLs para arquivos grandes

### Performance

- Use `delay` entre 1000-3000ms para evitar bloqueios
- Para envios em massa, respeite limites do WhatsApp
- Comprima imagens/vídeos quando possível

### Formatos Recomendados

| Tipo | Formato Recomendado |
|------|---------------------|
| Imagem | JPEG (menor tamanho) ou PNG (transparência) |
| Vídeo | MP4 com H.264 |
| Áudio | OGG Opus (para PTT) ou MP3 |
| Documento | PDF (universal) |

---

## 10. Exemplo Completo (JavaScript)

```javascript
async function sendMedia(instanceName, apiKey, baseUrl) {
  const response = await fetch(
    `${baseUrl}/message/sendMedia/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: '5511999998888',
        mediatype: 'image',
        mimetype: 'image/png',
        caption: 'Promoção especial!',
        media: 'https://meusite.com/promo.png',
        delay: 1200
      })
    }
  )

  const result = await response.json()
  console.log('Mensagem enviada:', result.key?.id)
  return result
}
```

---

## 11. Exemplo com cURL

```bash
curl -X POST "https://sua-api.com/message/sendMedia/minha-instancia" \
  -H "Content-Type: application/json" \
  -H "apikey: seu-token-aqui" \
  -d '{
    "number": "5511999998888",
    "mediatype": "document",
    "mimetype": "application/pdf",
    "caption": "Segue o documento solicitado",
    "media": "https://exemplo.com/documento.pdf",
    "fileName": "Proposta_Comercial.pdf"
  }'
```

---

## Referências

- [Evolution API Documentation](https://doc.evolution-api.com)
- [Documentação Completa do Sistema](./evolution-api-reference.md)
