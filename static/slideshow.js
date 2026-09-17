/*
  Progressive enhancement for the photo slideshow (lib/slideshow.mjs).

  The strip already scrolls, swipes and snaps in CSS; this adds prev/next
  buttons and turns the badge's "N photos" into a "current / total" position.
  Nothing here is required to see every photo, which is why the buttons are
  hidden until this runs (html.js, the same gate as the theme toggle).

  Idempotent per slideshow: a page with two strips loads this once and each
  strip is wired up once, however many <script> tags the shortcode emitted.
*/
(function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('[data-slideshow]:not([data-ready])').forEach(function (root) {
        root.dataset.ready = '';

        var track = root.querySelector('.slideshow-track');
        var prev = root.querySelector('.slideshow-prev');
        var next = root.querySelector('.slideshow-next');
        var count = root.querySelector('.slideshow-count');
        var total = track.children.length;

        // Slides are exactly as wide as the track, so the index is just how
        // many track-widths have scrolled past.
        function current() {
            return Math.round(track.scrollLeft / track.clientWidth);
        }

        function render() {
            count.textContent = (current() + 1) + ' / ' + total;
        }

        // Where the strip is heading, if a smooth scroll is still in flight.
        // Stepping from the live scroll position instead would lose clicks:
        // two quick presses of "next" mid-animation added up to one slide.
        var target = null;

        // Wraps at both ends: next on the last photo goes round to the first,
        // and prev on the first goes to the last. The wrap itself jumps
        // rather than scrolling smoothly — a smooth scroll back across every
        // photo took three times as long as a step and read as a rewind.
        function step(direction) {
            var from = target === null ? current() : target;
            var wrapped = from + direction < 0 || from + direction >= total;
            target = (from + direction + total) % total;
            track.scrollTo({
                left: target * track.clientWidth,
                behavior: reduceMotion || wrapped ? 'auto' : 'smooth'
            });
        }

        prev.addEventListener('click', function () { step(-1); });
        next.addEventListener('click', function () { step(1); });

        // The strip is focusable so the arrow keys reach it, but a native
        // keyboard scroll is a few dozen pixels, which mandatory snapping
        // pulls straight back. Step a whole photo instead.
        track.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
        });

        var queued = false;
        track.addEventListener('scroll', function () {
            if (queued) { return; }
            queued = true;
            requestAnimationFrame(function () {
                queued = false;
                render();
                if (current() === target) { target = null; }
            });
        }, { passive: true });

        render();
    });
})();
