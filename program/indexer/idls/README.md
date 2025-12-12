# IDLs Directory

This directory contains the Anchor IDL and TypeScript types for the WeSwap program.

## Files

- `weswap.json` - Anchor IDL (Interface Definition Language)
- `weswap.ts` - TypeScript types generated from IDL

## Updating

When the WeSwap program is updated, run:

```bash
# From the project root
anchor build

# From the indexer directory  
npm run copy-artifacts
```

Or use the convenience script:

```bash
# From the indexer directory
npm run update-idls
```

## Deployment

These files are committed to git so Railway deployment works without needing to build the Anchor program.
