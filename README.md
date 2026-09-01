# CaloriTracker

> A professional cross-platform health & fitness mobile app for iOS and Android — built with React Native (Expo), Supabase, and open-source nutrition & exercise data.

![License](https://img.shields.io/badge/license-MIT-green) ![Expo](https://img.shields.io/badge/Expo-SDK%2057-blue) ![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Flow](#user-flow)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [Features](#features)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [Setup Guide](#setup-guide)
10. [Workout Splits](#workout-splits)
11. [Data Sources](#data-sources)

---

## Overview

CaloriTracker is a full-featured personal health companion that combines nutrition tracking, structured workout programs, and body analytics in a single polished mobile app.

**Core capabilities:**

- 🍎 Track daily **calorie & macro intake** across 4 meal types with a searchable food diary
- 🔍 Instant food search powered by **Open Food Facts** (3M+ products, no API key)
- 💪 Follow structured **workout splits** (PPL, Upper/Lower, Arnold, Full Body, and more)
- 📋 Pre-loaded exercise lists per split day — start logging immediately, no manual searching
- ⏱️ **Live workout logger** with set/rep/weight/RPE tracking and an auto-start rest timer
- ⚖️ **Body weight tracking** with a smooth trend chart and goal weight line
- 🗓️ **Activity heatmap** — GitHub-style 26-week training calendar
- 🧠 **1RM Calculator** (Epley formula) with percentage breakdown by training goal
- 💡 **Muscle map** — front/back SVG body diagram shaded by weekly training volume
- 📈 **Strength progress charts** per exercise with personal record badges

All data is stored in your own **Supabase PostgreSQL** instance with Row-Level Security — nobody else can see your data.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       CaloriTracker Mobile App                           │
│                        React Native · Expo SDK 57                        │
│                                                                          │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Auth Screens │  │  Dashboard   │  │  Calories   │  │  Exercise   │ │
│  │               │  │              │  │             │  │             │ │
│  │  • Login      │  │  • Calorie   │  │  • Food     │  │  • Programs │ │
│  │  • Register   │  │    ring      │  │    diary    │  │    (splits) │ │
│  │  • Onboarding │  │  • Macros    │  │  • Search   │  │  • Logger   │ │
│  │               │  │  • Chart     │  │    modal    │  │  • History  │ │
│  └───────┬───────┘  │  • Targets   │  │             │  │  • Progress │ │
│          │          └──────┬───────┘  └──────┬──────┘  └──────┬──────┘ │
│          │                 │                 │                 │        │
│  ┌───────▼─────────────────▼─────────────────▼─────────────────▼──────┐ │
│  │                   Expo Router (File-based Navigation)              │ │
│  │              app/(auth)/  ·  app/(tabs)/  ·  AuthGate             │ │
│  └─────────────────────────────────┬──────────────────────────────────┘ │
│                                    │                                     │
│  ┌─────────────────────────────────▼──────────────────────────────────┐ │
│  │                        State & Data Layer                          │ │
│  │                                                                    │ │
│  │  ┌───────────────────┐          ┌──────────────────────────────┐   │ │
│  │  │   Auth Context    │          │     TanStack Query Cache     │   │ │
│  │  │  (Supabase        │          │  stale-while-revalidate      │   │ │
│  │  │   session +       │          │  optimistic updates          │   │ │
│  │  │   user profile)   │          │  background refetch          │   │ │
│  │  └────────┬──────────┘          └────────────┬─────────────────┘   │ │
│  │           │                                  │                     │ │
│  │  ┌────────▼──────────────────────────────────▼─────────────────┐   │ │
│  │  │                    lib/queries/                             │   │ │
│  │  │  calories.ts   food_logs · macros · weekly stats           │   │ │
│  │  │  exercise.ts   sessions · sets · progress                  │   │ │
│  │  │  bodyweight.ts weight logs · latest weight                 │   │ │
│  │  └──────────────────────────────┬──────────────────────────────┘   │ │
│  └────────────────────────────────-┼────────────────────────────────────┘ │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
             ┌───────────────────────▼──────────────────────┐
             │              Supabase Client                  │
             │            (lib/supabase.ts)                  │
             │   AsyncStorage · autoRefreshToken · no SSR    │
             └───────────────┬──────────────┬───────────────┘
                             │              │
              ┌──────────────▼────┐  ┌──────▼────────────────────┐
              │  Supabase Auth    │  │  Supabase Database        │
              │                   │  │  PostgreSQL + RLS         │
              │  • JWT tokens     │  │                           │
              │  • Email/password │  │  profiles                 │
              │  • Auto-refresh   │  │  food_logs                │
              │  • Persist        │  │  body_weight_logs         │
              │    (AsyncStorage) │  │  workout_sessions         │
              └───────────────────┘  │  workout_sets (+rpe)      │
                                     └───────────────────────────┘

              ┌────────────────────────────────────────────────┐
              │           External Data (read-only)            │
              │                                                │
              │  Open Food Facts API  · 3M+ products           │
              │  free-exercise-db     · 55 exercises (bundled) │
              └────────────────────────────────────────────────┘
```

---

## User Flow

```
  App Launch
      │
      ▼
  ┌─────────────────────┐     No session    ┌──────────────────────────┐
  │  Root AuthGate      │ ────────────────▶ │       (auth) group       │
  │  checks Supabase    │                   │                          │
  │  session            │                   │  Login  ──▶  Register    │
  └─────────────────────┘                   │                 │        │
            │                               │            Onboarding    │
     Has session                            │  (goals + body stats)    │
            │                               └──────────────┬───────────┘
            └──────────────────────────────────────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │     (tabs) group       │
                       │  Bottom navigation     │
                       └───────────┬────────────┘
                                   │
       ┌───────────────────────────┼──────────────────────────┐
       │               │           │                          │
       ▼               ▼           ▼                          ▼
┌────────────┐  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐
│ Dashboard  │  │  Calories    │  │   Exercise     │  │   Profile    │
│            │  │              │  │                │  │              │
│ Calorie    │  │ Date picker  │  │ Programs tab   │  │ Avatar +     │
│ ring +     │  │ Calorie bar  │  │  • Split cards │  │ stats        │
│ macros     │  │ Breakfast    │  │  • Start day   │  │              │
│            │  │ Lunch        │  │  • Pre-loaded  │  │ Body weight  │
│ Gradient   │  │ Dinner       │  │    exercises   │  │ chart +      │
│ quick      │  │ Snacks       │  │                │  │ goal line    │
│ actions    │  │              │  │ History tab    │  │              │
│            │  │ + Food       │  │  • Past        │  │ Heatmap      │
│ Weekly     │  │   Search     │  │    sessions    │  │ calendar     │
│ chart      │  │   Modal      │  │  • Stats       │  │              │
│            │  │  (OFF API)   │  │                │  │ Goals +      │
│ Nutrient   │  │              │  │ Progress tab   │  │ body stats   │
│ targets    │  │              │  │  • 1RM calc    │  │              │
│            │  │              │  │  • Muscle map  │  │ Data sources │
└────────────┘  └──────────────┘  │  • PR badges   │  └──────────────┘
                                  │  • Charts      │
                                  └────────────────┘
```

---

## Data Flow

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    FOOD LOGGING FLOW                        │
  └─────────────────────────────────────────────────────────────┘

  User types "chicken breast"
          │
          ▼
  FoodSearchModal  ──▶  searchOpenFoodFacts()
                                │
                    GET world.openfoodfacts.org
                    /cgi/search.pl?search_terms=...
                                │
                    Filter: must have product_name
                            + energy-kcal_100g
                    Map: normalise, round values
                                │
                    Results list (≤15 items)
                                │
  User picks item, enters grams (default 100g)
                                │
                    Scale: value = (per100g × grams) / 100
                                │
  addFoodLog() ──▶  Supabase food_logs
                    (user_id, date, meal_type,
                     calories, protein_g, carbs_g, fat_g)
                                │
  TanStack invalidates  ──▶  UI re-renders with new totals


  ┌─────────────────────────────────────────────────────────────┐
  │                   WORKOUT LOGGING FLOW                      │
  └─────────────────────────────────────────────────────────────┘

  User selects split + day  ──▶  Start Session
          │
          │  Exercises pre-loaded from split definition
          │  (no manual searching needed)
          │
  WorkoutSession modal opens
  • expo-keep-awake: screen stays on
  • Workout timer starts
  │
  User logs sets → reps → weight → RPE (optional)
          │
  Tick ✓ on set  ──▶  Rest timer auto-starts (60/90/120/180s)
                       Vibrates when rest ends
          │
  "Finish Workout" pressed
          │
  createWorkoutSession()  ──▶  Supabase workout_sessions
  addWorkoutSets()        ──▶  Supabase workout_sets
                               (incl. rpe column)
          │
  TanStack invalidates  ──▶  Dashboard + History + Muscle map update


  ┌─────────────────────────────────────────────────────────────┐
  │                 BODY WEIGHT TRACKING FLOW                   │
  └─────────────────────────────────────────────────────────────┘

  Profile screen  ──▶  "+ Log weight" button
          │
  Modal: enter kg value
          │
  upsertBodyWeight()  ──▶  Supabase body_weight_logs
                            (upsert on user_id + date —
                             only one entry per day)
          │
  Chart re-renders  ──▶  New point on trend line
                          Goal line shows distance to target


  ┌─────────────────────────────────────────────────────────────┐
  │                  AUTHENTICATION FLOW                        │
  └─────────────────────────────────────────────────────────────┘

  signUp(email, password)  ──▶  supabase.auth.signUp()
          │                     Creates auth.users record
          ▼
  Onboarding (name, goals, body stats)
          │
  saveProfile()  ──▶  Supabase profiles (upsert)
          │
  AuthContext broadcasts session  ──▶  AuthGate redirects to tabs
```

---

## Database Schema

```
  ┌────────────────────────────────────────────────────────┐
  │               auth.users  (Supabase managed)           │
  │  id UUID · email · created_at · ...                    │
  └───────────────────────┬────────────────────────────────┘
                          │ 1 : 1
          ┌───────────────▼──────────────────────────────────┐
          │                   profiles                        │
          ├──────────────────────────────────────────────────┤
          │  id            UUID  PK                          │
          │  user_id       UUID  FK auth.users (unique)      │
          │  name          TEXT                              │
          │  age           INT                               │
          │  height_cm     NUMERIC                           │
          │  weight_kg     NUMERIC   (goal / current weight) │
          │  goal_calories INT       DEFAULT 2000            │
          │  goal_protein  INT       DEFAULT 150             │
          │  goal_carbs    INT       DEFAULT 250             │
          │  goal_fat      INT       DEFAULT 65              │
          │  created_at    TIMESTAMPTZ                       │
          └───────────┬──────────────┬───────────────────────┘
                      │              │
           ┌──────────┘              └──────────┐
           │ 1 : N                              │ 1 : N
  ┌────────▼──────────────────┐  ┌─────────────▼────────────────┐
  │        food_logs          │  │      body_weight_logs        │
  ├───────────────────────────┤  ├──────────────────────────────┤
  │  id          UUID  PK     │  │  id          UUID  PK        │
  │  user_id     UUID  FK     │  │  user_id     UUID  FK        │
  │  date        DATE         │  │  date        DATE            │
  │  meal_type   TEXT         │  │  weight_kg   NUMERIC(5,2)    │
  │  food_name   TEXT         │  │  notes       TEXT            │
  │  quantity    NUMERIC (g)  │  │  created_at  TIMESTAMPTZ     │
  │  unit        TEXT         │  │                              │
  │  calories    NUMERIC      │  │  UNIQUE(user_id, date)       │
  │  protein_g   NUMERIC      │  └──────────────────────────────┘
  │  carbs_g     NUMERIC      │
  │  fat_g       NUMERIC      │
  │  created_at  TIMESTAMPTZ  │
  └───────────────────────────┘

          ┌───────────────────────────────────────────────────┐
          │                workout_sessions                    │
          ├───────────────────────────────────────────────────┤
          │  id                UUID  PK                       │
          │  user_id           UUID  FK auth.users            │
          │  date              DATE                           │
          │  split_name        TEXT  (e.g. "PPL – Push Day")  │
          │  duration_minutes  INT                            │
          │  notes             TEXT                           │
          │  created_at        TIMESTAMPTZ                    │
          └──────────────────────┬────────────────────────────┘
                                 │ 1 : N
          ┌──────────────────────▼────────────────────────────┐
          │                  workout_sets                      │
          ├───────────────────────────────────────────────────┤
          │  id              UUID    PK                       │
          │  session_id      UUID    FK workout_sessions      │
          │  exercise_name   TEXT                             │
          │  muscle_group    TEXT                             │
          │  set_number      INT                              │
          │  reps            INT                              │
          │  weight_kg       NUMERIC                          │
          │  rpe             NUMERIC(3,1)   ← RPE 1–10 scale │
          │  notes           TEXT                             │
          │  duration_sec    INT    (for timed exercises)     │
          │  created_at      TIMESTAMPTZ                      │
          └───────────────────────────────────────────────────┘

  Row-Level Security enforced on ALL tables:
  auth.uid() = user_id  →  users access only their own rows
```

---

## Features

### 🍎 Calorie Tracker
- **Food Diary** — Breakfast, Lunch, Dinner, Snacks with per-meal calorie totals
- **Open Food Facts Search** — 3M+ products, scales nutrients by gram quantity in real time
- **Date Navigation** — browse any past or future date
- **Macro Donut Chart** — protein / carbs / fat ring with % of daily goal
- **Gradient Progress Bar** — green → red as you approach/exceed goal
- **Macro Boxes** — at-a-glance P/C/F with mini progress bars

### 💪 Exercise Tracker
- **6 Workout Programs** — PPL, Upper/Lower, Full Body, Arnold, Bro Split, PHUL
- **Pre-loaded Exercises** — tap Start on a split day and all exercises appear instantly
- **Live Workout Logger** — sets, reps, weight, and optional RPE (effort 1–10) per set
- **Auto Rest Timer** — starts counting down when you tick a set done (60/90/120/180s presets), vibrates when rest ends
- **Screen Stay-Awake** — `expo-keep-awake` keeps display on during sessions
- **Workout History** — volume, set count, duration, exercise tags per session
- **Strength Progress Charts** — SVG line chart per exercise with trend over time
- **Personal Records** — auto-detected PR per exercise with estimated 1RM badge

### 🧠 1RM Calculator
- **Epley formula** — estimates your one-rep max from any set of ≤12 reps
- **Percentage table** — shows target weight at 60 / 70 / 80 / 90 / 100% with training-goal labels (Warm-up → Max)
- **Explainer** — plain-English description so any user understands what 1RM means and why it matters

### 🗺️ Muscle Map
- **Front / Back SVG body diagram** — anatomically placed ellipse overlays on a human silhouette
- **Volume shading** — green intensity reflects sets logged per muscle group in the last 7 days
- **Trained / Needs Work** legend — tells you exactly which muscles you've neglected

### 📊 Dashboard
- **Hero Calorie Ring** — large donut with % of goal, gradient progress bar, remaining kcal
- **Macro Grid** — protein, carbs, fat boxes with per-macro mini progress bars
- **Gradient Quick Actions** — one-tap to food diary or start a workout
- **Weekly Bar Chart** — 7-day gradient bars (green = today, red = over goal)
- **Nutrient Targets** — all four macros as labelled progress bars

### ⚖️ Body Weight Tracking
- **Daily weigh-in** — log once per day via Profile screen
- **Trend chart** — smooth cubic Bézier line with gradient fill and goal weight dashed line
- **Delta label** — shows total gain/loss across all entries
- **Upsert logic** — editing the same day overwrites instead of duplicating

### 🗓️ Activity Heatmap
- **26-week GitHub-style calendar** — one cell per day, green for workout days
- **Month labels** auto-position across the top
- **Today highlight** — green border on today's cell

### 👤 Profile
- **Body stats** — age, height, weight; auto-calculated BMI with category label
- **Daily goals** — edit calorie, protein, carbs, fat targets
- **Streak counter** — consecutive days with a logged workout
- **Data sources** — branded cards for Open Food Facts, free-exercise-db, Supabase

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
| Charts | react-native-svg | Donut ring, bar chart, line chart, muscle map |
| Food Data | Open Food Facts API | 3M+ products, open source, no key needed |
| Exercise Data | free-exercise-db (MIT) | 55 exercises bundled as JSON |
| Storage | @react-native-async-storage | Supabase session persistence |

---

## Project Structure

```
CaloriTracker/
├── app/
│   ├── _layout.tsx                  Root: providers + AuthGate redirect
│   ├── (auth)/
│   │   ├── _layout.tsx              Auth stack layout
│   │   ├── login.tsx                Gradient bg + floating form card
│   │   ├── register.tsx             Indigo gradient + scrollable form
│   │   └── onboarding.tsx           Multi-step goal + body stat setup
│   └── (tabs)/
│       ├── _layout.tsx              Bottom tab bar (pill active indicator)
│       ├── index.tsx                Dashboard
│       ├── calories.tsx             Food diary
│       ├── exercise.tsx             Exercise tracker
│       └── profile.tsx              Profile + body weight + heatmap
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx               Gradient primary · ghost · danger · secondary
│   │   ├── Card.tsx                 White card with 3 shadow tiers
│   │   └── Input.tsx                Labelled input with icon + error state
│   ├── calories/
│   │   ├── MacroDonut.tsx           SVG ring — protein/carbs/fat segments + legend
│   │   ├── MealSection.tsx          Per-meal list with gradient icons + delete
│   │   ├── FoodSearchModal.tsx      Green gradient header + OFF API results
│   │   └── CalorieProgressBar.tsx   Horizontal bar with colour states
│   ├── exercise/
│   │   ├── SplitCard.tsx            Gradient program card + expandable day plan
│   │   ├── WorkoutSession.tsx       Live logger: sets/reps/weight/RPE + rest timer
│   │   ├── ExerciseSearch.tsx       Search + muscle group filter
│   │   ├── ProgressChart.tsx        SVG line chart for strength over time
│   │   └── MuscleMap.tsx            Front/back SVG body with intensity overlays
│   └── profile/
│       ├── BodyWeightChart.tsx      Cubic Bézier trend line + goal dashed line
│       └── ActivityHeatmap.tsx      26-week GitHub-style training calendar
│
├── lib/
│   ├── context/
│   │   └── AuthContext.tsx          Supabase session · profile · signIn/Out/Up
│   ├── queries/
│   │   ├── calories.ts              CRUD food_logs + Open Food Facts search
│   │   ├── exercise.ts              CRUD workout_sessions + sets + progress
│   │   └── bodyweight.ts            CRUD body_weight_logs + latest weight
│   ├── data/
│   │   ├── splits.ts                6 workout split definitions
│   │   └── exercises.json           55 exercises with muscle groups + instructions
│   ├── supabase.ts                  Supabase client (AsyncStorage session)
│   └── types.ts                     All TypeScript interfaces and types
│
├── supabase/
│   └── migrations/
│       ├── 001_init.sql             Core schema: profiles, food_logs, sessions, sets
│       └── 002_bodyweight_rpe.sql   body_weight_logs table + rpe/notes columns
│
├── .env.example                     Environment variable template
├── .env                             Supabase credentials (git-ignored)
├── app.json                         Expo config (web: single output)
├── babel.config.js                  NativeWind JSX transform
├── metro.config.js                  Metro + NativeWind CSS pipeline
├── tailwind.config.js               Tailwind theme + custom palette
├── global.css                       Tailwind @tailwind directives
├── nativewind-env.d.ts              NativeWind + CSS module type declarations
└── tsconfig.json
```

---

## Setup Guide

### Prerequisites

- **Node.js** 18+
- **[Expo Go](https://expo.dev/client)** on your phone — or an iOS/Android emulator
- A free **[Supabase](https://supabase.com)** account

---

### Step 1 — Clone and install

```bash
git clone <your-repo-url>
cd CaloriTracker
npm install
```

---

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Navigate to **Settings → API**
3. Copy your **Project URL** and **anon/public** key

---

### Step 3 — Run the database migrations

In the Supabase **SQL Editor**, run each file in order:

```
supabase/migrations/001_init.sql        ← core schema + RLS
supabase/migrations/002_bodyweight_rpe.sql  ← body weight + RPE columns
```

---

### Step 4 — Configure environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> The `EXPO_PUBLIC_` prefix makes variables available at runtime in Expo.

---

### Step 5 — Start the app

```bash
npx expo start --clear
```

| Platform | How to open |
|---|---|
| Physical phone | Scan QR code with **Expo Go** (Android) or **Camera** (iOS) |
| Android emulator | Press `a` in the terminal |
| iOS simulator | Press `i` in the terminal |
| Web (limited) | Press `w` in the terminal |

> **First run:** Register → complete onboarding to set your calorie and macro goals, then start exploring.

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

Each split includes:
- Day-by-day breakdown with target muscle groups
- Pre-loaded exercise list (auto-populated when you start a session)
- Level badge (Beginner / Intermediate / Advanced)

---

## Data Sources

| Source | License | Usage |
|---|---|---|
| [Open Food Facts](https://world.openfoodfacts.org/) | ODbL | Food search — 3M+ products, no API key required |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | MIT | 55 exercises bundled as JSON, used offline |
| [Supabase](https://supabase.com) | Apache 2.0 | Auth, PostgreSQL database, Row-Level Security |
| [openGym](https://github.com/DuarteSantos8/openGym) | AGPL v3 | UI/UX inspiration only — no code copied |

---

## Environment Variables

| Variable | Description | Where to find |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Settings → API → anon key |
