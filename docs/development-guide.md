# Development Guide & Workflow

## Setup & Running Locally

### Prerequisites
- Node.js v18+
- pnpm or npm

### Installation
```bash
# Install dependencies
pnpm install

# Initialize Database Schema
npx prisma db push

# Seed Demo Creator, Hiring Form, and Responses
npx prisma db seed

# Start Development Server
pnpm dev
```

### Accessing Demo Accounts
- **Creator Dashboard**: Open `http://localhost:3000/dashboard`
- **Demo User Email**: `creator@experienceforms.com`
- **Demo User Password**: `password123`
- **Public Hiring Form**: Open `http://localhost:3000/f/frontend-dev-app`

## Code Verification
```bash
# Type Check
npx tsc --noEmit

# Re-run Database Seed
npx prisma db seed
```
