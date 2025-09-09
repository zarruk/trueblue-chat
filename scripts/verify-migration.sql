-- =====================================================
-- VERIFICACIÓN DE MIGRACIÓN MULTI-CLIENTE
-- =====================================================

-- 1. Verificar que el cliente Trueblue existe
SELECT 'Cliente Trueblue' as check_name, 
       CASE WHEN EXISTS (SELECT 1 FROM clients WHERE slug = 'trueblue') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

-- 2. Verificar que no hay registros sin client_id
SELECT 'Profiles sin client_id' as check_name,
       CASE WHEN COUNT(*) = 0 
            THEN '✅ TODOS TIENEN CLIENT_ID' 
            ELSE '❌ ' || COUNT(*) || ' SIN CLIENT_ID' 
       END as status
FROM profiles WHERE client_id IS NULL;

SELECT 'Conversaciones sin client_id' as check_name,
       CASE WHEN COUNT(*) = 0 
            THEN '✅ TODAS TIENEN CLIENT_ID' 
            ELSE '❌ ' || COUNT(*) || ' SIN CLIENT_ID' 
       END as status
FROM tb_conversations WHERE client_id IS NULL;

SELECT 'Agentes sin client_id' as check_name,
       CASE WHEN COUNT(*) = 0 
            THEN '✅ TODOS TIENEN CLIENT_ID' 
            ELSE '❌ ' || COUNT(*) || ' SIN CLIENT_ID' 
       END as status
FROM tb_agents WHERE client_id IS NULL;

SELECT 'Plantillas sin client_id' as check_name,
       CASE WHEN COUNT(*) = 0 
            THEN '✅ TODAS TIENEN CLIENT_ID' 
            ELSE '❌ ' || COUNT(*) || ' SIN CLIENT_ID' 
       END as status
FROM message_templates WHERE client_id IS NULL;

-- 3. Verificar que las funciones existen
SELECT 'Función get_current_user_client_id' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_client_id') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

SELECT 'Función get_client_config' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_client_config') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

SELECT 'Función create_client' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_client') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

-- 4. Verificar que las políticas RLS están activas
SELECT 'RLS Profiles' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles') 
            THEN '✅ ACTIVAS' 
            ELSE '❌ NO ACTIVAS' 
       END as status;

SELECT 'RLS Conversations' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tb_conversations') 
            THEN '✅ ACTIVAS' 
            ELSE '❌ NO ACTIVAS' 
       END as status;

SELECT 'RLS Agents' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tb_agents') 
            THEN '✅ ACTIVAS' 
            ELSE '❌ NO ACTIVAS' 
       END as status;

SELECT 'RLS Message Templates' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_templates') 
            THEN '✅ ACTIVAS' 
            ELSE '❌ NO ACTIVAS' 
       END as status;

-- 5. Verificar configuración del cliente Trueblue
SELECT 'Configuración branding Trueblue' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM client_configs WHERE client_id = '550e8400-e29b-41d4-a716-446655440000' AND config_key = 'branding') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

SELECT 'Configuración features Trueblue' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM client_configs WHERE client_id = '550e8400-e29b-41d4-a716-446655440000' AND config_key = 'features') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

SELECT 'Configuración limits Trueblue' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM client_configs WHERE client_id = '550e8400-e29b-41d4-a716-446655440000' AND config_key = 'limits') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

-- 6. Verificar índices
SELECT 'Índice profiles_client_id' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_client_id') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

SELECT 'Índice conversations_client_id' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_client_id') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

-- 7. Resumen de datos migrados
SELECT 'Resumen de migración' as section, '' as details;

SELECT 'Total de clientes' as metric, COUNT(*)::text as value FROM clients;

SELECT 'Total de perfiles migrados' as metric, COUNT(*)::text as value FROM profiles;

SELECT 'Total de conversaciones migradas' as metric, COUNT(*)::text as value FROM tb_conversations;

SELECT 'Total de agentes migrados' as metric, COUNT(*)::text as value FROM tb_agents;

SELECT 'Total de plantillas migradas' as metric, COUNT(*)::text as value FROM message_templates;

SELECT 'Total de configuraciones de cliente' as metric, COUNT(*)::text as value FROM client_configs;

-- 8. Verificar vista current_client_info
SELECT 'Vista current_client_info' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'current_client_info') 
            THEN '✅ EXISTE' 
            ELSE '❌ NO EXISTE' 
       END as status;

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================
