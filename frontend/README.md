# Frontend Service

This is the frontend for the Head & Growshop E-Commerce Platform, built with Next.js, React, and Tailwind CSS.

## Features

-   Modern, responsive storefront UI.
-   Client-side state management with React Context for shopping cart.
-   No-code page builder interface in the admin section.
-   Integration with Stripe.js for checkout.
-   Admin dashboard for managing products, customers, and site settings.
-   E2E testing with Playwright.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env.local` file in the `frontend` directory. This is mainly for the backend API URL.
    ```env
    # Example .env.local
    NEXT_PUBLIC_API_URL=http://localhost:4000
    ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Available Scripts

-   `npm run dev`: Starts the Next.js development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a production server.
-   `npm run lint`: Lints the code using Next.js's built-in ESLint configuration.
-   `npm run test:e2e`: Runs Playwright end-to-end tests.
