# Evolution API v2 - Referência Completa

## Configuração Base

```
Base URL: https://{server-url}
Header: apikey: {sua-api-key}
```

---

## 1. INSTANCE CONTROLLER

### 1.1 Create Instance
Cria uma nova instância do WhatsApp.

```http
POST /instance/create
```

**Headers:**
```
Content-Type: application/json
apikey: {GLOBAL_API_KEY}
```

**Body:**
```json
{
  "instanceName": "minha-instancia",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS",
  "number": "",
  "token": "",
  "webhook": "",
  "webhookByEvents": false,
  "webhookBase64": false,
  "webhookEvents": [
    "QRCODE_UPDATED",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "CONNECTION_UPDATE"
  ],
  "rejectCall": false,
  "msgCall": "",
  "groupsIgnore": false,
  "alwaysOnline": false,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": false
}
```

**Response (201):**
```json
{
  "instance": {
    "instanceName": "minha-instancia",
    "instanceId": "uuid-da-instancia",
    "integration": "WHATSAPP-BAILEYS",
    "status": "created"
  },
  "hash": "5FB8C7B3-0DAE-4676-B57A-19B7E310C470",
  "qrcode": {
    "pairingCode": "WZYEH1YY",
    "code": "2@y8eK+bjtEjUWy9/FOM...",
    "base64": "data:image/png;base64,iVBORw0KGgo...",
    "count": 0
  }
}
```

**IMPORTANTE:** O campo `hash` é o token de autenticação da instância. Salve-o para usar nas próximas requisições.

---

### 1.2 Instance Connect (Get QR Code)
Retorna o QR Code para conexão do WhatsApp.

```http
GET /instance/connect/{instanceName}
```

**Headers:**
```
apikey: {INSTANCE_TOKEN ou GLOBAL_API_KEY}
```

**Response (200):**
```json
{
  "pairingCode": "WZYEH1YY",
  "code": "2@y8eK+bjtEjUWy9/FOM...",
  "base64": "data:image/png;base64,iVBORw0KGgo...",
  "count": 1
}
```

**Campos:**
- `pairingCode`: Código para parear via número (alternativa ao QR)
- `code`: Código interno do WhatsApp
- `base64`: QR Code em formato base64 (imagem PNG)
- `count`: Contador de tentativas

---

### 1.3 Connection State
Verifica o estado da conexão da instância.

```http
GET /instance/connectionState/{instanceName}
```

**Response (200):**
```json
{
  "instance": {
    "instanceName": "minha-instancia",
    "state": "open"
  }
}
```

**Estados possíveis:**
- `open`: Conectado
- `close`: Desconectado
- `connecting`: Conectando

---

### 1.4 Fetch Instances
Lista todas as instâncias ou uma específica.

```http
GET /instance/fetchInstances
GET /instance/fetchInstances?instanceName={instanceName}
```

**Response (200):**
```json
[
  {
    "instance": {
      "instanceName": "minha-instancia",
      "instanceId": "uuid",
      "owner": "5511999998888@s.whatsapp.net",
      "profileName": "Meu Nome",
      "profilePictureUrl": "https://...",
      "profileStatus": "Disponível",
      "status": "open",
      "serverUrl": "https://...",
      "apikey": "hash-da-instancia"
    }
  }
]
```

---

### 1.5 Delete Instance
Remove uma instância.

```http
DELETE /instance/delete/{instanceName}
```

**Response (200):**
```json
{
  "status": "SUCCESS",
  "error": false,
  "response": {
    "message": "Instance deleted"
  }
}
```

---

### 1.6 Logout Instance
Desconecta a instância do WhatsApp.

```http
DELETE /instance/logout/{instanceName}
```

**Response (200):**
```json
{
  "status": "SUCCESS",
  "error": false,
  "response": {
    "message": "Instance logged out"
  }
}
```

---

### 1.7 Restart Instance
Reinicia a instância.

