# ClawConnect Setup

One-command installation for ClawConnect P2P messaging.

## Quick Start

```bash
# Clone and install
git clone https://github.com/TheSethRose/ClawConnect ~/.openclaw/skills/claw-connect
cd ~/.openclaw/skills/claw-connect
npm install
npm run build
```

## Setup Skill (Alternative)

The `claw-connect-setup` skill automates this:

1. `claw_connect_install` — Clones repo, installs dependencies
2. `claw_connect_start` — Builds project, returns initialization commands

### Setup Skill Notes

**Shell Execution:**
- Uses explicit `cd` commands with `shell: '/bin/bash'`
- `cwd` option in execAsync is unreliable on macOS

**Path Detection:**
- Each tool independently checks for ClawConnect installation
- Checks default path: `~/.openclaw/skills/claw-connect`
- Falls back to custom path if provided

**Command Structure:**
```typescript
// Working pattern
await execAsync('cd "' + installPath + '" && npm install', { shell: '/bin/bash' });

// Avoid this pattern (fails on macOS)
await execAsync('npm install', { cwd: installPath });
```

## Usage After Setup

```bash
# Initialize node
cd ~/.openclaw/skills/claw-connect
node -e "require('./dist/index').tools.claw_connect_init.run({}).then(console.log)"

# Generate invite code
node -e "require('./dist/index').tools.claw_connect_invite.run({}).then(console.log)"

# Join friend's network
node -e "require('./dist/index').tools.claw_connect_join.run({ code: 'claw-xxxxxx' }).then(console.log)"
```

## Troubleshooting

**"spawn /bin/bash ENOENT"**
- macOS shell path issue — use explicit `cd` commands

**"No such file or directory"**
- Check if `~/.claw-connect/` exists for data
- Check if `~/.openclaw/skills/claw-connect/` exists for skill

**Build fails**
- Ensure Node.js 18+ is installed
- Run `npm install` before `npm run build`
