// Lightweight self-contained "live" background: soft drifting gradient
// blobs on a canvas, redrawn every frame. No video file, no external
// assets, no licensing concerns — just motion. Swap in a real <video>
// later if you have brand footage; this canvas is a safe default.

function initLiveBackground(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;

  function resize(w, h) {
    width = w;
    height = h;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  if (window.ResizeObserver) {
    const observer = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      resize(box.width, box.height);
    });
    observer.observe(canvas);
  } else {
    resize(canvas.clientWidth, canvas.clientHeight);
    window.addEventListener('resize', () => resize(canvas.clientWidth, canvas.clientHeight));
  }

  const blobs = [
    { color: 'rgba(139, 92, 246, 0.55)', r: 0.3, speedX: 0.00012, speedY: 0.00017, phase: 0 },
    { color: 'rgba(59, 130, 246, 0.5)', r: 0.26, speedX: 0.00019, speedY: 0.00013, phase: 2.1 },
    { color: 'rgba(255, 69, 0, 0.3)', r: 0.22, speedX: 0.00015, speedY: 0.0002, phase: 4.4 },
  ];

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame(t) {
    if (!width || !height) {
      requestAnimationFrame(frame);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.filter = 'blur(46px)';

    for (const b of blobs) {
      const cx = width / 2 + Math.cos(t * b.speedX + b.phase) * width * 0.3;
      const cy = height / 2 + Math.sin(t * b.speedY + b.phase) * height * 0.3;
      const r = Math.min(width, height) * b.r;
      ctx.beginPath();
      ctx.fillStyle = b.color;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!prefersReducedMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
