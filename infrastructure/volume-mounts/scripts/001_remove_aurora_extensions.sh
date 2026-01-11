#!/bin/bash
# Runtime safety net to remove AWS extensions from DDL files.
# This script scans generated SQL files and ensures cloud-specific extensions 
# that do not exist in local PostgreSQL are commented out.

EXTENSIONS=("aws_s3" "aws_lambda" "aws_ml" "pg_tle" "rds_tools" "apg_plan_mgmt")

# Directory is relative to the script's location in infrastructure/volume-mounts/scripts/
DDL_DIR="$(dirname "$0")/../ddl"

if [ ! -d "$DDL_DIR" ]; then
    echo "DDL directory not found at $DDL_DIR"
    exit 0
fi

for file in "$DDL_DIR"/*.sql; do
  [ -e "$file" ] || continue
  echo "Checking $file for AWS extensions and replication objects..."
  for ext in "${EXTENSIONS[@]}"; do
    # Use sed to comment out CREATE EXTENSION and COMMENT ON EXTENSION
    # Supports both 'CREATE EXTENSION' and 'CREATE EXTENSION IF NOT EXISTS'
    sed -i "s/^\(CREATE EXTENSION.*\b$ext\b\)/-- \1/g" "$file"
    sed -i "s/^\(COMMENT ON EXTENSION.*\b$ext\b\)/-- \1/g" "$file"
  done

  # Comment out Publication and Subscription objects
  sed -i "s/^\(CREATE PUBLICATION.*\)/-- \1/g" "$file"
  sed -i "s/^\(ALTER PUBLICATION.*\)/-- \1/g" "$file"
  sed -i "s/^\(CREATE SUBSCRIPTION.*\)/-- \1/g" "$file"
  sed -i "s/^\(ALTER SUBSCRIPTION.*\)/-- \1/g" "$file"
done
