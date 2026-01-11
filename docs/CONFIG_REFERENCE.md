# Tusk Configuration Reference (`tusk.yaml`)

This document defines all available configuration options for the `tusk-cli`. The `tusk.yaml` file is the heart of the project, controlling how remote schemas are sanitized and how local data is generated.

---

## 🔝 Top-Level Properties

### `dependency_versions` (Object)
Defines the specific versions of external tools used via `npx`. This ensures all developers use the same engine versions.
- `prisma`: Version for schema diffing (`bundle:prep` commands).
- `mermaid`: Version for diagram rendering (`generate:diagram` commands).

### `faker_configs` (Map)
Maps reference keys to local file paths for Faker definitions.
- **Key:** A unique identifier used in `seed_tables[].faker_config_ref`.
- **Value:** Path to a YAML file (e.g., `./templates/faker/users.yaml`).

---

## 🐘 `databases` (Array)
A list of remote source databases to synchronize.

### Database Properties:
- `source_name` (String): **Required.** A unique identifier for the remote source (e.g., "StatusReports"). Used for filename segmenting and as the database name for `.pgpass` lookups.
- `local_target_name` (String): **Required.** The name of the database created inside your local Docker container. This should be lowercase and snake_case (e.g., "status_db").
- `host` (String): **Required.** Remote database host. Supports port overrides (e.g., `db.example.com` or `db.example.com:5432`).
- `username` (String): **Required.** The remote database user.
- `sslmode` (String): SSL connection mode. Options: `disable` (default), `require`, `verify-full`.

---

## 🌱 `seed_tables` (Array)
Defined per database. Specifies which tables to pull and how to populate them.

### Table Properties:
- `table` (String): **Required.** Fully qualified table name (e.g., `public.users`).
- `method` (String): **Required.** The population strategy:
    - `dump`: Use `pg_dump --data-only --inserts`. Extracts real data from the remote source.
    - `faker`: Use synthetic data based on a YAML definition mapping columns to Faker.js methods.
    - `query`: Execute a custom SQL query from `templates/queries/` against the remote host.
    - `csv`: Load a local CSV from `templates/csv/` using the `\copy` command.
- `faker_config_ref` (String): **Required if method is `faker`.** The key defined in the top-level `faker_configs` map.
- `rows` (Number): The number of rows to generate. Currently applies to the `faker` method.
