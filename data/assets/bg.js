/*
 * Background chooser for OMV-Landingpage.
 * Picks a thematically fitting blurred background per view.
 *
 * Convention:
 *   - Home (/) uses:           /data/backgrounds/_home.jpg
 *   - Section (/section/:slug) uses (first match wins):
 *         /data/backgrounds/section-:slug.jpg
 *         /data/backgrounds/:slug.jpg
 *         /data/backgrounds/_default.jpg
 *
 * You can override on any page by placing
 *   <meta name="omv-bg" content="/data/backgrounds/custom.jpg">
 * or by setting data-bg attribute on <html> or <body>.
 */
(function(){
  try {
    const html = document.documentElement;
    const override = (document.querySelector('meta[name="omv-bg"]')||{}).content
                  || html.dataset.bg || document.body?.dataset?.bg;

    if (override) {
      setVar(override);
      return;
    }

    const path = location.pathname.replace(/\/+/g,'/').replace(/\/$/,'') || '/';

    if (path === '/') {
      setVar('/data/backgrounds/_home.png');
      return;
    }

    // Expecting /section/:slug as section pages
    const m = path.match(/^\/section\/([^/]+)$/);
    if (m) {
      const slug = decodeURIComponent(m[1]);
      const candidates = [
        `/data/backgrounds/section-${slug}.jpg`,
        `/data/backgrounds/${slug}.jpg`,
        '/data/backgrounds/_default.png'
      ];
      pickFirstExisting(candidates).then(setVar);
      return;
    }

    // Fallback for any other route
    setVar('/data/backgrounds/_default.png');

    function setVar(url){
      if (!url) return;
      html.style.setProperty('--bg-url', `url('${url}')`);
      html.style.setProperty('--bg-opacity', '1');
    }

    // Probe which file exists by loading as Image (fast; browser-cached)
    function pickFirstExisting(list){
      return new Promise(resolve => {
        let i=0;
        const tryNext = () => {
          if (i>=list.length) return resolve(list[list.length-1]);
          const url = list[i++];
          const img = new Image();
          img.onload  = () => resolve(url);
          img.onerror = tryNext;
          img.src = url + `?v=${cacheBuster()}`;
        };
        tryNext();
      });
    }

    function cacheBuster(){
      // daily buster to allow hot-swapping wallpapers without hard reload
      const d = new Date();
      return `${d.getUTCFullYear()}${d.getUTCMonth()+1}${d.getUTCDate()}`;
    }
  } catch(e) {
    console.warn('[omv-bg] failed:', e);
  }
})();
