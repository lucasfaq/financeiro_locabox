insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos-atividades', 'anexos-atividades', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy "equipe le anexos de atividades" on storage.objects for select to authenticated using (bucket_id = 'anexos-atividades');
create policy "usuarios enviam anexos proprios" on storage.objects for insert to authenticated with check (bucket_id = 'anexos-atividades' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "usuarios atualizam anexos proprios" on storage.objects for update to authenticated using (bucket_id = 'anexos-atividades' and owner_id = (select auth.uid()::text)) with check (bucket_id = 'anexos-atividades' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "usuarios excluem anexos proprios" on storage.objects for delete to authenticated using (bucket_id = 'anexos-atividades' and owner_id = (select auth.uid()::text));
