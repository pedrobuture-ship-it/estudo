-- ==============================================================================
-- ADICIONAR PRIORIDADE AOS CARDS E SINCRONIZAR USUÁRIOS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ==============================================================================

-- 1. Adicionar coluna de prioridade na tabela de cards
ALTER TABLE cards ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Baixa';

-- 2. Recriar tabela pública de usuários compatível com Supabase Auth (UUID)
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Copiar os usuários já cadastrados no Supabase Auth para a tabela public.users
INSERT INTO public.users (id, name, email)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name, 
    email 
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    email = EXCLUDED.email;

-- 4. Criar Trigger para que todo novo usuário cadastrado seja salvo automaticamente em public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Desabilitar RLS em users para permitir que a aplicação liste os membros
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
