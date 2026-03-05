# yj_atomshot-firefox
a port of the Chromium extension Atomshot by gulden röttger solicitors.

<img src="atomshot-firefox/images/favicon_atomshot_128_128.png" alt="Logo Atomshot. Aperture with three yellow stripes similar to a radio active symbol" align="right"> atomshot is a browser extension that produces *legally secure* screenshots of your browser's content by adding a trusted, atom-clock backed time stamp and precise URL. It is made by [gulden rötter solicitors](https://ggr-law.com/screenshot-tool-beweise-atomshot/) and it is used by solicitors and courts to preserve evidence alike. It depends on a dedicated  timeserver and collects all relevant data (as far as I learned) to secure digital evidence for legal purposes. But it's only available for Chomium-based browsers. I dislike the Chromium architecture, hence I wanted to port it to Gecko-based browsers (Firefox and Waterfox, which I use, to be precise).

See [https://ggr-law.com/screenshot-tool-beweise-atomshot/](https://ggr-law.com/screenshot-tool-beweise-atomshot/) for more details (in German).
This is the link to the crhome web store: [https://chromewebstore.google.com/detail/atomshot/pjfmllbdhacnbnjgenkeflcmklpkjdcn](https://chromewebstore.google.com/detail/atomshot/pjfmllbdhacnbnjgenkeflcmklpkjdcn?pli=1)

### What I changed 
- Removed `update_url`, which is Chrome Web Store–specific
- Switched Manifest V3 to Manifest V2 for better compatibility, especially for background and service worker behaviour
- I replaced the `background.service_worker` with `background.scripts` (`persistent: false`)
- `action` is now called `browser_action`
- `chrome.scripting.executeScript` is `chrome.tabs.executeScript`
- `chrome.action.*`functions became `chrome.browserAction.*`
- furthermore, I added Firefox add-on identifier `applications.gecko.id = "atomshot@atomshot.de"`
- changed tabs permission, which are needed for executeScript / screenshot workflow in Firefox
- Updated `popup.js` to avoid Chrome-only Promise usage for `chrome.commands.getAll`
- added some basic error handling `chrome.runtime.lastError`, `console.error`, and `console.log` messages, also in `handleClick`
- added constants for hardening `captureVisibleToCanvas()`
- speeded up caputring by prefering `captureTab(tab.id)`
- skipping `setTimeout`
- fixed listener function by waiting for `promise.resolve()`
- `background.scrollNext()` waits for `paint` to finish

## Install
How to load it in Firefox/Waterfox (temporary install)
- Open *<a href="about:debugging#/runtime/this-firefox" target="_blank">about:debugging#/runtime/this-firefox</a>*
- Click “Load Temporary Add-on…”
- use the zip-file from [Releases](https://github.com/yjeanrenaud/yj_atomshot-firefox/releases) or unzip the file and select the `manifest.json`

## ToDo
- add file format toggle
- make it compatbile to Gecko on smart phones
