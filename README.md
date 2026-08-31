# CaloriTracker

> A professional cross-platform health & fitness app for iOS and Android — built with React Native (Expo), Supabase, and open-source nutrition data.

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

CaloriTracker is a full-featured mobile application that lets users:

- Track daily **calorie and macro intake** (protein, carbs, fat) with a food diary
- Search **3 million+ food products** via the Open Food Facts API
- Follow structured **workout splits** (PPL, Upper/Lower, Arnold, etc.)
- Log **live workout sessions** (sets, reps, weight) with a built-in timer
- Visualise **strength progress** over time per exercise
- Manage **personal goals** and body stats (BMI, weight targets)

All data is stored securely in **Supabase PostgreSQL** with Row-Level Security ensuring each user only sees their own data.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     CaloriTracker Mobile App                     │
│                      (React Native + Expo SDK 57)                │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  ┌─────────┐ │
│  │  Auth       │  │  Dashboard  │  │  Calories  │  │Exercise │ │
│  │  Screens    │  │  Screen     │  │  Screen    │  │ Screen  │ │
│  │             │  │             │  │            │  │         │ │
│  │ • Login     │  │ • Calorie   │  │ • Food     │  │• Splits │ │
│  │ • Register  │  │   ring      │  │   diary    │  │• Logger │ │
│  │ • Onboard   │  │ • Macros    │  │ • Search   │  │• Charts │ │
│  │             │  │ • Chart     │  │   modal    │  │• PRs    │ │
│  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  └────┬────┘ │
│         │                │               │               │      │
│  ┌──────▼────────────────▼───────────────▼───────────────▼────┐ │
│  │                     Expo Router (Navigation)               │ │
│  │           File-based routing — app/(auth) / app/(tabs)     │ │
│  └────────────────────────────┬───────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────▼──────────────────────────────┐ │
│  │                     State & Data Layer                     │ │
│  │                                                            │ │
│  │   ┌──────────────────┐        ┌──────────────────────────┐ │ │
│  │   │  Auth Context    │        │   TanStack Query Cache   │ │ │
│  │   │  (Supabase       │        │   (server state,         │ │ │
│  │   │   session +      │        │    stale-while-revalidate│ │ │
│  │   │   user profile)  │        │    + optimistic updates) │ │ │
│  │   └────────┬─────────┘        └────────────┬─────────────┘ │ │
│  │            │                               │               │ │
│  │   ┌────────▼───────────────────────────────▼─────────────┐ │ │
│  │   │              lib/queries/                            │ │ │
│  │   │  calories.ts (food logs, macros, weekly stats)       │ │ │
│  │   │  exercise.ts (sessions, sets, progress)              │ │ │
│  │   └────────────────────────────┬─────────────────────────┘ │ │
│  └───────────────────────────────-┼────────────────────────────┘ │
└────────────────────────────────── ┼──────────────────────────────┘
                                    │
            ┌───────────────────────▼──────────────────────┐
            │              Supabase Client                  │
            │             (lib/supabase.ts)                 │
            │    AsyncStorage session persistence           │
            └───────────────┬──────────────┬───────────────┘
                            │              │
             ┌──────────────▼────┐  ┌──────▼──────────────────┐
             │  Supabase Auth    │  │  Supabase Database      │
             │                   │  │  (PostgreSQL + RLS)     │
             │  • JWT tokens     │  │                         │
             │  • Email/password │  │  ┌──────────────────┐   │
             │  • Auto-refresh   │  │  │    profiles      │   │
             │  • Persist        │  │  ├──────────────────┤   │
             │    session        │  │  │    food_logs     │   │
             └───────────────────┘  │  ├──────────────────┤   │
                                    │  │ workout_sessions │   │
                                    │  ├──────────────────┤   │
                                    │  │  workout_sets    │   │
                                    │  └──────────────────┘   │
                                    └─────────────────────────┘

             ┌──────────────────────────────────────────────┐
             │            External APIs (read-only)         │
             │                                              │
             │  ┌──────────────────────┐                   │
             │  │  Open Food Facts API │  food search       │
             │  │  world.openfoodfacts │  3M+ products      │
             │  │  .org/cgi/search.pl  │  no key required   │
             │  └──────────────────────┘                   │
             │                                              │
             │  ┌──────────────────────┐                   │
             │  │  free-exercise-db    │  exercise library  │
             │  │  (bundled JSON)      │  55 exercises      │
             │  │  MIT license         │  offline access    │
             │  └──────────────────────┘                   │
             └──────────────────────────────────────────────┘
