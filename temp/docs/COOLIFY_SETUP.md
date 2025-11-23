# Configuração Manual no Coolify

## ⚠️ IMPORTANTE: O Coolify está IGNORANDO o arquivo `.coolify.json`

Apesar de termos configurado `.coolify.json` com `"buildPack": "dockerfile"`, o Coolify continua usando Nixpacks.

## Solução: Configurar Manualmente na Interface do Coolify

### Passo 1: Acessar as Configurações do Projeto

1. Acesse a interface web do Coolify: `https://dev.wpp.sistemabrasil.online`
2. Vá até o projeto `meusistemadedisparos`
3. Clique em **Settings** ou **Configurações**

### Passo 2: Mudar o Build Pack

Procure por uma das seguintes opções:

- **Build Pack**: Mude de "Nixpacks" para "Dockerfile"
- **Build Method**: Selecione "Dockerfile"
- **Custom Dockerfile**: Ative esta opção

### Passo 3: Configurações de Build

Se houver opções avançadas de build, configure:

```
Build Command: (deixe vazio - o Dockerfile já tem)
Start Command: npm start
Port: 3000
```

### Passo 4: Variáveis de Ambiente CRÍTICAS

Configure estas variáveis de ambiente no Coolify (todas são OBRIGATÓRIAS):

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

#### UAZAPI (WhatsApp)
```
UAZAPI_BASE_URL=https://api.uazapi.com
UAZAPI_ADMIN_TOKEN=seu_token_admin
```

#### Mercado Pago
```
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=sua_public_key
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token
```

#### App
```
NEXT_PUBLIC_APP_URL=https://dev.wpp.sistemabrasil.online
```

⚠️ **IMPORTANTE**: Marque TODAS as variáveis como **Runtime e Build Time**

### Passo 5: Redeploy

Depois de fazer essas configurações:

1. Clique em **Deploy** ou **Redeploy**
2. Aguarde o build completar
3. Verifique os logs para confirmar que está usando o Dockerfile

## Verificação de Sucesso

Nos logs de build, você deve ver:

```
Building with Dockerfile...
```

E NÃO deve ver:

```
Generating nixpacks configuration...
```

## Se AINDA assim usar Nixpacks

Se mesmo após mudar nas configurações ainda usar Nixpacks:

1. **Delete o projeto** no Coolify
2. **Recrie o projeto** do zero
3. Na criação, selecione **explicitamente** "Dockerfile" como build method
4. Reconecte ao repositório GitHub

## Alternativa: Usar Docker Compose

Se nada funcionar, podemos mudar para Docker Compose:

1. Criar `docker-compose.yml` no repositório
2. Configurar Coolify para usar Docker Compose ao invés de Dockerfile
3. Isso dá controle total sobre o processo de build

---

## Problemas Conhecidos

### Erro Atual: Prerendering de páginas /404 e /500

```
Error: <Html> should not be imported outside of pages/_document
> Export encountered errors on following paths:
	/_error: /404
	/_error: /500
```

**Causa**: Next.js tenta fazer Static Site Generation de páginas de erro, mas o app requer renderização dinâmica.

**Soluções Aplicadas**:
- ✅ `export const dynamic = 'force-dynamic'` no layout raiz
- ✅ Criado `global-error.tsx` para App Router
- ✅ Desabilitado `output: 'standalone'`
- ✅ Configurado build sem static export

**Estas soluções funcionam APENAS se usar nosso Dockerfile customizado!**
