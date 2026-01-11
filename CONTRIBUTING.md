<p align="center">
  <img src="docs/assets/tusk.cli.logo.svg" width="100" alt="Tusk CLI Logo">
</p>

<h1 align="center">Contributing to Tusk CLI</h1>

Thank you for your interest in improving `tusk-cli`! 

This project adheres to **strict architectural constraints** to ensure safety, reliability, and ease of audit. Please read this guide carefully before submitting a Pull Request.

---

## 1. Prerequisites
You must have the following tools installed on your host machine to develop and test this tool:

* **Node.js:** v20.x (LTS) or higher.
* **Docker:** Required for local container orchestration.
* **PostgreSQL Client Tools:** * `psql` and `pg_dump` (Client v16+)
    * *Why?* We use native shell spawning instead of node libraries for database operations.
* **VHS:** (Optional) Required only if you are regenerating the demo GIFs (`vhs` must be in your PATH).

**Windows Users:** PowerShell may block the execution of setup and test scripts. Run the following to allow local scripts to run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 2. Development Setup

### A. The CLI Workspace
```bash
# 1. Clone the repo
git clone [https://github.com/phillpafford/tusk-cli](https://github.com/phillpafford/tusk-cli)
cd tusk-cli

# 2. Install Dependencies
npm install
```

### B. The "Mock" Remote Database
To test Tusk's syncing capabilities (e.g., `generate:ddl`, `db:diff`), you need a "Source" database running. We use a specific demo container to ensure consistent test data.

```bash
# 1. Clone the demo repo in a sibling directory
cd ..
git clone https://github.com/phillpafford/postgres-remote-local-demo
cd postgres-remote-local-demo

# 2. Setup local hostname (Adds fake-remote-db.local to /etc/hosts)
bash setup-host.sh

# 3. Start the "Remote" Database
# Note: This runs on Port 5433 to avoid conflicts with local Postgres installs
docker-compose up -d

# 4. Verify Connectivity
# User: remote_user | DB: remote_example | Schema: bookstore_ops
psql -h fake-remote-db.local -p 5433 -U remote_user -d remote_example -c "\dt bookstore_ops.*"
```

### C. Verify Environment
Once both repos are set up, run the smoke test in the `tusk-cli` directory:
```bash
npm run smoke
```

---

## 3. Maintainer Workflow (`TUSK_CONTRIBUTE`)
To ensure a clean user experience, advanced developer commands (Diagrams, Demos, Mocking, and Reset) are hidden by default.

### Enable Maintainer Commands
Set the `TUSK_CONTRIBUTE` environment variable to `'true'`:
```bash
export TUSK_CONTRIBUTE=true
tusk --help # Hidden commands will now appear
```

### The "One-Command" Reset
If your local configuration or generated SQL files become messy during development, run the full reset utility to restore the project to its default demo state:
```bash
tusk generate:db:reset --force
```
This command will:
1. Reset `tusk.yaml` to target the `postgres-remote-local-demo` repo.
2. Delete all generated DDL, Seed, and Init SQL files.
3. Clear existing Faker, Query, and CSV templates.
4. Re-scaffold the default demo templates and documentation assets.

---

## 4. Architectural Standards (Strict)
Violating these rules will cause your PR to be rejected.

### 🚫 Forbidden Patterns
1. **NO `pg` Library:** Do not use the `pg` node module.
    * **Correct Way:** Use the helper at `src/utils/psql.js`.
    * *Reason:* We rely on the user's system binary for authentication and SSL consistency.
2. **NO `require()`:** All files must use ES Modules (`import`/`export`).
3. **NO Emojis:** CLI output must be strictly ASCII/Plain text for compatibility.
4. **NO Em-dashes:** Use standard hyphens (`-`) or double-hyphens (`--`).

### ✅ Required Patterns
1. **Dry Run Mandate:** Every command that modifies state **MUST** implement `--dry-run`.
2. **Sanitization:** All filesystem paths and SQL identifiers must pass through `src/utils/sanitizer.js`.
3. **Dynamic Versioning:** Do not add `prisma` or `mermaid` to `package.json`. These are invoked via `npx` using versions defined in `tusk.yaml`.

---

## 4. Coding New Commands
1. **Naming:** Use `verb:noun` format (e.g., `sync:schema`).
2. **Registration:** Register the command in `bin/tusk.js`.
3. **Help Text:** Provide a `.description()` and help text for every option.
4. **Error Handling:** Log errors to `stderr` and use `process.exit(1)` for fatal failures.

---

## 5. Testing Policy
We follow a **"Quarantine on Failure"** policy during Alpha/Beta:

* **Runner:** Use `npm test` (native `node:test` runner).
* **Policy:** If a test fails and the source code is correct:
    1. **DO NOT** modify `src/` just to force a pass.
    2. **DO** modify the test file to skip the case using `t.skip()`.
    3. **DO** add a comment: `// FIXME: BROKEN TEST - [Brief Reason]`.

---

## 6. Documentation
If you change CLI logic, you must regenerate assets:

```bash
# 1. Regenerate Mermaid Diagrams (Diagrams -> docs/images/*.png)
node bin/tusk.js generate:docs --diagrams

# 2. Regenerate VHS Demos (Tapes -> docs/demos/gifs/*.gif)
node bin/tusk.js generate:docs --demos
```