```

---

## User Flow

```
  App Launch
      │
      ▼
  ┌───────────────────────┐
  │  Root Layout          │
  │  AuthGate component   │  ─── checks Supabase session ───┐
  └───────────────────────┘                                  │
            │                                                │
     Has valid                                          No session
      session                                               │
            │                                               ▼
            │                                  ┌────────────────────┐
            │                                  │   (auth) group     │
            │                                  │                    │
            │                                  │  ┌──────────────┐  │
            │                                  │  │ Login Screen │  │
            │                                  │  │              │  │
            │                                  │  │ Enter email  │  │
            │                                  │  │ + password   │  │
            │                                  │  └──────┬───────┘  │
            │                                  │         │          │
            │                                  │  ┌──────▼───────┐  │
            │                                  │  │   Register   │  │
            │                                  │  │              │  │
            │                                  │  │ Name, email  │  │
            │                                  │  │ password     │  │
            │                                  │  └──────┬───────┘  │
            │                                  │         │          │
            │                                  │  ┌──────▼───────┐  │
            │                                  │  │  Onboarding  │  │
            │                                  │  │              │  │
            │                                  │  │ Step 1: Goal │  │
            │                                  │  │ Step 2: Body │  │
            │                                  │  │ Step 3: Diet │  │
            │                                  │  └──────┬───────┘  │
            │                                  └─────────┼──────────┘
            │                                            │
            └────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │     (tabs) group      │
                        │    Bottom Tab Bar     │
                        └──────────┬────────────┘
                                   │
          ┌────────────────────────┼───────────────────────────┐
          │                        │                           │
          ▼                        ▼                           ▼          ▼
  ┌──────────────┐      ┌───────────────────┐      ┌──────────────┐  ┌──────────┐
  │  Dashboard   │      │     Calories      │      │   Exercise   │  │ Profile  │
  │  (index.tsx) │      │  (calories.tsx)   │      │(exercise.tsx)│  │          │
  │              │      │                   │      │              │  │          │
  │ ┌──────────┐ │      │ ┌───────────────┐ │      │ ┌──────────┐ │  │ • Body   │
  │ │  Macro   │ │      │ │ Date selector │ │      │ │ Programs │ │  │   stats  │
  │ │  Donut   │ │      │ │ + calorie bar │ │      │ │ (splits) │ │  │ • Goals  │
  │ │  Ring    │ │      │ └───────────────┘ │      │ └──────────┘ │  │ • BMI    │
  │ └──────────┘ │      │                   │      │              │  │ • Sign   │
  │ ┌──────────┐ │      │ ┌───────────────┐ │      │ ┌──────────┐ │  │   out    │
  │ │  Macro   │ │      │ │ Breakfast     │ │      │ │ History  │ │  │          │
  │ │  Boxes   │ │      │ │ Lunch         │ │      │ │ (log)    │ │  │          │
  │ └──────────┘ │      │ │ Dinner        │ │      │ └──────────┘ │  │          │
  │ ┌──────────┐ │      │ │ Snacks        │ │      │              │  │          │
  │ │ Quick    │ │      │ └───────────────┘ │      │ ┌──────────┐ │  │          │
  │ │ Actions  │ │      │        │          │      │ │ Progress │ │  │          │
  │ └──────────┘ │      │        ▼          │      │ │ (charts) │ │  │          │
  │ ┌──────────┐ │      │ ┌───────────────┐ │      │ └──────────┘ │  │          │
  │ │ Weekly   │ │      │ │ Food Search   │ │      │              │  │          │
  │ │ Chart    │ │      │ │ Modal (OFF    │ │      │ ┌──────────┐ │  │          │
  │ └──────────┘ │      │ │  API search)  │ │      │ │ Workout  │ │  │          │
  │ ┌──────────┐ │      │ └───────────────┘ │      │ │ Session  │ │  │          │
  │ │ Nutrient │ │      │                   │      │ │ (logger) │ │  │          │
  │ │ Targets  │ │      │                   │      │ └──────────┘ │  │          │
  └──────────────┘      └───────────────────┘      └──────────────┘  └──────────┘
