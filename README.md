# jules_test
# Supabase Backend Setup Instructions

This document guides you through setting up the Supabase backend for the AI Chat Exporter Chrome Extension.

## 1. Create a New Supabase Project

1.  Go to [Supabase](https://supabase.com/).
2.  Click on "**Start your project**" or "**Dashboard**" if you already have an account.
3.  Log in or sign up.
4.  Click on "**New project**".
5.  Choose an organization or create a new one.
6.  Fill in the project details:
    *   **Name**: e.g., `AI Chat Exporter Backend`
    *   **Database Password**: Generate a strong password and save it securely. You'll need this if you ever connect directly to the database.
    *   **Region**: Choose the region closest to your users or yourself.
    *   **Pricing Plan**: The free tier is sufficient for development and small-scale use.
7.  Click "**Create new project**". Wait for the project to be provisioned.

## 2. Create the `prompts` Table using the SQL Editor

1.  Once your project dashboard is loaded, look for the sidebar menu on the left.
2.  Click on the **SQL Editor** icon (it often looks like `<> SQL`).
3.  Click on "**+ New query**" or open an existing "Welcome" query tab.
4.  Copy the entire content of the `supabase_schema.sql` file (provided with the extension source code) into the query editor.
    *   The `supabase_schema.sql` file contains the `CREATE TABLE` statement for the `prompts` table and other helpful definitions like indexes.
5.  Review the SQL (optional, but good practice).
6.  Click the "**RUN**" button (usually green).
7.  You should see a "Success. No rows returned" message or similar, indicating the table and related objects were created successfully.
8.  You can verify this by going to the **Table Editor** icon in the sidebar, selecting the `public` schema, and you should see the `prompts` table listed.

## 3. Locate Project URL and `anon` Key

1.  In the Supabase project dashboard, navigate to the **Project Settings** (usually a gear icon in the sidebar).
2.  In the Project Settings menu, click on **API**.
3.  You will find:
    *   **Project URL**: Under "Project Configuration" -> "URL". This is your unique Supabase URL.
    *   **Project API Keys**: Under "Project API Keys". You need the **`anon` public** key. This key is safe to use in client-side applications like a Chrome extension because Row Level Security (RLS) will protect your data (once configured).
4.  Copy both the Project URL and the `anon` key. You will need to insert these into the `background.js` file of the Chrome extension.

    **Example:**
    *   URL: `https://yourprojectid.supabase.co`
    *   anon key: `eyJh......`

## 4. Row Level Security (RLS) - Important Considerations

The `supabase_schema.sql` file includes comments and example policies for Row Level Security (RLS).

*   **Why RLS?** If you plan to have multiple users save prompts, RLS is crucial to ensure that users can only access and modify their own data.
*   **Initial State:** By default, RLS is OFF for new tables. This means the `anon` key allows full read/write access to anyone with it, which is fine for initial local development but **NOT for production or shared use.**
*   **Enabling RLS:**
    1.  In Supabase, go to **Authentication** (shield icon) -> **Policies**.
    2.  Select the `prompts` table.
    3.  Click "**Enable RLS**".
    4.  **You MUST then add policies** to grant access. Without policies, enabling RLS means no one can access the table (not even with the `anon` key).
*   **Example Policies (from `supabase_schema.sql`):**
    *   `CREATE POLICY "Users can select their own prompts" ON prompts FOR SELECT USING (auth.uid() = user_id);`
    *   `CREATE POLICY "Users can insert their own prompts" ON prompts FOR INSERT WITH CHECK (auth.uid() = user_id);`
    *   (And similar for UPDATE and DELETE)
*   **For this Extension (Initial Phase):**
    *   If you are the only user or are just testing, you can proceed with RLS disabled. The `user_id` column in the `prompts` table can be `NULL`.
    *   If you implement user authentication within the extension (e.g., via Supabase Auth UI or by linking to existing Supabase users), you **MUST** enable RLS and define appropriate policies using the `user_id` column to link prompts to users.
    *   For operations in `background.js` that might not be tied to a specific user context (e.g. admin tasks, if any), you might use the `service_role` key, but this should be done with extreme caution and never exposed in the client-side code.

**Recommendation:** Start with RLS disabled for ease of initial development. Once you have the basic prompt saving working and if you intend for this to be used by others or want to separate your own prompts securely if you log into Supabase, implement user authentication in the extension and then enable RLS with the policies mentioned.

## 5. Next Steps in the Extension

After setting up your Supabase project and table:
1.  You will need to add the Supabase JS client library to the extension.
2.  Update `background.js` with your Project URL and `anon` key.
3.  Implement the functions in `background.js` to use the Supabase client to save and retrieve prompts.

Save your Project URL and `anon` key securely and have them ready for the next steps in the extension development.
