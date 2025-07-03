# Awell Bots

This project contains self-contained bots using the Medplum SDK for Awell Panels.

## Structure

Each bot is a self-contained file with its tests co-located in the same directory:

```
src/bots/
├── bot1/
│   ├── bot1.ts
│   └── bot1.test.ts
├── bot2/
│   ├── bot2.ts
│   └── bot2.test.ts
└── bot3/
    ├── bot3.ts
    └── bot3.test.ts
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the project
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format
```

## Environment Variables

Create a `.env` file with the following variables:

```env
MEDPLUM_CLIENT_ID=your_client_id
MEDPLUM_CLIENT_SECRET=your_client_secret
MEDPLUM_BASE_URL=https://api.medplum.com
NODE_ENV=development
```

## Adding a New Bot

1. Create a new directory in `src/bots/`
2. Add your bot implementation (e.g., `mybot.ts`)
3. Add tests co-located with the bot (e.g., `mybot.test.ts`)
4. Export the bot from `src/index.ts` 