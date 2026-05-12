# Build in Base

This app now uses:

- Clerk for authentication
- Google, X, and email/password sign-in through Clerk
- Neon PostgreSQL for persistence
- Prisma ORM for database access

## Environment variables

Create `C:\Projects\Build-in-Base\.env.local` from `.env.example` and fill in the values.

## Install dependencies

```bash
npm install
```

## Generate Prisma client

```bash
npm run prisma:generate
```

## Create the database schema in Neon

```bash
npm run prisma:migrate -- --name init_auth_db
```

## Run the app

```bash
npm run dev
```

## Clerk setup guide

### 1. Create a Clerk application

1. Go to the Clerk Dashboard and create or open your application.
2. Copy your API keys.
3. Put them in `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

### 2. Configure your local auth routes

Add these values to `.env.local` so Clerk knows your local sign-in and sign-up paths:

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
```

### 3. Enable email/password auth

In the Clerk Dashboard:

1. Open `User & authentication`.
2. Enable sign-up with email.
3. Enable sign-in with email.
4. Enable password-based sign-up/sign-in.
5. Keep email verification enabled unless you intentionally want to relax it.

### 4. Enable Google

Development:

1. Open `SSO connections`.
2. Select `Add connection`.
3. Choose `For all users`.
4. Select `Google`.

Production:

1. In `SSO connections`, add `Google`.
2. Turn on custom credentials.
3. Copy the redirect URI Clerk shows you.
4. In Google Cloud Console, create an OAuth client for a web app.
5. Paste Clerk's redirect URI into Google's authorized redirect URI list.
6. Copy the Google client ID and client secret back into Clerk.

### 5. Enable X

Development:

1. Open `SSO connections`.
2. Select `Add connection`.
3. Choose `For all users`.
4. Select `X/Twitter`.

Production:

1. In `SSO connections`, add `X/Twitter`.
2. Copy the redirect URI Clerk shows you.
3. In the X Developer Portal, create or open your app.
4. Set the app type to a web app and paste Clerk's callback URL.
5. Save the X client ID and client secret into Clerk.

Note:

- X may require additional setup in the X Developer Portal.
- X sign-in can require users to add an email after OAuth, depending on provider data returned to Clerk.

## Neon + Prisma setup guide

### 1. Create a Neon project

1. Open the Neon dashboard.
2. Create a project if you do not already have one.
3. Click `Connect`.
4. Copy:
   - the pooled connection string for runtime
   - the direct connection string for Prisma migrations

### 2. Add Neon URLs to `.env.local`

```env
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-POOLER-ENDPOINT/DB_NAME?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@YOUR-DIRECT-ENDPOINT/DB_NAME?sslmode=require
```

Recommended:

- Use the pooled Neon URL for `DATABASE_URL`
- Use the direct Neon URL for `DIRECT_URL`

### 3. Run Prisma migration

```bash
npm run prisma:migrate -- --name init_auth_db
```

### 4. Regenerate Prisma client after schema changes

```bash
npm run prisma:generate
```

## Database schema

The Prisma schema creates:

- `projects`
- `messages`

Each record is scoped by the Clerk `userId`.
