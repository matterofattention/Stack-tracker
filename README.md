# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Deployment

Deployed as a Cloudflare Worker (static assets), connected directly to this GitHub repo via Cloudflare's Git integration: build command `npm run build`, deploy command `npx wrangler deploy` (see `wrangler.jsonc`). The site sits behind Cloudflare Access, restricted to a single user — both the custom domain and the `*.workers.dev` project URL are gated, so there's no public fallback.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
