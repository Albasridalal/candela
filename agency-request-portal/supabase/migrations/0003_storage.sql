-- Storage bucket for reference files in and final deliverables out.
-- Private: the app hands out short-lived signed URLs instead of public links.

insert into storage.buckets (id, name, public)
values ('request-attachments', 'request-attachments', false)
on conflict (id) do nothing;

do $$
begin
  execute 'drop policy if exists request_attachments_read on storage.objects';
  execute 'drop policy if exists request_attachments_write on storage.objects';
  execute 'drop policy if exists request_attachments_delete on storage.objects';

  execute $policy$
    create policy request_attachments_read on storage.objects
      for select to authenticated
      using (bucket_id = 'request-attachments')
  $policy$;

  execute $policy$
    create policy request_attachments_write on storage.objects
      for insert to authenticated
      with check (bucket_id = 'request-attachments')
  $policy$;

  execute $policy$
    create policy request_attachments_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'request-attachments')
  $policy$;
end $$;
