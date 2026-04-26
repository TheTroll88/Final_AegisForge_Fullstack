(() => {
    if (window.hasRun) return;
    window.hasRun = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "sendPrompt") {
            processPrompt(request.text, request.model, request.requestId, request.newChat);
        }
    });

    async function processPrompt(text, model, requestId, newChat) {
        try {
            if (newChat) {
                sendUpdate(requestId, "Starting new chat...");
                await resetByModel(model);
                await new Promise(r => setTimeout(r, 2000));
            }

            await sendByModel(model, text);
            const response = await waitByModel(model, requestId);
            sendBack(requestId, response);
        } catch (err) {
            chrome.runtime.sendMessage({
                action: "promptStatus",
                requestId: requestId,
                status: "Error occurred, using 5s fallback"
            });
            await new Promise(r => setTimeout(r, 5000));
            const fallbackText = scrapeLatestResponseText(model) || ("Error: " + err.message);
            sendBack(requestId, fallbackText);
        }
    }

    async function resetGemini() {
        console.log("Attempting to reset Gemini chat via New Chat button...");

        // Target the actual "New chat" button with data-test-id="expanded-button"
        const btn = document.querySelector('button[data-test-id="expanded-button"]');

        if (btn) {
            // Remove disabled state (button is disabled due to viewport size)
            btn.removeAttribute("disabled");
            btn.removeAttribute("aria-disabled");
            btn.classList.remove("mdc-list-item--disabled");

            console.log("Found New Chat button, using keyboard navigation...");
            // Focus the button and press Enter instead of using .click()
            btn.focus();
            await new Promise(r => setTimeout(r, 100));

            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            btn.dispatchEvent(enterEvent);

            const enterUpEvent = new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            btn.dispatchEvent(enterUpEvent);

            return;
        }

        // Fallback: force navigation to root if button not found
        console.log("New Chat button not found, falling back to root navigation...");
        window.location.href = "https://gemini.google.com";
    }

    async function resetChatGPT() {
        const newChatBtn = document.querySelector('a[href="/"], button[aria-label="New chat"]');
        if (newChatBtn) { newChatBtn.click(); return; }
        window.location.href = "https://chatgpt.com/";
    }

    async function resetDeepSeek() {
        const btn = document.querySelector('a[href="/"], a[href="/chat"]');
        if (btn) { btn.click(); return; }
        window.location.href = "https://chat.deepseek.com/";
    }

    async function resetQwen() {
        const btn = document.querySelector('a[href="/"], a[href*="/chat"]');
        if (btn) { btn.click(); return; }
        window.location.href = "https://chat.qwen.ai/";
    }

    async function resetKimi() {
        const btn = document.querySelector('a[href="/"], a[href*="/chat"]');
        if (btn) { btn.click(); return; }
        window.location.href = "https://www.kimi.com/en/";
    }

    async function resetVenice() {
        // Venice uses a Chakra button, not an anchor link
        const buttons = document.querySelectorAll('button.chakra-button');
        for (const btn of buttons) {
            if (btn.textContent.trim().includes('New chat')) {
                btn.click();
                return;
            }
        }
        window.location.href = "https://venice.ai/chat";
    }

    async function resetBlackbox() {
        const btn = document.querySelector('a[href="/"], a[href*="/chat"]');
        if (btn) { btn.click(); return; }
        window.location.href = "https://www.blackbox.ai/";
    }

    async function resetByModel(model) {
        if (model === 'gemini') return resetGemini();
        if (model === 'chatgpt') return resetChatGPT();
        if (model === 'deepseek') return resetDeepSeek();
        if (model === 'qwen') return resetQwen();
        if (model === 'kimi') return resetKimi();
        if (model === 'venice') return resetVenice();
        if (model === 'blackbox') return resetBlackbox();
        return;
    }

    function sendBack(requestId, text) {
        chrome.runtime.sendMessage({
            action: "promptResponse",
            requestId: requestId,
            text: text
        });
    }

    function sendUpdate(requestId, status) {
        chrome.runtime.sendMessage({
            action: "promptStatus",
            requestId: requestId,
            status: status
        });
    }

    function sendStream(requestId, chunk) {
        chrome.runtime.sendMessage({
            action: "promptStream",
            requestId: requestId,
            chunk: chunk
        });
    }

    function waitForCondition(predicate, timeout) {
        return new Promise((resolve, reject) => {
            // Check immediately first
            try {
                if (predicate()) {
                    resolve(true);
                    return;
                }
            } catch (e) { }

            const start = Date.now();
            const interval = setInterval(() => {
                let ok = false;
                try { ok = !!predicate(); } catch (e) { ok = false; }
                if (ok) {
                    clearInterval(interval);
                    resolve(true);
                } else if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    reject(new Error("Timeout"));
                }
            }, 200);
        });
    }

    async function sendByModel(model, text) {
        if (model === 'gemini') return sendGemini(text);
        if (model === 'chatgpt') return sendChatGPT(text);
        if (model === 'deepseek') return sendDeepSeek(text);
        if (model === 'qwen') return sendQwen(text);
        if (model === 'kimi') return sendKimi(text);
        if (model === 'venice') return sendVenice(text);
        if (model === 'blackbox') return sendBlackbox(text);
        throw new Error('Unknown model: ' + model);
    }

    async function sendGemini(text) {
        const inputSelectors = ['div[contenteditable="true"]', 'div[role="textbox"]', 'rich-textarea div[contenteditable="true"]'];
        let inputField = null;
        for (const selector of inputSelectors) {
            inputField = document.querySelector(selector);
            if (inputField) break;
        }
        if (!inputField) throw new Error("Gemini input not found");

        inputField.focus();
        inputField.innerHTML = "";
        const p = document.createElement('p');
        p.textContent = text;
        inputField.appendChild(p);

        ['input', 'change', 'keyup', 'keydown'].forEach(evt => {
            inputField.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }));
        });

        await new Promise(r => setTimeout(r, 500));

        const sendButton = document.querySelector('button[aria-label="Send message"], button[aria-label="Send"]');
        if (!sendButton) throw new Error("Gemini send button not found");
        sendButton.click();
    }

    function scrapeLatestResponseText(model) {
        if (model === 'chatgpt') {
            const messages = document.querySelectorAll('.markdown, [data-message-author-role="assistant"]');
            return messages.length ? messages[messages.length - 1].innerText : '';
        }
        if (model === 'deepseek') {
            const blocks = document.querySelectorAll('[data-testid="message-bubble"], .markdown');
            return blocks.length ? blocks[blocks.length - 1].innerText : '';
        }
        if (model === 'qwen') {
            const blocks = document.querySelectorAll('.chat-message, .assistant, .markdown');
            return blocks.length ? blocks[blocks.length - 1].innerText : '';
        }
        if (model === 'kimi') {
            const blocks = document.querySelectorAll('.message-bubble, .assistant, .markdown');
            return blocks.length ? blocks[blocks.length - 1].innerText : '';
        }
        if (model === 'venice') {
            // Strategy 1: Look for turn-based message containers
            // Venice wraps each turn in a container — find assistant turns
            const turns = document.querySelectorAll('[data-role="assistant"], [data-message-role="assistant"], [class*="assistant"]');
            if (turns.length) {
                console.log('[BEMP Venice] Strategy 1 hit: data-role/class*=assistant, count=' + turns.length);
                return turns[turns.length - 1].innerText.trim();
            }

            // Strategy 2: Look for markdown-rendered prose blocks inside the chat area
            const chatContainer = document.querySelector('.chat-messages-content, [class*="chat-messages"], [class*="ChatMessages"], main [class*="messages"]');
            if (chatContainer) {
                // Look for rendered markdown containers (prose, markdown, rich text)
                const proseBlocks = chatContainer.querySelectorAll('[class*="prose"], [class*="markdown"], [class*="Markdown"], [class*="message-content"], [class*="MessageContent"]');
                if (proseBlocks.length) {
                    console.log('[BEMP Venice] Strategy 2 hit: prose/markdown blocks inside chat, count=' + proseBlocks.length);
                    return proseBlocks[proseBlocks.length - 1].innerText.trim();
                }

                // Strategy 3: Find direct child divs of the chat container that contain paragraphs
                const childDivs = chatContainer.querySelectorAll(':scope > div');
                console.log('[BEMP Venice] Strategy 3: checking ' + childDivs.length + ' direct children of chat container');
                for (let i = childDivs.length - 1; i >= 0; i--) {
                    const text = childDivs[i].innerText.trim();
                    // Skip tiny fragments (timestamps, model names, timing labels like "0.23s")
                    if (text.length > 20 && !/^\d+\.\d+s$/.test(text) && !/^[A-Za-z\s]+ \d+\.\d+s$/.test(text)) {
                        console.log('[BEMP Venice] Strategy 3 hit: child div #' + i + ', text length=' + text.length);
                        return text;
                    }
                }
            }

            // Strategy 4: Broad search — any element with substantial text that looks like a response
            const allDivs = document.querySelectorAll('div[class*="css-"]');
            console.log('[BEMP Venice] Strategy 4: scanning ' + allDivs.length + ' Chakra divs');
            let bestCandidate = '';
            for (const div of allDivs) {
                const text = div.innerText.trim();
                // Find the deepest div with substantial text (likely the response body)
                if (text.length > 50 && text.length < 50000 && div.children.length > 0) {
                    // Check if this div contains paragraphs or formatted text (likely a response)
                    const hasParagraphs = div.querySelector('p, ol, ul, pre, code, h1, h2, h3');
                    if (hasParagraphs && text.length > bestCandidate.length) {
                        bestCandidate = text;
                    }
                }
            }
            if (bestCandidate) {
                console.log('[BEMP Venice] Strategy 4 hit: best candidate length=' + bestCandidate.length);
                return bestCandidate;
            }

            // Strategy 5: DOM dump for debugging (log what we see)
            const container2 = document.querySelector('.chat-messages-content');
            if (container2) {
                console.log('[BEMP Venice] DEBUG: .chat-messages-content exists, innerHTML length=' + container2.innerHTML.length);
                console.log('[BEMP Venice] DEBUG: first 500 chars:', container2.innerHTML.substring(0, 500));
                console.log('[BEMP Venice] DEBUG: childElementCount=' + container2.childElementCount);
                console.log('[BEMP Venice] DEBUG: innerText preview:', container2.innerText.substring(0, 300));
            } else {
                console.log('[BEMP Venice] DEBUG: .chat-messages-content NOT FOUND');
                // Log all elements with "message" or "chat" in class names
                const candidates = document.querySelectorAll('[class*="message"], [class*="Message"], [class*="chat"], [class*="Chat"]');
                console.log('[BEMP Venice] DEBUG: elements with message/chat in class:', candidates.length);
                candidates.forEach((el, i) => {
                    if (i < 10) console.log('[BEMP Venice] DEBUG:', el.tagName, el.className.substring(0, 80), 'text:' + el.innerText.substring(0, 60));
                });
            }

            return '';
        }
        if (model === 'blackbox') {
            const blocks = document.querySelectorAll('.response, .assistant, .markdown');
            return blocks.length ? blocks[blocks.length - 1].innerText : '';
        }
        const responses = document.querySelectorAll('.model-response-text, model-response, .message-content');
        if (responses.length) return responses[responses.length - 1].innerText;
        const allTextBlocks = document.querySelectorAll('div[data-message-id]');
        if (allTextBlocks.length) return allTextBlocks[allTextBlocks.length - 1].innerText;
        return '';
    }

    async function waitForGeminiResponse(requestId) {
        sendUpdate(requestId, "Thinking...");

        // 1. Wait for Send button to disable (indicating request started)
        try {
            await waitForCondition(() => {
                const sendBtn = document.querySelector('button[aria-label="Send message"], button[aria-label="Send"]');
                return sendBtn && sendBtn.disabled;
            }, 5000);
        } catch (e) {
            console.log("Did not detect send button disable, proceeding to wait for completion...");
        }

        // 2. Wait for Send button to enable (indicating request finished)
        sendUpdate(requestId, "Generating...");
        let lastText = "";

        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const sendBtn = document.querySelector('button[aria-label="Send message"], button[aria-label="Send"]');
                // The request is done when the send button is visible and NOT disabled
                const isDone = sendBtn && !sendBtn.disabled;

                const currentText = scrapeLatestResponseText('gemini');

                // Stream updates if text is growing
                if (currentText && currentText.length > lastText.length) {
                    const newChunk = currentText.slice(lastText.length);
                    sendStream(requestId, newChunk);
                    lastText = currentText;
                }

                if (isDone) {
                    clearInterval(checkInterval);
                    // Ensure we capture the very last bit of text
                    if (currentText && currentText !== lastText) {
                        sendStream(requestId, currentText.slice(lastText.length));
                    }
                    resolve(currentText || "Error: No text found");
                }
            }, 200); // Check faster (200ms) for smoother streaming

            // Safety timeout (120 seconds as requested)
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(lastText || "Timeout waiting for response");
            }, 120000);
        });
    }

    async function sendChatGPT(text) {
        const inputField = document.querySelector('#prompt-textarea');
        if (!inputField) throw new Error("ChatGPT input not found");
        inputField.focus();
        inputField.innerHTML = `<p>${text}</p>`;
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 500));
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (!sendButton) throw new Error("ChatGPT send button not found");
        sendButton.click();
    }

    async function sendDeepSeek(text) {
        const input = document.querySelector('textarea, [contenteditable="true"][role="textbox"]');
        if (!input) throw new Error('DeepSeek input not found');
        if (input.tagName.toLowerCase() === 'textarea') {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            input.innerHTML = `<p>${text}</p>`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 300));
        const btn = document.querySelector('button[type="submit"], button[aria-label*="Send"], button:has(svg)');
        if (!btn) throw new Error('DeepSeek send button not found');
        btn.click();
    }

    async function sendQwen(text) {
        const input = document.querySelector('textarea, div[contenteditable="true"][role="textbox"]');
        if (!input) throw new Error('Qwen input not found');
        if (input.tagName.toLowerCase() === 'textarea') {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            input.innerHTML = `<p>${text}</p>`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 300));
        const btn = document.querySelector('button[type="submit"], button[aria-label*="Send"], .send-button button');
        if (!btn) throw new Error('Qwen send button not found');
        btn.click();
    }

    async function sendKimi(text) {
        const input = document.querySelector('textarea, div[contenteditable="true"][role="textbox"]');
        if (!input) throw new Error('Kimi input not found');
        if (input.tagName.toLowerCase() === 'textarea') {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            input.innerHTML = `<p>${text}</p>`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 300));
        const btn = document.querySelector('button[type="submit"], button[aria-label*="Send"], .send-button button');
        if (!btn) throw new Error('Kimi send button not found');
        btn.click();
    }

    async function sendVenice(text) {
        const input = document.querySelector('textarea[name="prompt-textarea"], textarea');
        if (!input) throw new Error('Venice input not found');
        console.log('[BEMP Venice] Found input:', input.tagName, input.name, input.className.substring(0, 40));

        // React overrides the native value setter — use the prototype setter to trigger state updates
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[BEMP Venice] Text set, value length:', input.value.length);

        await new Promise(r => setTimeout(r, 500));
        const btn = document.querySelector('button[type="submit"]');
        if (!btn) throw new Error('Venice send button not found');
        console.log('[BEMP Venice] Submit button found, disabled:', btn.disabled, 'class:', btn.className.substring(0, 40));

        if (btn.disabled) {
            console.log('[BEMP Venice] Button disabled — trying keyboard workaround');
            input.focus();
            // Simulate typing to trigger React state update
            input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
            await new Promise(r => setTimeout(r, 300));
            console.log('[BEMP Venice] After InputEvent, button disabled:', btn.disabled);
        }

        if (btn.disabled) {
            console.log('[BEMP Venice] Button STILL disabled — trying Enter key on textarea');
            input.focus();
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            await new Promise(r => setTimeout(r, 200));
        } else {
            btn.click();
            console.log('[BEMP Venice] Submit button clicked');
        }

        // Verify something happened — wait briefly and check if a loading indicator appeared
        await new Promise(r => setTimeout(r, 1000));
        const stopBtn = document.querySelector('button[aria-label*="stop"], button[aria-label*="Stop"]');
        console.log('[BEMP Venice] After submit — stop button exists:', !!stopBtn);
    }

    async function sendBlackbox(text) {
        const input = document.querySelector('textarea, div[contenteditable="true"][role="textbox"]');
        if (!input) throw new Error('Blackbox input not found');
        if (input.tagName.toLowerCase() === 'textarea') {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            input.innerHTML = `<p>${text}</p>`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 300));
        const btn = document.querySelector('button[type="submit"], button[aria-label*="Send"], .send-button button');
        if (!btn) throw new Error('Blackbox send button not found');
        btn.click();
    }

    function waitByModel(model, requestId) {
        if (model === 'gemini') return waitForGeminiResponse(requestId);
        if (model === 'chatgpt') return waitForChatGPTResponse(requestId);
        if (model === 'deepseek') return waitForGenericWait(requestId, 'deepseek');
        if (model === 'qwen') return waitForGenericWait(requestId, 'qwen');
        if (model === 'kimi') return waitForGenericWait(requestId, 'kimi');
        if (model === 'venice') return waitForVeniceResponse(requestId);
        if (model === 'blackbox') return waitForGenericWait(requestId, 'blackbox');
        return Promise.resolve('Unknown model');
    }

    async function waitForChatGPTResponse(requestId) {
        sendUpdate(requestId, "Thinking...");

        let smartMode = false;
        try {
            await waitForCondition(() => {
                return document.querySelector('button[aria-label="Stop generating"]') !== null;
            }, 5000);
            smartMode = true;
        } catch (e) {
            console.log("Smart detection failed, using 5-second fallback");
        }

        if (!smartMode) {
            sendUpdate(requestId, "Waiting 5 seconds for response...");
            await new Promise(r => setTimeout(r, 5000));

            const finalText = scrapeLatestResponseText('chatgpt');
            if (finalText) {
                sendStream(requestId, finalText);
            }
            return finalText || "No response found after 5 seconds";
        }

        sendUpdate(requestId, "Generating...");
        let lastText = "";

        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const stopBtn = document.querySelector('button[aria-label="Stop generating"]');
                const isDone = !stopBtn;

                const currentText = scrapeLatestResponseText('chatgpt');

                if (currentText && currentText.length > lastText.length) {
                    const newChunk = currentText.slice(lastText.length);
                    sendStream(requestId, newChunk);
                    lastText = currentText;
                }

                if (isDone) {
                    clearInterval(checkInterval);
                    resolve(currentText || "Error: No text found");
                }
            }, 500);

            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(lastText || "Timeout");
            }, 60000);
        });
    }

    async function waitForVeniceResponse(requestId) {
        sendUpdate(requestId, "Thinking...");

        // Capture baseline text before response starts
        const baselineText = scrapeLatestResponseText('venice');
        console.log('[BEMP Venice Wait] Baseline text length:', baselineText.length, 'preview:', baselineText.substring(0, 80));

        // 1. Wait for ANY sign that request was accepted:
        //    - submit button disabled, OR
        //    - a loading/streaming indicator appears, OR
        //    - new content appears in the chat
        let requestStarted = false;
        try {
            await waitForCondition(() => {
                const btn = document.querySelector('button[type="submit"]');
                const stopBtn = document.querySelector('button[aria-label*="stop"], button[aria-label*="Stop"]');
                const currentText = scrapeLatestResponseText('venice');
                const textGrew = currentText.length > baselineText.length;
                if (btn && btn.disabled) { console.log('[BEMP Venice Wait] Detected: submit disabled'); return true; }
                if (stopBtn) { console.log('[BEMP Venice Wait] Detected: stop button'); return true; }
                if (textGrew) { console.log('[BEMP Venice Wait] Detected: text grew'); return true; }
                return false;
            }, 15000);
            requestStarted = true;
        } catch (e) {
            console.log('[BEMP Venice Wait] No start signal detected after 15s');
        }

        sendUpdate(requestId, "Generating...");
        let lastText = baselineText;
        let pollCount = 0;

        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                pollCount++;
                const currentText = scrapeLatestResponseText('venice');

                // Stream new chunks
                if (currentText && currentText.length > lastText.length) {
                    const newChunk = currentText.slice(lastText.length);
                    console.log('[BEMP Venice Wait] Poll #' + pollCount + ': new chunk length=' + newChunk.length + ' preview:', newChunk.substring(0, 60));
                    sendStream(requestId, newChunk);
                    lastText = currentText;
                }

                // Log every 10 polls for debugging
                if (pollCount % 10 === 0) {
                    const btn = document.querySelector('button[type="submit"]');
                    console.log('[BEMP Venice Wait] Poll #' + pollCount + ': totalText=' + currentText.length + ', submitDisabled=' + (btn ? btn.disabled : 'N/A'));
                }

                // Check if generation finished: submit button re-enabled AND text grew
                const btn = document.querySelector('button[type="submit"]');
                const isDone = btn && !btn.disabled && currentText.length > baselineText.length && pollCount > 5;

                if (isDone) {
                    clearInterval(checkInterval);
                    console.log('[BEMP Venice Wait] DONE: submit re-enabled, finalText length=' + currentText.length);
                    // Capture final text
                    const finalText = scrapeLatestResponseText('venice');
                    if (finalText && finalText.length > lastText.length) {
                        sendStream(requestId, finalText.slice(lastText.length));
                    }
                    // Strip baseline if it leaked through
                    let result = finalText || lastText;
                    if (baselineText && result.startsWith(baselineText)) {
                        result = result.slice(baselineText.length).trim();
                    }
                    resolve(result || "Error: No text found");
                }
            }, 300);

            // Safety timeout (120 seconds)
            setTimeout(() => {
                clearInterval(checkInterval);
                console.log('[BEMP Venice Wait] TIMEOUT at 120s. pollCount=' + pollCount + ', lastText length=' + lastText.length);
                let result = lastText;
                if (baselineText && result.startsWith(baselineText)) {
                    result = result.slice(baselineText.length).trim();
                }
                resolve(result || "Timeout waiting for Venice response");
            }, 120000);
        });
    }

    async function waitForGenericWait(requestId, model) {
        sendUpdate(requestId, 'Generating...');
        let lastText = '';
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                const text = scrapeLatestResponseText(model);
                if (text && text.length > lastText.length) {
                    const chunk = text.slice(lastText.length);
                    sendStream(requestId, chunk);
                    lastText = text;
                }
            }, 400);
            setTimeout(() => {
                clearInterval(interval);
                const text = scrapeLatestResponseText(model);
                resolve(text || lastText || 'No response found');
            }, 90000);
        });
    }
})();
