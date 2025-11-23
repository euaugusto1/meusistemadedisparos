# Configuração do n8n no Coolify

## Problema
A página de Agentes IA mostra "Falha ao buscar agentes" porque as variáveis de ambiente do n8n não estão configuradas no servidor de produção.

## Solução

### 1. Acessar Configuração de Variáveis de Ambiente no Coolify

1. Acesse seu painel do Coolify
2. Vá para o projeto **meusistemadedisparos**
3. Clique em **Environment Variables** ou **Variáveis de Ambiente**

### 2. Adicionar as Variáveis do n8n

Adicione as seguintes variáveis de ambiente:

```
N8N_API_URL=https://dev.n8n.sistemabrasil.online/api/v1
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTYxNDJhMi1kMDIzLTQ1OTYtYWZkMy0xMTI5NTY4MzcyYTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzOTI1OTIyfQ.FccQV_2o06C-xdI6cKC-hqksLbIfOpvC3-5rsVqXsvA
```

### 3. Fazer Redeploy

Após adicionar as variáveis:
1. Salve as configurações
2. Faça um **redeploy** da aplicação
3. As variáveis estarão disponíveis em `process.env`

### 4. Verificar se Funcionou

Após o redeploy:
1. Acesse a página `/agents`
2. Os agentes do n8n devem aparecer corretamente
3. Verifique o console do navegador para confirmar que não há mais erros

## Notas Importantes

⚠️ **Segurança**:
- Nunca commite o arquivo `.env.local` no git
- As variáveis de ambiente ficam seguras no Coolify
- O token API do n8n tem acesso completo - proteja-o

✅ **Validação**:
- Certifique-se de que a URL do n8n está acessível: https://dev.n8n.sistemabrasil.online/api/v1
- Teste se o token API está válido fazendo uma requisição manual

## Troubleshooting

Se ainda não funcionar após configurar:

1. **Verificar logs do Coolify**: Veja se há erros de conexão com n8n
2. **Testar URL manualmente**:
   ```bash
   curl https://dev.n8n.sistemabrasil.online/api/v1/workflows \
     -H "X-N8N-API-KEY: SEU_TOKEN_AQUI"
   ```
3. **Verificar se n8n está rodando**: Acesse https://dev.n8n.sistemabrasil.online
4. **Checar firewall**: Certifique-se de que o servidor pode acessar o n8n
