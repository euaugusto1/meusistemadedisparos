# Estrutura JSON dos Grupos - Evolution API

## Endpoint Usado
```
GET /group/fetchAllGroups/{instanceName}?getParticipants=true
```

## Estrutura Atual (Como o código está mapeando)

O código atual em `src/app/api/instances/[id]/groups/route.ts` mapeia assim:

```javascript
const groups = rawGroups.map((g: any) => ({
  id: g.id,                    // <-- Usado como remoteJID
  name: g.subject || 'Grupo sem nome',
  subject: g.desc || '',
  participants: (g.participants || []).map((p: any) => ({
    id: p.id || p,
    admin: p.admin === 'admin' || p.admin === 'superadmin' || p.admin === true
  })),
  size: g.size || 0,
  pictureUrl: g.pictureUrl,
  owner: g.owner,
  creation: g.creation,
  announce: g.announce,
  restrict: g.restrict
}))
```

## Estrutura Esperada da Evolution API v2

Baseado na documentação da Evolution API, a resposta típica de `fetchAllGroups` é:

```json
[
  {
    "id": "120363123456789@g.us",
    "subject": "Nome do Grupo",
    "subjectOwner": "5511999998888@s.whatsapp.net",
    "subjectTime": 1699999999,
    "pictureUrl": "https://...",
    "size": 50,
    "creation": 1699999999,
    "owner": "5511999998888@s.whatsapp.net",
    "desc": "Descrição do grupo",
    "descId": "abc123",
    "restrict": false,
    "announce": false,
    "isCommunity": false,
    "isCommunityAnnounce": false,
    "joinApprovalMode": false,
    "memberAddMode": false,
    "participants": [
      {
        "id": "5511999998888@s.whatsapp.net",
        "admin": "superadmin"
      },
      {
        "id": "5521988887777@s.whatsapp.net",
        "admin": null
      }
    ]
  }
]
```

---

# FLUXO DE DESTINATÁRIOS PARA O N8N

## 1. Criação da Campanha

Quando uma campanha é criada, os destinatários são salvos na tabela `campaign_items`:

**Arquivo:** `src/services/campaigns.ts` (linhas 60-110)

```typescript
export async function createCampaign(
  campaignData: Partial<Campaign>,
  recipients: string[]  // <-- Array de números/JIDs
): Promise<...> {
  // 1. Criar campanha
  const { data: campaign } = await supabase
    .from('campaigns')
    .insert({
      ...campaignData,
      total_recipients: recipients.length,
      status: campaignData.scheduled_for ? 'scheduled' : 'draft',
    })
    .select()
    .single()

  // 2. Criar itens (um por destinatário)
  const items = recipients.map(recipient => ({
    campaign_id: campaign.id,
    recipient,              // <-- O número ou JID do grupo
    status: 'pending',
  }))

  const { data: campaignItems } = await supabase
    .from('campaign_items')
    .insert(items)
    .select()
}
```

## 2. N8N Busca Campanhas Prontas

O N8N faz polling no endpoint:

**Endpoint:** `GET /api/n8n/scheduled-campaigns`
**Arquivo:** `src/app/api/n8n/scheduled-campaigns/route.ts`

Retorna campanhas prontas para envio com todos os destinatários:

```json
{
  "success": true,
  "count": 1,
  "campaigns": [
    {
      "campaignId": "uuid-da-campanha",
      "title": "Minha Campanha",
      "message": "Olá, {nome}!",

      "instance": {
        "id": "uuid-instancia",
        "name": "Minha Instância",
        "instanceKey": "test_1e90397a_1764205808867",
        "phoneNumber": "5511999998888",
        "apiToken": "05F9E46B-04CD-45F2-906F-B14BC5A82E70",
        "apiUrl": "https://dev.evo.sistemabrasil.online",
        "apiHeaderName": "apikey",
        "sendTextEndpoint": "/message/sendText/test_1e90397a_1764205808867",
        "sendMediaEndpoint": "/message/sendMedia/test_1e90397a_1764205808867",
        "isTest": true
      },

      "recipients": [
        {
          "id": "uuid-item-1",
          "phoneNumber": "5511999998888",    // <-- AQUI ESTÁ O DESTINATÁRIO
          "status": "pending"
        },
        {
          "id": "uuid-item-2",
          "phoneNumber": "120363123456789@g.us",  // <-- OU JID DO GRUPO
          "status": "pending"
        }
      ],

      "totalRecipients": 45,
      "media": null,
      "throttling": {
        "enabled": true,
        "minDelay": 35,
        "maxDelay": 250
      }
    }
  ]
}
```

## 3. Campo `phoneNumber` nos Recipients

O campo `phoneNumber` no JSON enviado ao N8N contém:

- **Para contatos individuais:** número no formato `5511999998888`
- **Para grupos (JID):** JID no formato `120363123456789@g.us`

**ORIGEM DO DADO:**

O valor vem da tabela `campaign_items.recipient`:

```sql
SELECT id, recipient, status
FROM campaign_items
WHERE campaign_id = 'uuid' AND status = 'pending'
```

```typescript
// Linha 437 do scheduled-campaigns/route.ts
recipients: recipients?.map(r => ({
  id: r.id,
  phoneNumber: r.recipient,  // <-- campaign_items.recipient
  status: r.status
})) || []
```

## 4. Quando é Grupo (JID)

Se a lista foi importada com "Importar JIDs dos Grupos", o `recipient` é o JID do grupo:

```
120363123456789@g.us
```

Se a lista foi importada com "Importar Participantes", o `recipient` são os números dos membros:

```
5511999998888
5521988887777
```

---

# PROBLEMA IDENTIFICADO

Se o remoteJID dos grupos está errado, preciso saber:

1. **Qual campo** da Evolution API deve ser usado como JID?
2. **Qual é o formato correto** do JID?

## Cole aqui a resposta real da API:

```json
// Cole aqui a estrutura JSON real retornada pela Evolution API


```

## Qual é o campo correto para o remoteJID?

- [ ] `g.id` (atual)
- [ ] `g.remoteJid`
- [ ] `g.jid`
- [ ] `g.groupId`
- [ ] Outro: _______________
