#!/bin/bash
set -e

# The default ORBISAVE db is already created by POSTGRES_DB
# We create the separate country databases here

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE orbisave_ke;
    CREATE DATABASE orbisave_rw;
    CREATE DATABASE orbisave_gh;
    GRANT ALL PRIVILEGES ON DATABASE orbisave_ke TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE orbisave_rw TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE orbisave_gh TO "$POSTGRES_USER";
EOSQL
