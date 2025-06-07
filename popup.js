document.addEventListener('DOMContentLoaded', function() {
  // Existing elements
  const exportBtn = document.getElementById('exportBtn');
  const savePromptBtn = document.getElementById('save-prompt-button');
  const promptDisplayArea = document.getElementById('prompt-display-area');
  const promptPlaceholder = document.getElementById('prompt-placeholder');
  const promptTextarea = document.getElementById('prompt-text');
  const statusMessageArea = document.getElementById('status-message-area');

  // New elements for saved prompts
  const fetchPromptsBtn = document.getElementById('fetch-prompts-button');
  const savedPromptsList = document.getElementById('saved-prompts-list');
  const promptsLoadingMessage = document.getElementById('prompts-loading-message');
  const noPromptsMessage = document.getElementById('no-prompts-message');

  let currentPromptData = {
    site: null,
    prompt: null
  };

  function showStatusMessage(message, isError = false, area = statusMessageArea) {
    area.textContent = message;
    area.className = isError ? 'status-message error' : 'status-message success';
    if (area === statusMessageArea) { // Only auto-hide main status messages
        setTimeout(() => {
            area.textContent = '';
            area.className = '';
        }, 3000);
    }
  }

  // Request prompt data when popup opens (for current prompt section)
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs.length === 0 || !tabs[0].id) {
      console.error("No active tab found or tab ID missing.");
      promptPlaceholder.textContent = "No active tab found.";
      promptTextarea.style.display = 'none';
      promptPlaceholder.style.display = 'block';
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, { action: "getPromptData" }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error sending message to content script:", chrome.runtime.lastError.message);
        promptPlaceholder.textContent = "Could not connect to content script. Try reloading the page.";
        promptTextarea.style.display = 'none';
        promptPlaceholder.style.display = 'block';
        return;
      }
      if (response && response.site && response.prompt) {
        currentPromptData.site = response.site;
        currentPromptData.prompt = response.prompt;
        promptTextarea.value = response.prompt;
        promptPlaceholder.style.display = 'none';
        promptTextarea.style.display = 'block';
      } else if (response && response.prompt === null) {
        promptPlaceholder.textContent = `No active prompt detected on ${response.site || 'current page'}.`;
        promptTextarea.style.display = 'none';
        promptPlaceholder.style.display = 'block';
      } else {
        promptPlaceholder.textContent = "No prompt data received or site not supported.";
        promptTextarea.style.display = 'none';
        promptPlaceholder.style.display = 'block';
      }
    });
  });

  // Handle "Save Prompt" button click
  if (savePromptBtn) {
    savePromptBtn.addEventListener('click', function() {
      if (currentPromptData.prompt && currentPromptData.site) {
        showStatusMessage("Saving prompt...", false);
        chrome.runtime.sendMessage(
          {
            action: "savePromptToSupabase",
            data: {
              prompt: currentPromptData.prompt,
              site: currentPromptData.site,
              timestamp: new Date().toISOString()
            }
          },
          function(response) {
            if (chrome.runtime.lastError) {
              showStatusMessage(`Error: ${chrome.runtime.lastError.message}`, true);
              return;
            }
            if (response && response.success) {
              showStatusMessage("Prompt saved successfully!", false);
            } else {
              showStatusMessage(`Save failed: ${response.error || 'Unknown error'}`, true);
            }
          }
        );
      } else {
        showStatusMessage("No prompt data available to save.", true);
      }
    });
  }

  // Handle "Fetch Prompts" button click
  if (fetchPromptsBtn) {
    fetchPromptsBtn.addEventListener('click', function() {
      promptsLoadingMessage.style.display = 'block';
      noPromptsMessage.style.display = 'none';
      savedPromptsList.innerHTML = ''; // Clear existing list
      showStatusMessage('', false); // Clear previous main status messages

      chrome.runtime.sendMessage({ action: "getSavedPrompts" }, function(response) {
        promptsLoadingMessage.style.display = 'none';
        if (chrome.runtime.lastError) {
          showStatusMessage(`Error fetching prompts: ${chrome.runtime.lastError.message}`, true, noPromptsMessage);
          noPromptsMessage.style.display = 'block';
          return;
        }
        if (response && response.success) {
          if (response.data && response.data.length > 0) {
            displaySavedPrompts(response.data);
          } else {
            noPromptsMessage.textContent = "No prompts saved yet.";
            noPromptsMessage.style.display = 'block';
          }
        } else {
          noPromptsMessage.textContent = `Failed to load prompts: ${response.error || 'Unknown error'}`;
          noPromptsMessage.style.display = 'block';
        }
      });
    });
  }

  function displaySavedPrompts(prompts) {
    savedPromptsList.innerHTML = ''; // Clear previous items
    noPromptsMessage.style.display = 'none';

    prompts.forEach(prompt => {
      const listItem = document.createElement('li');

      const promptTextDiv = document.createElement('div');
      promptTextDiv.className = 'prompt-text-display';
      promptTextDiv.textContent = prompt.prompt_text.length > 100 ? prompt.prompt_text.substring(0, 97) + '...' : prompt.prompt_text;

      const promptDetailsDiv = document.createElement('div');
      promptDetailsDiv.className = 'prompt-details';
      promptDetailsDiv.textContent = `Source: ${prompt.source_website || 'N/A'} | Saved: ${new Date(prompt.created_at).toLocaleDateString()}`;

      const useButton = document.createElement('button');
      useButton.className = 'use-prompt-button';
      useButton.textContent = 'Use';
      useButton.setAttribute('data-prompt-text', prompt.prompt_text);
      useButton.addEventListener('click', handleUsePromptClick);

      listItem.appendChild(promptTextDiv);
      listItem.appendChild(promptDetailsDiv);
      listItem.appendChild(useButton);
      savedPromptsList.appendChild(listItem);
    });
  }

  function handleUsePromptClick(event) {
    const promptText = event.target.getAttribute('data-prompt-text');
    // Copy to clipboard
    navigator.clipboard.writeText(promptText).then(() => {
      showStatusMessage("Prompt copied to clipboard!", false);
      // Optionally, try to fill the current tab's prompt box
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "fillPrompt", text: promptText }, function(response) {
            if (chrome.runtime.lastError) {
              // If content script is not on a supported page or there's an issue connecting
              console.warn("Could not send 'fillPrompt' message to content script or no listener:", chrome.runtime.lastError.message);
              // The primary feedback is "Copied to clipboard". Injection is a bonus.
              // We could add a secondary, less prominent status if injection fails but copy succeeds.
              // For now, the console warning is sufficient.
            } else if (response) {
              if (response.success) {
                showStatusMessage("Prompt injected and copied!", false);
                console.log("Prompt filled in active tab: " + response.message);
              } else {
                // Content script was reached but couldn't inject
                showStatusMessage("Copied. Injection failed: " + (response.message || "Unknown reason"), true);
                console.warn("Content script could not fill prompt: " + response.message);
              }
            } else {
              // No response from content script (should ideally not happen if script is there)
               showStatusMessage("Copied. No response from content script for injection.", true);
               console.warn("No response from content script for fillPrompt action.");
            }
          });
        } else {
           showStatusMessage("Copied. No active tab to inject into.", true);
        }
      });
    }).catch(err => {
      console.error('Failed to copy prompt to clipboard:', err);
      showStatusMessage("Failed to copy prompt.", true);
    });
  }


  // Handle "Export Full Chat" button click (placeholder)
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      showStatusMessage("Full chat export functionality is not yet implemented.", true);
    });
  }
});
