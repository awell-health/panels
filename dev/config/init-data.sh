#!/bin/bash
set -e;

# Set default values if environment variables are not provided

# Create medplum database and user
if [ -n "${MEDPLUM_DB_USER:-}" ] && [ -n "${MEDPLUM_DB_PASSWORD:-}" ]; then
	echo "SETUP INFO: Creating medplum database and user ${MEDPLUM_DB_USER}"
	
	# First create database and user in postgres database
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
		CREATE DATABASE ${MEDPLUM_DB_NAME};
		CREATE USER ${MEDPLUM_DB_USER} WITH PASSWORD '${MEDPLUM_DB_PASSWORD}';
		GRANT ALL PRIVILEGES ON DATABASE ${MEDPLUM_DB_NAME} TO ${MEDPLUM_DB_USER};
	EOSQL
	
	# Then connect to medplum database and make user owner of public schema
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${MEDPLUM_DB_NAME}" <<-EOSQL
		ALTER SCHEMA public OWNER TO ${MEDPLUM_DB_USER};
	EOSQL
else
    echo "SETUP INFO: No medplum database credentials provided!"
fi


# Create n8n database and user
if [ -n "${N8N_DB_USER:-}" ] && [ -n "${N8N_DB_PASSWORD:-}" ]; then
	echo "SETUP INFO: Creating n8n database and user ${N8N_DB_USER}"
	
	# First create database and user in postgres database
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
		CREATE DATABASE ${N8N_DB_NAME};
		CREATE USER ${N8N_DB_USER} WITH PASSWORD '${N8N_DB_PASSWORD}';
		GRANT ALL PRIVILEGES ON DATABASE ${N8N_DB_NAME} TO ${N8N_DB_USER};
	EOSQL
	
	# Then connect to n8n database and make user owner of public schema
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${N8N_DB_NAME}" <<-EOSQL
		ALTER SCHEMA public OWNER TO ${N8N_DB_USER};
	EOSQL
else
    echo "SETUP INFO: No n8n database credentials provided!"
fi

echo "SETUP INFO: Created medplum and n8n databases with users ${MEDPLUM_DB_USER} and ${N8N_DB_USER}"