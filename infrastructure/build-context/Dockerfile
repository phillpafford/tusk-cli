# Base Image: PostgreSQL 16
FROM postgres:16

# Update apt-get
RUN apt-get update

# Logic: Install extensions from requirements.txt if it exists
COPY requirements.txt* /tmp/
RUN if [ -f /tmp/requirements.txt ]; then \
    apt-get install -y $(cat /tmp/requirements.txt) && \
    rm -rf /var/lib/apt/lists/*; \
    fi

# Logic: Copy custom configuration if it exists
COPY tusk.conf* /etc/postgresql/conf.d/

# Ensure the custom config is included by the main postgresql.conf
# Note: The official postgres image automatically includes files in /etc/postgresql/conf.d/ 
# if the directory exists and the image is configured to look there, 
# but we can also use the -c config_file option or include_dir if needed.
# By default, we use the standard entrypoint behavior.

