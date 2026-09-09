
alter table public.support_threads
  drop constraint support_threads_user_id_key;

alter table public.support_messages
  add column thread_id uuid references public.support_threads(id) on delete cascade;

update public.support_messages m
set thread_id = t.id
from public.support_threads t
where m.user_id = t.user_id and m.thread_id is null;

alter table public.support_messages
  alter column thread_id set not null;

create index on public.support_messages (thread_id, created_at);

drop policy if exists "support_messages insert own as user" on public.support_messages;
create policy "support_messages insert own as user" on public.support_messages
  for insert with check (
    auth.uid() = user_id
    and sender = 'user'
    and exists (
      select 1 from public.support_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );
