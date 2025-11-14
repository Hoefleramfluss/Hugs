# HUGS Head & Growshop E-Commerce Platform

This is a monorepo for a Shopify-like e-commerce platform for a Head & Growshop. It includes a feature-rich backend, a modern frontend, and all the necessary infrastructure-as-code for deployment on Google Cloud Platform.

## Project Structure

This project is a monorepo managed with npm workspaces.

-   `/backend`: A [Fastify](https://www.fastify.io/) application that serves the REST API. It uses [Prisma](https://www.prisma.io/) to interact with a PostgreSQL database.
-   `/frontend`: A [Next.js](https://nextjs.org/) application for the storefront and admin panel, built with React and styled with [Tailwind CSS](https://tailwindcss.com/).
-   `/infra`: Contains [Terraform](https://www.terraform.io/) configurations for provisioning GCP infrastructure (Cloud Run, Cloud SQL, etc.).
-   `/ci`: Holds CI/CD pipeline definitions, including `cloudbuild.yaml` for Google Cloud Build.

## Core Features

-   **No-Code Page Builder**: Admins can visually build and edit pages using a section-based editor.
-   **AI Content Generation**: Product descriptions can be auto-generated using the Gemini API.
-   **Modern E-commerce Stack**: Fastify backend for high performance, Next.js for a fast and flexible frontend.
-   **Full Admin Suite**: Dashboards for managing products, customers, settings, and SEO.
-   **Production-Ready**: Infrastructure-as-code, CI/CD pipelines, and operational runbooks for robust deployment and management on GCP.

## Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   npm (v8 or later)
-   Docker (for local containerization, optional)
-   A running PostgreSQL instance

### 1. Install Dependencies

From the root of the project, install all dependencies for both `backend` and `frontend` workspaces.

```bash
npm install -ws
```

### 2. Set Up Environment Variables

Each workspace has its own environment file.

-   Copy `backend/.env.example` to `backend/.env` and fill in the database URL and other secrets.
-   Copy `frontend/.env.local.example` to `frontend/.env.local` and set the API URL.

### 3. Set Up the Database

Navigate to the backend directory to run database migrations and seeding.

```bash
cd backend
npm run migrate:dev
npm run db:seed
cd ..
```

### 4. Run the Full Application

You can run both the backend and frontend development servers concurrently from the root directory.

```bash
npm run dev
```

-   Backend API will be available at `http://localhost:4000`
-   Frontend will be available at `http://localhost:3000`

## Admin Access

-   **URL**: `http://localhost:3000/admin`
-   **Email**: `admin@example.com`
-   **Password**: `admin-password-placeholder` (as defined in `backend/prisma/seed.ts`)

## Deployment

Deployment is automated via Google Cloud Build. See the [Terraform setup guide](./infra/terraform-readme.md) to provision the cloud infrastructure first. Pushing to the `main` branch will trigger the pipeline defined in `ci/cloudbuild.yaml`.
