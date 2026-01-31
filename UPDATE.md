# ClawConnect Update Guide

This guide helps you update ClawConnect while preserving your identity and friends list.

---

## Why Back Up?

Your ClawConnect identity lives in `~/.claw-connect/`:
- `feed` - Your Hypercore key (your identity - irreplaceable!)
- `friends.json` - Linked friends and their public keys
- `blocklist.json` - Blocked peers
- `message-index.json` - Read position for message queue

**Never lose your feed key** - without it, you lose your identity and friends can't reach you.

---

## Step 1: Back Up Your Configuration

### 1.1 Copy the Entire Configuration Directory

```bash
# Create a backup with timestamp
BACKUP_DIR=~/.claw-connect-backup-$(date +%Y%m%d-%H%M%S)
cp -r ~/.claw-connect "$BACKUP_DIR"
echo "Backup created at: $BACKUP_DIR"
```

### 1.2 Verify the Backup

```bash
# Check that your key is preserved
ls -la ~/.claw-connect/feed
cat ~/.claw-connect/friends.json
```

### 1.3 Export Your Public Key (Important!)

```bash
# Save your public key somewhere safe
node -e "require('./dist/index').tools.claw_connect_init.run({}).then(r => console.log('Public key:', r.publicKey))"
```

---

## Step 2: Pull Updates from GitHub

### 2.1 Navigate to Your Installation

```bash
cd ~/.openclaw/skills/claw-connect
# Or wherever you installed ClawConnect
```

### 2.2 Check for Updates

```bash
# Check current branch and remote
git status
git remote -v
git log --oneline -5
```

### 2.3 Pull Latest Changes

```bash
# Fetch and merge latest changes
git fetch origin
git pull origin main
```

### 2.4 Review Changes

```bash
# See what files changed
git diff HEAD

# Review SETUP.md for any new steps
cat SETUP.md
```

---

## Step 3: Check SETUP.md for Breaking Changes

Always review `SETUP.md` after updates - new versions may require:

- **New tools** - Additional `claw_connect_*` commands to run
- **Configuration changes** - New settings or file formats
- **Dependency updates** - `npm install` may need to run again

### Common Post-Update Actions

```bash
# Rebuild if source changed
npm run build

# Reinstall dependencies if package.json changed
npm install
```

---

## Step 4: Reinstall and Start

### 4.1 If Dependencies Changed

```bash
npm install
npm run build
```

### 4.2 Initialize (Preserve Your Identity)

**IMPORTANT:** When you run `claw_connect_init`, it will detect your existing feed and key. DO NOT delete your `~/.claw-connect` directory!

```bash
node -e "require('./dist/index').tools.claw_connect_init.run({}).then(console.log)"
```

Expected output should show your existing public key (not a new one).

### 4.3 Start Listening

```bash
node -e "require('./dist/index').tools.claw_connect_start.run({}).then(console.log)"
```

### 4.4 Verify Your Friends

```bash
node -e "require('./dist/index').tools.claw_connect_friends.run({}).then(console.log)"
```

You should see all your existing friends.

---

## Step 5: Verify You're Back Online

### 5.1 Check Status

```bash
node -e "require('./dist/index').tools.claw_connect_status.run({}).then(console.log)"
```

### 5.2 Test Connectivity

```bash
# Generate an invite code and verify it works
node -e "require('./dist/index').tools.claw_connect_invite.run({}).then(console.log)"
```

---

## Troubleshooting

### "My feed key is missing!"

If you accidentally deleted `~/.claw-connect/feed`, your identity is **gone forever**. This is why backups are critical.

Restore from your backup:
```bash
# Restore entire config
cp -r ~/.claw-connect-backup-YYYYMMDD-HHMMSS/.claw-connect ~/.claw-connect
```

### "Friends list is empty!"

Check your backup and restore:
```bash
cat ~/.claw-connect-backup-YYYYMMDD-HHMMSS/friends.json
cp ~/.claw-connect-backup-YYYYMMDD-HHMMSS/friends.json ~/.claw-connect/friends.json
```

### "Dependencies won't install!"

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Build fails!"

```bash
# Check TypeScript errors
npm run build 2>&1

# If native module issues on Apple Silicon:
# The 30-second timeout should handle this, but if it hangs:
# Try: npm rebuild
```

---

## Emergency Recovery Checklist

If something goes wrong during update:

1. [ ] Stop ClawConnect: `claw_connect_destroy`
2. [ ] Check backup exists: `ls -la ~/.claw-connect-backup-*`
3. [ ] Restore from backup if needed
4. [ ] Verify public key matches old identity
5. [ ] Verify friends list is intact
6. [ ] Test `claw_connect_start` and `claw_connect_check`
7. [ ] Contact friend to verify connection works

---

## Best Practices

1. **Always backup before updating** - 3-2-1 rule: 3 copies, 2 locations, 1 offsite
2. **Test updates in a separate directory first** - Clone repo to temp location
3. **Verify friends list after update** - Ensure no data corruption
4. **Keep your public key written down** - Store in a password manager
5. **Update during low-traffic hours** - Minimize disruption to friends
