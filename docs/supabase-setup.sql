-- Схема хранилища «Экспертный совет» (идеи, комментарии, голоса).
-- Вставьте этот файл целиком в Supabase: SQL Editor → New query → Run.

create extension if not exists pgcrypto;

-- Идеи экспертов (прикрепляются к разделам платформы)
create table public.ideas (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author     text not null check (char_length(author) between 1 and 80),
  section    text not null check (char_length(section) between 1 and 40),
  kind       text not null default 'idea' check (kind in ('idea', 'critique')),
  title      text not null check (char_length(title) between 3 and 140),
  body       text not null check (char_length(body) between 3 and 2000)
);

-- Комментарии к идеям
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  idea_id    uuid not null references public.ideas (id) on delete cascade,
  author     text not null check (char_length(author) between 1 and 80),
  body       text not null check (char_length(body) between 1 and 1000)
);

-- Голоса «Поддержать» (один голос с устройства на идею)
create table public.votes (
  idea_id    uuid not null references public.ideas (id) on delete cascade,
  client_id  text not null check (char_length(client_id) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (idea_id, client_id)
);

create index comments_idea_idx on public.comments (idea_id);

-- Права: гости могут читать и добавлять; менять и удалять — никто (кроме вас через панель)
alter table public.ideas    enable row level security;
alter table public.comments enable row level security;
alter table public.votes    enable row level security;

create policy "ideas: читать всем"     on public.ideas    for select to anon, authenticated using (true);
create policy "ideas: добавлять всем"  on public.ideas    for insert to anon, authenticated with check (true);
create policy "comments: читать всем"    on public.comments for select to anon, authenticated using (true);
create policy "comments: добавлять всем" on public.comments for insert to anon, authenticated with check (true);
create policy "votes: читать всем"     on public.votes    for select to anon, authenticated using (true);
create policy "votes: добавлять всем"  on public.votes    for insert to anon, authenticated with check (true);

-- Обновления в реальном времени (граф обновляется без перезагрузки страницы)
alter publication supabase_realtime add table public.ideas;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.votes;
