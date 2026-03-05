//** constants for hardening captureVisibleToCanvas() */
// const CAPTURE_FORMAT = 'png'; // 'jpeg' | 'png'
// const OUTPUT_MIME = (CAPTURE_FORMAT === 'jpeg') ? 'image/jpeg' : 'image/png';
const MSG_TIMEOUT_MS = 8000;

//defaults
let CAPTURE_FORMAT = "png"; // "png" | "jpeg"
let OUTPUT_MIME = "image/png";
let CAPTURE_QUALITY = 85;

/**
 * apply capture settings accroding to preferences
 */

async function applyCapturePrefs() {
  const prefs = await getPrefs();
  CAPTURE_FORMAT = (prefs.captureFormat === "jpeg") ? "jpeg" : "png";
  OUTPUT_MIME = (CAPTURE_FORMAT === "jpeg") ? "image/jpeg" : "image/png";
  CAPTURE_QUALITY = Number(prefs.jpegQuality) || 85;
}

const DEFAULTS = {
  menuEnabled: true,
  captureFormat: "png", // "png" | "jpeg"
  jpegQuality: 85
};

/**
 * get stored preferences
 */

async function getPrefs() {
  return await browser.storage.local.get(DEFAULTS);
}

/**
 * apply menu state according to stored preferences
 */
async function applyMenuState() {
  const { menuEnabled } = await getPrefs();

  await browser.menus.removeAll();
  if (!menuEnabled) return;

  browser.menus.create({
    id: "capture-visible",
    title: browser.i18n.getMessage("popupActionCaptureVisible", ""),
    contexts: ["page"]
  });
  browser.menus.create({
    id: "capture-fullpage",
    title: browser.i18n.getMessage("popupActionCaptureEntire", ""),
    contexts: ["page"]
  });
}

//Call at startup and install, and react to changes
applyMenuState();
browser.runtime.onInstalled.addListener(applyMenuState);

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.menuEnabled) applyMenuState();
});

applyCapturePrefs();

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.captureFormat || changes.jpegQuality) {
    applyCapturePrefs();
  }
});

// basic error handling
const sendMessageWithTimeout = (tabId, msg, timeoutMs = MSG_TIMEOUT_MS) => new Promise((res, rej) => {
    let done = false;
    const t = setTimeout(() => {
        if (done) return;
        done = true;
        rej(new Error('sendMessage timeout'));
    }, timeoutMs);

    try {
        chrome.tabs.sendMessage(tabId, msg, (response) => {
            if (done) return;
            done = true;
            clearTimeout(t);

            if (chrome.runtime.lastError) {
                rej(new Error(chrome.runtime.lastError.message));
            } else {
                res(response);
            }
        });
    } catch (e) {
        if (done) return;
        done = true;
        clearTimeout(t);
        rej(e);
    }
});

/**
 * @typedef ScrollshotParameters
 * @param {number} width
 * @param {number} height
 * @param {number} windowWidth
 * @param {number} windowHeight
 */
/**
 * @typedef ViewportInfo
 * @property {number} x Horizontal offset in the complete page
 * @property {number} y Vertical offset in the complete page
 * @property {number} w Width of the viewport
 * @property {number} h Height of the viewport
 */

/**
 * Placeholder spacing for the header information
 */
const space_top = 55;
let id = 100;
/** @type {ScrollshotParameters} */
let scrollshotParameters = {
    width: 0,
    height: 0,
    windowWidth: 0,
    windowHeight: 0,
};
let url = null;

/**
 * @param {string} url
 * @returns string
 */
const getHost = url => {
    const m = url.match(/^(.+:)\/\/([^/]+)/);
    return m ? m[2] : url;
};

// In Firefox MV2 background pages, i18n is available directly.
const i18nGetMessage = (name, placeholders) => chrome.i18n.getMessage(name, placeholders);

// Capture errors
console.log('[atomshot] background started', chrome.runtime.getManifest().version);

self.addEventListener('unhandledrejection', (e) => {
    console.error('[atomshot] unhandledrejection', e.reason);
});
self.addEventListener('error', (e) => {
    console.error('[atomshot] error', e.error || e.message);
});

/**
 * @typedef {{
 *   seconds: string,
 *   minutes: string,
 *   hours: string,
 *   day: string,
 *   month: string,
 *   year: string,
 * }} AtomshotTime
 */

/**
 * @returns {Promise<AtomshotTime>}
 */
const getTimeFromServer = () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    return fetch('https://www.atomshot.de/time/timestamp.php', { signal: controller.signal })
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .catch(() => null)
        .finally(() => clearTimeout(timeout));
};


