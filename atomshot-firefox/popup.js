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
    chrome.runtime.sendMessage(message, (response) => {
        if (response.ack) {
            document.getElementById('loading').style.display = 'block';
            window.close();
        } else if (response.type === 'errorFeedback') {
            const message = chrome.i18n.getMessage(response.message + 'Error');
            document.getElementById('feedback').innerHTML = `<p>${message}</p>`;
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
