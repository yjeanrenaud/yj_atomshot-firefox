/**
 * @param {string} keyCombination A key combination as returned from the SDK,
 *      like `Ctrl+Shift+F`
 * @returns string
 */
const formatHotkey = keyCombination =>
    ` (${keyCombination.replace(/\+/g, ' + ')})`;

/**
 * Tries to retrieve a hotkey for the given action that can be used when
 * localizing the interface
 * @param {Array<{name: string, description: string, shortcut: string}>} actions
 * @param {string} actionName
 * @returns string
 */
const getHotkey = (actions, actionName) => {
    const candidate = actions.find(action => action.name === actionName);
    if (candidate && candidate.shortcut) {
        return formatHotkey(candidate.shortcut);
    }
    return '';
};

/**
 * Helper to trigger an action and close the popup afterwards
 * @param {string} message
 */
const handleClick = message => () => {
    document.getElementById('controls').style.display = 'none';

    let done = false;
    const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        document.getElementById('controls').style.display = 'block';
        const txt = chrome.i18n.getMessage('cantTakeScreenshotError') || 'Could not take screenshot.';
        document.getElementById('feedback').innerHTML = `<p>${txt}</p>`;
    }, 6000);

    chrome.runtime.sendMessage(message, (response) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
            document.getElementById('controls').style.display = 'block';
            const txt = chrome.i18n.getMessage('cantTakeScreenshotError') || chrome.runtime.lastError.message;
            document.getElementById('feedback').innerHTML = `<p>${txt}</p>`;
            return;
        }

        if (response && response.ack) {
            document.getElementById('loading').style.display = 'block';
            window.close();
        } else if (response && response.type === 'errorFeedback') {
            const msg = chrome.i18n.getMessage(response.message + 'Error') || response.detail || 'Error';
            document.getElementById('feedback').innerHTML = `<p>${msg}</p>`;
            document.getElementById('controls').style.display = 'block';
        } else {
            document.getElementById('controls').style.display = 'block';
            const msg = chrome.i18n.getMessage('cantTakeScreenshotError') || 'Could not take screenshot.';
            document.getElementById('feedback').innerHTML = `<p>${msg}</p>`;
        }
    });
};

// we start by getting the configured actions so we can enrich the popup with
// the currently configured hotkeys
chrome.commands.getAll((actions) => {
    const setupButton = (id, { label, actionName, commandName }) => {
        const button = document.getElementById(id);
        const hotkeyPlaceholder = commandName ? getHotkey(actions, commandName) : '';
        button.textContent = chrome.i18n.getMessage(label, hotkeyPlaceholder);
        button.addEventListener('click', handleClick({ action: actionName }));
    };

    setupButton('btn_screenshot_fullpage', {
        actionName: 'popup.captureFullpage',
        commandName: 'captureFullpage',
        label: 'popupActionCaptureEntire',
    });
    setupButton('btn_screenshot_visible', {
        actionName: 'popup.captureVisible',
        commandName: 'captureVisible',
        label: 'popupActionCaptureVisible',
    });
});
