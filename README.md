# yj_atomshot-firefox
a port of the Chromium extension Atomshot by gulden röttger solicitors.
  
<a href="https://addons.mozilla.org/en-GB/firefox/addon/atomshot/" target="_blank"><img width="172" height="60" alt="Get the ADD-ON" src="https://github.com/user-attachments/assets/278a3292-b597-452a-964a-f7bfccb9685e" align ="left"/><img src="atomshot-firefox/images/favicon_atomshot_128_128.png" alt="Logo Atomshot. Aperture with three yellow stripes similar to a radio active symbol" align="right"></a> atomshot is a browser extension that produces *legally secure* screenshots of your browser's content by adding a trusted, atomic clock backed time stamp and precise URL. It is made by [gulden röttger solicitors](https://ggr-law.com/screenshot-tool-beweise-atomshot/) and it is used by solicitors and courts to preserve evidence alike. It depends on a dedicated  timeserver and collects all relevant data (as far as I learned) to secure digital evidence for legal purposes. But it's only available for Chomium-based browsers. I dislike the Chromium architecture, hence I wanted to port it to Gecko-based browsers (Firefox and Waterfox, which I use, to be precise).
## Privacy 
As far as I learned, there is no data collection in place. The add-on itsself does not submit your tab, url or any other sensible information to atomshot.de. It only receives the atomic clock's timestamp from there. From my point of view, there *might* be some data, e.g. IP, browser version etc. that ends up at atomshot.de when this request is made, but I do not know for sure. And frankly speaking, I do not care becaus that data is so arbitary and non-telling, I think it's neglectable. Anyhow, the time server is not under my control at all.

See [https://ggr-law.com/screenshot-tool-beweise-atomshot/](https://ggr-law.com/screenshot-tool-beweise-atomshot/) for more details (in German).<br/> and link to the chrome web store entry of the extension: [https://chromewebstore.google.com/detail/atomshot/pjfmllbdhacnbnjgenkeflcmklpkjdcn](https://chromewebstore.google.com/detail/atomshot/pjfmllbdhacnbnjgenkeflcmklpkjdcn?pli=1). I also added the [original Chromium extension as zip-file](atomshot-Chrome-Web-Store.zip) for documenting purposes. Hence it's excluded via `.gitignore`. 

### What I changed 
- Removed `update_url`, which is Chrome Web Store–specific
- Switched Manifest V3 to Manifest V2 for better compatibility, especially for background and service worker behaviour
- I replaced the `background.service_worker` with `background.scripts` (`persistent: false`)
- `action` is now called `browser_action`
- `chrome.scripting.executeScript` is `chrome.tabs.executeScript`
- `chrome.action.*`functions became `chrome.browserAction.*`
- furthermore, I added Firefox add-on identifier `applications.gecko.id `
- changed tabs permission, which are needed for executeScript / screenshot workflow in Firefox
- Updated `popup.js` to avoid Chrome-only Promise usage for `chrome.commands.getAll`
- added some basic error handling `chrome.runtime.lastError`, `console.error`, and `console.log` messages, also in `handleClick`
- added constants for hardening `captureVisibleToCanvas()`
- speeded up caputring by prefering `captureTab(tab.id)`
- skipping `setTimeout`
- fixed listener function by waiting for `promise.resolve()`
- `background.scrollNext()` waits for `paint` to finish
- fixed some typos in my code and strings
- added some rebranding, so to say. It's now more obvious that this extension for Gecko-based browers is made by me, derived from the work of gulden rüttger solicitors 
- added 65x65 icons (why ever I thought 56x56 would be a good idea)
- added `favicon_atomshot_allSizes.ico` 
- added do `page_action`, too
- uploaded to *addons.mozilla.org*
- added to menus for convenience
- addressed a **security issue**: added `setFeedbackElement(text)` to avoid setting `innerHTML=` with potentially un-sanitised values<br/>
  this prevents XSS if any of those values ever contain `<script>`, `<img onError=...>`, etc. and get executed.
- domain-info button now localised and non-static
- added options page. User may now select the file format of the screenshot and enable/disable the menu entry
- added sidebar
- added French
  
## Install
### How to load it in Firefox/Waterfox (temporary install)
- Open *<a href="about:debugging#/runtime/this-firefox" target="_blank">about:debugging#/runtime/this-firefox</a>*
- Click "Load Temporary Add-on…"
- use the zip-file from [Releases](https://github.com/yjeanrenaud/yj_atomshot-firefox/releases) or unzip the file and select the `manifest.json`

### How to install regularly
- use the xpi-file from [Releases](https://github.com/yjeanrenaud/yj_atomshot-firefox/releases)
- or go to the Add-on Mozilla 
  <a href="https://addons.mozilla.org/en-GB/firefox/addon/atomshot/" target="_blank"><img width="172" height="60" alt="Get the ADD-ON" src="https://github.com/user-attachments/assets/278a3292-b597-452a-964a-f7bfccb9685e" /></a>

## ToDo
- make it compatbile to Gecko-browsers on smartphones
