-- Verificar se a tabela system_settings existe e tem dados

-- 1. Listar todas as tabelas
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar dados na tabela system_settings
SELECT * FROM system_settings WHERE key = 'mercadopago';

-- 3. Contar registros
SELECT COUNT(*) as total FROM system_settings;
