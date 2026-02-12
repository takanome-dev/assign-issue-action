# AGENTS.md

This file provides guidelines for AI coding agents working in this repository.

## Build, Lint, and Test Commands

### Essential Commands

```bash
# Type checking (TypeScript)
npm run test
# or
bun run test

# Run all tests
bun run test:unit

# Run a single test file
bun test commands/__tests__/self-assign.command.test.ts

# Run tests with coverage
bun run test:coverage

# Format code
bun run format

# Lint code
bun run lint

# Full CI check (lint + type check)
bun run ci

# Build for production
bun run bundle

# Complete workflow (format + lint + bundle)
bun run all
```

### Build Process

The project uses a two-step build:
1. `tsdown` - Bundles TypeScript to CommonJS
2. `ncc` - Creates the final distribution in `dist/index.cjs`

Always run `bun run bundle` before committing to ensure `dist/index.cjs` is up to date.

## Code Style Guidelines

### Formatting (Biome)

This project uses **Biome** (not ESLint/Prettier):

- **Indent**: 2 spaces
- **Line width**: 80 characters
- **Quotes**: Single quotes for JS/TS
- **Semicolons**: As needed (omitted when possible)
- **Trailing commas**: Always
- **Line endings**: LF
- **Arrow parentheses**: Always

Configuration is in `biome.json`.

### TypeScript Conventions

- **Target**: ES6, CommonJS modules
- **Strict mode**: Enabled (strictNullChecks, noImplicitAny, noImplicitReturns)
- **Types**: Always use explicit types for function parameters and returns
- **No unused locals**: Enabled - remove unused variables
- **Isolated declarations**: Enabled

### Naming Conventions

- **Files**: kebab-case (e.g., `comment-handler.ts`)
- **Classes**: PascalCase (e.g., `CommentHandler`)
- **Interfaces**: PascalCase with descriptive names (e.g., `ActionConfig`)
- **Functions**: camelCase (e.g., `getConfig()`)
- **Constants**: UPPER_SNAKE_CASE for enums (e.g., `INPUTS.ASSIGNED_TEXT`)
- **Private methods**: camelCase (no underscore prefix)

### Import Style

```typescript
// External imports first
import * as core from '@actions/core'
import { context } from '@actions/github'

// Internal imports (organized by path depth)
import CommentHandler from './handlers/comment-handler'
import { getConfig } from './core/config'
import { INPUTS } from './utils/lib/inputs'
```

Biome automatically organizes imports on format.

### Error Handling

```typescript
// Always handle errors with proper types
try {
  await someAsyncOperation()
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(error.message)
  }
}

// For async IIFE
;(async () => {
  try {
    await main()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
})()
```

### Testing

- **Framework**: Bun's built-in test runner (`bun:test`)
- **Pattern**: `**/__tests__/*.test.ts`
- **Mocking**: Use `mock()` from `bun:test`

```typescript
import { describe, expect, it, mock } from 'bun:test'

// Mock external modules before imports
const mockGetInput = mock((name: string): string => {
  return 'mock-value'
})

mock.module('@actions/core', () => ({
  getInput: mockGetInput,
}))
```

## Project Structure

```
├── commands/          # Command handlers (self-assign, unassign, etc.)
├── core/             # Core config and utilities
├── handlers/         # Event handlers (comment, schedule)
├── services/         # Business logic (assignment, GitHub API)
├── utils/            # Helper functions
├── index.ts          # Entry point
├── action.yml        # GitHub Action definition
└── biome.json        # Linting/formatting config
```

## Key Dependencies

- **Runtime**: Node 20.x, Bun 1.x
- **GitHub Actions**: `@actions/core`, `@actions/github`
- **Octokit**: `@octokit/core`, `@octokit/plugin-throttling`
- **Templates**: `mustache`
- **Dates**: `date-fns`

## Important Notes

1. **Always run type checking** (`bun run test`) before committing
2. **Always run the full bundle** (`bun run bundle`) to update `dist/index.cjs`
3. **Use Biome for formatting/linting** - no ESLint/Prettier
4. **Test files** use `__tests__/` subdirectories
5. **No comments** unless absolutely necessary - code should be self-documenting
6. **Backward compatibility** - when renaming inputs, support both old and new names with deprecation warnings

## Workflow

Before submitting changes:
1. `bun run format` - Format code
2. `bun run lint` - Lint code
3. `bun run test` - Type check
4. `bun run test:unit` - Run tests
5. `bun run bundle` - Build distribution
