CREATE POLICY "Anon read app_user_roles" ON public.app_user_roles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write app_user_roles" ON public.app_user_roles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update app_user_roles" ON public.app_user_roles FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access_rules" ON public.access_rules FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write access_rules" ON public.access_rules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update access_rules" ON public.access_rules FOR UPDATE TO anon USING (true) WITH CHECK (true);