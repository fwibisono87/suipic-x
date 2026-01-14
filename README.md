// Update README with comprehensive project documentation
# Suipic

Photo proofing for photographers and clients. Share your rushes, gather feedback, and streamline your editing workflow.

## Tech Stack

- **Frontend**: SvelteKit, SCSS, TanStack Query
- **Backend**: ElysiaJS (Bun), Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: Keycloak
- **Storage**: Garage (S3-compatible)
- **Reverse Proxy**: Nginx

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Bun 1.0+ (for backend)

### Development Setup

1. **Clone and configure:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

2. **Start infrastructure:**
   ```bash
   docker compose up -d postgres keycloak garage
   ```

3. **Setup Garage S3 bucket:**
   ```bash
   # After Garage starts, configure a bucket (see docs)
   ```

4. **Install dependencies:**
   ```bash
   cd backend && bun install
   cd ../frontend && npm install
   ```

5. **Run migrations and seed:**
   ```bash
   cd backend
   bun run db:generate
   bun run db:migrate
   bun run db:seed
   ```

6. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && bun run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

7. **Access the app:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Swagger docs: http://localhost:3001/docs
   - Keycloak admin: http://localhost:8080

### Docker (Production)

```bash
docker compose up -d
```

## Project Structure

```
suipic-x/
├── frontend/           # SvelteKit app
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── composables/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   └── routes/
│   └── ...
├── backend/            # ElysiaJS API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── db/
│   │   └── types/
│   └── ...
├── docker/             # Docker configs
│   ├── nginx/
│   ├── keycloak/
│   └── garage/
└── docker-compose.yml
```

## User Roles

- **Admin**: Manages photographers, full system access
- **Photographer**: Creates albums, uploads images, manages clients
- **Client**: Views albums, provides feedback (ratings, picks, comments)

## License

Private - All rights reserved
