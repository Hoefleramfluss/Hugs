
# Running Prisma Migrations in Cloud Build

Deploying database schema changes requires a secure and reliable process. This guide explains how to run `prisma migrate deploy` in a Cloud Build step, connecting to a private Cloud SQL instance using the Cloud SQL Auth Proxy.

## The Challenge

Our Cloud SQL instance has a private IP and is not accessible from the public internet. Cloud Build runs in a separate environment, so it cannot connect directly. The solution is the **Cloud SQL Auth Proxy**, which provides a secure, encrypted connection.

The `gcr.io/google-appengine/exec-wrapper` builder in Cloud Build is a convenient tool that bundles the Cloud SQL Auth Proxy.

## Cloud Build Step for Migrations

The following step from `ci/cloudbuild.yaml` handles the migration:

```yaml
- name: 'gcr.io/google-appengine/exec-wrapper'
  id: 'Run Prisma Migrations'
  args:
    - '-i'
    - 'gcr.io/cloud-builders/npm' # The image to run our command in
    - '-s'
    - '${_DB_CONNECTION_NAME}' # The Cloud SQL instance connection string
    - '--'
    - 'npm'
    - 'run'
    - 'migrate:deploy'
  dir: 'backend'
  secretEnv: ['DATABASE_URL']
```

### How It Works

1.  `name: 'gcr.io/google-appengine/exec-wrapper'`: This is the builder image that contains the Cloud SQL Auth Proxy.
2.  `-i 'gcr.io/cloud-builders/npm'`: This tells the wrapper which container image to *run our command inside*. We use the standard `npm` builder because our `package.json` has the necessary scripts.
3.  `-s '${_DB_CONNECTION_NAME}'`: This is the crucial flag. It tells the wrapper to start the Cloud SQL Auth Proxy and connect it to our database instance. The `_DB_CONNECTION_NAME` is a substitution variable provided to the build, e.g., `my-project:europe-west3:my-instance`. The proxy will be available at `/cloudsql/${_DB_CONNECTION_NAME}` inside the container.
4.  `-- 'npm' 'run' 'migrate:deploy'`: These are the commands that will be executed inside the `npm` container *after* the proxy is running and connected.
5.  `dir: 'backend'`: This sets the working directory to `/backend`, where our `package.json` and `prisma` schema are located.
6.  `secretEnv: ['DATABASE_URL']`: This is a placeholder to demonstrate how you would inject the full database URL if needed (e.g., if it contains the password). The `DATABASE_URL` in your `package.json` or Prisma schema should be configured to use the proxy socket path.

### Prisma `schema.prisma` Configuration

Your `datasource` block in `schema.prisma` should be configured to use the socket path provided by the proxy when running in the cloud environment.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The `DATABASE_URL` environment variable should be set to:
`postgresql://<USER>:<PASSWORD>@localhost/<DB_NAME>?host=/cloudsql/<INSTANCE_CONNECTION_NAME>`

This URL format tells Prisma to connect via the Unix socket created by the Cloud SQL Auth Proxy, rather than over TCP.
