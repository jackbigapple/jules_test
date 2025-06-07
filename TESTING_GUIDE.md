# AI Chat Exporter - Testing Guide

This guide provides steps to manually test the AI Chat Exporter Chrome Extension and suggestions for refining its functionality.

## 1. Prerequisites for Testing

Before you begin testing, please ensure the following:

1.  **Supabase Setup:**
    *   You have a Supabase project created.
    *   The `prompts` table is created in your Supabase database using the schema provided in `supabase_schema.sql`.
    *   You have replaced the placeholder `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the `background.js` file with your actual Supabase project URL and public anon key. **This is crucial for saving and retrieving prompts.**

2.  **Load the Unpacked Extension:**
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode" (usually a toggle in the top right).
    *   Click "Load unpacked".
    *   Select the directory where your extension files (manifest.json, etc.) are located.
    *   Ensure the extension is enabled.

3.  **Open Developer Consoles:**
    *   **Popup Console:** Right-click on the extension icon in the Chrome toolbar, then click "Inspect popup". This will open a DevTools window for the popup's HTML and JavaScript. Keep the "Console" tab open.
    *   **Background Service Worker Console:** On the `chrome://extensions` page, find your extension and click the "Service worker" link. This will open a DevTools window for the background script. Keep the "Console" tab open.
    *   **Content Script Console:** When testing on an AI chat website, open the regular browser DevTools (right-click on the page -> Inspect or F12) and check the "Console" tab. Filter by messages from `content_script.js` if needed (logs are prefixed with "AI Chat Exporter:").

## 2. Testing Prompt Extraction

This tests the extension's ability to read what you're typing into an AI chat site.

1.  **Navigate to Supported Sites:** Open a tab for each of the following:
    *   ChatGPT (`https://chat.openai.com/`)
    *   Gemini (`https://gemini.google.com/`)
    *   Grok (`https://grok.x.ai/`) - *Note: URL and selectors might need verification as this site is less publicly documented.*
    *   Claude (`https://claude.ai/`)
2.  **Type a Prompt:** On each site, type a distinct prompt into the main chat input field.
3.  **Open Extension Popup:** Click the AI Chat Exporter icon in your Chrome toolbar.
4.  **Verification:**
    *   Does the prompt text you typed appear correctly in the "Current Prompt" textarea within the popup?
5.  **Check Consoles:**
    *   **Content Script Console (on the AI chat page):** Look for logs like "AI Chat Exporter: Detected site - [SITE_KEY]" and "AI Chat Exporter: Extracted prompt from [SITE_KEY]: [your prompt]". Check for any errors related to finding the prompt element.
    *   **Popup Console:** Check for errors if the prompt doesn't appear.
6.  **Note on Selectors (Troubleshooting):**
    *   If prompt extraction fails for a specific site (no prompt appears or the wrong text is shown), the `SITE_SELECTORS` for that site in `content_script.js` are likely incorrect or outdated.
    *   To fix:
        *   On the problematic AI chat site, right-click the chat input field and "Inspect Element".
        *   Carefully examine the HTML structure to find a reliable and unique CSS selector (e.g., an ID, a specific combination of class names, or a `data-testid` attribute).
        *   Update the corresponding `promptSelector` in `SITE_SELECTORS` in `content_script.js`.
        *   Reload the extension from `chrome://extensions` (click the refresh icon for your extension) and re-test.

## 3. Testing Prompt Saving

This tests if the extracted prompt can be saved to your Supabase database.

1.  **Extract a Prompt:** Ensure a prompt is correctly extracted and visible in the "Current Prompt" section of the popup (see section 2).
2.  **Click "Save Prompt":** In the popup, click the "Save Prompt" button.
3.  **Verification (Popup):**
    *   A success message like "Prompt saved successfully!" should appear in the popup's status area.
    *   If Supabase credentials are not set, it should ideally show an error like "Save failed: Supabase client is not initialized..." or "Save failed: Supabase URL is a placeholder...".
