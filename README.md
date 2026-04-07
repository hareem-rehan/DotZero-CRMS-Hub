# DotZero CR Portal

A Change Request Management System (CRMS) for managing client change requests on fixed-cost projects.

## Prerequisites

- Node.js v20 LTS
- Docker + Docker Compose
- npm v10+

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/hareem-rehan/DotZero-CRMS-Hub.git
cd DotZero-CRMS-Hub

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start PostgreSQL
docker compose -f docker/docker-compose.yml up -d

# 5. Run database migrations and seed
npm run db:migrate
npm run db:seed

# 6. Start development servers
npm run dev
```

Client runs on `http://localhost:3000`
Server runs on `http://localhost:4000`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start client + server concurrently |
| `npm run dev:client` | Start Next.js client only |
| `npm run dev:server` | Start Express server only |
| `npm run build` | Build both client and server |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

## Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@dotzero.com | Admin@123 |
| Delivery Manager | dm@dotzero.com | Dm@12345 |
| Finance | finance@dotzero.com | Finance@1 |
| Product Owner | po@dotzero.com | Po@123456 |