let spinnerInterval = 0;
let spinnerIteration = 0;
const setLoadingIcon = () => {
    spinnerIteration = 0;
    clearInterval(spinnerInterval);
    spinnerInterval = setInterval(() => {
        browser.browserAction.setIcon({
            path: `./images/frame-${spinnerIteration}.png`,
        });
        spinnerIteration = (spinnerIteration + 12) % 120;
    }, 60);
};
const resetIcon = () => {
    clearInterval(spinnerInterval);
    browser.browserAction.setIcon({
        path: {
            '16': './images/favicon_atomshot_16_16.png',
            '32': './images/favicon_atomshot_32_32.png',
            '48': './images/favicon_atomshot_48_48.png',
            '64': './images/favicon_atomshot_64_64.png',
            '128': './images/favicon_atomshot_128_128.png',
        },
    });
};

/**
 * @type {HTMLCanvasElement | null} Actually an {@link OffscreenCanvas} element,
 *      which however is not known to the IDE
 * */
let canvas = null;

/**
 * Get a configured canvas or setup a new one if necessary
 * @param {Tab=} tab Can be used as fallback to determine canvas dimensions
 * @param {number=} width Can be used when initializing the canvas if diverging
 *      from tab size
 * @param {number=} height Can be used when initializing the canvas if diverging
 *      from tab size
 * @returns
 */
const getCanvas = (tab, width, height) => {
    if (!canvas) {
        const w = width || tab.width;
        const h = height || tab.height + space_top;
        canvas = (typeof OffscreenCanvas !== 'undefined')
            ? new OffscreenCanvas(w, h)
            : (() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; })();
    }
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
};

/**
 * Helper function for getting an image object that can be drawn onto an
 * offscreen canvas.
 * @param {string} uri
 * @returns {Promise<ImageBitmap>}
 */
const getImageBitmap = uri =>
    fetch(uri)
        .then(r => r.blob())
        .then(blob => createImageBitmap(blob));

/**
 * @param {Tab} tab
 * @param {number} x {@link CanvasRenderingContext2D.drawImage}
 * @param {number} y {@link CanvasRenderingContext2D.drawImage}
 * @param {number=} w {@link CanvasRenderingContext2D.drawImage}
 * @param {number=} h {@link CanvasRenderingContext2D.drawImage}
 * @param {number=} dx {@link CanvasRenderingContext2D.drawImage}
 * @param {number=} dy {@link CanvasRenderingContext2D.drawImage}
 * @param {number=} dw {@link CanvasRenderingContext2D.drawImage}
 * @param {number=} dh {@link CanvasRenderingContext2D.drawImage}
 * @returns
 */
const captureVisibleToCanvas = (tab, x, y, w = 0, h = 0, dx, dy, dw, dh) =>
    new Promise((res, rej) => {
        const { ctx } = getCanvas(tab);

        // Prefer captureTab when available: avoids windowId edge-cases and is often more stable.
        const captureFn = (chrome.tabs.captureTab && tab && tab.id)
            ? (cb) => chrome.tabs.captureTab(tab.id, {
                format: CAPTURE_FORMAT,
                quality: CAPTURE_FORMAT === 'jpeg' ? CAPTURE_QUALITY : undefined,
            }, cb)
            : (cb) => chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
                format: CAPTURE_FORMAT,
                quality: CAPTURE_FORMAT === 'jpeg' ? CAPTURE_QUALITY : undefined,
            }, cb);

        captureFn((dataURI) => {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError);
                rej(new Error(chrome.runtime.lastError.message));
            } else if (dataURI) {
                getImageBitmap(dataURI)
                    .then(img => {
                        if (dx !== undefined && dy !== undefined && dw !== undefined && dh !== undefined) {
                            ctx.drawImage(img, x, y, w, h, dx, dy, dw, dh);
                        } else {
                            ctx.drawImage(img, x, y, w, h);
                        }
                    })
                    .then(() => res(dataURI))
                    .catch(rej);
            } else {
                const err = new Error('Could not take screenshot');
                console.error(err);
                rej(err);
            }
        });
    });

/**
 * Add the info-text as header
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w Width of the taken image as header width
 * @param {AtomshotTime} snapTime
 */
