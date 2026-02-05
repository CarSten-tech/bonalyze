-- Create push_subscriptions table
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  auth text not null,
  p256dh text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table push_subscriptions enable row level security;

-- Create policies
create policy "Users can view their own subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

-- Create index for faster lookups by user_id
create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);
