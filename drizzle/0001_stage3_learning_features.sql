CREATE TABLE IF NOT EXISTS "cornell_notes" (
  "id" text PRIMARY KEY NOT NULL,
  "study_set_id" text NOT NULL REFERENCES "study_sets"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cues" text DEFAULT '' NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "reflection" text DEFAULT '' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "cornell_notes_study_set_unique" ON "cornell_notes" ("study_set_id");

CREATE TABLE IF NOT EXISTS "study_set_shares" (
  "id" text PRIMARY KEY NOT NULL,
  "study_set_id" text NOT NULL REFERENCES "study_sets"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "study_set_shares_token_hash_unique" ON "study_set_shares" ("token_hash");
CREATE INDEX IF NOT EXISTS "study_set_shares_owner_set_idx" ON "study_set_shares" ("user_id", "study_set_id");
