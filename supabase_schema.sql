-- Supabase Prompts Table Schema

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL, -- REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for now, or if no auth
  prompt_text TEXT NOT NULL,
  source_website TEXT,
  tags TEXT[] NULL, -- Array of text for categorization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  is_favorite BOOLEAN DEFAULT false NOT NULL,
  -- Optional: Store conversation context or response snippet
  conversation_context TEXT NULL,
  -- Optional: Store a title for the prompt, if manually given or auto-generated
  title TEXT NULL
);

-- Indexing for common query patterns
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_source_website ON prompts(source_website);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_is_favorite ON prompts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN (tags); -- GIN index for array operations

-- Comment on user_id:
-- If you enable Row Level Security (RLS) and want users to only access their own prompts,
-- the user_id column will be crucial. You would typically link it to auth.users(id).
-- For initial development without RLS or user login, it can be NULL.
-- If you implement authentication later, ensure existing NULL user_id prompts are handled
-- (e.g., assign to a generic user or leave as admin-visible only).

-- Example of how to alter table later to add foreign key if starting without auth:
-- ALTER TABLE prompts
-- ADD CONSTRAINT fk_user
-- FOREIGN KEY (user_id)
-- REFERENCES auth.users (id)
-- ON DELETE CASCADE;

-- (Make sure auth.users table exists if you uncomment the above)

-- Row Level Security (RLS) Considerations (documentation - not enabled by default here):
-- 1. Enable RLS on the table in the Supabase dashboard (Authentication -> Policies).
-- 2. Define policies. Examples:
--
--    -- Allow users to read their own prompts
--    CREATE POLICY "Users can select their own prompts"
--    ON prompts
--    FOR SELECT
--    USING (auth.uid() = user_id);
--
--    -- Allow users to insert prompts for themselves
--    CREATE POLICY "Users can insert their own prompts"
--    ON prompts
--    FOR INSERT
--    WITH CHECK (auth.uid() = user_id);
--
--    -- Allow users to update their own prompts
--    CREATE POLICY "Users can update their own prompts"
--    ON prompts
--    FOR UPDATE
--    USING (auth.uid() = user_id)
--    WITH CHECK (auth.uid() = user_id);
--
--    -- Allow users to delete their own prompts
--    CREATE POLICY "Users can delete their own prompts"
--    ON prompts
--    FOR DELETE
--    USING (auth.uid() = user_id);
--
--    -- For public prompts or shared prompts, policies would be different.
--    -- For initial development without user authentication, you might have RLS disabled
--    -- or use a service role key for backend operations, or create permissive policies.
--    -- e.g. to allow all access if RLS is enabled (USE WITH CAUTION):
--    -- CREATE POLICY "Allow all access" ON prompts FOR ALL USING (true) WITH CHECK (true);

-- Full Text Search (Optional, but good for searching prompt_text)
-- ALTER TABLE prompts ADD COLUMN fts tsvector
--   GENERATED ALWAYS AS (to_tsvector('english', coalesce(prompt_text, '') || ' ' || coalesce(title, ''))) STORED;
-- CREATE INDEX prompts_fts ON prompts USING GIN (fts);
-- Query example: SELECT * FROM prompts WHERE fts @@ to_tsquery('english', 'search terms');

-- Ensure the "uuid-ossp" extension is enabled if not already (usually is on Supabase)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
-- (gen_random_uuid() is part of pgcrypto which is enabled by default on Supabase, so uuid-ossp might not be strictly needed for gen_random_uuid())
