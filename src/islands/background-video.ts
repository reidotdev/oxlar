/** Plays decorative background videos unless the visitor prefers reduced motion. Reacts live to the preference. */
const media = matchMedia("(prefers-reduced-motion: reduce)");
const videos = document.querySelectorAll<HTMLVideoElement>(
  "video[data-bg-video]",
);

function apply() {
  videos.forEach((video) => {
    if (media.matches) {
      video.pause();
      video.currentTime = 0;
    } else {
      // play() rejects if the browser declines autoplay; the poster stays.
      void video.play().catch(() => {});
    }
  });
}

apply();
media.addEventListener("change", apply);
