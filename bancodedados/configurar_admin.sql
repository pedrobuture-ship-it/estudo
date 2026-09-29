-- ==============================================================================
-- CONFIGURAR CONTROLE DE ADMINISTRADOR (is_admin)
-- Execute este script no SQL Editor do Supabase Dashboard
-- ==============================================================================

-- 1. Garantir que a tabela public.users existe e possui a coluna is_admin
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Importar os usuários do auth.users para public.users caso ainda não estejam lá
INSERT INTO public.users (id, name, email, is_admin)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name, 
    email,
    FALSE
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    email = EXCLUDED.email;

-- 3. Definir automaticamente o seu usuário (o primeiro criado) como ADMINISTRADOR
UPDATE public.users 
SET is_admin = TRUE 
WHERE id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
);

-- 4. Trigger para que todo novo usuário criado nasça como usuário comum (is_admin = FALSE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    FALSE
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

-- 5. Desabilitar RLS em users para a aplicação ler os dados e permissões
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