4.  **Verification (Supabase):**
    *   Open your Supabase project dashboard.
    *   Navigate to the "Table Editor" and select the `prompts` table.
    *   Verify that a new row has been added with the correct `prompt_text` and `source_website`. Check the `created_at` timestamp.
5.  **Check Consoles:**
    *   **Background Script Console:** Look for logs indicating successful initialization of the Supabase client (if you just started the browser/extension) and messages about the save attempt (e.g., "Attempting to save prompt...", "Prompt saved successfully to Supabase: [data]"). Check for any errors from the Supabase client (e.g., authentication errors, RLS policy violations if enabled, network issues).
    *   **Popup Console:** Check for errors if the success message doesn't appear or if an error message is displayed.
    *   **Background Script Network Tab:** If saving fails silently or you suspect network issues, open the "Network" tab in the background script's DevTools to inspect requests made to Supabase.

## 4. Testing Prompt Retrieval

This tests fetching saved prompts from Supabase and displaying them in the popup.

1.  **Save Prompts:** Ensure you have at least 1-2 prompts saved successfully (see section 3).
2.  **Open Extension Popup.**
3.  **Click "Load My Prompts":** Click this button in the "Saved Prompts" section.
4.  **Verification:**
    *   The loading message ("Loading prompts...") should appear briefly.
    *   Your previously saved prompts should be listed.
    *   Each list item should display:
        *   The prompt text (potentially truncated if very long).
        *   Source website (e.g., "ChatGPT").
        *   Creation date (formatted).
    *   If no prompts are saved (or if Supabase is not configured), the message "No prompts saved yet. Or, you need to set your Supabase URL/Key..." should appear.
5.  **Check Consoles:**
    *   **Background Script Console:** Look for logs like "Attempting to fetch prompts from Supabase..." and "Prompts fetched successfully...". Check for any errors from Supabase.
    *   **Popup Console:** Check for errors if prompts don't load or if error messages are displayed.

## 5. Testing Prompt Injection (Reuse)

This tests copying a saved prompt to the clipboard and injecting it into an AI chat site's input field.

1.  **Navigate to Supported Site:** Open one of the AI chat websites (ChatGPT, Gemini, etc.).
2.  **Load Saved Prompts:** Open the extension popup and click "Load My Prompts". Ensure prompts are listed.
3.  **Click "Use" Button:** Click the "Use" button next to any saved prompt.
4.  **Verification:**
    *   **Clipboard:** Try pasting (Ctrl+V/Cmd+V) into a text editor. The full text of the selected prompt should be pasted.
    *   **Injection:** The prompt text should appear in the AI chat site's main input field.
    *   **Site Reaction:** The website's UI should react as if you typed the prompt. For example, the "Send" button might become active if it was previously disabled.
    *   **Popup Message:** The popup should show a message like "Prompt injected and copied!" or "Copied. Injection failed: [reason]".
5.  **Check Consoles:**
    *   **Content Script Console (on the AI chat page):** Look for logs like "AI Chat Exporter: Found prompt element..." and "AI Chat Exporter: Text injected...". Check for errors if injection fails (e.g., "Prompt element not found...").
    *   **Popup Console:** Observe messages related to clipboard success/failure and injection success/failure.
