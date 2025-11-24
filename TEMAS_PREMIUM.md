# 🎨 Sistema de Temas Premium

Sistema completo de personalização visual com **8 temas únicos e criativos**, todos baseados no `estilotop.md`.

## 📍 Como Usar

1. Clique no **avatar do usuário** no canto superior direito
2. Selecione **"Escolher Tema"** (ícone de paleta 🎨)
3. Escolha um dos temas disponíveis (varia conforme seu plano)
4. O tema é **salvo automaticamente** e aplicado em todo o sistema!

## 🔒 Temas por Plano

### Plano FREE
- **1 tema disponível**: Neutral Gray ⚪
- Tema padrão elegante e profissional

### Planos BRONZE ou Superior
- **8 temas disponíveis**: Todos os temas premium!
- Acesso completo a todas as variações de cores e estilos

## 🌊 1. Ocean Blue (Padrão)
**Descrição**: Profissional e confiável

**Cores**:
- Primary: Cyan/Sky Blue
- Gradiente: Cyan → Blue → Indigo
- Ideal para: Ambientes corporativos, profissionais e confiáveis

**Estilo**:
```
from-cyan-500 via-blue-600 to-indigo-600
```

**Emoção**: Confiança, profissionalismo, clareza

---

## 🌅 2. Sunset Glow
**Descrição**: Vibrante e energético

**Cores**:
- Primary: Orange
- Gradiente: Orange → Red → Pink
- Ideal para: Energia, criatividade, ação

**Estilo**:
```
from-orange-500 via-red-500 to-pink-600
```

**Emoção**: Energia, paixão, dinamismo

---

## 🌲 3. Forest Green
**Descrição**: Natural e relaxante

**Cores**:
- Primary: Emerald Green
- Gradiente: Emerald → Green → Teal
- Ideal para: Bem-estar, sustentabilidade, crescimento

**Estilo**:
```
from-emerald-500 via-green-600 to-teal-600
```

**Emoção**: Natureza, crescimento, harmonia

---

## 🌌 4. Galaxy Purple
**Descrição**: Místico e inovador

**Cores**:
- Primary: Purple
- Gradiente: Purple → Violet → Fuchsia
- Ideal para: Inovação, criatividade, tecnologia

**Estilo**:
```
from-purple-500 via-violet-600 to-fuchsia-600
```

**Emoção**: Criatividade, mistério, inovação

---

## ✨ 5. Aurora Borealis
**Descrição**: Mágico e inspirador

**Cores**:
- Primary: Cyan
- Gradiente: Cyan → Blue → Purple (aurora effect)
- Ideal para: Inspiração, magia, transformação

**Estilo**:
```
from-cyan-400 via-blue-500 to-purple-600
```

**Emoção**: Magia, inspiração, transformação

---

## 🎄 6. Christmas Spirit
**Descrição**: Festivo e caloroso

**Cores**:
- Primary: Red
- Gradiente: Red → Green → Red (cores natalinas)
- Ideal para: Época festiva, celebrações, alegria

**Estilo**:
```
from-red-600 via-green-600 to-red-600
```

**Emoção**: Festividade, alegria, calor humano

**Especial**: Perfeito para a temporada de Natal! 🎅

---

## ⚪ 7. Neutral Gray ⭐ PADRÃO PLANO FREE
**Descrição**: Elegante e atemporal

**Cores**:
- Primary: Gray
- Gradiente: Slate → Gray → Zinc (tons neutros)
- Ideal para: Ambientes corporativos sérios, apresentações

**Estilo**:
```
from-slate-600 via-gray-600 to-zinc-600
```

**Emoção**: Elegância, sobriedade, atemporalidade

**Especial**:
- ✅ Tema padrão do plano FREE
- ✅ Ideal para ambientes que exigem neutralidade visual
- ✅ Disponível para todos os usuários

---

## ◼️ 8. Minimal Black
**Descrição**: Limpo e sofisticado

**Cores**:
- Primary: Zinc Black
- Gradiente: Zinc → Neutral → Stone (tons escuros)
- Ideal para: Design minimalista, foco no conteúdo

**Estilo**:
```
from-zinc-900 via-neutral-800 to-stone-900
```

**Emoção**: Sofisticação, modernidade, minimalismo

**Especial**: Perfeito para quem quer foco total no conteúdo

---

## 🎯 Elementos que Mudam com o Tema

✅ **Headers**: Gradientes dos títulos principais
✅ **Cards**: Bordas, backgrounds e hover effects
✅ **Badges**: Cores e gradientes
✅ **Botões**: Cores primárias e hover states
✅ **Glow Effects**: Cores dos efeitos de brilho
✅ **Shadows**: Tons das sombras
✅ **Navigation**: Cores dos itens ativos
✅ **Charts**: Cores dos gráficos

## 💾 Persistência

- O tema escolhido é salvo no **localStorage**
- Carrega automaticamente ao fazer login
- Mantém o tema entre sessões
- Independente do modo claro/escuro

## 🔧 Arquitetura Técnica

### Arquivos Principais:

