// Sticky pin helper — toggles `.stuck` on `#characters .content`
(function () {
  try {
    const content = document.querySelector('#characters .content');
    if (!content) return;

    const topOffset = 88; // should match CSS `top`

    // create an off-screen sentinel just before the content
    const sentinel = document.createElement('div');
    sentinel.className = 'sticky-sentinel';
    sentinel.style.position = 'absolute';
    sentinel.style.width = '1px';
    sentinel.style.height = '1px';
    sentinel.style.top = '0';
    sentinel.style.left = '0';
    sentinel.style.pointerEvents = 'none';
    content.parentNode.insertBefore(sentinel, content);

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // when sentinel is NOT fully visible (scrolled past), content is pinned
        if (entry.intersectionRatio < 1) {
          content.classList.add('stuck');
        } else {
          content.classList.remove('stuck');
        }
      });
    }, { root: null, threshold: [1], rootMargin: `-${topOffset}px 0px 0px 0px` });

    obs.observe(sentinel);

    // cleanup on unload
    window.addEventListener('beforeunload', () => {
      try { obs.disconnect(); } catch (e) {}
      try { sentinel.remove(); } catch (e) {}
    });
  } catch (e) {
    // silent fail — not critical
    console.error('sticky-pin init failed', e);
  }
})();
