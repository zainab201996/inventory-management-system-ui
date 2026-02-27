# Inventory Management System

Frontend application for the Inventory Management System built with Next.js, TypeScript, and Shadcn UI.

## Features

- User Management with role-based access control
- Roles Management
- Departments Management
- Regions, Divisions, and Sites Management (hierarchical structure)
- Authentication with JWT tokens
- Modern UI with Shadcn UI components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:7076
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/              # Next.js app directory
│   ├── login/       # Login page
│   ├── users/        # Users management page
│   ├── roles/        # Roles management page
│   ├── departments/  # Departments management page
│   ├── regions/      # Regions management page
│   ├── divisions/    # Divisions management page
│   └── sites/        # Sites management page
├── components/       # React components
│   ├── layout/       # Layout components (sidebar, header)
│   ├── ui/           # Shadcn UI components
│   ├── users/        # User management components
│   ├── roles/        # Role management components
│   └── ...          # Other feature components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and API client
└── types/            # TypeScript type definitions
```

## API Integration

The application integrates with the backend API documented in `API_DOCUMENTATION.md`. The API client is located in `src/lib/api-client.ts` and handles:

- Authentication (login, token verification)
- CRUD operations for all entities
- Automatic token management

## Authentication

The application uses JWT tokens stored in localStorage. The middleware (`src/middleware.ts`) protects routes and redirects unauthenticated users to the login page.

## Default Credentials

Use the credentials from your backend API:
- Username: `admin`
- Password: `admin123`

## Building for Production

```bash
npm run build
npm start
```

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- Shadcn UI
- Radix UI
- Lucide React

