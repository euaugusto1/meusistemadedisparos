-- =====================================================
-- MIGRATION: Allow admins to update any user profile
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- Drop the existing policy that only allows users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policy that allows users to update their own profile OR admins to update any profile
CREATE POLICY "Users can update own profile or admin can update any"
    ON profiles FOR UPDATE
    USING (auth.uid() = id OR is_admin(auth.uid()))
    WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

-- Verificar se a policy foi criada corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'UPDATE';
