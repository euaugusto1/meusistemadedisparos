# 🎨 Melhorias Visuais Pendentes - Estilo Premium

Este documento lista as melhorias visuais que devem ser aplicadas nas abas restantes do sistema, seguindo os padrões do `estilotop.md`.

## ✅ Já Implementado

### 1. Aba Instâncias
- ✅ Cards com hover effects (-translate-y-1, shadow-xl)
- ✅ Badges com gradientes e animações
- ✅ Modal QR Code com backdrop blur
- ✅ Empty state premium com glow effect
- ✅ Botões com gradientes e hover scale
- ✅ Timer com animações pulse

### 2. Aba Planos e Preços
- ✅ Header com gradiente (primary → blue → purple)
- ✅ Card de plano atual com shimmer effect
- ✅ Cards de planos com hover effects
- ✅ Badges recomendado com gradiente yellow→orange
- ✅ Modal de pagamento premium
- ✅ Empty state com glow effect

---

## 📋 Pendente de Implementação

### 3. Lista de Contatos (`src/components/lists/ContactsListManager.tsx`)

**Arquivo**: `ContactsListManager.tsx`

**Melhorias a aplicar:**

#### Header
```tsx
// ANTES:
<div className="flex items-center justify-between">
  <h1>Listas de Contatos</h1>
</div>

// DEPOIS:
<div className="text-center space-y-3 mb-8">
  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
    Listas de Contatos
  </h1>
  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
    Organize seus contatos e importe grupos diretamente do WhatsApp
  </p>
</div>
```

#### Cards de Lista
```tsx
// Adicionar:
className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
```

#### Botões de Ação
```tsx
// Botão Criar Lista (Principal):
className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"

// Botão Importar Grupos:
className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 hover:scale-105"
```

#### Empty State
```tsx
<Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background">
  <CardContent className="py-16 text-center space-y-6">
    <div className="relative inline-block">
      <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
      <div className="relative bg-gradient-to-br from-primary/10 to-blue-600/10 p-6 rounded-full">
        <Users className="h-16 w-16 text-primary" />
      </div>
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
        Crie sua primeira lista
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto text-base">
        Organize seus contatos em listas para facilitar o envio de campanhas
      </p>
    </div>
  </CardContent>
</Card>
```

#### Badges de Status
```tsx
// Badge de contatos:
<Badge className="bg-primary/10 text-primary border-primary/20 shadow-sm">
  <Users className="h-3 w-3 mr-1" />
  {list.total_contacts} contatos
</Badge>
```

---

### 4. Templates de Mensagem (`src/components/templates/TemplatesList.tsx`)

**Arquivo**: `TemplatesList.tsx`

**Melhorias a aplicar:**

#### Header
```tsx
<div className="text-center space-y-3 mb-8">
  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
    Templates de Mensagem
  </h1>
  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
    Crie e gerencie modelos de mensagens reutilizáveis para suas campanhas
  </p>
</div>
```

#### Cards de Template
```tsx
<Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
  {/* Conteúdo */}
</Card>
```

#### Botão Criar Template
```tsx
<Button className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
  <Plus className="mr-2 h-5 w-5" />
  Criar Template
</Button>
```

#### Preview do Template
```tsx
// Adicionar border decorativa:
<div className="relative p-1 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600">
  <div className="bg-background p-4 rounded-xl">
    {/* Preview content */}
  </div>
</div>
```

---

### 5. Biblioteca de Mídia (`src/components/media/MediaLibrary.tsx`)

**Arquivo**: `MediaLibrary.tsx`

**Melhorias a aplicar:**

#### Header
```tsx
<div className="text-center space-y-3 mb-8">
  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
    Biblioteca de Mídia
  </h1>
  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
    Gerencie suas imagens, vídeos e documentos para usar nas campanhas
  </p>
</div>
```

#### Cards de Mídia
```tsx
<Card className="group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
  {/* Overlay no hover */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
    {/* Botões de ação */}
  </div>
</Card>
```

#### Upload Zone
```tsx
<div className="relative group">
  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
  <div className="relative border-2 border-dashed border-primary/30 rounded-xl p-12 text-center bg-gradient-to-br from-primary/5 to-background hover:border-primary/60 transition-colors">
    <Upload className="h-12 w-12 mx-auto text-primary mb-4" />
    <p className="text-lg font-semibold mb-2">Arraste arquivos aqui</p>
    <p className="text-sm text-muted-foreground">
      ou clique para selecionar
    </p>
  </div>
</div>
```