const addHeader = async (ctx, w, snapTime) => {

    let timeString = '';
    try {
        if (!snapTime) {
            throw new Error('No time received');
        }
        const date = `${snapTime.year}-${snapTime.month}-${snapTime.day}`;
        const time = `${snapTime.hours}:${snapTime.minutes}:${snapTime.seconds}`;
        timeString = await Promise.resolve(i18nGetMessage(
            'screenshotHeaderTime',
            [
                date,
                time,
            ]
        ));
    } catch (e) {
        timeString = await Promise.resolve(i18nGetMessage('timeServerError'))
            .catch(e => e);
    }
    const urlString = await Promise.resolve(i18nGetMessage('screenshotHeaderPage', url))
        .catch(() => `URL: ${url}`);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, space_top);

    ctx.fillStyle = '#000000';
    ctx.font = '11pt Arial';

    ctx.fillText(timeString, 115, 25);
    ctx.fillText(urlString, 115, 45);

    const logoUri = chrome.runtime.getURL('images/atomshot-logo-50.png');
    await getImageBitmap(logoUri)
        .then(bitmap => ctx.drawImage(bitmap, 30, 2));
};


/**
 * Adds the header to the screenshot and displays it in a new tab.
 * @param {Tab} tab The tab the screenshot was taken for
 */
const finalizeScreenshot = async (tab) => {
    resetIcon();
    const { ctx, canvas } = getCanvas(tab);
    url = tab.url;
    const snapTime = await getTimeFromServer();
    const titleTime = snapTime
        ? `${snapTime.year}${snapTime.month}${snapTime.day}_${snapTime.hours}${snapTime.minutes}${snapTime.seconds}_`
        : 'ERROR_';
    const imageTitle = titleTime + tab.title;
    await addHeader(ctx, scrollshotParameters.width || tab.width, snapTime);
    const dataUrl = await canvasToBlob(canvas).then(blobToDataUrl);
    const viewTabUrl = chrome.runtime.getURL(`atomshot.html?id=${id++}`);
    let targetId;
    chrome.tabs.create({ url: viewTabUrl }, tab => {
        targetId = tab.id;
        const message = {
            action: 'open',
            image: dataUrl,
            url: url,
            domain: getHost(url),
            title: imageTitle,
        };
        chrome.tabs.sendMessage(targetId, message);
        const addSnapshotImageToTab = function(tabId, changedProps) {
            if (tabId != targetId || changedProps.status != 'complete') {
                return;
            }
            chrome.tabs.onUpdated.removeListener(addSnapshotImageToTab);
            chrome.tabs.sendMessage(targetId, message);
        };
        chrome.tabs.onUpdated.addListener(addSnapshotImageToTab);
    });
};

/**
 * Take a one-shot screenshot of the viewport currently visible on the `tab`.
 * @param {Tab} tab Tab to take the screenshot of
 * @returns {Promise<void>}
 */
const takeScreenshot = (tab) =>
    captureVisibleToCanvas(tab, 0, space_top, tab.width, tab.height)
        .then(() => finalizeScreenshot(tab));


/**
 * Convert either an OffscreenCanvas or HTMLCanvasElement to a Blob
 * @param {any} c
 * @returns {Promise<Blob>}
 */
const canvasToBlob = (c) => {
    if (c && typeof c.convertToBlob === 'function') {
        return c.convertToBlob({
            type: OUTPUT_MIME,
            quality: CAPTURE_FORMAT === 'png' ? (CAPTURE_QUALITY / 100) : undefined
        });
    }
    return new Promise((res, rej) => {
        try {
            c.toBlob(
                (blob) => blob ? res(blob) : rej(new Error('toBlob returned null')),
                OUTPUT_MIME,
                CAPTURE_FORMAT === 'png' ? (CAPTURE_QUALITY / 100) : undefined
            );
        } catch (e) {
            rej(e);
        }
    });
};

/**
 * Helper to create a dataURL from a blob
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
const blobToDataUrl = blob => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = () => rej(reader.error);
    reader.readAsDataURL(blob);
});


/**
 * Asks the tab to setup the scrollshot.
 * It should respond with the the dimensions of the image to take.
 * @param {Tab} tab
 * @returns {Promise<void>}
 */
		
const requestScrollshot = (tab) => new Promise((res, rej) => {
    chrome.tabs.sendMessage(tab.id, { action: 'background.initScrollshot' }, message => {
        if (!message) {
            rej();
        } else {
            setLoadingIcon();
            setupScrollshot(tab, {
                width: message.width,
                height: message.height,
                windowWidth: message.windowWidth,
                windowHeight: message.windowHeight,
            });
            res();
        }
    });
});

/**
 * Initializes the canvas and requests the first part of the scrollshot to be
 * taken.
 * @param {Tab} tab
 * @param {ScrollshotParameters} parameters Parameters of the scrollshot
 */
const setupScrollshot = (tab, parameters) => {
    scrollshotParameters = parameters;
    getCanvas(tab, parameters.width, parameters.height + space_top);

    // page.js responds only once it has scrolled and the frame is ready.
    sendMessageWithTimeout(tab.id, { action: 'background.scrollNext' })
        .then((message) => addScrollshot(tab, message.viewport, scrollshotParameters))
        .catch((e) => {
            console.error('[atomshot] setupScrollshot failed', e);
            resetIcon();
        });
};

