-- ==============================================================================
-- ADAPTAÇÃO DAS TABELAS PARA SUPABASE AUTH (UUID)
-- Execute este script no SQL Editor do Supabase Dashboard
-- ==============================================================================

-- 1. Remover constraints antigas de chaves estrangeiras com a tabela antiga 'users'
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_owner_id_fkey;
ALTER TABLE board_user DROP CONSTRAINT IF EXISTS board_user_user_id_fkey;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_created_by_fkey;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_assigned_to_fkey;

-- 2. Alterar o tipo das colunas de identificador de usuário para UUID
ALTER TABLE boards ALTER COLUMN owner_id TYPE UUID USING owner_id::text::uuid;
ALTER TABLE board_user ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
ALTER TABLE cards ALTER COLUMN created_by TYPE UUID USING created_by::text::uuid;
ALTER TABLE cards ALTER COLUMN assigned_to TYPE UUID USING assigned_to::text::uuid;

-- 3. Vincular chaves estrangeiras diretamente com o auth.users do Supabase
ALTER TABLE boards 
  ADD CONSTRAINT boards_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE board_user 
  ADD CONSTRAINT board_user_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE cards 
  ADD CONSTRAINT cards_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE cards 
  ADD CONSTRAINT cards_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Garantir que o RLS está desabilitado para desenvolvimento/testes
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE board_user DISABLE ROW LEVEL SECURITY;
