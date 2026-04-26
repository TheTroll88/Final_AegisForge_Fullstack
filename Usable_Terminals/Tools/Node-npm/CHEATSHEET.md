# Node.js & npm — Cheat Sheet

> **Path:** `C:\Program Files\nodejs\node.exe`  
> **Version:** Node 22.14.0, npm 10.9.2  
> **Type:** JavaScript runtime + package manager  
> **AegisForge Role:** Frontend build tools, API servers, Discord bots, blockchain tooling  
> **Also available:** npx (run packages without installing), corepack (Yarn/pnpm manager)

---

## Node.js Runtime

```bash
# Run scripts
node script.js                             # Execute file
node -e "console.log('hello')"             # Evaluate inline
node --inspect script.js                   # Run with debugger (chrome://inspect)
node --watch script.js                     # Auto-restart on changes (Node 18+)

# REPL (interactive)
node                                       # Start REPL
# .exit or Ctrl+D to quit
# .help for REPL commands

# Version & info
node -v                                    # Node version
node -p "process.arch"                     # Architecture (x64)
node -p "process.versions"                # All dependency versions
node -p "require('os').cpus().length"     # CPU count
node -p "require('os').freemem()/1e9"     # Free memory (GB)

# Environment variables
NODE_ENV=production node app.js            # Set env var (bash)
$env:NODE_ENV="production"; node app.js    # Set env var (PowerShell)
```

---

## npm (Package Manager)

```bash
# Project setup
npm init                                   # Interactive project setup
npm init -y                                # Quick setup with defaults

# Install packages
npm install                                # Install all from package.json
npm install express                        # Install + add to dependencies
npm install -D jest                        # Install as devDependency
npm install -g typescript                  # Install globally
npm install express@4.18.2                 # Specific version
npm install --save-exact lodash            # Pin exact version (no ^/~)

# Remove packages
npm uninstall express                      # Remove + update package.json
npm uninstall -g typescript                # Remove global package

# Update
npm update                                 # Update all packages (within semver range)
npm outdated                               # Show outdated packages
npm audit                                  # Check for vulnerabilities
npm audit fix                              # Auto-fix vulnerabilities

# List
npm ls                                     # Dependency tree
npm ls --depth=0                           # Top-level only
npm ls -g --depth=0                        # Global packages
npm list --json                            # JSON format

# Info
npm info express                           # Package details
npm info express version                   # Latest version
npm search keyword                         # Search registry
npm view express versions                  # All published versions

# Cache
npm cache clean --force                    # Clear cache
npm cache verify                           # Verify cache integrity
```

---

## npx (Execute packages)

```bash
# Run without installing
npx create-react-app my-app               # Create React project
npx ts-node script.ts                      # Run TypeScript directly
npx eslint .                               # Lint without global install
npx http-server                            # Quick static server
npx kill-port 3000                         # Kill process on port
npx depcheck                               # Find unused dependencies

# Run specific version
npx -p node@18 node -v                     # Run with specific Node version
npx -p typescript tsc --init               # Init TypeScript config
```

---

## package.json Scripts

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "clean": "rimraf dist",
    "prestart": "npm run build",
    "postinstall": "echo 'Dependencies installed!'"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

```bash
# Run scripts
npm start                                  # Run "start" script
npm run dev                                # Run any named script
npm test                                   # Run "test" script (alias: npm t)
npm run build                              # Run "build" script
```

---

## Common Patterns

```javascript
// Quick HTTP server
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
}).listen(8080, () => console.log('Listening on :8080'));

// Read/Write files
const fs = require('fs');
const data = fs.readFileSync('config.json', 'utf8');
const json = JSON.parse(data);
fs.writeFileSync('output.json', JSON.stringify(json, null, 2));

// Async file operations
const { readFile, writeFile } = require('fs/promises');
const content = await readFile('file.txt', 'utf8');
await writeFile('output.txt', content);

// Fetch API (Node 18+)
const res = await fetch('http://localhost:11434/api/tags');
const data = await res.json();

// Child process
const { execSync, exec } = require('child_process');
const output = execSync('git status', { encoding: 'utf8' });
```

---

## .npmrc Configuration

```ini
# ~/.npmrc or project .npmrc
registry=https://registry.npmjs.org/
save-exact=true                    # Pin exact versions
engine-strict=true                 # Enforce engines field
fund=false                         # Suppress funding messages
audit=true                         # Auto audit on install
loglevel=warn                      # Reduce noise
```

---

## Debugging & Troubleshooting

```bash
# Debug node
node --inspect-brk script.js              # Break on first line
# Open chrome://inspect in Chrome

# Memory issues
node --max-old-space-size=4096 script.js   # Increase heap to 4GB

# Common npm issues
npm cache clean --force                    # Fix corrupted cache
rm -rf node_modules && npm install         # Clean reinstall (bash)
Remove-Item node_modules -Recurse -Force; npm install  # PowerShell equivalent
npm config set registry https://registry.npmjs.org/    # Reset registry

# Check global prefix
npm config get prefix                      # Where globals install
npm root -g                                # Global node_modules path
```

---

## Useful AegisForge Commands

```bash
# Start services
npm run dev                                # Dev server with hot reload
npm start                                  # Production start

# Check for security issues
npm audit
npm audit --production                     # Only production deps

# Find what's using a port
npx kill-port 3000 8080 8545              # Kill processes on multiple ports

# Quick React Native (from project root)
npx react-native start                    # Metro bundler
npx react-native run-android              # Build + run on Android
npx react-native run-ios                  # Build + run on iOS
```
