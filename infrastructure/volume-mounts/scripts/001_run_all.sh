#!/bin/bash
# Smart Runner: Executes scripts in order, targeting the database defined in the filename.
# Protocol: {Prefix}__{Source}__{TargetDB}__{Context}.sql

# Directory is relative to the script's location
DDL_DIR="$(dirname "$0")/../ddl"

if [ ! -d "$DDL_DIR" ]; then
    echo "DDL directory not found at $DDL_DIR"
    exit 0
fi

# Sort alphabetically to respect prefix order (000, 200, 400...)
FILES=$(ls "$DDL_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$FILES" ]; then
    echo "No SQL files found in $DDL_DIR"
    exit 0
fi

for file in $FILES; do
  filename=$(basename "$file")
  
  # Extract the 3rd segment (TargetDB) using double underscore separator
  # Expected format: 200__source__targetdb__schema.sql
  target_db=$(echo "$filename" | awk -F'__' '{print $3}')
  
  if [ -z "$target_db" ]; then
    echo "Warning: Could not parse target database from $filename. Skipping."
    continue
  fi

  echo "Applying $filename to database: $target_db"
  
  # Execute via psql. 
  # We assume the user has set up 000_init.sql to create these databases.
  psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "$target_db" -f "$file"
done