```http
POST /instance/restart/{instanceName}
```

---

## 2. MESSAGE CONTROLLER

### 2.1 Send Text
Envia mensagem de texto.

```http
POST /message/sendText/{instanceName}
```

**Body:**
```json
{
  "number": "5511999998888",
  "text": "Olá! Esta é uma mensagem de teste.",
  "delay": 1200
}
```

**Para grupos:**
```json
{
  "number": "120363123456789@g.us",
  "text": "Mensagem para o grupo",
  "delay": 1200
}
```

**Response (201):**
```json
{
  "key": {
    "remoteJid": "5511999998888@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5F5A632EAE722"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Olá! Esta é uma mensagem de teste."
    }
  },
  "messageTimestamp": "1717775575",
  "status": "PENDING"
}
```

---

### 2.2 Send Media
Envia imagem, vídeo, documento ou áudio.

```http
POST /message/sendMedia/{instanceName}
```

**Body (Imagem):**
```json
{
  "number": "5511999998888",
  "mediatype": "image",
  "mimetype": "image/png",
  "caption": "Legenda da imagem",
  "media": "https://exemplo.com/imagem.png",
  "delay": 1200
}
```

**Body (Documento):**
```json
{
  "number": "5511999998888",
  "mediatype": "document",
  "mimetype": "application/pdf",
  "caption": "Documento importante",
  "media": "https://exemplo.com/doc.pdf",
  "fileName": "documento.pdf",
  "delay": 1200
}
```

**Body (Vídeo):**
```json
{
  "number": "5511999998888",
  "mediatype": "video",
  "mimetype": "video/mp4",
  "caption": "Vídeo legal",
  "media": "https://exemplo.com/video.mp4",
  "delay": 1200
}
```

**Media Types:**
- `image`: Imagens (png, jpg, gif, webp)
- `video`: Vídeos (mp4)
- `audio`: Áudios (mp3, ogg)
- `document`: Documentos (pdf, doc, xls, etc)

**Formatos de media:**
- URL pública: `"media": "https://exemplo.com/arquivo.png"`
- Base64: `"media": "data:image/png;base64,iVBORw0KGgo..."`

---

### 2.3 Send Audio (PTT - Push to Talk)
Envia áudio como mensagem de voz.

```http
POST /message/sendWhatsAppAudio/{instanceName}
```

**Body:**
```json
{
  "number": "5511999998888",
  "audio": "https://exemplo.com/audio.ogg",
  "delay": 1200
}
```

---

## 3. GROUP CONTROLLER

### 3.1 Fetch All Groups
Lista todos os grupos da instância.

```http
GET /group/fetchAllGroups/{instanceName}?getParticipants=true
```

**Query Parameters:**
- `getParticipants`: `true` ou `false` - Inclui lista de participantes

**Response (200):**
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

**IMPORTANTE:** O campo `id` é o JID do grupo usado para enviar mensagens.

---

### 3.2 Find Group Info
Busca informações de um grupo específico.

```http
GET /group/findGroupInfos/{instanceName}?groupJid={groupJid}
```

---

### 3.3 Create Group
Cria um novo grupo.

```http
POST /group/create/{instanceName}
```

**Body:**
```json
{
  "subject": "Nome do Grupo",
  "description": "Descrição do grupo",
  "participants": [
    "5511999998888",
    "5521988887777"
  ]
}
```

---

### 3.4 Update Group Picture
Atualiza a foto do grupo.

```http
POST /group/updateGroupPicture/{instanceName}
```

**Body:**
```json
{
  "groupJid": "120363123456789@g.us",
  "image": "https://exemplo.com/imagem.png"
}
```

---

### 3.5 Add/Remove Participants
Adiciona ou remove participantes.

```http
PUT /group/updateParticipant/{instanceName}
```

**Body (Adicionar):**
```json
{
  "groupJid": "120363123456789@g.us",
  "action": "add",
  "participants": ["5511999998888"]
}
```

