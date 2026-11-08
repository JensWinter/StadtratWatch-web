# StadtratWatch Session Review

Maintainer tool for manually reviewing and correcting the machine-generated data of a council session before it is
published. Built with React, Vite, and TypeScript.

It is a client-only single-page app without a backend: it loads a session's data from CloudFront, and every save is a
browser file download. The downloaded files are then uploaded to S3 or committed to `data/` by hand. Where each file
goes is described in `docs/guides/session-processing/session-processing-pipeline.md`.

## Views

Each view works on one session, identified by its date (`YYYY-MM-DD`):

| Route                            | Purpose                                                                   | Saves                           |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| `/session/{sessionDate}/votings`  | Check and correct votes, agenda items, and paper references from the OCR scan; set majority requirement and present members, see the computed voting result | `session-scan-{date}.json`      |
| `/session/{sessionDate}/speakers` | Assign speaker segments to persons, remove noise, generate speeches       | `session-speakers-{date}.json`, `session-speeches-{date}.json` |
| `/session/{sessionDate}/speeches` | Review speeches and mark chair contributions                              | `session-speeches-{date}.json`  |

## Development

```bash
cd session-review

npm install
npm run dev       # Start dev server, then open e.g. /session/2024-06-17/votings
npm run build     # Type-check and build
npm run lint      # Run ESLint
```

The CloudFront base URL is configured in `src/constants/env.ts`.

The session scan types and the voting result calculation come from the shared models (`@srw-astro/models`, resolved
to `../src/deps/astro/` in `vite.config.ts` and `tsconfig.app.json`). The parliament period registries are bundled from
`../data/*/registry.json`, so a session must have its entry in `registry.json` before its voting result can be shown.