/**
 *
 * @param {Tab} tab
 * @param {ViewportInfo} viewportFrame
 * @param {ScrollshotParameters} viewportOptions
 */
const addScrollshot = (tab, viewportFrame, viewportOptions) => {
    if (!viewportFrame) {
        finalizeScrollshot(tab);
        return;
    }

    captureVisibleToCanvas(tab,
        viewportFrame.x - (viewportOptions.windowWidth - viewportFrame.w),
        viewportFrame.y + space_top - (viewportOptions.windowHeight - viewportFrame.h),
        tab.width,
        tab.height
    )
        .then(() => sendMessageWithTimeout(tab.id, { action: 'background.scrollNext' }))
        .then((message) => {
            if (message && message.viewport) {
                addScrollshot(tab, message.viewport, viewportOptions);
            } else {
                finalizeScrollshot(tab);
            }
        })
        .catch((e) => {
            console.error('[atomshot] addScrollshot failed', e);
            resetIcon();
            // Best-effort cleanup
            try { chrome.tabs.sendMessage(tab.id, { action: 'background.cleanup' }); } catch (_) {}
        });
};

/**
 * Tells the page script to cleanup, i.e. restore the viewport properties and
 * sends the current canvas to finish the process
 * @see finalizeScreenshot
 * @param {Tab} tab
 */
const finalizeScrollshot = (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'background.cleanup' });
    const { canvas } = getCanvas();
    canvasToBlob(canvas)
        .then(blobToDataUrl)
        .then(() => finalizeScreenshot(tab));
};

/**
 * Initialize capturing the whole page for the current page
 */
const captureFullpage = () => new Promise((res, rej) => {
    canvas = null;
    chrome.tabs.query({ active: true, currentWindow: true }, ([ tab ]) => {
        if (chrome.runtime.lastError) {
            rej(chrome.runtime.lastError);
        } else {
            chrome.tabs.executeScript(tab.id, { file: 'page.js' }, () => {
                if (chrome.runtime.lastError) {
                    rej(chrome.runtime.lastError);
                } else {
                    res(requestScrollshot(tab));
                }
            });
        }
    });
});

/**
 * Initialize capturing visible content for the currently active tab
 */
const captureVisible = () => new Promise((res, rej) => {
    canvas = null;
    chrome.tabs.query({ active: true, currentWindow: true }, ([ tab ]) => {
        if (chrome.runtime.lastError) {
            rej(chrome.runtime.lastError);
        } else {
            res(takeScreenshot(tab));
        }
    });
});


// listen to commands from the popup
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    let result = Promise.resolve();

    switch (message.action) {
        case 'popup.captureFullpage':
            result = captureFullpage();
            break;
        case 'popup.captureVisible':
            result = captureVisible();
            break;
        default: // basic error handling
            respond({ ok: false, type: 'errorFeedback', message: 'unknownAction' });
            return false;
    }

    result
        .then(() => respond({ ok: true, ack: true }))
        .catch((e) => {
            console.error('[atomshot] action failed', message && message.action, e);
            respond({
                ok: false,
                type: 'errorFeedback',
                message: 'cantTakeScreenshot',
                detail: String(e && e.message ? e.message : e),
            });
        });

    return true;
});

// listen to commands via hotkeys
chrome.commands.onCommand.addListener(command => {
    switch (command) {
        case 'captureFullpage': {
            captureFullpage();
            break;
        }
        case 'captureVisible': {
            captureVisible();
            break;
        }
    }
});

//add to the menu of the browser, so one can call it by right-click
/**
 * make sure we can use the right handlers
 */
function createContextMenus() {
  browser.menus.removeAll().then(() => {
    browser.menus.create({
      id: "capture-visible",
      title: browser.i18n.getMessage("popupActionCaptureVisible", ""),
      contexts: ["page"]
    });

    browser.menus.create({
      id: "capture-fullpage",
      title: browser.i18n.getMessage("popupActionCaptureEntire", ""),
      contexts: ["page"]
    });
  });
}

createContextMenus();
browser.runtime.onInstalled.addListener(createContextMenus);

browser.menus.onClicked.addListener((info, tab) => {
  // optional debug
  console.log("[atomshot] menu click", info.menuItemId, tab && tab.url);

  if (info.menuItemId === "capture-visible") {
    captureVisible().catch(e => console.error("[atomshot] captureVisible failed", e));
  } else if (info.menuItemId === "capture-fullpage") {
    captureFullpage().catch(e => console.error("[atomshot] captureFullpage failed", e));
  }
});