**Body (Remover):**
```json
{
  "groupJid": "120363123456789@g.us",
  "action": "remove",
  "participants": ["5511999998888"]
}
```

**Actions:**
- `add`: Adicionar
- `remove`: Remover
- `promote`: Promover a admin
- `demote`: Remover admin

---

### 3.6 Get Invite Code
Obtém o código de convite do grupo.

```http
GET /group/inviteCode/{instanceName}?groupJid={groupJid}
```

**Response:**
```json
{
  "inviteUrl": "https://chat.whatsapp.com/ABC123xyz",
  "inviteCode": "ABC123xyz"
}
```

---

### 3.7 Leave Group
Sai de um grupo.

```http
DELETE /group/leaveGroup/{instanceName}?groupJid={groupJid}
```

---

## 4. CHAT CONTROLLER

### 4.1 Check WhatsApp Number
Verifica se um número tem WhatsApp.

```http
POST /chat/whatsappNumbers/{instanceName}
```

**Body:**
```json
{
  "numbers": ["5511999998888", "5521988887777"]
}
```

**Response:**
```json
[
  {
    "exists": true,
    "jid": "5511999998888@s.whatsapp.net",
    "number": "5511999998888"
  },
  {
    "exists": false,
    "jid": "",
    "number": "5521988887777"
  }
]
```

---

### 4.2 Find Contacts
Lista os contatos da instância.

```http
GET /chat/findContacts/{instanceName}
```

---

### 4.3 Find Messages
Busca mensagens de um chat.

```http
POST /chat/findMessages/{instanceName}
```

**Body:**
```json
{
  "where": {
    "key": {
      "remoteJid": "5511999998888@s.whatsapp.net"
    }
  },
  "limit": 20
}
```

---

## 5. PROFILE CONTROLLER

### 5.1 Fetch Profile
Busca informações do perfil.

```http
GET /chat/fetchProfile/{instanceName}?number={number}
```

---

### 5.2 Update Profile Name
Atualiza o nome do perfil.

```http
POST /chat/updateProfileName/{instanceName}
```

**Body:**
```json
{
  "name": "Novo Nome"
}
```

---

### 5.3 Update Profile Picture
Atualiza a foto do perfil.

```http
POST /chat/updateProfilePicture/{instanceName}
```

**Body:**
```json
{
  "picture": "https://exemplo.com/foto.png"
}
```

---

## 6. FORMATOS DE NÚMERO

### Contatos Individuais
```
5511999998888          -> Número sem formatação (recomendado)
5511999998888@s.whatsapp.net -> JID completo
```

### Grupos
```
120363123456789@g.us   -> JID do grupo (obrigatório @g.us)
```

---

## 7. CÓDIGOS DE STATUS HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autorizado (apikey inválida) |
| 404 | Não encontrado |
| 500 | Erro interno do servidor |

---

## 8. WEBHOOKS

A Evolution API envia webhooks para eventos:

```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "minha-instancia",
  "data": {
    "key": {
      "remoteJid": "5511999998888@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0..."
    },
    "pushName": "Nome do Contato",
    "message": {
      "conversation": "Texto da mensagem"
    }
  }
}
```

**Eventos disponíveis:**
- `QRCODE_UPDATED`: QR Code atualizado
- `CONNECTION_UPDATE`: Status de conexão alterado
- `MESSAGES_UPSERT`: Nova mensagem recebida
- `MESSAGES_UPDATE`: Mensagem atualizada (lida, entregue)
- `SEND_MESSAGE`: Mensagem enviada
- `CONTACTS_UPSERT`: Contatos atualizados
- `GROUPS_UPSERT`: Grupos atualizados

---

## Fontes

- [Evolution API Documentation](https://doc.evolution-api.com)
- [GitHub - EvolutionAPI](https://github.com/EvolutionAPI/evolution-api)
- [Postman Collection](https://www.postman.com/agenciadgcode/evolution-api)
