# 🎨 Guia de Estilo Premium - Padrões Visuais do Sistema

Este documento contém todos os padrões de design premium implementados no sistema para referência futura.

## 📋 Índice
- [Gradientes](#gradientes)
- [Animações](#animações)
- [Sombras e Elevação](#sombras-e-elevação)
- [Hover Effects](#hover-effects)
- [Cards Premium](#cards-premium)
- [Badges e Status](#badges-e-status)
- [Botões Interativos](#botões-interativos)
- [Modais Premium](#modais-premium)
- [Empty States](#empty-states)
- [Timers e Contadores](#timers-e-contadores)
- [Cores e Temas](#cores-e-temas)

---

## 🌈 Gradientes

### Gradiente Principal (Orange → Yellow)
```tsx
// Background gradiente sutil
className="bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 dark:from-orange-950 dark:via-yellow-950 dark:to-orange-950"

// Texto com gradiente
className="bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 bg-clip-text text-transparent"

// Border gradiente (usando pseudo-elemento)
<div className="relative">
  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 rounded-xl blur opacity-30"></div>
  <div className="relative">Conteúdo aqui</div>
</div>
```

### Gradiente Secundário (Primary → Blue)
```tsx
// Para botões de ação principal
className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"

// Para decoração de QR Code
className="bg-gradient-to-br from-primary via-blue-600 to-purple-600"
```

### Gradiente de Sucesso (Green → Emerald)
```tsx
// Para mensagens de sucesso
className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent"
```

---

## ✨ Animações

### Pulse Effect (Pulsação)
```tsx
// Para elementos que precisam chamar atenção
className="animate-pulse"

// Exemplo: Timer de expiração
<div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 animate-pulse"></div>
```

### Ping Effect (Indicador Ativo)
```tsx
// Para status "conectado" ou "ativo"
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
</span>
```

### Spin Effect (Carregamento)
```tsx
// Para ícones de loading
<Loader2 className="h-4 w-4 animate-spin" />
<RefreshCw className="h-4 w-4 animate-spin" />
```

### Glow Effect (Brilho Animado)
```tsx
// Para criar efeito de brilho ao redor de elementos
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
  <div className="relative">
    {/* Conteúdo */}
  </div>
</div>
```

### Zoom In (Entrada Animada)
```tsx
// Para modais de sucesso
className="animate-in zoom-in-95 duration-500"
```

---

## 🎭 Sombras e Elevação

### Hierarquia de Sombras
```tsx
// Nível 1 - Sutil
className="shadow-sm"

// Nível 2 - Médio
className="shadow-md"

// Nível 3 - Elevado
className="shadow-lg"

// Nível 4 - Muito Elevado
className="shadow-xl"

// Nível 5 - Máximo
className="shadow-2xl"
```

### Sombras em Hover
```tsx
// Progressão suave
className="shadow-md hover:shadow-xl transition-shadow duration-300"
```

---

## 🎯 Hover Effects

### Scale Transform (Ampliação)
```tsx
// Para botões e cards interativos
className="transition-all duration-300 hover:scale-105"

// Exemplo completo de botão premium
className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
```

### Translate (Elevação)
```tsx
// Para cards com efeito de "levantar"
className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
```

### Border Highlight
```tsx
// Para indicar interatividade
className="border hover:border-primary/50 transition-colors duration-300"
```

---

## 🃏 Cards Premium

### Card Básico com Hover
```tsx
<Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
  {/* Conteúdo */}
</Card>
```

### Card de Teste (Orange Theme)
```tsx
<Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-orange-300 dark:border-orange-700 bg-gradient-to-br from-orange-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:to-yellow-950/20">
  {/* Badge no canto */}
  <div className="absolute top-0 right-0 bg-gradient-to-br from-orange-500 to-yellow-500 text-white text-xs px-3 py-1.5 rounded-bl-xl font-bold flex items-center gap-1.5 shadow-md z-10">
    <TestTube2 className="h-3.5 w-3.5" />
    TESTE
  </div>

  {/* Conteúdo */}
</Card>
```

### Card Promocional com Shimmer
```tsx
<div className="relative group">
  {/* Shimmer effect */}
  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>

  {/* Card */}
  <Card className="relative bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 dark:from-orange-950 dark:via-yellow-950 dark:to-orange-950 border-2 border-orange-300/50 dark:border-orange-700/50 shadow-lg">
    <CardContent className="py-5">
      {/* Conteúdo */}
    </CardContent>
  </Card>
</div>
```

---

## 🏷️ Badges e Status

### Badge com Ping Animation (Conectado)
```tsx
<Badge className="bg-green-500 text-white border-none shadow-md">
  <Wifi className="h-3 w-3 mr-1" />
  <span className="relative flex h-2 w-2 mr-1">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
  </span>
  Conectado
</Badge>
```

### Badge com Pulse (Conectando)
```tsx
<Badge className="bg-yellow-500 text-white border-none shadow-md animate-pulse">
  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
  Conectando
</Badge>
```

### Badge Gradiente Premium
```tsx
<div className="absolute top-0 right-0 bg-gradient-to-br from-orange-500 to-yellow-500 text-white text-xs px-3 py-1.5 rounded-bl-xl font-bold flex items-center gap-1.5 shadow-md z-10">
  <TestTube2 className="h-3.5 w-3.5" />
  TESTE
</div>
```

---

## 🔘 Botões Interativos

### Botão Primário com Gradiente
```tsx
<Button className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 hover:shadow-lg">
  <QrCode className="mr-2 h-4 w-4" />
  Conectar
</Button>
```

### Botão Call-to-Action Premium (Orange)
```tsx
<Button
  size="lg"
  className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
>
  <TestTube2 className="mr-2 h-5 w-5" />
  Criar Instância Grátis Agora
</Button>
```

### Botão Outline com Hover
```tsx
<Button
  variant="outline"
  className="transition-all duration-300 hover:scale-105 hover:shadow-md border-2"
>
  <RefreshCw className="mr-2 h-4 w-4" />
  Atualizar
</Button>
```

### Botão Destrutivo com Hover
```tsx
<Button
  variant="destructive"
  className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
>
  <WifiOff className="mr-2 h-4 w-4" />
  Desconectar
</Button>
```

---

## 🪟 Modais Premium

### Modal com Backdrop Blur
```tsx
<DialogContent className="max-w-md backdrop-blur-sm bg-background/95 border-2 shadow-2xl">
  <DialogHeader>
    <DialogTitle className="flex items-center gap-2 text-xl">
      <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-lg">
        <QrCode className="h-5 w-5 text-white" />
      </div>
      Conectar WhatsApp
    </DialogTitle>
  </DialogHeader>

  {/* Conteúdo */}
</DialogContent>
```

### Modal de Sucesso com Glow
```tsx
<div className="flex flex-col items-center justify-center py-10 space-y-5 animate-in zoom-in-95 duration-500">
  <div className="relative">
    {/* Glow effect */}
    <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>

    {/* Ícone */}
    <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 shadow-lg">
      <CheckCircle className="w-14 h-14 text-green-600 dark:text-green-400" />
    </div>
  </div>

  <div className="text-center space-y-2">
    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
      Conectado com Sucesso!
    </h3>
    <p className="text-sm text-muted-foreground">
      Sua instância está pronta para enviar mensagens
    </p>
  </div>
</div>
```

### Border Decorativa para QR Code
```tsx
<div className="relative p-1 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600">
  <div className="flex justify-center p-5 bg-white dark:bg-gray-900 rounded-xl">
    <img src={qrCode} alt="QR Code" className="w-64 h-64 rounded-lg" />
  </div>
</div>
```

### Lista Numerada Estilizada
```tsx
<ol className="space-y-2 ml-1">
  <li className="flex gap-3 items-start">
    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
    <span className="text-muted-foreground pt-0.5">Abra o WhatsApp no seu celular</span>
  </li>
  {/* Repetir para outros itens */}
</ol>
```

---

## 📭 Empty States

### Empty State Premium com Glow
```tsx
<Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background overflow-hidden">
  <CardContent className="py-16 px-6 text-center space-y-6">
    {/* Ícone com glow effect */}
    <div className="relative inline-block">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
      <div className="relative bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-950 dark:to-yellow-950 p-6 rounded-full">
        <Smartphone className="h-16 w-16 text-orange-600 dark:text-orange-400" />
      </div>
    </div>

    {/* Título com gradiente */}
    <div className="space-y-2">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 bg-clip-text text-transparent">
        Comece sua jornada
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto text-base">
        Crie sua primeira instância de WhatsApp e alcance milhares de clientes.
      </p>
    </div>

    {/* CTA Premium */}
    <div className="pt-4 max-w-md mx-auto">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative p-6 bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 dark:from-orange-950 dark:via-yellow-950 dark:to-orange-950 border-2 border-orange-300/50 dark:border-orange-700/50 rounded-xl shadow-lg">
          {/* Conteúdo do CTA */}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## ⏱️ Timers e Contadores

### Timer Premium com Animação
```tsx
<div className="relative overflow-hidden">
  {/* Background animado */}
  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 animate-pulse"></div>

  {/* Conteúdo */}
  <div className="relative flex items-center gap-2.5 text-sm px-3.5 py-2.5 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 border-2 border-orange-300 dark:border-orange-600 rounded-xl shadow-sm">
    <div className="bg-orange-500 dark:bg-orange-600 p-1.5 rounded-lg">
      <Clock className="h-3.5 w-3.5 text-white animate-pulse" />
    </div>
    <span className="font-bold text-orange-800 dark:text-orange-200">
      15 dias restantes
    </span>
  </div>
</div>
```

### Indicador de Status com Ping
```tsx
<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
  </span>
  Status atualizado automaticamente
</div>
```

---

## 🎨 Cores e Temas

### Paleta Orange/Yellow (Testes/Promoções)
```tsx
// Backgrounds
"bg-orange-50 dark:bg-orange-950"        // Muito claro
"bg-orange-100 dark:bg-orange-900"       // Claro
"bg-orange-500 dark:bg-orange-600"       // Médio
"bg-orange-600 dark:bg-orange-400"       // Escuro

// Texto
"text-orange-600 dark:text-orange-400"   // Destaque
"text-orange-700 dark:text-orange-300"   // Normal
"text-orange-800 dark:text-orange-200"   // Forte
"text-orange-900 dark:text-orange-100"   // Muito forte

// Borders
"border-orange-200 dark:border-orange-800"  // Sutil
"border-orange-300 dark:border-orange-700"  // Normal
"border-orange-300/50 dark:border-orange-700/50"  // Semi-transparente
```

### Paleta Green (Sucesso)
```tsx
"bg-green-100 dark:bg-green-900"
"text-green-600 dark:text-green-400"
"border-green-300 dark:border-green-700"
```

### Paleta Primary/Blue (Ações Principais)
```tsx
"bg-primary"
"text-primary"
"border-primary"
"from-primary to-blue-600"
```

### Opacidade e Transparência
```tsx
"opacity-20"     // Muito sutil
"opacity-30"     // Sutil
"opacity-50"     // Meio termo
"opacity-75"     // Visível
"bg-background/95"  // Quase opaco (para modais)
```

---

## 📐 Espaçamento e Layout

### Sistema de Espaçamento
```tsx
// Gap entre elementos
"gap-2"    // 8px
"gap-3"    // 12px
"gap-4"    // 16px (padrão principal)
"gap-5"    // 20px
"gap-6"    // 24px

// Padding
"p-3"      // 12px
"p-4"      // 16px
"p-5"      // 20px
"p-6"      // 24px
"px-3 py-2"  // Horizontal 12px, Vertical 8px

// Margin
"space-y-4"   // 16px vertical entre filhos
"space-y-5"   // 20px vertical entre filhos
"space-y-6"   // 24px vertical entre filhos
```

### Border Radius
```tsx
"rounded-lg"    // 8px (padrão para cards)
"rounded-xl"    // 12px (destaque)
"rounded-2xl"   // 16px (muito arredondado)
"rounded-full"  // Círculo perfeito
```

---

## 🔧 Utilitários Comuns

### Overflow e Clipping
```tsx
"overflow-hidden"           // Esconder conteúdo que ultrapassa
"bg-clip-text"             // Clipar background no texto
"text-transparent"         // Texto transparente (usar com bg-clip-text)
```

### Flexbox
```tsx
"flex items-center justify-between"  // Espaçar elementos nas extremidades
"flex items-center gap-2"            // Elementos centralizados com espaço
"flex-1"                             // Ocupar espaço disponível
"flex-shrink-0"                      // Não encolher
```

### Grid Responsivo
```tsx
"grid md:grid-cols-2 lg:grid-cols-3 gap-6"  // 1 col mobile, 2 tablet, 3 desktop
```

### Z-Index
```tsx
"z-10"   // Sobrepor elementos normais
"z-50"   // Modais e overlays
```

---

## 🎬 Transições

### Duração Padrão
```tsx
"transition-all duration-300"     // Padrão para hover effects
"transition duration-500"         // Para efeitos mais lentos
"transition-colors"              // Apenas cores
"transition-shadow"              // Apenas sombras
"transition-transform"           // Apenas transformações
```

---

## ✅ Checklist de Implementação

Ao criar um novo componente premium, certifique-se de incluir:

- [ ] Gradientes (background ou texto)
- [ ] Hover effects (scale, shadow, ou translate)
- [ ] Transições suaves (duration-300)
- [ ] Sombras adequadas ao contexto
- [ ] Dark mode support em todas as cores
- [ ] Animações quando aplicável (pulse, ping, spin)
- [ ] Border radius consistente
- [ ] Espaçamento do sistema (gap-4, space-y-4, etc)
- [ ] Estados disabled tratados
- [ ] Acessibilidade (aria-labels quando necessário)

---

## 📝 Notas Finais

- **Consistência**: Use sempre os mesmos padrões em componentes similares
- **Performance**: Animações devem ser suaves (60fps)
- **Acessibilidade**: Mantenha contraste adequado (WCAG AA)
- **Dark Mode**: Todos os componentes devem funcionar nos dois temas
- **Responsividade**: Teste em mobile, tablet e desktop

---

**Criado em**: 2025-01-23
**Última atualização**: 2025-01-23
**Versão**: 1.0
