# CaloriTracker

> A professional cross-platform health & fitness mobile app for iOS and Android — built with React Native (Expo), Supabase, and open-source nutrition & exercise data.

![License](https://img.shields.io/badge/license-MIT-green)
![Expo](https://img.shields.io/badge/Expo-SDK%2057-blue)
![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Flow](#user-flow)
4. [Food Search Flow](#food-search-flow)
5. [Workout Logging Flow](#workout-logging-flow)
6. [Database Schema](#database-schema)
7. [Features](#features)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Setup Guide](#setup-guide)
11. [Workout Splits](#workout-splits)
12. [Data Sources](#data-sources)

---

## Overview

CaloriTracker is a full-featured personal health companion that combines nutrition tracking, structured workout programs, and body analytics in a single polished mobile app.

**Core capabilities:**

- 🍎 Track daily **calorie & macro intake** across 4 meal types with a searchable food diary — edit quantities anytime with live macro recalculation
- ⚡ **Instant food search** — searches a local Supabase DB of 256 Indian & global foods first, falls back to Open Food Facts and auto-saves results
- 🗓️ **My Plan** — commit to a workout program and track weekly progress day-by-day with a checklist, a "Next Up" card, and Continue / Repeat session options
- 💪 Follow structured **workout splits** (PPL, Upper/Lower, Arnold, Full Body, Bro Split, PHUL)
- 📋 Pre-loaded exercise lists per split day — start logging immediately, no manual searching
- ⏱️ **Live workout logger** with set/rep/weight/RPE tracking and an auto-start rest timer
- ⚖️ **Body weight tracking** with a smooth trend chart and goal weight line
- 🗓️ **Activity heatmap** — GitHub-style 26-week training calendar
- 🧠 **1RM Calculator** (Epley formula) with percentage breakdown by training goal
- 📈 **Strength progress charts** per exercise with personal record badges

All data is stored in your own **Supabase PostgreSQL** instance with Row-Level Security — nobody else can see your data.

---

## Architecture

```mermaid
graph TD
    subgraph Mobile["📱 Mobile App · React Native · Expo SDK 57"]
        direction TB
        Auth["Auth Screens\n(Login · Register · Onboarding)"]
        Tabs["Tab Navigation · Expo Router"]
        Dashboard["Dashboard\nCalorie ring · Macros · Weekly chart"]
        Calories["Calories\nFood diary · Edit quantity · Date nav"]
        Exercise["Exercise\nMy Plan · Programs · Logger · History · Progress"]
        Profile["Profile\nBody weight · Heatmap · Goals"]
    end

    subgraph State["State & Data Layer"]
        AuthCtx["AuthContext\nSupabase session + user profile"]
        TQ["TanStack Query\nCache · Background refetch · Mutations"]
        Queries["lib/queries/\ncalories.ts · exercise.ts · bodyweight.ts"]
        AS["AsyncStorage\nactive_program · week restart timestamp"]
    end

    subgraph Backend["☁️ Supabase"]
        SupaAuth["Auth\nJWT · Email/Password · Auto-refresh"]
        DB["PostgreSQL\nRow-Level Security"]
        FoodsDB["foods table\n256 Indian + global foods"]
    end

    subgraph External["🌐 External APIs"]
        OFF["Open Food Facts\n3M+ products · fallback only"]
    end

    Auth --> Tabs
    Tabs --> Dashboard & Calories & Exercise & Profile
    Dashboard & Calories & Exercise & Profile --> TQ
    TQ --> Queries
    Queries --> AuthCtx
    Queries --> SupaAuth & DB
    Exercise --> AS
    Calories -->|"search"| FoodsDB
    FoodsDB -->|"miss → fallback"| OFF
    OFF -->|"auto-save"| FoodsDB
```

---

## User Flow

```mermaid
flowchart TD
    Launch([App Launch]) --> AuthGate{Supabase session?}

    AuthGate -->|No session| AuthGroup["Auth Group"]
    AuthGroup --> Login["Login"]
    AuthGroup --> Register["Register"]
    Register --> Onboarding["Onboarding — Goals and Body Stats"]
    Login & Onboarding --> TabGroup

    AuthGate -->|Has session| TabGroup["Tab Navigation"]

    TabGroup --> T1["Dashboard"]
    TabGroup --> T2["Calories"]
    TabGroup --> T3["Exercise"]
    TabGroup --> T4["Profile"]

    T1 --> D1["Calorie ring · Macro grid · Weekly chart"]

    T2 --> C1["Date picker · Meal sections · Food diary"]
    C1 --> C2["Add Food — Search modal"]
    C1 --> C_edit["Edit Food — Update quantity · Live macro preview"]
    C2 --> C3{"Found in local DB?"}
    C3 -->|"Yes — instant"| C4["Show results"]
    C3 -->|"No — fallback"| C5["Open Food Facts API"]
    C5 --> C4

    T3 --> E0["My Plan tab"]
    E0 --> E0a{"Program selected?"}
    E0a -->|"No"| E0b["CTA — Browse Programs"]
    E0a -->|"Yes"| E0c["Weekly checklist · Next Up card · Progress bar"]
    E0c --> E0d{"Day status?"}
    E0d -->|"Not done"| E0e["Start — pre-loaded exercises"]
    E0d -->|"Done"| E0f["Continue — previous weights pre-filled\nor Repeat — blank session"]
    T3 --> E1["Programs tab · Split cards"]
    E1 --> E1a["Follow This Program — persists to AsyncStorage"]
    E1 --> E2["Start Day · Pre-loaded exercises"]
    E2 --> E3["Live Workout Logger · Sets · Reps · Weight · RPE"]
    E3 --> E4["Rest timer auto-starts · Screen stays awake"]
    E3 --> E5["Finish — saved to Supabase"]
    E5 --> E0c

    T4 --> P1["Body stats · BMI"]
    T4 --> P2["Body weight chart · Log weight"]
    T4 --> P3["26-week heatmap"]
    T4 --> P4["Goals · Calories · Macros"]
```

---

## Food Search Flow

```mermaid
sequenceDiagram
    actor User
    participant Modal as FoodSearchModal
    participant Cache as In-Memory Cache
    participant Local as Supabase foods table
    participant Api as Open Food Facts API

    User->>Modal: Types query (debounce 400ms)
    Modal->>Cache: Check session cache
    alt Cache hit (< 5 min old)
        Cache-->>Modal: Return instantly ⚡
    else Cache miss
        Modal->>Local: Full-text search (search_vec)
        Local-->>Modal: Results (< 100ms)
        alt 3 or more results found
            Modal-->>User: Show results instantly ⚡
        else Fewer than 3 results
            Modal->>Api: GET world.openfoodfacts.org
            Note over Modal,Api: 5-second hard timeout
            Api-->>Modal: Products list
            Modal->>Local: Auto-save new foods (background)
            Modal-->>User: Show merged results
        end
        Modal->>Cache: Store results (5 min TTL)
    end
    alt Timeout exceeded
        Modal-->>User: Show Retry button
    end
```

---

## Workout Logging Flow

```mermaid
flowchart LR
    A(["My Plan — tap Next Up or Start"]) --> B["WorkoutSession opens"]
    B --> B1{"Continue or Repeat?"}
    B1 -->|"Continue"| B2["Pre-fill previous weights/reps\n+ remaining split exercises below"]
    B1 -->|"Repeat / fresh start"| B3["All exercises blank · split defaults"]
    B2 & B3 --> C["expo-keep-awake — screen stays on"]
    C --> D["Workout timer starts"]
    D --> E["Log set — Reps · Weight · RPE"]
    E --> F["Tick set done"]
    F --> G["Rest timer auto-starts"]
    G --> H{Rest done?}
    H -->|Vibrate alert| E
    E --> I{More exercises?}
    I -->|Yes| E
    I -->|No| J["Finish Workout"]
    J --> K["createWorkoutSession + addWorkoutSets"]
    K --> L[("Supabase — workout_sessions + workout_sets")]
    L --> M["TanStack Query invalidates"]
    M --> N["My Plan checklist updates · History updates"]
```

---

## Database Schema

```mermaid
erDiagram
    auth_users {
        uuid id PK
        text email
        timestamptz created_at
    }

    profiles {
        uuid id PK
        uuid user_id FK
        text name
        int age
        numeric height_cm
        numeric weight_kg
        int goal_calories
        int goal_protein
        int goal_carbs
        int goal_fat
        timestamptz created_at
    }

    food_logs {
        uuid id PK
        uuid user_id FK
        date date
        text meal_type
        text food_name
        numeric quantity_g
        numeric calories
        numeric protein_g
        numeric carbs_g
        numeric fat_g
        timestamptz created_at
    }

    foods {
        uuid id PK
        text name
        text brand
        numeric energy_kcal
        numeric protein_g
        numeric carbs_g
        numeric fat_g
        text image_url
        text source
        int search_hits
        tsvector search_vec
        timestamptz created_at
    }

    body_weight_logs {
        uuid id PK
        uuid user_id FK
        date date
        numeric weight_kg
        text notes
        timestamptz created_at
    }

    workout_sessions {
        uuid id PK
        uuid user_id FK
        date date
        text split_name
        int duration_minutes
        text notes
        timestamptz created_at
    }

    workout_sets {
        uuid id PK
        uuid session_id FK
        text exercise_name
        text muscle_group
        int set_number
        int reps
        numeric weight_kg
        numeric rpe
        int duration_sec
        text notes
        timestamptz created_at
    }

    auth_users ||--o{ profiles : "1 to 1"
    auth_users ||--o{ food_logs : "1 to many"
    auth_users ||--o{ body_weight_logs : "1 to many"
    auth_users ||--o{ workout_sessions : "1 to many"
    workout_sessions ||--o{ workout_sets : "1 to many"
```

> Row-Level Security is enforced on **all tables**: `auth.uid() = user_id` — users can only access their own rows.

---

## Features

### 🍎 Calorie Tracker
- **Food Diary** — Breakfast, Lunch, Dinner, Snacks with per-meal calorie and protein totals
- **Smart Food Search** — searches local DB of 256 Indian + global foods first (instant), falls back to Open Food Facts (3M+ products), auto-saves new finds
- **Edit Food Quantity** — tap the pencil icon on any logged item to update grams; macros (calories, protein, carbs, fat) recalculate live as you type and save instantly to Supabase
- **Date Navigation** — browse any past or future date
- **Calorie Progress Bar** — gradient turns red as you approach or exceed your daily goal
- **Macro Row** — at-a-glance P/C/F with mini progress bars against daily targets

### 🗓️ My Plan (Active Program)
- **Commit to a Program** — tap "Follow This Program" on any split card; your choice persists across app restarts via AsyncStorage
- **Weekly Checklist** — all days of the split shown as rows; a green checkmark appears automatically when a matching workout session is saved for that day
- **Progress Bar** — shows `N / 5 days` with per-day dot indicators; turns gold when the full week is complete
- **Next Up Card** — always surfaces the first unfinished day with a direct Start button and exercise preview
- **Continue** — reopens a completed day with previous weights and reps pre-filled for every exercise; remaining split exercises appear below with blank sets ready to fill
- **Repeat** — starts a brand-new session for a done day using the split's default exercise list with empty sets
- **Per-Day Exercise Count** — each completed row shows `X/Y done ✓` (exercises logged vs split total)
- **Restart Week** — clears this week's visual progress without deleting workout history; persisted via a restart timestamp in AsyncStorage
- **Auto-Reset** — checklist resets every Monday at midnight; the program loops back to Day 1 automatically

### 💪 Exercise Tracker
- **6 Workout Programs** — PPL, Upper/Lower, Full Body, Arnold, Bro Split, PHUL
- **Follow This Program** — "Active" badge on selected split card; switches to My Plan tab automatically
- **Pre-loaded Exercises** — tap Start on a split day and all exercises populate instantly with thumbnail images
- **Live Workout Logger** — sets, reps, weight (kg), and optional RPE (1–10) per set; completed sets highlighted green
- **Auto Rest Timer** — starts counting down when you tick a set done (60/90/120/180s presets), vibrates on completion
- **Screen Stay-Awake** — `expo-keep-awake` keeps display on during sessions
- **Exercise GIF Demos** — tap any exercise card header to expand an animated demo (© Gym Visual)
- **Add / Remove Exercises** — search 55+ exercises mid-session; remove exercises mid-session
- **Workout History** — volume, set count, duration, exercise tags per saved session with swipe-to-delete
- **Strength Progress Charts** — SVG line chart per exercise with trend over time
- **Personal Records** — auto-detected max weight per exercise with estimated 1RM badge

### 🧠 1RM Calculator
- **Epley formula** — estimates your one-rep max from any set of ≤12 reps
- **Percentage table** — shows target weight at 60 / 70 / 80 / 90 / 100% with training-goal labels (Warm-up → Endurance → Hypertrophy → Strength → Max)
- **Plain-English explainer** — describes what 1RM means and why it matters

### 📊 Dashboard
- **Hero Calorie Ring** — large donut with % of goal, gradient progress bar, eaten / remaining / goal
- **Macro Grid** — protein, carbs, fat boxes with per-macro mini progress bars
- **Gradient Quick Actions** — one-tap shortcuts to food diary or start a workout
- **Weekly Bar Chart** — 7-day gradient bars (green = within goal, red = over goal)

### ⚖️ Body Weight Tracking
- **Daily weigh-in** — log once per day via Profile screen
- **Trend chart** — smooth cubic Bézier line with gradient fill and goal weight dashed line
- **Delta label** — shows total gain/loss across all entries
- **Upsert logic** — editing the same day overwrites instead of duplicating

### 🗓️ Activity Heatmap
- **26-week GitHub-style calendar** — one cell per day, green for workout days
- **Month labels** auto-position across the top
- **Today highlight** — green border on today's cell

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React Native + Expo SDK 57 | Cross-platform iOS + Android |
| Language | TypeScript (strict) | Type safety throughout |
| Navigation | Expo Router v4 (file-based) | Auth guard, tabs, stacks |
| Styling | NativeWind v4 (Tailwind CSS) | Utility-first mobile styling |
| Gradients | expo-linear-gradient | Headers, cards, buttons, charts |
| Screen Lock | expo-keep-awake | Keep display on during workouts |
| Backend | Supabase Auth + PostgreSQL | Auth, database, Row-Level Security |
| Data Fetching | TanStack Query v5 | Cache, background refresh, mutations |
| Charts | react-native-svg | Donut ring, bar chart, line chart |
| Food DB | Supabase `foods` table | 256 Indian + global foods, instant search |
| Food Fallback | Open Food Facts API | 3M+ products, open source, no key needed |
| Exercise Data | free-exercise-db (MIT) | 55 exercises bundled as JSON |
| Local Storage | @react-native-async-storage | Supabase session + active program persistence |

---

## Project Structure

```
CaloriTracker/
├── app/
│   ├── _layout.tsx                  Root: providers + AuthGate redirect
│   ├── (auth)/
│   │   ├── _layout.tsx              Auth stack layout
│   │   ├── login.tsx                Gradient login form
│   │   ├── register.tsx             Registration with validation
│   │   └── onboarding.tsx           Multi-step goal + body stat setup
│   └── (tabs)/
│       ├── _layout.tsx              Bottom tab bar (pill active indicator)
│       ├── index.tsx                Dashboard
│       ├── calories.tsx             Food diary + edit quantity
│       ├── exercise.tsx             My Plan · Programs · Logger · History · Progress
│       └── profile.tsx              Profile + body weight + heatmap
│
├── components/
│   ├── ui/
│   │   ├── AnimatedNumber.tsx       Smooth number transition component
│   │   ├── AnimatedProgressBar.tsx  Gradient animated bar
│   │   ├── GlassPill.tsx            Frosted glass pill container
│   │   ├── ScreenHeader.tsx         Gradient header with safe-area handling
│   │   └── Eyebrow.tsx              Labelled section tag
│   ├── calories/
│   │   ├── MealSection.tsx          Per-meal list · edit-quantity modal · delete
│   │   └── FoodSearchModal.tsx      Smart search: local DB → OFF fallback
│   ├── exercise/
│   │   ├── MyPlanView.tsx           Active program · weekly checklist · Next Up card
│   │   ├── SplitCard.tsx            Program card · Follow button · Active badge
│   │   ├── WorkoutSession.tsx       Live logger: sets/reps/weight/RPE · rest timer
│   │   ├── ExerciseSearch.tsx       Search + muscle group filter
│   │   └── ProgressChart.tsx        SVG line chart for strength over time
│   └── profile/
│       ├── BodyWeightChart.tsx      Bézier trend line + goal dashed line
│       └── ActivityHeatmap.tsx      26-week GitHub-style training calendar
│
├── lib/
│   ├── context/
│   │   └── AuthContext.tsx          Supabase session · profile · signIn/Out/Up
│   ├── queries/
│   │   ├── calories.ts              CRUD food_logs · update quantity · smart search
│   │   ├── exercise.ts              CRUD workout_sessions + sets + progress
│   │   └── bodyweight.ts            CRUD body_weight_logs + latest weight
│   ├── data/
│   │   ├── splits.ts                6 workout split definitions (days + exercises)
│   │   ├── exercises.json           55 exercises with muscle groups + GIF URLs
│   │   └── foods-seed.ts            256 Indian + global foods (seed source)
│   ├── activeProgram.ts             AsyncStorage helpers: save · load · restart week
│   ├── supabase.ts                  Supabase client (AsyncStorage session)
│   └── types.ts                     All TypeScript interfaces and types
│
├── scripts/
│   ├── seed-foods.sql               Run once in Supabase SQL Editor to seed foods
│   └── generate-sql.js              Generates seed-foods.sql from foods-seed.ts
│
├── supabase/
│   └── migrations/
│       ├── 001_init.sql             Core schema: profiles, food_logs, sessions, sets
│       └── 002_bodyweight_rpe.sql   body_weight_logs + rpe/notes columns
│
├── .env.example                     Environment variable template
├── app.json                         Expo config
├── babel.config.js                  NativeWind JSX transform
├── metro.config.js                  Metro + NativeWind CSS pipeline
├── tailwind.config.js               Tailwind theme + custom palette
└── tsconfig.json
```

---

## Setup Guide

### Prerequisites

- **Node.js** 22+
- A free **[Supabase](https://supabase.com)** account
- **[Expo Go](https://expo.dev/client)** on your phone — or Android Studio / Xcode for a development build

### Step 1 — Clone and install

```bash
git clone <your-repo-url>
cd CaloriTracker
npm install
```

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Navigate to **Settings → API**
3. Copy your **Project URL** and **anon/public** key

### Step 3 — Configure environment variables

```env
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4 — Run database migrations

In **Supabase → SQL Editor**, run in order:

```
supabase/migrations/001_init.sql
supabase/migrations/002_bodyweight_rpe.sql
```

Then create the foods table and seed it:

```sql
-- 1. Create foods table
CREATE TABLE IF NOT EXISTS foods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  brand        TEXT DEFAULT '',
  energy_kcal  NUMERIC NOT NULL DEFAULT 0,
  protein_g    NUMERIC NOT NULL DEFAULT 0,
  carbs_g      NUMERIC NOT NULL DEFAULT 0,
  fat_g        NUMERIC NOT NULL DEFAULT 0,
  image_url    TEXT,
  source       TEXT NOT NULL DEFAULT 'seed',
  search_hits  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vec   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', name || ' ' || COALESCE(brand,''))
  ) STORED
);
CREATE INDEX IF NOT EXISTS foods_search_vec_idx ON foods USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS foods_name_idx ON foods (LOWER(name) text_pattern_ops);
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foods_read_all"    ON foods FOR SELECT USING (true);
CREATE POLICY "foods_insert_auth" ON foods FOR INSERT WITH CHECK (true);
CREATE POLICY "foods_update_hits" ON foods FOR UPDATE USING (true);
ALTER TABLE foods ADD CONSTRAINT foods_name_unique UNIQUE (name);

-- 2. Helper function for search popularity ranking
CREATE OR REPLACE FUNCTION increment_food_hits(food_name TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE foods SET search_hits = search_hits + 1
  WHERE LOWER(name) LIKE '%' || LOWER(food_name) || '%';
$$;
```

Then paste and run `scripts/seed-foods.sql` to load 256 foods.

### Step 5 — Start the app

```bash
npx expo start
```

Connect your phone to the same Wi-Fi as your PC and scan the QR code with **Expo Go**.

> **Note:** `npx expo login` is required for tunnel mode or EAS builds. For LAN mode (phone + PC on the same network), no account is needed.

---

## Workout Splits

| Program | Days/week | Level | Best For |
|---|---|---|---|
| Push / Pull / Legs (PPL) | 6 | Intermediate | High-frequency hypertrophy |
| Upper / Lower | 4 | Intermediate | Balanced strength + size |
| Full Body | 3 | Beginner | New lifters, general fitness |
| Arnold Split | 6 | Advanced | Classic bodybuilding |
| Bro Split | 5 | Intermediate | Focused isolation per muscle |
| PHUL (Power Hypertrophy) | 4 | Intermediate | Strength + size combined |

Each split includes a day-by-day breakdown with target muscle groups and a pre-loaded exercise list that auto-populates when you start a session. Tap **Follow This Program** to commit — the app tracks your weekly progress and always surfaces the next day to train.

---

## Data Sources

| Source | License | Usage |
|---|---|---|
| [Open Food Facts](https://world.openfoodfacts.org/) | ODbL | Food search fallback — 3M+ products, no API key |
| [IFCT 2017 / NIN India](https://www.nin.res.in/) | Public domain | Nutritional values for Indian foods in seed DB |
| [USDA FoodData Central](https://fdc.nal.usda.gov/) | Public domain | Nutritional values for global staples in seed DB |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | MIT | 55 exercises bundled as JSON, used offline |
| [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) | MIT (code) · © Gym Visual (media) | Exercise GIFs/thumbnails via CDN |
| [Supabase](https://supabase.com) | Apache 2.0 | Auth, PostgreSQL database, RLS |

---

## Environment Variables

| Variable | Description | Where to find |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Settings → API → anon key |
