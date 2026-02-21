# Solana Stablecoin Standard (SSS)

The Solana Stablecoin Standard is an Anchor framework for deploying regulated stablecoins on Solana using Token-2022 extensions. It defines two presets:

- **SSS-1** — minimal stablecoin with role-based mint/burn/freeze/pause controls and no compliance extensions.
- **SSS-2** — fully-compliant stablecoin that adds a permanent delegate (asset seizure), a transfer hook (blacklist enforcement on every transfer), and default-frozen token accounts.

Both presets share the same on-chain program. The preset chosen at initialization determines which Token-2022 extensions are enabled on the mint.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                        │
│          (operator scripts, custodial systems)          │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                     CLI Layer                           │
│   sss-token init / mint / burn / freeze / thaw /        │
│   pause / unpause / blacklist / seize                   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                     SDK Layer                           │
│   @stbr/sss-sdk  (TypeScript)                           │
│   SolanaStablecoin  |  ComplianceModule                 │
│   PDA helpers  |  presets  |  types                     │
└───────────┬───────────────────────────┬─────────────────┘
            │                           │
┌───────────▼───────────┐  ┌────────────▼────────────────┐
│   sss-token program   │  │   transfer-hook program     │
│   (Anchor / Rust)     │  │   (Anchor / Rust)           │
│                       │  │                             │
│  initialize           │  │  initialize_extra_acct_meta │
│  mint_tokens          │  │  execute (SPL hook iface)   │
│  burn_tokens          │  │                             │
│  freeze / thaw        │  │  Checks blacklist PDAs on   │
│  pause / unpause      │  │  every Token-2022 transfer  │
│  add_minter           │  └─────────────────────────────┘
│  add_role / rm_role   │
│  add_to_blacklist     │
│  remove_from_blacklist│
│  seize                │
│  transfer_authority   │
└───────────────────────┘
```

## Program IDs

| Program | Localnet | Devnet |
|---|---|---|
| `sss_token` | `7xPa6e4hMagWEryfLD8bPvTs8cj8FT48FCoJPnP2EdyV` | `7xPa6e4hMagWEryfLD8bPvTs8cj8FT48FCoJPnP2EdyV` |
| `transfer_hook` | `6tULvFAJ7HfaMsjqcUyS7G3kJyncrBsth9kp2UGramiY` | `6tULvFAJ7HfaMsjqcUyS7G3kJyncrBsth9kp2UGramiY` |

## Quick Start

### Prerequisites

- Rust toolchain with `cargo-build-sbf`
- Anchor CLI (`anchor --version`)
- Node.js >= 18, Yarn
- Solana CLI with a funded keypair at `~/.config/solana/id.json`

### Run the test suite

```bash
anchor test
```

Starts a local validator, deploys both programs, and runs 25 integration tests covering the full SSS-1 and SSS-2 lifecycles plus SDK integration tests.

### Build the SDK and CLI

```bash
yarn install
yarn build
```

### CLI usage

Deploy an SSS-1 stablecoin:

```bash
sss-token init --name "USD Backed" --symbol "USDB" --preset sss-1
```

Deploy an SSS-2 compliant stablecoin:

```bash
sss-token init --name "USD Backed" --symbol "USDB" --preset sss-2
```

Mint tokens to a recipient:

```bash
sss-token mint <RECIPIENT_WALLET> 1000 --keypair ./minter.json
```

Burn tokens from the caller's own account:

```bash
sss-token burn 500 --keypair ./burner.json
```

Freeze a wallet's token account:

```bash
sss-token freeze <WALLET_ADDRESS>
```

Blacklist an address (SSS-2 only):

```bash
sss-token blacklist add <WALLET_ADDRESS> --reason "sanctions screening"
```

Seize tokens from a frozen account (SSS-2 only):

```bash
sss-token seize <FROM_WALLET> 1000 --to <TREASURY_WALLET>
```

Check stablecoin state:

```bash
sss-token status
```

All commands accept global flags:

```
--cluster <mainnet|devnet|testnet|localnet|URL>   RPC endpoint (default: devnet)
--keypair <path>                                  Authority keypair JSON
--mint <address>                                  Mint address (overrides .sss-config.json)
--json                                            Machine-readable JSON output
```

## Project Structure

```
solana-stablecoin-standard/
├── Anchor.toml                   Anchor workspace config, program IDs
├── Cargo.toml                    Rust workspace
├── package.json                  Yarn workspaces root
│
├── programs/
│   ├── sss-token/                Main stablecoin program (Rust/Anchor)
│   │   └── src/
│   │       ├── lib.rs            Program entry point, instruction dispatch
│   │       ├── state.rs          Account structs (StablecoinConfig, RoleManager, etc.)
│   │       ├── error.rs          SSSError enum
│   │       ├── events.rs         Anchor events emitted by each instruction
│   │       ├── constants.rs      Seed prefixes, capacity limits
│   │       └── instructions/     One file per instruction handler
│   └── transfer-hook/            Transfer hook program (Rust/Anchor)
│       └── src/
│           ├── lib.rs            Hook dispatch + SPL interface fallback
│           └── instructions/     initialize + execute handlers
│
├── sdk/                          TypeScript SDK (@stbr/sss-sdk)
│   └── src/
│       ├── stablecoin.ts         SolanaStablecoin class
│       ├── compliance.ts         ComplianceModule class (SSS-2)
│       ├── pda.ts                PDA derivation helpers
│       ├── presets.ts            SSS_1 / SSS_2 preset constants
│       └── types.ts              CreateConfig, StablecoinInfo interfaces
│
├── cli/                          TypeScript CLI (@stbr/sss-cli)
│   └── src/
│       ├── index.ts              Commander entry point
│       ├── commands/             One file per command
│       └── utils/                config loader, output formatting
│
├── services/
│   ├── mint-service/             Mint/burn lifecycle service (port 3001)
│   ├── indexer/                  On-chain event indexer + webhooks (port 3002)
│   └── compliance/               Sanctions screening + audit export (port 3003)
│
├── docker-compose.yml            Full stack: redis, postgres, all 3 services
├── scripts/
│   └── devnet-deploy.sh          Deploy both programs to Solana devnet
│
└── tests/
    ├── sss-1.ts                  SSS-1 integration tests (8 cases)
    ├── sss-2.ts                  SSS-2 integration tests (6 cases)
    └── sdk.ts                    TypeScript SDK integration tests (11 cases)
