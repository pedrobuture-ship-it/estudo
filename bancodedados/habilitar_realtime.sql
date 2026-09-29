-- ==============================================================================
-- HABILITAR REALTIME NO SUPABASE PARA CARTÕES E LISTAS DO KANBAN
-- Execute este script no SQL Editor do seu Dashboard do Supabase
-- ==============================================================================

-- 1. Habilitar a publicação supabase_realtime para as tabelas cards e lists
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE lists;

-- 2. Definir REPLICA IDENTITY FULL para que os payloads realtime contenham 
-- todos os dados do registro antes e depois da alteração
ALTER TABLE cards REPLICA IDENTITY FULL;
ALTER TABLE lists REPLICA IDENTITY FULL;
