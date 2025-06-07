console.log('Background script loaded for AI Chat Exporter.');

// REMINDER: Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE'; // Should be replaced by user
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // Should be replaced by user

import { createClient } from './lib/supabase-js.min.js'; // Ensure this path is correct

let supabase = null;

function initializeSupabase() {
  if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
      SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase client initialized successfully.');
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
      supabase = null;
    }
  } else {
    console.warn('Supabase URL or Anon Key is not set or is still a placeholder. Supabase client not initialized.');
    supabase = null;
  }
}

// Initialize Supabase when the script loads
initializeSupabase();


// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received in background script:', request);

  if (request.action === 'savePromptToSupabase') {
    handleSavePrompt(request.data, sendResponse);
    return true; // Indicate async response
  } else if (request.action === 'exportChat') {
    console.log('Exporting chat data (functionality pending):', request.data);
    setTimeout(() => {
      sendResponse({ success: true, message: 'Chat data export functionality is not yet implemented.' });
    }, 500);
    return true; // Indicate async response
  } else if (request.action === 'getSavedPrompts') {
    handleGetSavedPrompts(sendResponse);
    return true; // Indicate async response
  }
  // Return false or undefined for synchronous messages if any, or if not using sendResponse
});

async function handleGetSavedPrompts(sendResponse) {
  if (!supabase) {
    console.error('Supabase client not initialized. Cannot fetch prompts.');
    sendResponse({ success: false, error: 'Supabase client is not initialized. Please check credentials in background.js.', data: [] });
    return; // Keep message channel open by not returning true explicitly here, sendResponse handles it.
  }

  // This check is slightly different from save. For fetching, we might want to *attempt* to fetch
  // even with placeholder, as a Supabase project *could* be publicly readable.
  // However, it's better to be explicit and expect the user to configure it.
  // If the URL is a placeholder, it will definitely fail.
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || !SUPABASE_URL.includes('supabase.co')) {
    console.warn('Supabase URL is a placeholder or invalid. Cannot fetch prompts.');
    sendResponse({ success: false, error: 'Supabase URL is a placeholder or invalid. Please update it in background.js.', data: [] });
    return;
  }

  try {
    console.log('Attempting to fetch prompts from Supabase...');
    const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limiting to 100 prompts for now

    if (error) {
      console.error('Error fetching prompts from Supabase:', error);
      sendResponse({ success: false, error: error.message, data: [] });
    } else {
      console.log('Prompts fetched successfully from Supabase:', data);
      sendResponse({ success: true, data: data });
    }
  } catch (e) {
    console.error('Exception during Supabase fetch:', e);
    sendResponse({ success: false, error: e.message || 'An unknown error occurred during Supabase fetch operation.', data: [] });
  }
  // No explicit return true here, as sendResponse is always called.
  // However, the main listener `chrome.runtime.onMessage.addListener` *must* return true
  // for any path that uses an async sendResponse.
}

async function handleSavePrompt(promptData, sendResponse) {
  const { prompt: prompt_text, site: source_website, timestamp } = promptData;

  if (!supabase) {
    console.error('Supabase client not initialized. Cannot save prompt.');
    sendResponse({ success: false, error: 'Supabase client is not initialized. Please check credentials in background.js.' });
    return;
  }

  if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn('Supabase URL or Anon Key is still a placeholder. Saving will likely fail or use a dummy client.');
    sendResponse({ success: false, error: 'Supabase URL or Anon Key is a placeholder. Please update it in background.js.' });
    return;
  }

  try {
    console.log('Attempting to save prompt:', { prompt_text, source_website, created_at: timestamp });
    const { data, error } = await supabase
      .from('prompts')
      .insert([
        {
          prompt_text,
          source_website,
          created_at: timestamp, // Ensure your table has this column or adjust as needed
          // user_id: null, // Set if auth is implemented, otherwise ensure column is nullable
          // tags: null, // Set if you have tag data, ensure column is nullable or has default
        }
      ])
      .select(); // .select() to get the inserted data back

    if (error) {
      console.error('Error saving prompt to Supabase:', error);
      sendResponse({ success: false, error: error.message });
    } else {
      console.log('Prompt saved successfully to Supabase:', data);
      sendResponse({ success: true, data });
    }
  } catch (e) {
    console.error('Exception during Supabase insert:', e);
    sendResponse({ success: false, error: e.message || 'An unknown error occurred during Supabase operation.' });
  }
}


// Extension lifecycle listeners
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    console.log('Extension installed.');
    chrome.storage.local.set({ lastVersion: chrome.runtime.getManifest().version });
    // Re-initialize supabase in case it failed on first load due to placeholders
    // and user has updated them before enabling the extension.
    initializeSupabase();
  } else if (details.reason === 'update') {
    console.log('Extension updated to version ' + chrome.runtime.getManifest().version);
    initializeSupabase(); // Also re-initialize on update
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started up.');
  initializeSupabase();
});

// Health check for Supabase client initialization status
console.log('Supabase client status on load:', supabase ? 'Initialized' : 'Not initialized');
