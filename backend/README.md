# Backend Service

This is the backend for the Head & Growshop E-Commerce Platform, built with Fastify, Prisma, and TypeScript.

## Features

-   RESTful API for products, orders, inventory, and users.
-   JWT-based authentication.
-   Prisma ORM for database interaction with PostgreSQL.
-   Integration with Stripe for payments.
-   Integration with Gemini AI for content generation.
-   Real-time updates via Server-Sent Events (SSE).

## Prerequisites

-   Node.js (v18 or later)
-   npm or yarn
-   PostgreSQL database
-   A `.env` file (see `.env.example`)

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Setup Database**:
    -   Make sure your PostgreSQL server is running.
    -   Create a `.env` file in the `backend` directory and fill in your `DATABASE_URL`.
    -   Run migrations to create the database schema:
        ```bash
        npm run migrate:dev
        ```
    -   (Optional) Seed the database with initial data:
        ```bash
        npm run db:seed
        ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:4000` by default.

## Available Scripts

-   `npm run dev`: Starts the server in development mode with hot-reloading.
-   `npm run build`: Compiles TypeScript to JavaScript for production.
-   `npm start`: Starts the compiled application from the `dist` directory.
-   `npm run migrate:dev`: Creates and applies database migrations.
-   `npm run migrate:deploy`: Applies pending migrations to a production database.
-   `npm run db:seed`: Seeds the database with sample data.
-   `npm test`: Runs Jest tests.

## Environment Variables

Create a `.env` file in this directory with the following variables:

```env
# Example .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
PORT=4000
JWT_SECRET="your-super-secret-jwt-key"
API_KEY="your-gemini-api-key"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
POS_API_KEY="your-secret-pos-api-key"
FRONTEND_URL="http://localhost:3000"
```
