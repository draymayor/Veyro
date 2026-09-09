
drop policy "support_messages insert own" on public.support_messages;

create or replace function public.reopen_thread_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender = 'user' then
    update public.support_threads
    set status = 'open', updated_at = now()
    where id = new.thread_id and status = 'resolved';
  end if;
  return new;
end;
$$;