#### Badges de Tipo
```tsx
// Imagem:
<Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
  <Image className="h-3 w-3 mr-1" />
  Imagem
</Badge>

// Vídeo:
<Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
  <Video className="h-3 w-3 mr-1" />
  Vídeo
</Badge>

// Documento:
<Badge className="bg-green-500/10 text-green-600 border-green-500/20">
  <FileText className="h-3 w-3 mr-1" />
  Documento
</Badge>
```

---

### 6. Minhas Campanhas (`src/components/campaigns/CampaignsList.tsx`)

**Arquivo**: `CampaignsList.tsx`

**Melhorias a aplicar:**

#### Header
```tsx
<div className="text-center space-y-3 mb-8">
  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
    Minhas Campanhas
  </h1>
  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
    Gerencie e acompanhe suas campanhas de disparo em massa
  </p>
</div>
```

#### Cards de Campanha
```tsx
<Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
  {/* Status badge no topo */}
  {campaign.status === 'completed' && (
    <div className="absolute top-0 right-0 z-10">
      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg px-4 py-1.5">
        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
        Concluída
      </Badge>
    </div>
  )}

  {campaign.status === 'running' && (
    <div className="absolute top-0 right-0 z-10">
      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg px-4 py-1.5 animate-pulse">
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        Em andamento
      </Badge>
    </div>
  )}
</Card>
```

#### Estatísticas da Campanha
```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Enviadas */}
  <div className="relative">
    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl"></div>
    <div className="relative bg-background border-2 border-blue-500/20 p-4 rounded-xl text-center">
      <p className="text-3xl font-bold text-blue-600">{campaign.sent}</p>
      <p className="text-xs text-muted-foreground mt-1">Enviadas</p>
    </div>
  </div>

  {/* Entregues */}
  <div className="relative">
    <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl"></div>
    <div className="relative bg-background border-2 border-green-500/20 p-4 rounded-xl text-center">
      <p className="text-3xl font-bold text-green-600">{campaign.delivered}</p>
      <p className="text-xs text-muted-foreground mt-1">Entregues</p>
    </div>
  </div>

  {/* Falhas */}
  <div className="relative">
    <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl"></div>
    <div className="relative bg-background border-2 border-red-500/20 p-4 rounded-xl text-center">
      <p className="text-3xl font-bold text-red-600">{campaign.failed}</p>
      <p className="text-xs text-muted-foreground mt-1">Falhas</p>
    </div>
  </div>
</div>
```

#### Botão Nova Campanha
```tsx
<Button className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl" size="lg">
  <Plus className="mr-2 h-5 w-5" />
  Nova Campanha
</Button>
```

---

## 🎨 Padrões Comuns para Todas as Abas

### Modais/Dialogs
```tsx
<DialogContent className="max-w-2xl backdrop-blur-sm bg-background/95 border-2 shadow-2xl">
  <DialogHeader>
    <DialogTitle className="flex items-center gap-2 text-2xl">
      <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl">
        <IconComponent className="h-6 w-6 text-white" />
      </div>
      Título do Modal
    </DialogTitle>
  </DialogHeader>
</DialogContent>
```

### Botões Primários
```tsx
className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
```

### Botões Secundários
```tsx
className="transition-all duration-300 hover:scale-105 hover:shadow-md"
```

### Badges
```tsx
className="shadow-md transition-all duration-300"
```

### Empty States
```tsx
<Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background">
  {/* Icon com glow effect */}
  {/* Título com gradiente */}
  {/* Descrição */}
  {/* CTA com gradiente */}
</Card>
```

---

## 📝 Checklist de Implementação

Para cada aba, verificar:

- [ ] Header com gradiente e texto centralizado
- [ ] Cards com hover effects (shadow-xl, -translate-y-1)
- [ ] Botões com gradientes e hover scale
- [ ] Empty state premium
- [ ] Badges com cores apropriadas
- [ ] Modais com backdrop blur
- [ ] Transições de 300ms em tudo
- [ ] Dark mode funcionando
- [ ] Responsividade mantida

---

**Data de criação**: 2025-01-23
**Referência**: `estilotop.md`
