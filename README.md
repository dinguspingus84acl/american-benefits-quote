# American Benefits - Coverage Quote

Lead-gen funnel built with Vite + React + TypeScript + Tailwind.
Auto-deploys to GitHub Pages at https://qualify.americanbenefitstoday.com on every push to `main`.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Production build

```bash
npm run build
npm run preview
```

Output goes to `dist/`.

## Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml` builds and publishes to GitHub Pages automatically.
The custom domain is set via `public/CNAME` (gets copied into the build by Vite).
See `DEPLOY.md` (one folder up) for the first-time setup walkthrough.
