# CORS Test

> Inspect Cross-Origin Resource Sharing headers — deployed as a Cloudflare Worker.

Live at [cors.infraforge.cc](https://cors.infraforge.cc)

## Stack

| Layer    | Tech                                       |
| -------- | ------------------------------------------ |
| Runtime  | Cloudflare Workers (edge, zero cold-start) |
| Language | TypeScript (ESM, strict mode)              |
| Styling  | Vanilla CSS with CSS custom properties     |
| Build    | Wrangler 4 via esbuild                     |
| CI/CD    | GitHub Actions → `wrangler deploy`         |

## Local development

```bash
pnpm install
pnpm run dev       # wrangler dev → http://localhost:8787
```

## Deploy

```bash
pnpm run deploy    # wrangler deploy
```

## License

MIT
