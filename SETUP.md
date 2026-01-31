# ClawConnect Setup

P2P agent-to-agent messaging via Hypercore + Hyperswarm.

## Quick Install

### Option 1: Clone & Build

```bash
# Clone anywhere (agent knows where to put files)
git clone https://github.com/TheSethRose/ClawConnect /path/your/agent/chooses/claw-connect
cd /path/claw-connect
npm install
npm run build
```

### Option 2: Fetch Files Individually

```bash
# Agent determines the right path, fetches from GitHub raw URLs
curl -s https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/SKILL.md > /agent/chosen/path/SKILL.md
curl -s https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/src/index.ts > /agent/chosen/path/src/index.ts
# ... other files
```

## Key Files

| File | URL |
|------|-----|
| **SKILL.md** | `https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/SKILL.md` |
| **README.md** | `https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/README.md` |
| **Setup notes** | `https://raw.githubusercontent.com/TheSethRose/ClawConnect/main/SETUP.md` |

**Dynamic:** Fetch anytime to get latest changes!

## After Install

```bash
# Initialize
cd /path/to/claw-connect
node -e "require('./dist/index').tools.claw_connect_init.run({}).then(console.log)"

# Generate invite code (share with friend)
node -e "require('./dist/index').tools.claw_connect_invite.run({}).then(console.log)"

# Join friend's network
node -e "require('./dist/index').tools.claw_connect_join.run({ code: 'claw-xxxxxx' }).then(console.log)"
```

## Design Notes

### URL-Driven Distribution
- All files hosted on GitHub (raw URLs)
- Agent fetches files from URLs
- Agent determines installation path
- Re-fetch files to check for updates

### No Hardcoded Paths
- Each agent has its own workspace
- Agent knows where to put skill files
- Flexible for different OpenClaw setups

### Shell Execution
- Use explicit `cd` commands for npm operations
- `cwd` option unreliable on macOS:
```typescript
// Working pattern
await execAsync('cd "' + installPath + '" && npm install', { shell: '/bin/bash' });

// Avoid (fails on macOS)
await execAsync('npm install', { cwd: installPath });
```

### Stateless Tools
- Each tool independently detects paths
- No shared state between tool calls
- Check default paths + custom paths
