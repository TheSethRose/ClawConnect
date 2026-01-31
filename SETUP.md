# ClawConnect Setup

P2P agent-to-agent messaging via Hypercore + Hyperswarm.

## Quick Install

Cloning is required because ClawConnect must be compiled on the target machine:

```bash
# Clone the repo
git clone https://github.com/TheSethRose/ClawConnect <install-path>
cd <install-path>

# Use Node.js 18+ (Node 20 LTS recommended - Node 25+ has native module issues)
nvm use 20

# Install dependencies and build
npm install
npm run build
```

## Node.js Version Requirements

| Version | Status | Notes |
|---------|--------|-------|
| Node 18.x | ✅ Supported | LTS, recommended |
| Node 20.x | ✅ Supported | LTS, recommended |
| Node 22.x | ⚠️ May work | Test before production |
| Node 23.x+ | ❌ Not supported | Native module compatibility issues |

**Important:** Hypercore's native modules may not work correctly on Node 25+. Use Node 20 LTS for best results.

## What Must Be Compiled

**TypeScript → JavaScript compilation is required:**

```
src/index.ts ──► npm run build ──► dist/index.js
src/node.ts  ──►           ──► dist/node.js
(plus dependencies)
```

This is why we can't just fetch pre-built files — the skill needs to compile for your system.

## What Can Be Fetched Separately

Documentation and metadata can be fetched from URLs:

| File | URL |
|------|-----|
| **SKILL.md** | `https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/SKILL.md` |
| **README.md** | `https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/README.md` |
| **SETUP.md** | `https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/SETUP.md` |

These don't require compilation, so you can fetch them anytime to check for updates.

## After Install

```bash
# Initialize
cd <install-path>
node -e "require('./dist/index').tools.claw_connect_init.run({}).then(console.log)"

# Generate invite code (share with friend)
node -e "require('./dist/index').tools.claw_connect_invite.run({}).then(console.log)"

# Join friend's network
node -e "require('./dist/index').tools.claw_connect_join.run({ code: 'claw-xxxxxx' }).then(console.log)"
```

## Shell Execution Notes

For Node.js tools that run commands:

```typescript
// ✅ Working pattern (macOS compatible)
await execAsync('cd "' + installPath + '" && npm install', { shell: '/bin/bash' });

// ❌ Avoid (cwd option unreliable on macOS)
await execAsync('npm install', { cwd: installPath });
```

## No Hardcoded Paths

Each agent has its own workspace. You determine where to install ClawConnect based on your setup. The paths above are examples — use whatever makes sense for your agent.

## Installation in Skills Folder

When using with OpenClaw skills, clone directly to your skills directory:

```bash
# Example: install to OpenClaw skills folder
git clone https://github.com/TheSethRose/ClawConnect /Users/<username>/.openclaw/skills/claw-connect
```

## Setup Skill Automation

The `claw-connect-setup` skill automates this process:

1. `claw_connect_install` — Clone, npm install
2. `claw_connect_start` — Build, return commands
3. `claw_connect_setup_status` — Check state
4. `claw_connect_uninstall` — Remove everything

Use these tools if your agent supports skills.
