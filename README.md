# localstack-webui

A browser-based dashboard for managing LocalStack services. A stripped-down AWS Console that points at your local LocalStack instance.

No backend. The browser talks directly to LocalStack through a dev proxy (Vite in development, nginx in production).

## Services

Each service has its own page with create, read, update, and delete operations:

- S3 — buckets, object browser, upload/download
- Secrets Manager — secrets with a JSON viewer and syntax highlighting
- DynamoDB — tables, item scan, insert/delete
- Lambda — create functions via .zip upload, invoke with payloads, update code
- CloudWatch Logs — log groups and streams, event viewer
- IAM — roles and policies, trust policy and policy document editors

The sidebar shows a green or gray dot next to each service depending on whether it's running. This comes from LocalStack's `/_localstack/health` endpoint and updates every 30 seconds.

## Running

### Development

Start LocalStack, then the UI:

```bash
docker compose up localstack -d
npm install
npm run dev
```

Vite proxies `/aws` to `localhost:4566` and strips the `Origin` header so LocalStack doesn't reject requests.

### Production

```bash
docker compose up -d
```

LocalStack runs on port 4566, the UI on port 3000. Nginx handles the proxy and SPA routing.

## Project layout

```
src/
  config/       AWS SDK client factories, connection config context
  contexts/     health check context (polling)
  services/     one file per AWS service
  pages/        one folder per service page
  components/   PageHeader, ConfigModal
  layouts/      app shell with custom sidebar
```

## Configuration

Click the connection badge in the top bar or "Settings" in the sidebar. You can change the endpoint, region, and credentials. Defaults to `test`/`test`, which is what LocalStack expects. Saved in localStorage.

## Stack

React 19, TypeScript, Vite, Ant Design (tables, forms, modals), AWS SDK v3 (modular, runs in the browser). The sidebar is custom HTML/CSS because Ant Design's Menu component has spacing opinions that are hard to work around.
