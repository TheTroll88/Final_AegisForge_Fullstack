# Git — Cheat Sheet

> **Path:** `C:\Program Files\Git\cmd\git.exe`  
> **Version:** 2.49.0  
> **Type:** Distributed version control system  
> **AegisForge Role:** Code versioning across all projects, GitHub integration

---

## Configuration

```bash
# Identity
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Editor
git config --global core.editor "code-insiders --wait"

# View config
git config --list                          # All settings
git config --global --list                 # Global only
git config user.email                      # Specific value

# Useful settings
git config --global init.defaultBranch main
git config --global pull.rebase false      # Merge on pull (default)
git config --global push.default current   # Push current branch
git config --global fetch.prune true       # Auto-prune on fetch
git config --global core.autocrlf true     # Line ending conversion (Windows)
```

---

## Repository Setup

```bash
# Create repository
git init                                   # Initialize in current directory
git init project-name                      # Create + initialize directory
git clone https://github.com/user/repo.git # Clone remote repo
git clone URL folder-name                  # Clone into specific folder
git clone --depth=1 URL                    # Shallow clone (latest commit only)
```

---

## Basic Workflow

```bash
# Status
git status                                 # Working tree status
git status -s                              # Short format

# Stage changes
git add file.txt                           # Stage specific file
git add .                                  # Stage all changes
git add -p                                 # Interactive staging (hunk by hunk)
git add -A                                 # Stage all (including deletions)

# Commit
git commit -m "message"                    # Commit with message
git commit -am "message"                   # Stage tracked files + commit
git commit --amend                         # Modify last commit
git commit --amend --no-edit               # Amend without changing message
git commit --allow-empty -m "trigger CI"   # Empty commit

# Push/Pull
git push                                   # Push to remote
git push -u origin main                    # Push + set upstream
git push origin feature-branch             # Push specific branch
git pull                                   # Fetch + merge
git pull --rebase                          # Fetch + rebase (cleaner history)
git fetch                                  # Download without merging
git fetch --all                            # Fetch all remotes
```

---

## Branching

```bash
# List branches
git branch                                 # Local branches
git branch -r                              # Remote branches
git branch -a                              # All branches
git branch -v                              # With last commit

# Create/Switch
git branch feature-name                    # Create branch
git checkout feature-name                  # Switch to branch
git checkout -b feature-name               # Create + switch
git switch feature-name                    # Switch (modern)
git switch -c feature-name                 # Create + switch (modern)

# Delete
git branch -d branch-name                  # Delete (safe — only if merged)
git branch -D branch-name                  # Force delete
git push origin --delete branch-name       # Delete remote branch

# Rename
git branch -m old-name new-name            # Rename branch
git branch -m new-name                     # Rename current branch
```

---

## Merging & Rebasing

```bash
# Merge
git merge feature-branch                   # Merge into current branch
git merge --no-ff feature-branch           # Always create merge commit
git merge --squash feature-branch          # Squash all commits into one
git merge --abort                          # Cancel merge in progress

# Rebase
git rebase main                            # Rebase current branch onto main
git rebase -i HEAD~5                       # Interactive rebase last 5 commits
# In interactive rebase:
# pick   = keep commit
# squash = combine with previous
# reword = change message
# drop   = remove commit
# edit   = stop to amend
git rebase --abort                         # Cancel rebase
git rebase --continue                      # Continue after resolving conflicts
```

---

## Stashing

```bash
git stash                                  # Stash working changes
git stash push -m "description"            # Stash with message
git stash list                             # List all stashes
git stash show                             # Show stash diff summary
git stash show -p                          # Show full stash diff
git stash pop                              # Apply + remove latest stash
git stash apply                            # Apply but keep stash
git stash apply stash@{2}                  # Apply specific stash
git stash drop stash@{0}                   # Delete specific stash
git stash clear                            # Delete all stashes
```

---

## History & Diff

```bash
# Log
git log                                    # Commit history
git log --oneline                          # Compact view
git log --oneline -20                      # Last 20 commits
git log --graph --oneline --all            # Visual branch graph
git log --stat                             # Files changed per commit
git log -p file.txt                        # History of specific file
git log --author="name"                    # Filter by author
git log --since="2024-01-01"               # Filter by date
git log --grep="fix"                       # Filter by message

# Diff
git diff                                   # Unstaged changes
git diff --staged                          # Staged changes
git diff HEAD                              # All changes vs last commit
git diff branch1..branch2                  # Between branches
git diff --stat                            # Summary only
git diff --name-only                       # Just filenames

# Blame
git blame file.txt                         # Who changed each line
git blame -L 10,20 file.txt               # Lines 10-20 only

# Show
git show HEAD                              # Latest commit details
git show abc1234                           # Specific commit
git show HEAD:file.txt                     # File content at commit
```

---

## Undoing Changes

```bash
# Discard working changes
git checkout -- file.txt                   # Restore file (old syntax)
git restore file.txt                       # Restore file (modern)
git restore .                              # Restore all files

# Unstage
git reset HEAD file.txt                    # Unstage file (old)
git restore --staged file.txt              # Unstage file (modern)

# Reset commits
git reset --soft HEAD~1                    # Undo commit, keep changes staged
git reset --mixed HEAD~1                   # Undo commit, keep changes unstaged (default)
git reset --hard HEAD~1                    # Undo commit, DESTROY changes

# Revert (safe — creates new commit)
git revert abc1234                         # Revert specific commit
git revert HEAD                            # Revert latest commit

# Recover deleted commits
git reflog                                 # History of HEAD movements
git checkout abc1234                       # Check out lost commit
```

---

## Remote Repositories

```bash
# Remotes
git remote -v                              # List remotes
git remote add origin URL                  # Add remote
git remote remove origin                   # Remove remote
git remote set-url origin NEW_URL          # Change URL
git remote rename origin upstream          # Rename remote

# Fetch + track
git fetch origin                           # Fetch from origin
git branch --set-upstream-to=origin/main main  # Set tracking

# Force push (CAREFUL)
git push --force                           # Overwrite remote (dangerous!)
git push --force-with-lease                # Safer force push (fails if others pushed)
```

---

## Tags

```bash
git tag                                    # List tags
git tag v1.0.0                             # Lightweight tag
git tag -a v1.0.0 -m "Release 1.0.0"      # Annotated tag
git push origin v1.0.0                     # Push specific tag
git push origin --tags                     # Push all tags
git tag -d v1.0.0                          # Delete local tag
git push origin --delete v1.0.0            # Delete remote tag
```

---

## .gitignore

```gitignore
# Common patterns
node_modules/
.venv/
__pycache__/
*.pyc
.env
.env.local
*.log
dist/
build/
.DS_Store
Thumbs.db
*.sqlite3
.idea/
.vscode/settings.json
```

---

## Useful Aliases

```bash
# Set up aliases
git config --global alias.st "status -s"
git config --global alias.co "checkout"
git config --global alias.br "branch"
git config --global alias.ci "commit"
git config --global alias.lg "log --oneline --graph --all"
git config --global alias.last "log -1 HEAD"
git config --global alias.unstage "restore --staged"

# Usage: git st, git co main, git lg
```