```

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Program layer model, state accounts, RBAC, transfer hook flow |
| [SDK Reference](docs/SDK.md) | TypeScript SDK installation, all methods, code examples |
| [Operations Runbook](docs/OPERATIONS.md) | Deploy, CLI reference, common operational workflows |
| [SSS-1 Specification](docs/SSS-1.md) | Minimal stablecoin standard — extensions, constraints, lifecycle |
| [SSS-2 Specification](docs/SSS-2.md) | Compliant stablecoin standard — compliance extensions, hook flow |
| [Compliance Guide](docs/COMPLIANCE.md) | Regulatory considerations, blacklist management, audit trail |
| [API Reference](docs/API.md) | Backend service REST API endpoints and request/response formats |

## Backend Services

Three Docker-containerized services support production stablecoin operations:

```bash
# Start all services (requires Docker)
docker compose up --build
```

| Service | Port | Purpose |
|---|---|---|
| `mint-service` | 3001 | Fiat-to-stablecoin mint/burn lifecycle management |
| `indexer` | 3002 | On-chain event monitoring and webhook delivery |
| `compliance` | 3003 | SSS-2 sanctions screening and audit trail export |

Services share Redis (cache/queue) and Postgres (audit trail). Configure via environment variables — see [API Reference](docs/API.md) for full endpoint documentation.

## Devnet Proof

> **Status: pending SOL funding**
>
> Deployer wallet: `3FSj4hjUY156gTEFr3FoJH6RVxeYoaBV7gssTNFUsRLV`
>
> Fund with ≥ 4 SOL at https://faucet.solana.com, then run:
> ```bash
> ./scripts/devnet-deploy.sh
> ```

Once deployed, this section will be updated with:

| Item | Value |
|---|---|
| `sss_token` program ID | `7xPa6e4hMagWEryfLD8bPvTs8cj8FT48FCoJPnP2EdyV` |
| `transfer_hook` program ID | `6tULvFAJ7HfaMsjqcUyS7G3kJyncrBsth9kp2UGramiY` |
| SSS-1 init tx | — |
| SSS-2 init tx | — |
| Mint tx | — |
| Blacklist + blocked transfer tx | — |
| Seize tx | — |
| Deployed at | — |
