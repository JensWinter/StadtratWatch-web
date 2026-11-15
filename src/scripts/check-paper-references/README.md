# check-paper-references

## Purpose

Reports every voting whose Drucksachennummer is not in `data/paper-reference-map.json`, e.g. the typo `0S0023/23`. Each
line names the session, the agenda item and the number. The number must match exactly, so stray whitespace is reported
too. Votings without a number are skipped. Wrong agenda items are not checked.

## Usage

From the repository root, for one session or for all sessions:

```bash
bun src/scripts/check-paper-references/index.ts -s 2023-04-20
bun src/scripts/check-paper-references/index.ts
```

The exit code is 0 if nothing is reported, 1 if something is, and 2 if the session has no scan.

| Flag             | Description                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `-s, --session`  | Check only this session (`YYYY-MM-DD`). Default: all sessions.                                     |
| `-d, --data-dir` | Directory with `paper-reference-map.json` and the parliament period directories. Default: `data/`. |
| `-h, --help`     | Show the help text and exit.                                                                       |
