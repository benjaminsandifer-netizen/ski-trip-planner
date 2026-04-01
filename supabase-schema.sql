-- ============================================================
-- Park City Ski Trip Planner — Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1a. DATE OPTIONS
-- Each row = one date-range option the admin created
create table if not exists date_options (
  id bigint generated always as identity primary key,
  label text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

alter table date_options enable row level security;
create policy "Allow all access to date_options"
  on date_options for all using (true) with check (true);

-- 1b. DATE VOTES
-- Each row = one person voting for one option (one vote per person)
create table if not exists date_votes (
  id bigint generated always as identity primary key,
  option_id bigint not null references date_options(id) on delete cascade,
  voter_name text not null,
  created_at timestamptz not null default now(),
  unique (voter_name)
);

alter table date_votes enable row level security;
create policy "Allow all access to date_votes"
  on date_votes for all using (true) with check (true);

-- 2. HOUSE LISTINGS
-- Each row = one house someone pasted in
create table if not exists house_listings (
  id bigint generated always as identity primary key,
  link text not null,
  photo_url text,
  price text not null,
  created_at timestamptz not null default now()
);

alter table house_listings enable row level security;
create policy "Allow all access to house_listings"
  on house_listings for all using (true) with check (true);

-- 3. HOUSE VOTES
-- Each row = one person's up/down vote on a house
create table if not exists house_votes (
  id bigint generated always as identity primary key,
  house_id bigint not null references house_listings(id) on delete cascade,
  voter_name text not null,
  direction text not null check (direction in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (house_id, voter_name)
);

alter table house_votes enable row level security;
create policy "Allow all access to house_votes"
  on house_votes for all using (true) with check (true);

-- 4. HOUSE COMMENTS
-- Each row = one comment on a house listing
create table if not exists house_comments (
  id bigint generated always as identity primary key,
  house_id bigint not null references house_listings(id) on delete cascade,
  author text not null,
  text text not null,
  created_at timestamptz not null default now()
);

alter table house_comments enable row level security;
create policy "Allow all access to house_comments"
  on house_comments for all using (true) with check (true);

-- 5. SHOPPING / PACKING LIST
create table if not exists shopping_items (
  id bigint generated always as identity primary key,
  text text not null,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table shopping_items enable row level security;
create policy "Allow all access to shopping_items"
  on shopping_items for all using (true) with check (true);

-- Optional: enable realtime for all tables
alter publication supabase_realtime add table date_options;
alter publication supabase_realtime add table date_votes;
alter publication supabase_realtime add table house_listings;
alter publication supabase_realtime add table house_votes;
alter publication supabase_realtime add table house_comments;
alter publication supabase_realtime add table shopping_items;
