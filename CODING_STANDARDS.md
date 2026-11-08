# Coding Standards

Rules the reviewer applies to a diff. Conventions in `AGENTS.md` (Code Conventions, Boundaries) apply as well.

## Documentation

- **Removals delete their mentions.** When a change removes a file, folder or step, delete every mention of it from the docs. Notes that only explain an absence ("X is not in `data/`", "do not commit X") are findings.
- **arc42 names concepts and decisions.** Details like value lists, descriptions of validation rules and concrete error messages that the code holds stay in the code.

## Domain data

- **Council facts come from the period's data.** Read numbers that belong to a parliament period (member count, seats) from `data/{period}/registry.json`. Don't use hard-coded constants.

## Naming

- **Own names leave imports unaliased.** Name your own exports so an import keeps its original name (`parseCliArgs` next
  to `node:util`'s `parseArgs`, not `parseArgs` plus `import { parseArgs as nodeParseArgs }`). An alias is fine only
  for a clash between two imports. A pattern copied from a sibling file is no exception.

## Scripts

- **CLI help describes the interface.** The usage line in a script's `--help` text names the script and its flags (`bun index.ts -i <input-dir> …`), like the sibling `cli.ts` files. Commands with paths from the repo root belong in the script's README.
