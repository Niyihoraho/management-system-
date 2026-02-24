SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

PSQL ?= psql
REPLICATION_ROLE ?= neon_replication
REPLICATION_PUBLICATION ?= supabase_to_neon
REPLICATION_SLOT ?= supabase_to_neon_slot
SUBSCRIPTION_NAME ?= supabase_replica

define assert-var
	@if [ -z "$$($(1))" ]; then \
		echo "Environment variable $(1) is required. See docs/ONE_WAY_REPLICATION.md." >&2; \
		exit 1; \
	fi
endef

.PHONY: help replication-precheck replication-create-role replication-create-publication \
	replication-create-subscription replication-verify replication-drop-subscription \
	replication-failover-help

help:
	@printf "Available targets:\n"
	@printf "  replication-precheck          Verify WAL settings on Supabase and connectivity on Neon\n"
	@printf "  replication-create-role       Create/refresh the logical replication role on Supabase\n"
	@printf "  replication-create-publication Create the publication that streams tables to Neon\n"
	@printf "  replication-create-subscription Create or replace the Neon subscription\n"
	@printf "  replication-verify            Show replication/subscription status\n"
	@printf "  replication-drop-subscription Drop the Neon subscription and Supabase slot\n"
	@printf "  replication-failover-help     Print the manual failover procedure summary\n"
	@printf "\nSet SUPABASE_DSN, SUPABASE_REPLICATION_CONN, NEON_DSN, and REPLICATION_PASSWORD before running.\n"

replication-precheck:
	$(call assert-var,SUPABASE_DSN)
	$(call assert-var,NEON_DSN)
	@echo "Supabase WAL configuration:"
	@$(PSQL) "$(SUPABASE_DSN)" -At -c "SHOW wal_level;"
	@$(PSQL) "$(SUPABASE_DSN)" -At -c "SHOW max_replication_slots;"
	@$(PSQL) "$(SUPABASE_DSN)" -At -c "SHOW max_wal_senders;"
	@echo "Neon connection check:"
	@$(PSQL) "$(NEON_DSN)" -At -c "SELECT current_database(), current_user;"

replication-create-role:
	$(call assert-var,SUPABASE_DSN)
	$(call assert-var,REPLICATION_PASSWORD)
	@echo "Ensuring replication role $(REPLICATION_ROLE) exists..."
	@$(PSQL) "$(SUPABASE_DSN)" -v role="$(REPLICATION_ROLE)" -v pwd="$(REPLICATION_PASSWORD)" <<'SQL'
DO $$
DECLARE
  r text := :'role';
  p text := :'pwd';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN REPLICATION PASSWORD %L', r, p);
  ELSE
    EXECUTE format('ALTER ROLE %I WITH REPLICATION PASSWORD %L', r, p);
  END IF;
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
  EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I', r);
  EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', r);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO %I', r);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO %I', r);
END $$;
SQL

replication-create-publication:
	$(call assert-var,SUPABASE_DSN)
	@$(PSQL) "$(SUPABASE_DSN)" -v pub="$(REPLICATION_PUBLICATION)" <<'SQL'
DO $$
DECLARE p text := :'pub';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = p) THEN
    RAISE NOTICE 'Publication % already exists - skipping CREATE', p;
  ELSE
    EXECUTE format('CREATE PUBLICATION %I FOR ALL TABLES', p);
  END IF;
END $$;
SQL

replication-create-subscription:
	$(call assert-var,NEON_DSN)
	$(call assert-var,SUPABASE_REPLICATION_CONN)
	@$(PSQL) "$(NEON_DSN)" \
	  -v sub="$(SUBSCRIPTION_NAME)" \
	  -v conn="$(SUPABASE_REPLICATION_CONN)" \
	  -v pub="$(REPLICATION_PUBLICATION)" \
	  -v slot="$(REPLICATION_SLOT)" <<'SQL'
DO $$
DECLARE
  s text := :'sub';
  c text := :'conn';
  p text := :'pub';
  sl text := :'slot';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_subscription WHERE subname = s) THEN
    EXECUTE format('DROP SUBSCRIPTION %I WITH (force = true)', s);
  END IF;
  EXECUTE format(
    'CREATE SUBSCRIPTION %I CONNECTION %L PUBLICATION %I WITH (slot_name = %L, copy_data = true, enabled = true)',
    s,
    c,
    p,
    sl
  );
END $$;
SQL

replication-verify:
	$(call assert-var,SUPABASE_DSN)
	$(call assert-var,NEON_DSN)
	@echo "Supabase pg_stat_replication:"
	@$(PSQL) "$(SUPABASE_DSN)" -c "SELECT pid, application_name, state, sync_state, sent_lsn, write_lsn, flush_lsn, replay_lsn FROM pg_stat_replication;"
	@echo "Neon pg_stat_subscription:"
	@$(PSQL) "$(NEON_DSN)" -c "SELECT subname, status, received_lsn, latest_end_lsn, lag, sync_state FROM pg_stat_subscription;"

replication-drop-subscription:
	$(call assert-var,NEON_DSN)
	$(call assert-var,SUPABASE_DSN)
	@$(PSQL) "$(NEON_DSN)" -v sub="$(SUBSCRIPTION_NAME)" <<'SQL'
DO $$
DECLARE s text := :'sub';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_subscription WHERE subname = s) THEN
    EXECUTE format('DROP SUBSCRIPTION %I WITH (force = true)', s);
  END IF;
END $$;
SQL
	@$(PSQL) "$(SUPABASE_DSN)" -v slot="$(REPLICATION_SLOT)" <<'SQL'
DO $$
DECLARE sl text := :'slot';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = sl) THEN
    PERFORM pg_drop_replication_slot(sl);
  END IF;
END $$;
SQL

replication-failover-help:
	@printf "Manual failover steps:\n"
	@printf " 1. Disable write endpoints in the app.\n"
	@printf " 2. Point DATABASE_URL at Neon and unset REPLICA_DATABASE_URL.\n"
	@printf " 3. When Supabase recovers, dump data from Neon, restore into Supabase, recreate publication/subscription.\n"
	@printf " 4. Re-enable writes once Supabase is authoritative again.\n"