```

---

## Data Flow

```
  ┌────────────────────────────────────────────────────────────┐
  │                     FOOD LOGGING FLOW                      │
  └────────────────────────────────────────────────────────────┘

  User types "chicken breast"
          │
          ▼
  FoodSearchModal
          │
          ▼
  searchOpenFoodFacts()                External API
  ─────────────────────────────────▶  world.openfoodfacts.org
                                      /cgi/search.pl?...
  ◀─────────────────────────────────  { products: [...] }
          │
          │  Filter: has product_name + energy-kcal_100g
          │  Map: normalise fields, round values
          ▼
  Results list (up to 15 items)
          │
  User selects item + enters grams (default: 100g)
          │
          ▼
  Scale nutrients:  value = (per100g × grams) / 100
          │
          ▼
  addFoodLog()  ───────────────────▶  Supabase food_logs table
                                      (user_id, date, meal_type,
                                       calories, protein_g,
                                       carbs_g, fat_g)
          │
          ▼
  TanStack Query invalidates          UI re-renders
  ['food-logs', userId, date]  ─────▶ with updated totals


  ┌────────────────────────────────────────────────────────────┐
  │                   WORKOUT LOGGING FLOW                     │
  └────────────────────────────────────────────────────────────┘

  User selects split + day
          │
          ▼
  WorkoutSession modal opens
  (pre-loaded with suggested exercises)
          │
  User logs sets → reps → weight per exercise
  Timer runs in background
          │
  "Finish Workout" pressed
          │
          ▼
  createWorkoutSession()  ──────────▶  Supabase workout_sessions
                                       (user_id, date, split_name,
                                        duration_minutes)
          │
          ▼
  addWorkoutSets()  ────────────────▶  Supabase workout_sets
                                       (session_id, exercise_name,
                                        muscle_group, set_number,
                                        reps, weight_kg)
          │
          ▼
  TanStack Query invalidates          Dashboard "Today's Workout"
  ['workout-sessions']  ───────────▶  + Progress charts update


  ┌────────────────────────────────────────────────────────────┐
  │                  AUTHENTICATION FLOW                       │
  └────────────────────────────────────────────────────────────┘

  signUp(email, password)
          │
          ▼
  supabase.auth.signUp()  ─────────▶  Supabase Auth
                                      Creates auth.users record
          │
          ▼
  Router → /(auth)/onboarding
          │
  saveProfile(name, goals, body)
          │
          ▼
  supabase.from('profiles')           Supabase profiles table
  .upsert()  ──────────────────────▶  (linked by user_id FK)
          │
          ▼
  AuthContext broadcasts session      Root AuthGate redirects
  via onAuthStateChange  ──────────▶  to /(tabs)
```

---

## Database Schema

```
  ┌───────────────────────────────────────────────────────┐
  │                    auth.users (Supabase)               │
  │  id UUID PK │ email │ created_at │ ...                 │
  └──────────────────────────┬────────────────────────────┘
                             │ 1:1
             ┌───────────────▼────────────────────────────────┐
             │                    profiles                     │
             ├───────────────────────────────────────────────-┤
             │  id            UUID  PK                        │
             │  user_id       UUID  FK → auth.users (unique)  │
             │  name          TEXT                            │
             │  age           INT                             │
             │  height_cm     NUMERIC                         │
             │  weight_kg     NUMERIC                         │
             │  goal_calories INT   DEFAULT 2000              │
             │  goal_protein  INT   DEFAULT 150               │
             │  goal_carbs    INT   DEFAULT 250               │
             │  goal_fat      INT   DEFAULT 65                │
             │  created_at    TIMESTAMPTZ                     │
             └──────────────────┬─────────────────────────────┘
                                │ 1:N
      ┌─────────────────────────▼──────────────────────────┐
      │                     food_logs                       │
      ├────────────────────────────────────────────────────┤
      │  id          UUID     PK                           │
      │  user_id     UUID     FK → auth.users              │
      │  date        DATE     (YYYY-MM-DD)                 │
      │  meal_type   TEXT     breakfast│lunch│dinner│snack  │
      │  food_name   TEXT                                  │
      │  quantity    NUMERIC  (grams)                      │
      │  unit        TEXT     DEFAULT 'g'                  │
      │  calories    NUMERIC                               │
      │  protein_g   NUMERIC                               │
      │  carbs_g     NUMERIC                               │
      │  fat_g       NUMERIC                               │
      │  created_at  TIMESTAMPTZ                           │
      └────────────────────────────────────────────────────┘

                                │ 1:N
      ┌─────────────────────────▼──────────────────────────┐
      │                  workout_sessions                   │
      ├────────────────────────────────────────────────────┤
      │  id                UUID   PK                       │
      │  user_id           UUID   FK → auth.users          │
      │  date              DATE                            │
      │  split_name        TEXT   (e.g. "PPL – Push Day")  │
      │  duration_minutes  INT                             │
      │  notes             TEXT                            │
      │  created_at        TIMESTAMPTZ                     │
      └──────────────────────┬─────────────────────────────┘
                             │ 1:N
             ┌───────────────▼────────────────────────────────┐
             │                  workout_sets                   │
             ├───────────────────────────────────────────────-┤
             │  id              UUID  PK                      │
             │  session_id      UUID  FK → workout_sessions   │
             │  exercise_name   TEXT                          │
             │  muscle_group    TEXT                          │
             │  set_number      INT                           │
             │  reps            INT                           │
             │  weight_kg       NUMERIC                       │
             │  duration_sec    INT   (for timed exercises)   │
             │  created_at      TIMESTAMPTZ                   │
             └────────────────────────────────────────────────┘

  Row-Level Security (RLS) enforced on ALL tables:
  users can only SELECT / INSERT / UPDATE / DELETE their own rows
  using: auth.uid() = user_id
