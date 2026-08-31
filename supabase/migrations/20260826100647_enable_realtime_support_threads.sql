-- support_threads was never added to the supabase_realtime publication
-- (only support_messages was, in 20260823113318). The consumer Support
-- page already subscribes to UPDATE events on support_threads (status
-- changes), and the admin Support Inbox needs the same subscription to
-- reflect the reopen_support_thread_on_user_message trigger firing live
-- while an admin has a resolved thread open, none of which can ever
-- deliver without the table being in the publication, RLS aside.
alter publication supabase_realtime add table public.support_threads;
