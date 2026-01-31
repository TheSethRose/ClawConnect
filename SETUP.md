# ClawConnect Setup Skill

One-command installation for ClawConnect P2P messaging.

## What is This?

This skill automates installing ClawConnect:
- Clones from GitHub
- Installs dependencies  
- Builds the project
- Provides setup instructions

## Usage

```
Agent: "Install ClawConnect"
→ Runs claw_connect_install
→ Runs claw_connect_start
→ Provides instructions
```

## Manual Installation

```bash
git clone https://github.com/TheSethRose/ClawConnect ~/.openclaw/skills/claw-connect
cd ~/.openclaw/skills/claw-connect
npm install
npm run build
```

## Project Structure

```
claw-connect-setup/
├── src/
│   └── index.ts      # Setup tools
├── SKILL.md          # OpenClaw skill docs
├── README.md         # This file
├── package.json
└── tsconfig.json
```

## See Also

- [ClawConnect Core](https://github.com/TheSethRose/ClawConnect) - The actual messaging skill
