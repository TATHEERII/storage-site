# WebSale Storage

Drag-and-drop cloud storage with admin/sub-user permissions powered by Backblaze B2 and Supabase.

## Prerequisites

1. **Node.js** 18+
2. **Supabase** project with PostgreSQL
3. **Backblaze B2** bucket named `websale`

## Setup

### 1. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor** in the Supabase dashboard
3. Run the SQL from `server/supabase-schema.sql` to create the `users` table
4. Get your **Supabase URL** and **Service Role Key** from **Project Settings > API**

### 2. Configure Backblaze B2

1. Create a bucket named `websale` in your Backblaze B2 account
2. Go to **App Keys** and create an Application Key
3. Copy the **keyID** and **applicationKey**

### 3. Configure Server

1. Copy `server/.env.example` to `server/.env`
2. Fill in your credentials:

```env
PORT=3001
JWT_SECRET=websale_super_secret_jwt_key_change_me

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

B2_KEY_ID=a2becc3bcbc2
B2_APPLICATION_KEY=your-b2-application-key
B2_BUCKET=websale
B2_REGION=us-west-002
B2_ENDPOINT=https://s3.us-west-002.backblazeb2.com
```

3. Install and seed admin:

```bash
cd server
npm install
node src/seed-admin.js
```

### 4. Configure Client

No additional config needed. It proxies API requests to the backend via Vite.

### 5. Run

Open two terminals:

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Security Rules

- **Admin** can: create sub-users, upload, download, and delete any file
- **Sub-user** can: upload and download their own files only
- **Sub-user** cannot: delete files or create other users
- Only admin can create sub-user accounts

## Tech Stack

- **Frontend:** React 19 + Vite 8
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Storage:** Backblaze B2 (S3-compatible)
