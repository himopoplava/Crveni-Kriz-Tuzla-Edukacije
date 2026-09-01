# Red Cross Education Calendar

A small calendar app for planning Red Cross education sessions.

## What is built

- Educator and volunteer profile roles
- Add new educator, volunteer, and admin profiles
- Password login for admins and educators
- One-button read-only calendar access for volunteers
- Calendar view by month
- Upcoming education list
- Team profile view
- Educators can add, edit, and delete only their own sessions
- Volunteers can view the calendar but cannot change dates
- Responsive layout for desktop and phone screens
- Supabase storage for shared public data
- Supabase database schema for real accounts and shared data

## How to open it

Open `index.html` in a browser.

No install step is needed.

## How dates and profiles are stored

The public app uses Supabase:

- `auth.users`: login accounts managed by Supabase Auth
- `profiles`: one row per person, connected to `auth.users.id`
- `profiles.role`: `educator`, `volunteer`, or `admin`
- `education_events`: calendar sessions
- `education_events.educator_id`: the educator who owns that session
- `supabase-config.js`: the public project URL and publishable key used by the website

The SQL file `supabase-schema.sql` creates those tables and security rules.

Important: passwords are handled by Supabase Auth. Do not store real passwords in `app.js`, `index.html`, or GitHub.

## Recommended Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run everything from `supabase-schema.sql`.
4. Enable email/password login in Supabase Auth.
5. Create a user for yourself in Supabase Auth.
6. Copy that user's ID.
7. Add a matching row in `profiles` with role `admin`.
8. Create users for educators in Supabase Auth.
9. Add a matching row in `profiles` for each educator.

The important security idea is Row Level Security:

- Volunteers can view the calendar without logging in.
- Signed-in admins and educators can view profiles and education events.
- Only educators and admins can create education events.
- Educators can update and delete only their own events.
- Volunteers have read-only access.

For publishing steps, see `DEPLOYMENT.md`.

## Next development step

Publish the folder with GitHub Pages, Netlify, or Vercel after the Supabase SQL and first admin profile are created.