```

---

## Features

### Calorie Tracker
- **Food Diary** — organised into Breakfast, Lunch, Dinner, and Snacks
- **Smart Food Search** — powered by Open Food Facts (3M+ products, free, no API key)
- **Live Macro Scaling** — nutrients are automatically scaled when you change gram quantity
- **Date Navigation** — browse any past or future date
- **Macro Donut Chart** — protein (blue) / carbs (amber) / fat (red) ring with % of goal
- **Progress Bar** — shows remaining vs consumed calories with colour coding (green → amber → red)

### Exercise Tracker
- **6 Workout Programs** — curated splits with muscle groups, exercise lists, and training notes
- **Live Workout Logger** — add exercises, log sets/reps/weight, built-in session timer
- **Workout History** — all past sessions with volume, set count, and exercise list
- **Strength Progress Charts** — SVG line chart showing max weight over time per exercise
- **Personal Records** — auto-calculated PR for each tracked exercise

### Dashboard
- **Calorie Ring** — large donut showing today's intake vs goal
- **Macro Boxes** — at-a-glance protein, carbs, fat with mini progress bars
- **Quick Actions** — one-tap to food diary or workout
- **Weekly Bar Chart** — 7-day calorie history with gradient bars
- **Nutrient Targets** — progress bars for all four macros

### Profile & Goals
- **Goal Setting** — daily calorie, protein, carbs, fat targets
- **Body Stats** — age, height, weight
- **BMI Calculator** — auto-calculated with weight category indicator
- **Workout Streak** — consecutive days with a logged session

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React Native + Expo SDK 57 | Cross-platform mobile (iOS + Android) |
| Language | TypeScript | Type-safe code throughout |
| Navigation | Expo Router v4 (file-based) | Auth guard, tab and stack routing |
| Styling | NativeWind v4 (Tailwind CSS) | Utility-first styling for React Native |
| Gradients | expo-linear-gradient | Header and card gradient effects |
| Backend | Supabase Auth + PostgreSQL | User auth, database, Row-Level Security |
| Data Fetching | TanStack Query v5 | Caching, background refresh, mutations |
| Charts | react-native-svg | Custom donut ring and bar charts |
| Food Data | Open Food Facts API | 3M+ products, open source, no key needed |
| Exercise Data | free-exercise-db (MIT) | 55 exercises bundled as JSON |
| Storage | @react-native-async-storage | Supabase session persistence |

---

## Project Structure

```
CaloriTracker/
├── app/
│   ├── _layout.tsx              Root layout: providers + AuthGate redirect
│   ├── (auth)/
│   │   ├── _layout.tsx          Auth stack layout
│   │   ├── login.tsx            Sign-in screen (gradient bg + bottom sheet)
│   │   ├── register.tsx         Create account screen
│   │   └── onboarding.tsx       Multi-step goal + body setup
│   └── (tabs)/
│       ├── _layout.tsx          Bottom tab bar (Dashboard, Calories, Exercise, Profile)
│       ├── index.tsx            Dashboard screen
│       ├── calories.tsx         Food diary screen
│       ├── exercise.tsx         Exercise tracker screen
│       └── profile.tsx          User profile + settings screen
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx           Gradient primary + ghost/secondary/danger variants
│   │   ├── Card.tsx             White card with 3 shadow tiers
│   │   └── Input.tsx            Labelled input with icon slot + error state
│   ├── calories/
│   │   ├── MacroDonut.tsx       SVG donut ring with macro segments + legend
│   │   ├── MealSection.tsx      Per-meal food log list with add/delete
│   │   ├── FoodSearchModal.tsx  Bottom sheet: search → select → quantity → add
│   │   └── CalorieProgressBar.tsx Horizontal progress bar with colour states
│   └── exercise/
│       ├── SplitCard.tsx        Gradient program card with expandable day plan
│       ├── WorkoutSession.tsx   Live workout logging modal with timer
│       ├── ExerciseSearch.tsx   Exercise picker with muscle group filter
│       └── ProgressChart.tsx    SVG line chart for strength progression
│
├── lib/
│   ├── context/
│   │   └── AuthContext.tsx      Supabase session, profile state, signIn/Out/Up
│   ├── queries/
│   │   ├── calories.ts          CRUD for food_logs + Open Food Facts search
│   │   └── exercise.ts          CRUD for workout_sessions + sets + progress
│   ├── data/
│   │   ├── splits.ts            6 workout split definitions (PPL, U/L, etc.)
│   │   └── exercises.json       55 exercises with muscle groups + instructions
│   ├── supabase.ts              Supabase client (AsyncStorage session persistence)
│   └── types.ts                 All TypeScript interfaces and types
│
├── supabase/
│   └── migrations/
│       └── 001_init.sql         Full schema: tables, indexes, RLS policies
│
├── .env.example                 Environment variable template
├── .env                         Your Supabase credentials (git-ignored)
├── app.json                     Expo app config (name, icons, web output)
├── babel.config.js              Babel preset for NativeWind JSX transform
├── metro.config.js              Metro bundler config for NativeWind CSS
├── tailwind.config.js           Tailwind theme + custom colour palette
├── global.css                   Tailwind base directives entry point
├── nativewind-env.d.ts          NativeWind + CSS module type declarations
├── tsconfig.json                TypeScript config
└── package.json
```

---

## Setup Guide

### Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/client) app on your phone **or** an iOS/Android emulator
- A free [Supabase](https://supabase.com) account

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

### Step 3 — Run the database migration

1. In Supabase, go to **SQL Editor**
2. Paste the full contents of `supabase/migrations/001_init.sql`
3. Click **Run** — this creates all tables and RLS policies

---

### Step 4 — Configure environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> Variables must use the `EXPO_PUBLIC_` prefix to be accessible at runtime.

---

### Step 5 — Start the app

```bash
npx expo start
```

| Platform | How to open |
|---|---|
| Physical phone | Scan QR code with **Expo Go** (Android) or **Camera app** (iOS) |
| Android emulator | Press `a` in the terminal |
| iOS simulator | Press `i` in the terminal |
| Web (limited) | Press `w` in the terminal |

> **First run:** Register an account → complete onboarding to set your calorie and macro goals.

---

## Workout Splits

| Program | Days/week | Level | Best For |
|---|---|---|---|
| Push / Pull / Legs (PPL) | 6 | Intermediate | Muscle hypertrophy, high frequency |
| Upper / Lower | 4 | Intermediate | Balanced strength + size |
| Full Body | 3 | Beginner | New lifters, general fitness |
| Arnold Split | 6 | Advanced | Classic bodybuilding |
| Bro Split | 5 | Intermediate | Focused isolation per muscle |
| PHUL (Power Hypertrophy) | 4 | Intermediate | Strength + size combined |

---

## Data Sources

| Source | License | Usage |
|---|---|---|
| [Open Food Facts](https://world.openfoodfacts.org/) | ODbL (Open Database) | Food search — 3M+ products, no API key required |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | MIT | Exercise library — 55 exercises, bundled as JSON |
| [Supabase](https://supabase.com) | Apache 2.0 | Backend infrastructure (auth, database, RLS) |

---

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL (from Settings → API) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key (safe to use client-side) |