1. **`src/lib/themes.ts`**
   - Definição de todos os 5 temas
   - Função `applyTheme()` para aplicar CSS variables
   - Função `getStoredTheme()` para recuperar tema salvo
   - Gerenciamento de CSS variables

2. **`src/components/dashboard/ThemeSelector.tsx`**
   - Modal de seleção de temas
   - Preview visual de cada tema com cards interativos
   - Interface premium com animações e glow effects
   - Dispara evento 'theme-change' ao trocar tema

3. **`src/components/dashboard/ThemeProvider.tsx`** ⭐ **NOVO**
   - Componente que injeta CSS dinâmico
   - Sobrescreve classes Tailwind compiladas com `!important`
   - Escuta evento 'theme-change' para atualizar estilos em tempo real
   - Garante que todos os gradientes respondam ao tema selecionado

4. **`src/hooks/useTheme.ts`**
   - Hook para carregar tema salvo do localStorage
   - Aplica tema automaticamente ao montar

5. **`src/components/dashboard/DashboardWrapper.tsx`**
   - Wrapper client-side para o layout do dashboard
   - Integra ThemeProvider e useTheme
   - Permite carregamento de tema no lado do cliente

6. **`src/components/dashboard/Header.tsx`**
   - Botão "Escolher Tema" no menu do usuário
   - Integração com ThemeSelector modal
   - Posicionado abaixo de "Meu Plano"

7. **`src/app/(dashboard)/layout.tsx`**
   - Modificado para usar DashboardWrapper
   - Permite aplicação de temas client-side

8. **`src/app/globals.css`**
   - CSS variables base para temas
   - Classe `.theme-transition` para transições suaves
   - Suporte a customização dinâmica

## 🔍 Como Funciona Tecnicamente

### Desafio: Tailwind CSS e Temas Dinâmicos

Tailwind compila classes como `from-cyan-500 via-blue-600 to-indigo-600` em **build time**, tornando impossível mudá-las com CSS variables em runtime.

### Solução: ThemeProvider com CSS Injection

O `ThemeProvider` injeta CSS dinâmico que sobrescreve as classes Tailwind:

```typescript
// Exemplo: classe Tailwind original
.bg-gradient-to-r.from-primary.to-blue-600 {
  // Compilado com cores fixas
}

// ThemeProvider injeta com !important
.bg-gradient-to-r.from-primary.to-blue-600 {
  background-image: linear-gradient(to right,
    rgb(var(--theme-gradient-from)),
    rgb(var(--theme-gradient-to))
  ) !important;
}
```

### Fluxo de Aplicação do Tema

1. **Carregamento Inicial** (`DashboardWrapper` mount)
   - `useTheme()` carrega tema do localStorage
   - `applyTheme()` define CSS variables no `:root`
   - `ThemeProvider` injeta CSS dinâmico

2. **Mudança de Tema** (usuário seleciona novo tema)
   - `ThemeSelector` chama `applyTheme(variant)`
   - Dispara evento `window.dispatchEvent('theme-change')`
   - `ThemeProvider` escuta evento e atualiza CSS injetado
   - Mudança visual instantânea sem reload

3. **Persistência**
   - `localStorage.setItem('theme-variant', variant)`
   - Tema persiste entre sessões
   - Carrega automaticamente no próximo login

## 🎨 Padrões do estilotop.md Aplicados

Todos os temas seguem rigorosamente o `estilotop.md`:

✅ Gradientes múltiplos (3 cores)
✅ Transições de 300-500ms
✅ Hover effects (scale, shadow, translate)
✅ Glow effects com blur + opacity
✅ Shadow hierarchy (sm → md → xl)
✅ Badges com gradientes e shadows
✅ Cards com hover effects premium
✅ Animações suaves (pulse, ping)

## ✅ Status: IMPLEMENTADO E FUNCIONAL

- ✅ Sistema de temas completo
- ✅ **8 temas criativos** baseados em estilotop.md
  - 🌊 Ocean Blue (Bronze+)
  - 🌅 Sunset Glow (Bronze+)
  - 🌲 Forest Green (Bronze+)
  - 🌌 Galaxy Purple (Bronze+)
  - ✨ Aurora Borealis (Bronze+)
  - 🎄 Christmas Spirit (Bronze+) **(NOVO!)**
  - ⚪ Neutral Gray (FREE + Todos os planos) **(PADRÃO FREE)**
  - ◼️ Minimal Black (Bronze+) **(NOVO!)**
- ✅ Seletor visual premium
- ✅ **Sistema de restrição por plano**
  - Plano FREE: 1 tema (Neutral Gray)
  - Planos Bronze+: 8 temas completos
- ✅ Temas bloqueados com ícone de cadeado
- ✅ Banner de upgrade para usuários FREE
- ✅ Persistência com localStorage
- ✅ Mudança instantânea sem reload
- ✅ Cobertura de todos os gradientes do sistema
- ✅ ThemeProvider com CSS injection dinâmico
- ✅ Event-driven updates

---

**Criado em**: 2025-01-24
**Atualizado em**: 2025-01-24 (8 temas disponíveis!)
**Baseado em**: `estilotop.md`
**Versão**: 1.1 (Production Ready - Extended Edition)
