const DEFAULTS = {
	menuEnabled: true,
	captureFormat: "png",		 // "png" | "jpeg"
	jpegQuality: 85
};

/**
 * Helper to set settings status message, sanitised
 * @param {string} msg to display
 */
function setStatus(msg) {
	const el = document.getElementById("status");
	el.style.backgroundColor = "#475602";
	el.textContent = msg;
	setTimeout(() => {
		el.textContent = "";
		el.style.backgroundColor = "transparent";
		}, 1200);
}


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

const openTab = (url) => chrome.tabs.create({ url });

const closeTab = () => {
    chrome.tabs.getCurrent(currentTab => {
        chrome.tabs.remove(currentTab.id);
    });
};

async function load() {
	const prefs = await browser.storage.local.get(DEFAULTS);
	// set the labels
	document.title = chrome.i18n.getMessage('settingsTitle');
	document.getElementById("settingsTitleSpan").textContent  = chrome.i18n.getMessage('settingsTitleSpan');
	document.getElementById("enableMenuLabel").textContent  = chrome.i18n.getMessage('settingsEnableMenu');
	document.getElementById("settingsImageFormatH3").textContent = chrome.i18n.getMessage('settingsImageFormatH3');
	document.getElementById("settingsJpegQualityLabel").textContent = browser.i18n.getMessage("settingsJpegQuality");
	
	//set values
	document.getElementById("enableMenu").checked = prefs.menuEnabled;
	const formatRadios = [...document.querySelectorAll('input[name="format"]')];
	formatRadios.forEach(r => (r.checked = (r.value === prefs.captureFormat)));

	document.getElementById("jpegQuality").value = prefs.jpegQuality;
	document.getElementById("jpegQualityWrap").style.display =
		(prefs.captureFormat === "jpeg") ? "block" : "none";
	
	//setup button texts and actions
	setupButton(
        'close',
        chrome.i18n.getMessage('resultActionClose'),
        closeTab
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
}

async function save() {
	const menuEnabled = document.getElementById("enableMenu").checked;
	const captureFormat = document.querySelector('input[name="format"]:checked').value;
	const jpegQuality = Math.max(1, Math.min(100, Number(document.getElementById("jpegQuality").value || 85)));

	await browser.storage.local.set({ menuEnabled, captureFormat, jpegQuality });
	var msg=chrome.i18n.getMessage('settingsStatusSaved');
	setStatus(msg);
}

document.addEventListener("DOMContentLoaded", load);

document.getElementById("enableMenu").addEventListener("change", save);
document.querySelectorAll('input[name="format"]').forEach(r => r.addEventListener("change", async () => {
	// update UI immediately
	document.getElementById("jpegQualityWrap").style.display =
		(document.querySelector('input[name="format"]:checked').value === "jpeg") ? "block" : "none";
	await save();
}));

document.getElementById("jpegQuality").addEventListener("change", save);
//console.log("options.js running on:", location.href);