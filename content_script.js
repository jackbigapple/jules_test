console.log('Content script loaded for AI Chat Exporter.');

const SITE_SELECTORS = {
  CHAT_OPENAI: {
    hostname: "chat.openai.com",
    promptSelector: "textarea#prompt-textarea",
  },
  GEMINI_GOOGLE: {
    hostname: "gemini.google.com",
    // More specific selector for Gemini, might need adjustments.
    // Targets a textarea that is typically within a div structure used for input.
    promptSelector: "textarea[enterkeyhint='send']",
  },
  GROK_X_AI: {
    hostname: "grok.x.ai",
    promptSelector: "textarea[data-testid='composer-textarea']", // Specific to Grok's known structure
  },
  CLAUDE_AI: {
    hostname: "claude.ai",
    // claude.ai uses a div with contenteditable="true" and a specific class.
    promptSelector: "div.ProseMirror[contenteditable='true']",
  }
};

let currentSiteKey = null;

function detectSite() {
  const currentHostname = window.location.hostname;
  for (const key in SITE_SELECTORS) {
    if (currentHostname.includes(SITE_SELECTORS[key].hostname)) {
      currentSiteKey = key;
      console.log(`AI Chat Exporter: Detected site - ${key}`);
      return key;
    }
  }
  console.log("AI Chat Exporter: Current site not identified as a supported AI chat platform.");
  return null;
}

function extractPromptText() {
  if (!currentSiteKey) {
    console.log("AI Chat Exporter: Cannot extract prompt, current site not identified.");
    return null;
  }
  const selector = SITE_SELECTORS[currentSiteKey].promptSelector;
  if (!selector) {
    console.log(`AI Chat Exporter: No prompt selector defined for ${currentSiteKey}`);
    return null;
  }
  const promptElement = document.querySelector(selector);
  if (promptElement) {
    const text = promptElement.tagName === 'TEXTAREA' ? promptElement.value : promptElement.innerText;
    console.log(`AI Chat Exporter: Extracted prompt from ${currentSiteKey}:`, text);
    return text;
  } else {
    console.log(`AI Chat Exporter: Prompt element not found with selector "${selector}" for ${currentSiteKey}.`);
    return null;
  }
}

function injectPromptText(textToInject) {
  if (!currentSiteKey) {
    console.error("AI Chat Exporter: Cannot inject prompt, current site not identified.");
    return false;
  }
  const selector = SITE_SELECTORS[currentSiteKey].promptSelector;
  if (!selector) {
    console.error(`AI Chat Exporter: No prompt selector defined for ${currentSiteKey}. Cannot inject text.`);
    return false;
  }
  const promptElement = document.querySelector(selector);

  if (promptElement) {
    console.log(`AI Chat Exporter: Found prompt element for ${currentSiteKey} with selector "${selector}". Injecting text.`);

    // Set the value
    if (promptElement.tagName === 'TEXTAREA') {
      promptElement.value = textToInject;
    } else if (promptElement.isContentEditable) {
      promptElement.innerText = textToInject; // Or textContent, innerText is often better for triggering changes.
    } else {
      console.error(`AI Chat Exporter: Element found for ${currentSiteKey} is neither a textarea nor contentEditable.`);
      return false;
    }

    // Dispatch events to ensure the site recognizes the change
    // Using 'input' for real-time updates and 'change' for final confirmation (though often 'input' is enough)
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    const changeEvent = new Event('change', { bubbles: true, cancelable: true }); // Some frameworks might listen for change

    promptElement.dispatchEvent(inputEvent);
    promptElement.dispatchEvent(changeEvent);

    // Optionally focus the element
    promptElement.focus();

    // For some rich text editors (like ProseMirror on Claude), you might need to simulate more specific events
    // or interact with their internal APIs if direct value setting and event dispatching isn't enough.
    // This is a common area that requires site-specific testing and refinement.
    if (currentSiteKey === 'CLAUDE_AI' && promptElement.ProseMirror) {
        // This is hypothetical, actual API would need to be discovered
        // promptElement.ProseMirror.dispatch(promptElement.ProseMirror.state.tr.insertText(textToInject));
        console.log("AI Chat Exporter: Additional steps might be needed for Claude's ProseMirror to fully recognize injected text.");
    }

    console.log(`AI Chat Exporter: Text injected into ${currentSiteKey}.`);
    return true;
  } else {
    console.error(`AI Chat Exporter: Prompt element not found with selector "${selector}" for ${currentSiteKey}. Cannot inject text.`);
    return false;
  }
}

// Initial detection when the script loads
detectSite();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('AI Chat Exporter: Message received in content script:', request);
  if (request.action === 'getPromptData') {
    const promptText = extractPromptText();
    sendResponse({ site: currentSiteKey, prompt: promptText });
  } else if (request.action === 'getChatData') {
    console.warn("AI Chat Exporter: getChatData action received, but full chat extraction is not yet implemented.");
    sendResponse({ data: { message: "Full chat data extraction pending." } });
  } else if (request.action === 'fillPrompt') {
    if (typeof request.text === 'string') {
      const success = injectPromptText(request.text);
      sendResponse({ success: success, message: success ? "Prompt injected." : "Failed to find or set prompt input field." });
    } else {
      sendResponse({ success: false, message: "No text provided to fill."});
    }
  }
  return true; // Indicates that the response will be sent asynchronously for all message types.
});

window.addEventListener('focus', () => {
  console.log("AI Chat Exporter: Window focused, re-evaluating site if not already identified.");
  if (!currentSiteKey) {
    detectSite();
  }
});
