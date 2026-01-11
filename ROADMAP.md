# Tusk CLI Roadmap 🚀

This document outlines the planned evolution of the Tusk CLI. These features aim to improve security, developer experience, and CI/CD integration.

---

## 🎯 Next Milestone: The `ci` Namespace (Air-Gapped Integration)
**Goal:** Enable zero-trust, repo-first database provisioning for CI/CD environments without remote database access.

### 🏗 Features:
- **`tusk ci:run` (Orchestrator):** 
    - Executes the full boot sequence using only repo-local files.
    - Applies `infrastructure/volume-mounts/ddl/` baseline snapshots first.
    - Automatically applies branch-specific artifacts from `artifacts/` in chronological order.
- **`tusk ci:validate` (SQL Linter):** 
    - Scans all committed SQL for syntax errors and forbidden commands (e.g., `DROP DATABASE`, `GRANT ALL`) before the build starts.
- **Artifact Versioning:** 
    - Improve the tracking of which artifacts have been applied to the local Docker instance to support incremental updates in long-running CI runners.

---

## ⚙️ Configuration & DX Enhancements
**Goal:** Reduce boilerplate in `tusk.yaml` and provide more granular control.

### 🏗 Features:
- **Global Defaults (`defaults` block):** 
    - Support top-level `username`, `sslmode`, and `target_schemas` to reduce repetition across multiple database entries.
- **Host Aliasing (`hosts` block):** 
    - Allow users to define a map of hostnames (e.g., `prod_db_cluster: "long-db-endpoint.postgresqldb.com"`) and refer to them via `host_ref` in the database configuration.
- **Interactive `tusk generate:config:db`:** 
    - Enhance the command to be an interactive prompt-based wizard for creating new database entries.

---

## 📽 Documentation & Visuals
**Goal:** Professionalize the contributor and end-user experience.

### 🏗 Features:
- **Automated GIF Injection:** 
    - A command to automatically update `README.md` and `DEVELOPER.md` with the latest rendered GIFs from `docs/demos/gifs/`.
- **Schema Dependency Visualization:** 
    - Extend `generate:diagram:mmd` to introspect Foreign Key relationships and generate a Mermaid ERD (Entity Relationship Diagram).

---

## 🧪 Quality Assurance
**Goal:** 100% reliability and parity.

### 🏗 Features:
- **Parity Check Utility:** 
    - A command to compare the data distribution (row counts, null ratios) between the remote source and the local Dockerized seed to ensure high-fidelity testing.
- **Windows Native Testing:** 
    - Expand `ops:self-test` to include platform-specific path validation for Windows developers.
