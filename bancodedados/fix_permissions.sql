-- =====================================================
-- LIBERAR PERMISSÕES NO SUPABASE (RLS)
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- =====================================================

-- Opção 1: Desabilitar o RLS (Mais simples para ambiente de estudo/desenvolvimento)
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE board_user DISABLE ROW LEVEL SECURITY;

-- Se o owner_id da tabela boards precisar aceitar UUID do Supabase Auth:
-- ALTER TABLE boards ALTER COLUMN owner_id TYPE TEXT;
-- ALTER TABLE cards ALTER COLUMN created_by TYPE TEXT;
-- ALTER TABLE cards ALTER COLUMN assigned_to TYPE TEXT;
-- ALTER TABLE board_user ALTER COLUMN user_id TYPE TEXT;
