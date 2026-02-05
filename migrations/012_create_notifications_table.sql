create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  type text not null check (type in ('receipt', 'budget', 'system')),
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications (mark as read)"
  on notifications for update
  using (auth.uid() = user_id);

-- System/Server can insert (service_role) or potential user trigger via RPC (though usually actions)
-- For now, letting authenticated users insert might be needed if we trigger from client, 
-- but we plan to do it from server actions (which use service role or user context).
-- If server actions run as user, they need insert permissions IF we don't use service_role client.
-- Our `saveSubscription` uses `createClient` (standard user client presumably? or service wrapper?).
-- safe-server usually implies strict user context.
-- Let's allow insert for now if user belongs to household, BUT strictly speaking 
-- a user inserts notifications for *others*.
-- So user A inserts notification for User B.
create policy "Users can insert notifications for household members"
  on notifications for insert
  with check (
    exists (
      select 1 from household_members
      where household_members.household_id = notifications.household_id
      and household_members.user_id = auth.uid()
    )
  );
