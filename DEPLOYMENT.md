# Publishing The Calendar Website

This app is currently a static website. That means it can be published very easily because it only needs:

- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`

## Easiest First Publish: Netlify

1. Go to <https://app.netlify.com/drop>.
2. Drag this whole project folder into Netlify Drop.
3. Netlify will give you a public website link.
4. Open that link on desktop and phone to test it.

This publishes the Supabase-connected version. Make sure the SQL setup below is finished before sharing the link.

## Better Long-Term Publish: GitHub + Vercel Or Netlify

Use this when the Red Cross team will use the app seriously.

1. Create a GitHub repository.
2. Upload these project files.
3. Create a Vercel or Netlify account.
4. Import the GitHub repository.
5. Every time the code is updated, the website can be republished automatically.

## Supabase Setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Copy everything from `supabase-schema.sql`.
4. Run it.
5. Go to Authentication settings.
6. Enable email/password login.
7. Create a Supabase Auth user for yourself first.
8. Copy your Auth user ID.
9. Add one row in `profiles` for yourself with role `admin`.
10. Create Supabase Auth users for educators.
11. Add one row in `profiles` for each educator.

Passwords are created and stored in Supabase Auth. Do not add real passwords to the website code.

## Important Security Notes

- The Supabase project URL can be used in the website.
- The Supabase publishable or anon key can be used in the website.
- Never put the Supabase `service_role` key in frontend code.
- Row Level Security in `supabase-schema.sql` protects who can view and edit data.

## Volunteer Access

Volunteers use the public button on the login screen. They do not need a password and they cannot add, edit, or delete education sessions.
