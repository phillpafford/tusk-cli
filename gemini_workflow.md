# Gemini CLI Release Validation Workflow

This document outlines the steps to validate the project against the `npm_release_warden.md` persona and `release_standards.md` checklist using the Gemini CLI.

## Prerequisites
Ensure the following files are in your project root:
1. `npm_release_warden.md` (The System Prompt)
2. `release_standards.md` (The Checklist)

## Step 1: The "Deep Scan" Command

Run the following command in your terminal. This gathers your standards, your config, and a list of **exactly** what npm intends to publish, then sends it all to Gemini for analysis.

```bash
(
  echo "--- RELEASE STANDARDS ---"
  cat release_standards.md
  echo "\n--- PACKAGE CONFIGURATION ---"
  cat package.json tsconfig.json 2>/dev/null
  echo "\n--- NPM PUBLISH PREVIEW (DRY RUN) ---"
  npm pack --dry-run --json
) | gemini chat -f npm_release_warden.md
