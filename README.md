# yj_atomshot-firefox
a port of the Chromium extension Atomshot

atomshot is a browser extension that produces *legally secure* screenshots of browser content. It is made by [gulden rötter](https://ggr-law.com/screenshot-tool-beweise-atomshot/) and it is used by solicitors and courts to preserve evidence alike. It depends on a seperate timeserver and collects all relevant data (as far as I learned) to secure digital evidence. I dislike the Chromium architecture, hence I wanted to port it to firefox (and waterfox, to be precise).

See [https://ggr-law.com/screenshot-tool-beweise-atomshot/](https://ggr-law.com/screenshot-tool-beweise-atomshot/) for more (in German).

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

## Install
How to load it in Firefox/Waterfox (temporary install)
- Open <a href="about:debugging#/runtime/this-firefox" target="_blank">about:debugging#/runtime/this-firefox</a>
- Click “Load Temporary Add-on…”
- use the zip-file from [Releases](https://github.com/yjeanrenaud/yj_atomshot-firefox/releases) or unzip the file and select the `manifest.json`
