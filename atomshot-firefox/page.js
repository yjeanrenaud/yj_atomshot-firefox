let viewportBackup = {
    x: 0,
    y: 0,
    overflow: null,
};
let frame = 0;
/** @type {{x: number, y: number, h: number, w: number}[]} */
let viewports = [];

const initScrollshot = () => {
    viewportBackup.x = window.scrollX,
    viewportBackup.y = window.scrollY,
    viewportBackup.overflow = document.documentElement.style.overflow;
    frame = 0;
    viewports = [];

    document.documentElement.style.overflow = 'hidden';

    const widths = [
        document.documentElement.clientWidth,
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
    ];
    const heights = [
        document.documentElement.clientHeight,
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
    ];


    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const fullWidth = Math.max(...widths.filter(Boolean));
    const fullHeight = Math.max(...heights.filter(Boolean));

    const dx = Math.ceil(fullWidth / windowWidth);
    const dy = Math.ceil(fullHeight / windowHeight);

    for (let x = 0; x < dx; x++) {
        for (let y = 0; y < dy; y++) {
            const px = windowWidth * x;
            const py = windowHeight * y;
            viewports.push({
                x: px,
                y: py,
                w: Math.min(windowWidth, fullWidth - px),
                h: Math.min(windowHeight, fullHeight - py),
            });
        }
    }

    return { viewports, fullWidth, fullHeight, windowWidth, windowHeight };
};

const scrollToNext = () => {
    const currentFrame = viewports[frame++];
    if (!currentFrame) {
        return null;
    }
    window.scrollTo(currentFrame.x, currentFrame.y);
    return currentFrame;
};

const restoreViewport = () => {
    document.documentElement.style.overflow = viewportBackup.overflow;
    window.scrollTo(viewportBackup.x, viewportBackup.y);
};

if (!window.__screenCaptureInit) {
    window.__screenCaptureInit = true;
    chrome.runtime.onMessage.addListener((message, _sender, respond) => {
        switch (message.action) {
            case 'background.initScrollshot': {
                const data = initScrollshot();
                respond({
                    action: 'page.init',
                    todo: data.viewports.length,
                    width: data.fullWidth,
                    height: data.fullHeight,
                    windowWidth: data.windowWidth,
                    windowHeight: data.windowHeight,
                });
                break;
            }
            case 'background.scrollNext': {
                const frame = scrollToNext();
                respond({ action: 'page.scrolledNext', viewport: frame });
                break;
            }
            case 'background.cleanup':
                restoreViewport();
                break;
        }
        return true;
    });
}