6.  **Note on Selectors & Events (Troubleshooting):**
    *   **Injection Failure (Text doesn't appear):**
        *   The `SITE_SELECTORS` for that site in `content_script.js` might be incorrect. Use DevTools to find the right selector (see section 2.6).
    *   **Injection Failure (Site doesn't recognize text - e.g., Send button disabled):**
        *   The programmatic dispatching of `input` and `change` events in `injectPromptText()` in `content_script.js` might not be sufficient for that specific site. Some sites use complex JavaScript frameworks that require more specific event sequences or even direct interaction with their component's state/APIs. This is an advanced refinement area.
        *   Ensure the input field is not hidden or disabled by the site when you try to inject.

## 6. General UI/UX Checks

*   **Responsiveness:** Are all buttons in the popup clickable and do they provide feedback (e.g., status messages)?
*   **Clarity of Messages:** Are loading, success, and error messages clear, concise, and displayed in appropriate places?
*   **Layout:** Is the popup layout logical? Is text readable? Does it handle different lengths of prompt text gracefully (e.g., in the saved prompts list)?
*   **Edge Cases:**
    *   Test saving a very long prompt.
    *   Test saving an empty prompt (if the "Current Prompt" area is empty, the "Save Prompt" button should ideally not attempt a save, or `background.js` should handle it).
    *   Test loading prompts when the list is very long (scrolling in `saved-prompts-list`).
    *   Test on sites not in the `matches` list in `manifest.json` (content script shouldn't run, popup should indicate no prompt detected).

## 7. Refinement Areas (Common Issues & Advanced Fixes)

*   **CSS Selectors (Most Common Issue):**
    *   AI chat websites update their UIs frequently. Selectors will break.
    *   **How to find better selectors:** Use the browser's Developer Tools (Inspect Element). Look for elements with unique `id` attributes first. If not available, look for stable `data-testid`, `aria-label`, or a combination of `class` names that are unlikely to change. Avoid relying on highly generic tags like `div` or `span` alone, or classes that look auto-generated.

*   **Dynamic Content Loading:**
    *   If `content_script.js` runs before the chat input field is loaded into the DOM, extraction/injection will fail.
    *   The current `window.addEventListener('focus', ...)` in `content_script.js` attempts to re-detect the site if it wasn't found initially. This might help in some cases.
    *   **Advanced Solution:** If issues persist, a `MutationObserver` could be used in `content_script.js` to wait for the specific prompt input element to appear in the DOM before attempting to interact with it. Alternatively, a polling mechanism with retries (e.g., try to find element every 500ms for a few seconds).

*   **Event Dispatching for Injection:**
    *   As mentioned in 5.6, simply setting `.value` or `.innerText` and dispatching generic `input`/`change` events might not be enough for all sites, especially those using frameworks like React, Vue, or Angular, or complex editors like ProseMirror.
    *   **Advanced Solution:** You might need to inspect the site's JavaScript to see what events its components listen for, or if there are global functions/objects you can interact with to update the input state programmatically. This is highly site-specific.

*   **Supabase Row Level Security (RLS):**
    *   Currently, the `prompts` table is likely public (RLS not enabled or permissive policies).
    *   **Future Consideration:** If user authentication were added to the extension (e.g., allowing users to log in via Supabase Auth), RLS policies on the `prompts` table would be **essential** to ensure users can only access their own saved prompts. This would involve:
        *   Enabling RLS on the `prompts` table in Supabase.
        *   Defining policies (e.g., `CREATE POLICY "Users can CRUD own prompts" ON prompts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`).
        *   Ensuring `user_id` is correctly populated when prompts are saved.

*   **Error Handling:**
    *   Review console logs for unhandled errors.
    *   Ensure error messages shown to the user are helpful (e.g., "Failed to save: Network error" vs. just "Error").
    *   Consider adding more specific error handling for Supabase errors (e.g., distinguishing between network errors, permission errors, and data validation errors).

By systematically going through these testing steps, you can identify areas for improvement and ensure the extension functions reliably across the supported AI chat platforms. Good luck!
---

This TESTING_GUIDE.md should provide a good starting point for the user to test the extension.I have created the `TESTING_GUIDE.md` file with detailed instructions covering prerequisites, testing procedures for prompt extraction, saving, retrieval, and injection, as well as general UI/UX checks and common refinement areas.

This document includes:
*   Setup instructions (Supabase, loading the extension, opening dev consoles).
*   Step-by-step verification for each core feature.
*   Emphasis on checking console logs for errors.
*   Specific troubleshooting advice for common issues, particularly regarding CSS selectors for prompt extraction and injection, and event dispatching for injection.
*   Notes on dynamic content loading and future considerations like Supabase RLS.

This subtask is now complete. The `TESTING_GUIDE.md` is ready for the user to follow to test the extension thoroughly.
