# WebSale Storage

Drag-and-drop cloud storage with admin/sub-user permissions powered by Cloudflare R2 and Supabase.

## Prerequisites

1. **Node.js** 18+
2. **Supabase** project with PostgreSQL
3. **Cloudflare R2** bucket named `websale`

## Setup

### 1. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor** in the Supabase dashboard
3. Run the SQL from `server/supabase-schema.sql` to create the `folders` and `shared_files` tables
4. Get your **Supabase URL** and **Service Role Key** from **Project Settings > API**

### 2. Configure Cloudflare R2

1. Create a bucket named `websale` in your Cloudflare R2 account
2. Go to **R2 > Manage R2 API Tokens** and create an API token with Read/Write permissions
3. Copy the **Access Key ID** and **Secret Access Key**
4. Set up CORS for your bucket (allow your Vercel domain and localhost)

### 3. Configure Server

1. Copy `server/.env.example` to `server/.env`
2. Fill in your credentials:

```env
PORT=3001
JWT_SECRET=websale_super_secret_jwt_key_change_me

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=websale
R2_REGION=us-east-1
R2_ENDPOINT=https://ac6950a1d4069b5c7854d1dfd394121c.r2.cloudflarestorage.com
CLIENT_URL=https://your-vercel-app.vercel.app
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
- **Storage:** Cloudflare R2 (S3-compatible)
