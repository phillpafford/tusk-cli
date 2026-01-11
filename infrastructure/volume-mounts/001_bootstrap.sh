#!/bin/bash
# Bootstrap shim to overcome Postgres ignoring subdirectories in /docker-entrypoint-initdb.d/

echo "Starting Tusk Bootstrap..."

# 1. Run the AWS Extension Sanitizer
if [ -f "/docker-entrypoint-initdb.d/scripts/001_remove_aurora_extensions.sh" ]; then
    /bin/bash /docker-entrypoint-initdb.d/scripts/001_remove_aurora_extensions.sh
fi

# 2. Run the Smart Runner
if [ -f "/docker-entrypoint-initdb.d/scripts/001_run_all.sh" ]; then
    /bin/bash /docker-entrypoint-initdb.d/scripts/001_run_all.sh
fi
