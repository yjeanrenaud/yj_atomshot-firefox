let title;
// eslint-disable-next-line no-unused-vars
let requestedDomain;


function showCapturedImage(dataUrl) {
    document.getElementById('screenshot').src = dataUrl;
}


const saveSnap = () => {

    const src = document.getElementById('screenshot').src;
    const b64Data = src.split(',')[1];
    const contentType = src.split(',')[0].split(':')[1].split(';')[0];

    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 1024;

        function charCodeFromCharacter(c) {
            return c.charCodeAt(0);
        }

        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = Array.prototype.map.call(slice, charCodeFromCharacter);
            const byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: contentType });
    }

    const blob = b64toBlob(b64Data, contentType);

    const blobUrl = (window.webkitURL || window.URL).createObjectURL(blob);

    const a = document.createElement('a');

    const e = document.createEvent('MouseEvents');
    e.initMouseEvent('click', !0, !0, window, 1, 0, 0, 0, 0, !1, !1, !1, !1, 0, null);
    a.setAttribute('href', blobUrl);
    a.setAttribute('download', title.replace(/[#$~!@%^&*();'"?><[\]{}|,:/=+-]/g, '') + '.' + contentType.split('/')[1]);
    a.dispatchEvent(e);

};


const closeTab = () => {
    chrome.tabs.getCurrent(currentTab => {
        chrome.tabs.remove(currentTab.id);
    });
};

const printShot = () => {
    window.print();
};

const openTab = (url) => chrome.tabs.create({ url });

const domainInfo = () => {
    //const newURL = `https://ggr-law.com/atomshot/domaininhaber?URL=${requestedDomain}`;
    const newURL = 'https://ggr-law.com/atomshot/domaininhaber/';
    openTab(newURL);
};


/**
 * Helper to setup a button with labels and event listener
 * @param {string} id ID of the button-element
 * @param {string} label Label to be set as `title` and `aria-label`
 * @param {Function} callback Click-Handler
 * @returns {HTMLButtonElement} The button identified by the `id`
 */
const setupButton = (id, label, callback) => {
    const btn = document.getElementById(id);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', callback, false);
    return btn;
};

/**
 * Helper to setup a button with labels, text content, and event listener
 * @param {string} id ID of the button-element
 * @param {string} label Label to be set as `title`, `aria-label`, and `HTML`
 * @param {Function} callback Click-Handler
 * @returns {HTMLButtonElement} The button identified by the `id`
 */
const setupButtonText = (id, label, callback) => {
    const btn = document.getElementById(id);
    btn.setAttribute('title', label);
	btn.setAttribute('aria-label', label);
	btn.textContent = label;
    btn.addEventListener('click', callback, false);
    return btn;
};

window.onload = function () { // or use instead window.addEventListener('load', () => {
    chrome.runtime.onMessage.addListener(
        request => {
            switch (request.action) {
                case 'open':
                    showCapturedImage(request.image);
                    requestedDomain = request.domain;
                    title = request.title;
                    break;
            }
        });

    document.title = chrome.i18n.getMessage('resultTitle');

    setupButton(
        'save',
        chrome.i18n.getMessage('resultActionSave'),
        saveSnap
    );
    setupButton(
        'close',
        chrome.i18n.getMessage('resultActionClose'),
        closeTab
    );
    setupButton(
        'print',
        chrome.i18n.getMessage('resultActionPrint'),
        printShot
    );
    setupButtonText(
        'domain-info',
        chrome.i18n.getMessage('resultActionDomainInfo'),
        domainInfo
    );
    setupButton(
        'ggr',
        chrome.i18n.getMessage('resultActionAbout'),
        () => {
            openTab('https://ggr-law.com/');
        }
    );
    setupButtonText(
        'yj',
        chrome.i18n.getMessage('resultActionYJ'),
        () => {
            openTab('https://github.com/yjeanrenaud/yj_atomshot-firefox');
        }
    );
	console.log('atomshot init ran');
};
