-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default '',
  age           int,
  height_cm     numeric(5,1),
  weight_kg     numeric(5,1),
  goal_calories int not null default 2000,
  goal_protein  int not null default 150,
  goal_carbs    int not null default 250,
  goal_fat      int not null default 65,
  created_at    timestamptz not null default now(),
  unique(user_id)
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);

-- ─── Food Logs ────────────────────────────────────────────────────────────────
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table if not exists food_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  meal_type   meal_type not null,
  food_name   text not null,
  calories    numeric(7,1) not null default 0,
  protein_g   numeric(6,1) not null default 0,
  carbs_g     numeric(6,1) not null default 0,
  fat_g       numeric(6,1) not null default 0,
  quantity    numeric(7,1) not null default 100,
  unit        text not null default 'g',
  created_at  timestamptz not null default now()
);

create index on food_logs (user_id, date);

alter table food_logs enable row level security;

create policy "Users can view own food_logs"
  on food_logs for select using (auth.uid() = user_id);

create policy "Users can insert own food_logs"
  on food_logs for insert with check (auth.uid() = user_id);

create policy "Users can delete own food_logs"
  on food_logs for delete using (auth.uid() = user_id);

-- ─── Workout Sessions ─────────────────────────────────────────────────────────
create table if not exists workout_sessions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  split_name       text not null default '',
  duration_minutes int,
  notes            text,
  created_at       timestamptz not null default now()
);

create index on workout_sessions (user_id, date);

alter table workout_sessions enable row level security;

create policy "Users can view own workout_sessions"
  on workout_sessions for select using (auth.uid() = user_id);

create policy "Users can insert own workout_sessions"
  on workout_sessions for insert with check (auth.uid() = user_id);

create policy "Users can update own workout_sessions"
  on workout_sessions for update using (auth.uid() = user_id);

create policy "Users can delete own workout_sessions"
  on workout_sessions for delete using (auth.uid() = user_id);

-- ─── Workout Sets ─────────────────────────────────────────────────────────────
create table if not exists workout_sets (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  exercise_name text not null,
  muscle_group  text not null default '',
  set_number    int not null default 1,
  reps          int,
  weight_kg     numeric(6,2),
  duration_sec  int,
  created_at    timestamptz not null default now()
);

create index on workout_sets (session_id);

alter table workout_sets enable row level security;

create policy "Users can view own workout_sets"
  on workout_sets for select
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert own workout_sets"
  on workout_sets for insert
  with check (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );

create policy "Users can delete own workout_sets"
  on workout_sets for delete
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );
