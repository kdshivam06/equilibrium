# Equilibrium Performance Portal - Architecture Overview

## 1. System Overview
Equilibrium is a real-time performance alignment system designed to handle goal creation, achievement tracking, manager approvals, and automated escalations.

### Core Technologies
- **Frontend Framework**: Next.js 14 (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4, shadcn/ui, base-ui, tw-animate-css, lucide-react
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security, Auth)
- **Email/Notifications**: Resend
- **Data Visualisation**: Recharts
- **Hosting**: Vercel

## 2. High-Level Architecture
The application runs as a serverless Next.js deployment on Vercel, interacting directly with a Supabase PostgreSQL instance. It follows a mostly Server Component-driven pattern for data fetching, with Client Components for interactivity.

### Data Flow Pattern
1. **Client/Browser**: Renders React components (Tailwind + shadcn).
2. **Next.js App Router**: Handles routing (`/employee`, `/manager`, `/admin`). Uses Server Actions & API routes for mutations.
3. **Supabase Client (@supabase/ssr)**: Connects to the database.
4. **PostgreSQL**: Stores relational data, enforcing security via Row Level Security (RLS).
5. **Cron Jobs / API Routes**: Background tasks for sending emails (Resend) and running the escalation engine.

## 3. Directory Structure
```text
equilibrium-portal/
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login/Authentication flows
│   │   ├── (dashboard)/    # Main application routes (employee, manager, admin)
│   │   └── api/            # Serverless API routes (cron, email, seed)
│   ├── components/         # Reusable UI components
│   │   ├── charts/         # Recharts wrappers (AchievementTrend, etc.)
│   │   ├── goals/          # Goal cards, status badges
│   │   ├── layout/         # Topbar, Sidebar, DemoSwitcher, OnboardingTour
│   │   ├── notifications/  # Notification dropdowns
│   │   └── ui/             # shadcn primitives
│   └── lib/                # Utility functions and types
│       ├── supabase/       # DB schema and client initialization
│       ├── types/          # TypeScript interfaces
│       ├── email/          # Resend templates and helpers
│       └── utils/          # Generic helpers
```

## 4. Database Schema (Supabase / PostgreSQL)

### Core Entities
- **`users`**: Stores employee details, linked to `auth.users`. Contains role (`employee`, `manager`, `admin`) and `manager_id` for hierarchy.
- **`goal_cycles`**: Defines performance periods (e.g., FY2025 Goal Setting, Q1, Q2).
- **`goals`**: The primary entity. Contains targets, weightage (>=10%), and status (`draft`, `submitted`, `approved`, `rework`). Supports shared goals (`shared_from_goal_id`).
- **`achievements`**: Tracks quarterly progress against a goal.
- **`checkins`**: Manager feedback and rating (`below`, `meets`, `exceeds`) per quarter.

### System Entities
- **`escalation_rules`**: Configurable rules for delays (e.g., goal_not_submitted, checkin_not_done).
- **`escalation_events`**: Tracks active escalations and their current level (Level 1 to 3).
- **`audit_logs`**: Tracks every action performed in the system for compliance.
- **`notifications`**: In-app notifications.

### Security
- **Row Level Security (RLS)** is strictly enforced:
  - Employees only see their own goals.
  - Managers see goals of employees where `user.manager_id = manager.id`.
  - Admins see everything.

## 5. Core Modules & Workflows

### A. Goal Management Flow
1. Employee drafts a goal (min 10% weightage).
2. Employee submits for approval.
3. Manager reviews -> Approves OR requests rework (with notes).
4. Goal becomes locked for the cycle.

### B. Achievement & Check-in Flow
1. At quarter end, employee logs progress in `achievements`.
2. Manager performs a `checkin`, providing a qualitative rating and comment.

### C. Automated Escalation Engine (API Route + Cron)
- A scheduled cron job hits `/api/cron` or specific escalation routes.
- It scans for goals stuck in `draft` or `submitted` past the configured `days_threshold`.
- If triggered, creates an `escalation_event` and sends emails via **Resend**.
- Escalates up the management chain (Level 1 -> Level 2 -> Level 3) if unresolved.

### D. Demo & Onboarding
- **Demo Switcher**: Allows one-click switching between Employee, Manager, and Admin views without re-authenticating.
- **Onboarding Tour**: Role-based interactive tour using a guided component.

## 6. Integrations
- **Resend**: Used in `/api/email/*` routes for "escalation" and "checkin-reminder" emails.
- **Next-Themes**: For Light/Dark (Midnight Cyber / Neon Tokyo) modes.
- **jsPDF / xlsx**: For exporting goal sheets and reports.
