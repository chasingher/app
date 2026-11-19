import { ChasingHerProjectData, MemoriesProjectData } from './platformLogic';

function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data, null, 2).replace(/<\/script/gi, '<\\/script');
}

const REDESIGNED_PASSCODE_CSS = `
  /* ---------- Redesigned Deep Burgundy & Gold PIN Gate ---------- */
  .login-screen{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:40px 20px;
    background:radial-gradient(circle at 50% 24%,#4a0918 0%,#28060e 52%,#160308 100%);
    color:#fdf3ea;position:relative;overflow:hidden;
    transition:opacity 900ms ease, transform 900ms ease}
  .login-screen::before{content:"";position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(circle at 50% 35%,rgba(226,185,111,.14),transparent 60%)}
  .login-screen.fading-out{opacity:0;transform:scale(1.06);pointer-events:none}
  .login-whisper{font-family:var(--font-serif);font-style:italic;font-size:1.18rem;letter-spacing:.03em;color:#e2b96f;position:relative;z-index:1;text-align:center}
  .login-heart{position:relative;z-index:1;width:88px;height:88px;border-radius:50%;
    background:radial-gradient(circle at 35% 30%,rgba(226,185,111,.22),rgba(194,24,91,.16));
    border:1px solid rgba(226,185,111,.42);display:flex;align-items:center;justify-content:center;
    box-shadow:0 14px 34px rgba(0,0,0,.45), 0 0 28px rgba(194,24,91,.28)}
  .login-heart svg{width:50px;height:50px;filter:drop-shadow(0 8px 18px rgba(194,24,91,.55));animation:pulseHeartSlow 2.2s ease-in-out infinite}
  .login-heart.shake svg{animation:shakeX .5s ease}
  .login-heart.success svg{animation:burstHeart .6s ease}
  @keyframes burstHeart{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1.05)}}
  .pin-dots{display:flex;gap:14px;position:relative;z-index:1}
  .pin-dots.shake{animation:shakeX .5s ease}
  .dot{width:14px;height:14px;border-radius:50%;border:2px solid rgba(226,185,111,.65);background:rgba(255,255,255,.04);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
  .dot.filled{background:#e2b96f;border-color:#e2b96f;box-shadow:0 0 12px rgba(226,185,111,.6);transform:scale(1.18)}
  .dot.success{background:#4c9a52;border-color:#4c9a52;box-shadow:0 0 14px rgba(76,154,82,.65)}
  .keypad{display:grid;grid-template-columns:repeat(3,72px);gap:16px 20px;animation:fadeInUp .6s ease;position:relative;z-index:1}
  .key{width:72px;height:72px;border-radius:50%;border:1px solid rgba(226,185,111,.32);
    background:linear-gradient(155deg,rgba(255,255,255,.11),rgba(58,13,24,.72));backdrop-filter:blur(8px);
    color:#fdf3ea;font-size:1.48rem;font-weight:500;
    box-shadow:0 8px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.16);
    transition:transform .16s ease, border-color .16s ease, background .16s ease}
  .key:hover{transform:translateY(-2px);border-color:#e2b96f;background:linear-gradient(155deg,rgba(226,185,111,.22),rgba(82,16,32,.85))}
  .key:active{transform:translateY(0) scale(.93)}
  .key-alt{background:rgba(194,24,91,.22);border-color:rgba(232,135,159,.35);color:#f9d8e2;font-size:1.05rem;display:flex;align-items:center;justify-content:center}
  .key-alt svg{width:20px;height:20px}
  @keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
`;

function buildChasingHerMusicInjection(slug: string, project: ChasingHerProjectData): string {
  const musicUrl = project.music_url || '';
  if (!musicUrl) return '';
  const musicStart = project.music_start || 0;
  const musicEnd =
    project.music_end === null || project.music_end === undefined ? null : project.music_end;

  return `
<style>
#bs-music-player{position:fixed;right:18px;bottom:18px;z-index:10001;display:flex;align-items:center;gap:8px;background:rgba(32,0,0,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(232,194,122,.35);border-radius:999px;padding:8px 10px;box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;transform:translateY(10px);transition:opacity .8s ease, transform .8s ease;font-family:'Poppins',sans-serif;}
#bs-music-player.bs-show{opacity:1;transform:translateY(0);}
#bs-music-player button{width:40px;height:40px;border-radius:50%;border:1px solid rgba(232,194,122,.4);background:rgba(255,255,255,.06);color:#fdf1e7;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .18s ease, transform .18s ease, border-color .18s ease;}
#bs-music-player button:hover{background:rgba(255,255,255,.16);border-color:#e8c27a;transform:translateY(-2px);}
#bs-music-player button svg{width:17px;height:17px;}
#bs-music-player .bs-note{width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#c2185b,#5c0b0b);color:#fdf1e7;}
#bs-music-player .bs-note svg{width:15px;height:15px;}
#bs-music-player .bs-note.bs-spin{animation:bs-spin 6s linear infinite;}
@keyframes bs-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
#bs-music-player .bs-vol-label{font-size:.62rem;color:#e8c27a;min-width:28px;text-align:center;}
</style>
<script>
(function(){
  var DEFAULT_MUSIC_URL = ${safeJsonForScript(musicUrl)};
  var DEFAULT_MUSIC_START = ${safeJsonForScript(musicStart)};
  var DEFAULT_MUSIC_END = ${safeJsonForScript(musicEnd)};
  var SLUG = ${safeJsonForScript(slug)};
  function init(){
    var audio = new Audio(DEFAULT_MUSIC_URL);
    audio.loop = false;
    audio.preload = "auto";
    audio.muted = true;
    audio.volume = 0;
    var START = Math.max(0, DEFAULT_MUSIC_START || 0);
    var END = (DEFAULT_MUSIC_END !== null && DEFAULT_MUSIC_END > START) ? DEFAULT_MUSIC_END : null;
    var VOLUME_STEPS = [0.15, 0.35, 0.55, 0.75, 1];
    var stepIndex = 1, seeked = false, ended = false;
    audio.addEventListener("loadedmetadata", function(){
      if (END === null || END > audio.duration) END = audio.duration;
      if (!seeked) { try { audio.currentTime = START; } catch(e){} seeked = true; }
    });
    audio.addEventListener("timeupdate", function(){
      var ep = END !== null ? END : audio.duration;
      if (!ep || isNaN(ep)) return;
      if (audio.currentTime >= ep - 0.05 && !ended) { audio.pause(); ended = true; updateUI(); }
    });
    function unlock(){
      if (!seeked) { try { audio.currentTime = START; } catch(e){} seeked = true; }
      audio.muted = false;
      audio.volume = VOLUME_STEPS[stepIndex];
      audio.play().catch(function(){});
      updateUI();
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    }
    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
    var wrap = document.createElement("div");
    wrap.id = "bs-music-player";
    wrap.setAttribute("data-slug", SLUG);
    wrap.innerHTML = '<div class="bs-note" id="bs-note">&#9835;</div><button type="button" id="bs-mute" aria-label="Toggle music mute"></button><button type="button" id="bs-vol" aria-label="Adjust volume"><span class="bs-vol-label" id="bs-vol-label">35%</span></button><button type="button" id="bs-restart" aria-label="Restart song">&#8634;</button>';
    document.body.appendChild(wrap);
    var muteBtn = wrap.querySelector("#bs-mute");
    var volBtn = wrap.querySelector("#bs-vol");
    var volLabel = wrap.querySelector("#bs-vol-label");
    var restartBtn = wrap.querySelector("#bs-restart");
    var noteEl = wrap.querySelector("#bs-note");
    function updateUI(){
      muteBtn.textContent = audio.muted ? "Muted" : "Sound";
      volLabel.textContent = Math.round(VOLUME_STEPS[stepIndex] * 100) + "%";
      noteEl.classList.toggle("bs-spin", !audio.paused && !audio.muted);
    }
    updateUI();
    setTimeout(function(){ wrap.classList.add("bs-show"); }, 1200);
    muteBtn.onclick = function(){ audio.muted = !audio.muted; if (!audio.muted) { audio.volume = VOLUME_STEPS[stepIndex]; audio.play().catch(function(){}); } updateUI(); };
    volBtn.onclick = function(){ stepIndex = (stepIndex + 1) % VOLUME_STEPS.length; audio.muted = false; audio.volume = VOLUME_STEPS[stepIndex]; audio.play().catch(function(){}); updateUI(); };
    restartBtn.onclick = function(){ ended = false; try { audio.currentTime = START; } catch(e){} audio.muted = false; audio.volume = VOLUME_STEPS[stepIndex]; audio.play().catch(function(){}); updateUI(); };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
<\/script>`;
}

export function buildChasingHerStandaloneHtml(
  slug: string,
  project: ChasingHerProjectData,
  orderPageUrl = ''
): string {
  const snapshot: ChasingHerProjectData = {
    slug,
    pin: project.pin || '140226',
    intro_message: project.intro_message || 'I love you so much',
    letter_title: project.letter_title || 'My Dearest,',
    letter_body: project.letter_body || '',
    final_message: project.final_message || 'Forever yours',
    photos: project.photos || [],
    flower_images: project.flower_images || [],
    songs: project.songs || [],
    music_url: project.music_url || '',
    music_start: project.music_start || 0,
    music_end: project.music_end ?? null,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<meta name="theme-color" content="#380000" />
<title>For You — ${slug}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&family=Caveat:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root{
    --cream:#fdf1e7; --cream-deep:#f7ddc9;
    --rose:#c2185b; --rose-deep:#96123f; --rose-soft:#e8879f;
    --maroon-900:#200000; --maroon-800:#380000; --maroon-700:#4a0909; --maroon-600:#5c0b0b;
    --gold:#e8c27a;
    --cream-text:#fdf3ea;
    --font-script:'Dancing Script',cursive;
    --font-hand:'Caveat',cursive;
    --font-serif:'Cormorant Garamond',serif;
    --font-ui:'Poppins',sans-serif;
  }
  *,*::before,*::after{box-sizing:border-box}
  html,body{height:100%;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:var(--font-ui);background:var(--maroon-800);color:var(--cream-text);overflow-x:hidden}
  #root{min-height:100%}
  img{max-width:100%;display:block}
  button{font-family:inherit;cursor:pointer}
  a{color:inherit}

  /* Loading gate */
  .loading-gate{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:38px;padding:40px 20px;text-align:center;overflow:hidden;background:radial-gradient(circle at 50% 15%,#fffaf5 0%,var(--cream) 55%,var(--cream-deep) 100%)}
  .loading-heart-wrap{position:relative;width:104px;height:90px;perspective:700px;animation:pulseHeartSlow 2.4s ease-in-out infinite}
  .loading-heart-wrap::before{content:"";position:absolute;inset:-34px;border-radius:50%;border:1px solid rgba(194,24,91,.3);animation:heartRing 2.4s ease-out infinite;pointer-events:none}
  @keyframes heartRing{0%{transform:scale(.75);opacity:.5}70%{opacity:0}100%{transform:scale(1.7);opacity:0}}
  .loading-heart-wrap.impact{animation:none;transform:scale(1.3);transition:transform .38s cubic-bezier(.34,1.56,.64,1)}
  .heart-half{position:absolute;inset:0;transform-style:preserve-3d;transition:transform 1900ms cubic-bezier(.16,1,.3,1), opacity 1200ms ease 420ms}
  .heart-half svg{width:100%;height:100%;filter:drop-shadow(0 14px 24px rgba(194,24,91,.4))}
  .heart-half-left{clip-path:inset(0 50% 0 0);transform-origin:right center}
  .heart-half-right{clip-path:inset(0 0 0 50%);transform-origin:left center}
  .heart-open .heart-half-left{transform:rotateY(-120deg) translateX(-8px);opacity:0}
  .heart-open .heart-half-right{transform:rotateY(120deg) translateX(8px);opacity:0}
  .heart-burst{position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;transform:translate(-50%,-50%) scale(1);opacity:0;pointer-events:none;background:radial-gradient(circle,#fff8ec 0%,rgba(255,222,180,.5) 40%,rgba(255,222,180,0) 72%);transition:opacity 340ms ease, transform 1700ms cubic-bezier(.16,1,.3,1)}
  .heart-open .heart-burst{opacity:1;transform:translate(-50%,-50%) scale(18)}
  .loading-arrow-layer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:visible}
  .cupid-arrow{animation:arrowFly 1350ms cubic-bezier(.22,1,.36,1) forwards;filter:drop-shadow(0 3px 8px rgba(0,0,0,.3)) drop-shadow(0 0 10px rgba(232,194,122,.55))}
  @keyframes arrowFly{0%{transform:translate(80vw,-52vh) rotate(-40deg) scale(.7);opacity:0}10%{opacity:1}60%{transform:translate(19vw,-9vh) rotate(-31deg) scale(.94);opacity:1}100%{transform:translate(0,0) rotate(-27deg) scale(1);opacity:1}}
  .loading-text{font-family:var(--font-hand);font-weight:600;font-size:clamp(1.15rem,3vw,1.5rem);color:var(--rose-deep);min-height:1.7em;max-width:340px}
  .tw-cursor{animation:blinkCursor 1s step-start infinite}
  @keyframes blinkCursor{50%{opacity:0}}
  @keyframes pulseHeartSlow{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  @keyframes shakeX{10%,90%{transform:translateX(-4px)}20%,80%{transform:translateX(6px)}30%,50%,70%{transform:translateX(-9px)}40%,60%{transform:translateX(9px)}}

  ${REDESIGNED_PASSCODE_CSS}

  /* Flower reveal */
  .flower-overlay{position:fixed;inset:0;z-index:9999;background-color:var(--cream);overflow:hidden;contain:layout style;transition:background-color 2000ms ease .3s}
  .flower-overlay.revealing{background-color:transparent;pointer-events:none}
  .flower-ambient-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(232,135,159,.28),rgba(232,135,159,0) 62%);animation:ambientGlowPulse 4.4s ease-in-out infinite}
  @keyframes ambientGlowPulse{0%,100%{opacity:.55}50%{opacity:1}}
  .flower-sparkles{position:absolute;inset:0;pointer-events:none}
  .sparkle{position:absolute;border-radius:50%;background:radial-gradient(circle,#fff8ec 0%,rgba(255,248,236,0) 72%);animation-name:twinkle;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
  @keyframes twinkle{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}}
  .flower-wrap{position:absolute;top:50%;left:50%;width:0;height:0;will-change:transform,opacity}
  .flower-self{position:absolute;left:0;top:0;transform:translate(-50%,-50%);animation-name:selfSpin;animation-timing-function:linear;animation-iteration-count:infinite;filter:drop-shadow(0 3px 10px rgba(194,24,91,.4))}
  @keyframes selfSpin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
  .flower-whisper{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:3;font-family:var(--font-script);font-weight:700;font-size:clamp(2rem,7vw,3.4rem);color:var(--rose-deep);text-shadow:0 6px 24px rgba(255,255,255,.75);opacity:0;transform:scale(.94);transition:opacity 1200ms ease, transform 1600ms cubic-bezier(.16,1,.3,1)}
  .flower-whisper.in{opacity:1;transform:scale(1)}

  /* Sections */
  .main-app{position:relative}
  .section{min-height:100vh;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 22px;opacity:0;transform:translateY(46px);transition:opacity 1.1s ease, transform 1.1s ease;overflow:hidden}
  .section.in-view{opacity:1;transform:translateY(0)}
  .section-hero{background:var(--maroon-900)}
  .polaroid-rows{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:16px;background:var(--maroon-900);filter:saturate(.88);-webkit-mask-image:linear-gradient(90deg,transparent 0,black 10%,black 90%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,black 10%,black 90%,transparent 100%)}
  .polaroid-row{width:100%;overflow:hidden}
  .polaroid-row-track{display:flex;align-items:center;gap:22px;width:max-content;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}
  .polaroid-row.dir-left .polaroid-row-track{animation-name:marqueeLeft}
  .polaroid-row.dir-right .polaroid-row-track{animation-name:marqueeRight}
  @keyframes marqueeLeft{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  @keyframes marqueeRight{from{transform:translateX(-50%)}to{transform:translateX(0)}}
  .polaroid{flex:0 0 auto;background:#f3e9dc;padding:8px 8px 24px;width:132px;border-radius:3px;box-shadow:0 10px 22px rgba(0,0,0,.4)}
  .polaroid img{width:100%;height:132px;object-fit:cover;border-radius:2px}
  .hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(32,0,0,.42),rgba(32,0,0,.58) 55%,rgba(32,0,0,.84))}
  .hero-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 38%,rgba(32,0,0,.75) 100%)}
  .hero-glow{position:absolute;top:50%;left:50%;width:480px;height:480px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(232,194,122,.26),rgba(232,194,122,0) 70%);filter:blur(10px);animation:glowPulse 5.5s ease-in-out infinite;z-index:1;pointer-events:none}
  .hero-text{position:relative;z-index:2;font-family:var(--font-script);font-weight:700;color:var(--cream-text);text-align:center;font-size:clamp(2rem,6.4vw,3.7rem);line-height:1.25;text-shadow:0 4px 34px rgba(0,0,0,.6);padding:0 16px;max-width:900px;min-height:1.4em}
  .scroll-cue{position:absolute;left:0;right:0;bottom:34px;display:flex;flex-direction:column;align-items:center;gap:7px;z-index:3;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity 1200ms ease, transform 1200ms ease}
  .scroll-cue.show{opacity:1;transform:translateY(0)}
  .scroll-cue-text{font-family:var(--font-serif);font-style:italic;font-size:1rem;color:rgba(253,243,234,.7)}
  .scroll-cue svg{width:20px;height:20px;color:var(--gold);animation:scrollBounce 2s ease-in-out infinite}
  @keyframes scrollBounce{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(8px);opacity:1}}

  /* Letter */
  .section-letter{background:radial-gradient(circle at 50% 25%,var(--maroon-700),var(--maroon-900) 78%)}
  .letter-eyebrow{font-family:var(--font-serif);font-style:italic;font-size:1.15rem;color:rgba(255,235,220,.6);margin-bottom:26px;position:relative;z-index:2}
  .envelope-stack{display:flex;flex-direction:column;align-items:center;gap:20px;position:relative;z-index:2;transition:opacity 700ms ease, transform 700ms ease}
  .envelope-stack.gone{opacity:0;transform:scale(.94);pointer-events:none;position:absolute}
  .envelope{position:relative;width:272px;height:180px;cursor:pointer;perspective:1000px;transition:transform .3s ease}
  .envelope-body{position:absolute;inset:0;border-radius:6px;background:linear-gradient(155deg,#f6ead9,#e0c9a8);box-shadow:0 24px 46px rgba(0,0,0,.45)}
  .envelope-pocket{position:absolute;left:0;right:0;bottom:0;height:62%;border-radius:0 0 6px 6px;background:linear-gradient(180deg,#eeddc4,#e0c9a8);clip-path:polygon(0 42%,50% 0,100% 42%,100% 100%,0 100%);z-index:3}
  .envelope-flap{position:absolute;top:0;left:0;right:0;height:0;border-left:136px solid transparent;border-right:136px solid transparent;border-top:100px solid #d8bd97;transform-origin:top center;transition:transform 1200ms cubic-bezier(.4,0,.2,1);z-index:4}
  .envelope.open .envelope-flap{transform:rotateX(180deg);z-index:1}
  .envelope-seal{position:absolute;top:58%;left:50%;transform:translate(-50%,-50%);width:42px;height:42px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d8306a,var(--rose-deep));display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 8px 16px rgba(0,0,0,.4);z-index:5;transition:opacity .5s ease, transform .5s ease}
  .envelope.open .envelope-seal{opacity:0;transform:translate(-50%,-50%) scale(1.4)}
  .envelope-note{position:absolute;left:14px;right:14px;top:16px;height:58%;border-radius:3px;background:#fffaf1;z-index:2;transform:translateY(0);transition:transform 900ms cubic-bezier(.4,0,.2,1) 500ms}
  .envelope.open .envelope-note{transform:translateY(-28px)}
  .envelope-hint{font-family:var(--font-hand);font-size:1.2rem;color:#e9cdbf}
  .letter-card{max-width:720px;width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);border-radius:28px;padding:56px 46px;text-align:center;box-shadow:0 32px 64px rgba(0,0,0,.4);position:relative;z-index:2;opacity:0;transform:translateY(22px) scale(.98);transition:opacity 1200ms ease, transform 1200ms cubic-bezier(.16,1,.3,1)}
  .letter-card.show{opacity:1;transform:translateY(0) scale(1)}
  .letter-title{font-family:var(--font-script);font-weight:700;font-size:clamp(1.8rem,4vw,2.4rem);color:var(--gold);margin-bottom:10px}
  .letter-flourish{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 26px;opacity:.85}
  .fl-line{width:44px;height:1px;background:linear-gradient(90deg,transparent,var(--gold))}
  .fl-line.right{background:linear-gradient(90deg,var(--gold),transparent)}
  .letter-body{font-family:var(--font-hand);font-weight:500;font-size:clamp(1.25rem,2.6vw,1.55rem);line-height:1.85;color:var(--cream-text);white-space:pre-wrap;text-align:left}

  /* Songs */
  .section-songs{background:linear-gradient(180deg,var(--maroon-700),var(--maroon-900))}
  .songs-head{text-align:center;margin-bottom:44px}
  .songs-head h2{font-family:var(--font-script);font-weight:700;font-size:clamp(2rem,5vw,3rem);margin:0;color:var(--cream-text)}
  .songs-sub{font-family:var(--font-serif);font-style:italic;font-size:1.15rem;color:#e0bfae;margin-top:6px}
  .songs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px;max-width:1020px;width:100%}
  .song-slot{opacity:0;transform:translateY(26px);transition:opacity 900ms ease, transform 900ms cubic-bezier(.16,1,.3,1)}
  .in-view .song-slot.rise{opacity:1;transform:translateY(0)}
  .song-card{background:linear-gradient(155deg,rgba(255,255,255,.075),rgba(0,0,0,.22));border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:18px 18px 16px}
  .song-card-embed{padding:0;overflow:hidden;background:rgba(0,0,0,.18)}
  .song-top{display:flex;gap:14px;align-items:flex-start}
  .album-art{width:64px;height:64px;border-radius:12px;flex-shrink:0}
  .song-meta{flex:1;min-width:0}
  .song-title{display:flex;align-items:center;gap:6px;font-weight:600;color:#fff;font-size:1rem}
  .explicit-tag{font-size:.6rem;background:rgba(255,255,255,.2);padding:1px 5px;border-radius:3px}
  .song-artist{font-family:var(--font-serif);font-style:italic;color:rgba(255,255,255,.62);font-size:.95rem;margin:2px 0 10px}
  .song-bottom{display:flex;align-items:center;gap:10px;margin-top:16px}
  .progress{flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden}
  .progress-fill{height:100%;background:linear-gradient(90deg,var(--rose-soft),var(--gold))}
  .duration{font-family:var(--font-serif);font-size:.8rem;color:rgba(255,255,255,.55)}
  .play-btn{width:32px;height:32px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:var(--maroon-900);text-decoration:none}

  /* Final */
  .section-final{position:relative;overflow:hidden;background-color:var(--maroon-800)}
  .final-backdrop{position:absolute;inset:0}
  .final-backdrop-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(1px) saturate(.85) brightness(.66);opacity:0;transform:scale(1.08);transition:opacity 2.4s ease, transform 11s ease, filter 2.4s ease}
  .final-backdrop-img.active{opacity:1;transform:scale(1.2);filter:blur(0) saturate(.95) brightness(.72)}
  .final-backdrop-overlay{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(56,9,9,.18),rgba(32,0,0,.64) 78%),linear-gradient(180deg,rgba(32,0,0,.36),rgba(32,0,0,.7))}
  .final-glow{position:absolute;top:50%;left:50%;width:380px;height:380px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(232,135,159,.38),rgba(232,135,159,0) 70%);filter:blur(6px);animation:glowPulse 4.6s ease-in-out infinite;z-index:0;pointer-events:none}
  @keyframes glowPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.65}50%{transform:translate(-50%,-50%) scale(1.18);opacity:1}}
  .final-eyebrow{position:relative;z-index:1;font-family:var(--font-serif);font-style:italic;font-size:1.15rem;color:rgba(255,255,255,.66);margin-bottom:16px}
  .final-text{position:relative;z-index:1;font-family:var(--font-script);font-weight:700;color:var(--cream-text);text-align:center;font-size:clamp(1.9rem,6vw,3.3rem);padding:0 20px}
  .relive-btn{position:relative;z-index:1;margin-top:24px;background:rgba(255,247,241,.1);border:1px solid rgba(232,194,122,.55);color:var(--cream-text);padding:13px 30px;border-radius:999px;font-family:var(--font-serif);font-size:1rem}
  .hearts-rise{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}
  .rise-heart{position:absolute;bottom:-8%;opacity:0;animation-name:heartRiseUp;animation-timing-function:cubic-bezier(.2,.6,.4,1);animation-fill-mode:forwards}
  @keyframes heartRiseUp{0%{transform:translateY(0) translateX(0) rotate(0deg) scale(.6);opacity:0}12%{opacity:1}85%{opacity:.9}100%{transform:translateY(-118%) translateX(var(--riseDrift)) rotate(22deg) scale(1);opacity:0}}
  .floating-hearts{position:fixed;inset:0;z-index:5;overflow:hidden;pointer-events:none}
  .floating-heart{position:absolute;top:-8%;opacity:0;animation-name:heartFall;animation-timing-function:linear;animation-iteration-count:infinite}
  @keyframes heartFall{0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:0}8%{opacity:1}50%{transform:translateY(56vh) translateX(var(--drift)) rotate(180deg)}92%{opacity:1}100%{transform:translateY(112vh) translateX(0) rotate(360deg);opacity:0}}
  .site-footer{background:var(--maroon-900);padding:44px 20px 56px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .brand-mark{display:flex;align-items:center;gap:16px;max-width:420px;width:100%}
  .brand-mark-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(232,194,122,.4))}
  .brand-mark-line:last-child{background:linear-gradient(90deg,rgba(232,194,122,.4),transparent)}
  .brand-mark-inner{display:inline-flex;align-items:center;gap:9px;padding:9px 20px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(232,194,122,.32)}
  .brand-mark-text{font-family:var(--font-script);font-weight:600;font-size:1.1rem;color:var(--gold)}
  .made-with{display:block;margin:24px auto 0;text-align:center;font-family:var(--font-serif);font-style:italic;font-size:.95rem;color:rgba(253,243,234,.55);text-decoration:none}
</style>
</head>
<body>
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"><\/script>
<script type="text/babel" data-presets="react">
const PROJECT_SLUG = ${safeJsonForScript(slug)};
const ORDER_PAGE_URL = ${safeJsonForScript(orderPageUrl)};
/* DEFAULT_CONFIG:START */
const DEFAULT_CONFIG = ${safeJsonForScript(snapshot)};
/* DEFAULT_CONFIG:END */

function urlOf(item){ return !item ? null : (typeof item === "string" ? item : item.url || null); }
function HeartIcon(){return(<svg viewBox="0 0 32 28" fill="none"><path d="M16 27C10 22.5 2 16 2 9.2 2 4.4 5.7 1 10.1 1c2.6 0 5 1.3 6 3.4C17.1 2.3 19.5 1 22.1 1 26.5 1 30 4.4 30 9.2 30 16 22 22.5 16 27z" fill="#c2185b"/></svg>);}
function MiniHeart(){return(<svg viewBox="0 0 32 28" fill="currentColor" style={{width:12,height:12}}><path d="M16 27C10 22.5 2 16 2 9.2 2 4.4 5.7 1 10.1 1c2.6 0 5 1.3 6 3.4C17.1 2.3 19.5 1 22.1 1 26.5 1 30 4.4 30 9.2 30 16 22 22.5 16 27z" /></svg>);}
function BackspaceIcon(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6.5-7L9 5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 10l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function CupidArrow(){return(<svg className="cupid-arrow" viewBox="0 0 140 36" width="140" height="36"><line x1="6" y1="18" x2="118" y2="18" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" /><path d="M118 18 L102 9 M118 18 L102 27" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" fill="none" /><path d="M6 18 L17 12 M6 18 L17 24 M6 18 L15 18" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /></svg>);}

function Typewriter({ text, speed = 35, delay = 0 }) {
  const [display, setDisplay] = React.useState("");
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    let interval, idx = 0; setDisplay(""); setDone(false);
    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        idx++; setDisplay(text.slice(0, idx));
        if (idx >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
    }, delay);
    return () => { clearTimeout(startTimeout); clearInterval(interval); };
  }, [text, speed, delay]);
  return (<React.Fragment>{display}{!done && <span className="tw-cursor">|</span>}</React.Fragment>);
}

const LOADING_MESSAGES = ["Hold on, I'm preparing your gift…","I love you so much…","Kisses, baby — be excited…","Almost there, my love…","This one's just for you…"];
function LoadingGate({ onDone }) {
  const [phase, setPhase] = React.useState("waiting");
  const [msgIndex, setMsgIndex] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setPhase("arrow"), 3000); return () => clearTimeout(t); }, []);
  React.useEffect(() => {
    if (phase === "waiting") { const t = setTimeout(() => setMsgIndex((i) => (i+1) % LOADING_MESSAGES.length), 2400); return () => clearTimeout(t); }
    if (phase === "arrow") { const t = setTimeout(() => setPhase("impact"), 1350); return () => clearTimeout(t); }
    if (phase === "impact") { const t = setTimeout(() => setPhase("opening"), 380); return () => clearTimeout(t); }
    if (phase === "opening") { const t = setTimeout(onDone, 1900); return () => clearTimeout(t); }
  }, [phase]);
  return (
    <div className={\`loading-gate \${phase === "opening" ? "heart-open" : ""}\`}>
      <div className={\`loading-heart-wrap \${phase === "impact" ? "impact" : ""}\`}>
        <div className="heart-half heart-half-left"><HeartIcon /></div>
        <div className="heart-half heart-half-right"><HeartIcon /></div>
        <div className="heart-burst" />
        {(phase === "arrow" || phase === "impact") && <div className="loading-arrow-layer"><CupidArrow /></div>}
      </div>
      {phase === "waiting" && <div className="loading-text"><Typewriter key={msgIndex} text={LOADING_MESSAGES[msgIndex]} speed={40} /></div>}
    </div>
  );
}

function LoginScreen({ correctPin, onCorrect, fading }) {
  const maxLen = (correctPin || "140226").length || 6;
  const [digits, setDigits] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  React.useEffect(() => {
    if (success || digits.length < maxLen) return;
    const t = setTimeout(() => {
      if (digits === correctPin) { setSuccess(true); setTimeout(onCorrect, 620); }
      else { setShake(true); setTimeout(() => { setShake(false); setDigits(""); }, 550); }
    }, 240);
    return () => clearTimeout(t);
  }, [digits]);
  const press = (d) => !success && setDigits((p) => (p.length < maxLen ? p + d : p));
  return (
    <div className={\`login-screen \${fading ? "fading-out" : ""}\`}>
      <div className="login-whisper">{success ? "There you are." : "Only you know this one."}</div>
      <div className={\`login-heart \${shake ? "shake" : ""} \${success ? "success" : ""}\`}><HeartIcon /></div>
      <div className={\`pin-dots \${shake ? "shake" : ""}\`}>
        {Array.from({ length: maxLen }).map((_, i) => <span key={i} className={\`dot \${i < digits.length ? "filled" : ""} \${success ? "success" : ""}\`} />)}
      </div>
      <div className="keypad">
        {[1,2,3,4,5,6,7,8,9].map((n) => <button key={n} type="button" className="key" onClick={() => press(String(n))}>{n}</button>)}
        <button type="button" className="key key-alt" onClick={() => !success && setDigits("")}>C</button>
        <button type="button" className="key" onClick={() => press("0")}>0</button>
        <button type="button" className="key key-alt" onClick={() => !success && setDigits((p) => p.slice(0, -1))} aria-label="Backspace"><BackspaceIcon /></button>
      </div>
    </div>
  );
}

const FLOWER_PALETTES = [{ petal: "#eb9bb0", center: "#fbdfe8", rose: true },{ petal: "#a33a5b", center: "#3a0d1f", rose: false },{ petal: "#f0c988", center: "#f0c988", rose: true }];
function FlowerGraphic({ palette }) {
  const petals = palette.rose ? 10 : 6;
  return (<svg viewBox="0 0 100 100" width="100%" height="100%">{Array.from({ length: petals }).map((_, i) => (<ellipse key={i} cx="50" cy="26" rx={palette.rose ? 12 : 15} ry={palette.rose ? 20 : 23} fill={palette.petal} opacity={0.9} transform={\`rotate(\${i * (360 / petals)} 50 50)\`} />))}<circle cx="50" cy="50" r={8} fill={palette.center} /></svg>);
}
function FlowerReveal({ onDone, images, whisper }) {
  const flowerImages = images || [];
  const flowers = React.useMemo(() => {
    const w = window.innerWidth, h = window.innerHeight, cols = w < 600 ? 6 : 9, rows = w < 600 ? 9 : 6, cellW = w / cols, cellH = h / rows, arr = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const px = (c + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.35, py = (r + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.35;
      const dx = px - w / 2, dy = py - h / 2, dist = Math.sqrt(dx * dx + dy * dy);
      arr.push({ id: arr.length, dx, dy, dist, size: Math.max(cellW, cellH) * (1.55 + Math.random() * 0.65), palette: FLOWER_PALETTES[arr.length % FLOWER_PALETTES.length], image: urlOf(flowerImages.length ? flowerImages[arr.length % flowerImages.length] : null), spinDur: 14 + Math.random() * 10, spinDir: Math.random() < 0.5 ? "normal" : "reverse" });
    }
    arr.sort((a, b) => a.dist - b.dist);
    arr.forEach((f, idx) => {
      f.packDelay = idx * 56 + Math.random() * 60; f.packDuration = 620 + Math.random() * 380;
      const side = f.dx >= 0 ? 1 : -1;
      f.exitDx = f.dx + side * (w * 0.85 + Math.abs(f.dx) * 0.15); f.exitDy = f.dy + (Math.random() - 0.5) * 160;
      f.exitRotate = side * (30 + Math.random() * 70); f.exitDelay = Math.random() * 500; f.exitDuration = 1700 + Math.random() * 700;
    });
    return arr;
  }, []);
  const [phase, setPhase] = React.useState("start");
  const [whisperIn, setWhisperIn] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setPhase("packed"), 60); return () => clearTimeout(t); }, []);
  React.useEffect(() => {
    if (phase !== "packed") return;
    const maxPackEnd = flowers.reduce((m, f) => Math.max(m, f.packDelay + f.packDuration), 0);
    const wTimer = setTimeout(() => setWhisperIn(true), Math.max(0, maxPackEnd - 500));
    const pTimer = setTimeout(() => { setWhisperIn(false); setPhase("parting"); }, maxPackEnd + 1700);
    return () => { clearTimeout(wTimer); clearTimeout(pTimer); };
  }, [phase]);
  React.useEffect(() => {
    if (phase !== "parting") return;
    const maxExitEnd = flowers.reduce((m, f) => Math.max(m, f.exitDelay + f.exitDuration), 0);
    const t = setTimeout(onDone, maxExitEnd + 150);
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <div className={\`flower-overlay \${phase === "parting" ? "revealing" : ""}\`}>
      <div className="flower-ambient-glow" />
      {flowers.map((f) => (
        <div key={f.id} className="flower-wrap" style={phase === "start" ? {transform:"scale(0)",opacity:0} : phase === "packed" ? {transform:\`translate(\${f.dx}px,\${f.dy}px) scale(1)\`,opacity:1,transition:\`transform \${f.packDuration}ms cubic-bezier(.16,1,.3,1) \${f.packDelay}ms, opacity 480ms ease \${f.packDelay}ms\`} : {transform:\`translate(\${f.exitDx}px,\${f.exitDy}px) rotate(\${f.exitRotate}deg) scale(.82)\`,opacity:1,transition:\`transform \${f.exitDuration}ms cubic-bezier(.4,0,.3,1) \${f.exitDelay}ms\`}}>
          <div className="flower-self" style={{width:f.size,height:f.size,animationDuration:f.spinDur+"s",animationDirection:f.spinDir}}>
            {f.image ? <img src={f.image} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} /> : <FlowerGraphic palette={f.palette} />}
          </div>
        </div>
      ))}
      {whisper && <div className={\`flower-whisper \${whisperIn ? "in" : ""}\`}>{whisper}</div>}
    </div>
  );
}

function getSpotifyTrackId(url) { if (!url) return null; const m = url.match(/track[/:]([a-zA-Z0-9]+)/); return m ? m[1] : null; }
function MainApp({ config, flowersCleared }) {
  const [openEnv, setOpenEnv] = React.useState(false);
  const [showCard, setShowCard] = React.useState(false);
  const list = (config.photos && config.photos.length) ? config.photos : [{url:""}];
  const rows = [0,1,2,3];
  return (
    <div className="main-app">
      <section className="section section-hero in-view">
        <div className="polaroid-rows">
          {rows.map((r) => (
            <div key={r} className={\`polaroid-row dir-\${r % 2 === 0 ? "right" : "left"}\`}>
              <div className="polaroid-row-track" style={{animationDuration:(52 + (r%3)*9)+"s"}}>
                {[...list,...list,...list,...list].map((p, i) => (
                  <div key={i} className="polaroid" style={{transform:\`rotate(\${((r*7+i*13)%9)-4}deg)\`}}>
                    {p.url && <img src={p.url} alt={p.caption || ""} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="hero-overlay" /><div className="hero-vignette" /><div className="hero-glow" />
        <h1 className="hero-text">{flowersCleared ? <Typewriter text={config.intro_message} speed={58} /> : "|"}</h1>
      </section>
      <section className="section section-letter in-view">
        <div className="letter-eyebrow">I wrote this down so I'd get it right</div>
        <div className={\`envelope-stack \${showCard ? "gone" : ""}\`}>
          <div className={\`envelope \${openEnv ? "open" : ""}\`} onClick={() => { if (!openEnv) { setOpenEnv(true); setTimeout(() => setShowCard(true), 1150); } }}>
            <div className="envelope-body" /><div className="envelope-note" /><div className="envelope-pocket" /><div className="envelope-flap" />
            <div className="envelope-seal"><MiniHeart /></div>
          </div>
          <div className="envelope-hint">{openEnv ? "…" : "Tap to break the seal"}</div>
        </div>
        <div className={\`letter-card \${showCard ? "show" : ""}\`}>
          {showCard && <React.Fragment>
            <div className="letter-title"><Typewriter text={config.letter_title} speed={48} /></div>
            <div className="letter-flourish"><span className="fl-line"/><MiniHeart/><span className="fl-line right"/></div>
            <p className="letter-body"><Typewriter text={config.letter_body} speed={16} delay={config.letter_title.length * 48 + 500} /></p>
          </React.Fragment>}
        </div>
      </section>
      <section className="section section-songs in-view">
        <div className="songs-head"><h2>Our Top Songs</h2><div className="songs-sub">the soundtrack of us</div></div>
        <div className="songs-grid">
          {(config.songs || []).map((s, i) => {
            const trackId = getSpotifyTrackId(s.spotify_url);
            return (
              <div key={i} className="song-slot rise" style={{transitionDelay:(i*110)+"ms"}}>
                {trackId ? (
                  <div className="song-card song-card-embed">
                    <iframe src={\`https://open.spotify.com/embed/track/\${trackId}?utm_source=generator&theme=0\`} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title={s.title} />
                  </div>
                ) : (
                  <div className="song-card">
                    <div className="song-top">
                      <div className="album-art" style={{background:"linear-gradient(135deg,#5c2323,#8a3d3d)"}} />
                      <div className="song-meta">
                        <div className="song-title">{s.title} {s.explicit && <span className="explicit-tag">E</span>}</div>
                        <div className="song-artist">{s.artist}</div>
                      </div>
                    </div>
                    <div className="song-bottom">
                      <div className="progress"><div className="progress-fill" style={{width:"55%"}} /></div>
                      <span className="duration">{s.duration || ""}</span>
                      <a className="play-btn" href={\`https://open.spotify.com/search/\${encodeURIComponent(s.title+" "+s.artist)}\`} target="_blank" rel="noreferrer">&#9654;</a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="section section-final in-view">
        <div className="final-backdrop">{config.photos?.[0]?.url && <img className="final-backdrop-img active" src={config.photos[0].url} alt="" />}</div>
        <div className="final-backdrop-overlay" /><div className="final-glow" />
        <div className="final-eyebrow">forever yours</div>
        <h1 className="final-text">{config.final_message}</h1>
        <button type="button" className="relive-btn" onClick={() => window.location.reload()}>Relive this moment</button>
      </section>
      <footer className="site-footer">
        <div className="brand-mark"><span className="brand-mark-line"/><span className="brand-mark-inner"><MiniHeart/><span className="brand-mark-text">Chasing Her</span></span><span className="brand-mark-line"/></div>
        {ORDER_PAGE_URL && <a className="made-with" href={ORDER_PAGE_URL} target="_blank" rel="noreferrer">Made with Chasing Her</a>}
      </footer>
    </div>
  );
}

function App() {
  const [stage, setStage] = React.useState("loading");
  return (
    <React.Fragment>
      {stage === "loading" && <LoadingGate onDone={() => setStage("login")} />}
      {(stage === "login" || stage === "unlocking") && <LoginScreen correctPin={DEFAULT_CONFIG.pin} fading={stage === "unlocking"} onCorrect={() => { setStage("unlocking"); setTimeout(() => setStage("flowers"), 700); }} />}
      {(stage === "flowers" || stage === "main") && <MainApp config={DEFAULT_CONFIG} flowersCleared={stage === "main"} />}
      {stage === "flowers" && <FlowerReveal images={DEFAULT_CONFIG.flower_images} whisper="For you" onDone={() => setStage("main")} />}
    </React.Fragment>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
<\/script>
${buildChasingHerMusicInjection(slug, snapshot)}
</body>
</html>`;
}

export function buildMemoriesStandaloneHtml(
  slug: string,
  project: MemoriesProjectData,
  orderPageUrl = ''
): string {
  const snapshot: MemoriesProjectData = {
    slug,
    pin: project.pin || '250824',
    hero_title: project.hero_title || 'For You',
    hero_subtitle: project.hero_subtitle || 'I made something for you... tap to begin.',
    collage_names: project.collage_names || '',
    collage_day: project.collage_day || '',
    collage_month: project.collage_month || '',
    collage_year: project.collage_year || '',
    collage_quote:
      project.collage_quote || 'Every love story is beautiful, but ours is my favorite.',
    mosaic_images: project.mosaic_images || [],
    letter_title: project.letter_title || 'My Dearest,',
    letter_body: project.letter_body || '',
    final_message: project.final_message || 'Forever yours',
    memories: project.memories || [],
    flower_images: project.flower_images || [],
    music_url: project.music_url || '',
    music_start: project.music_start || 0,
    music_end: project.music_end ?? null,
    voice_url: project.voice_url || '',
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<meta name="theme-color" content="#380000" />
<title>${snapshot.hero_title || 'Memories'} — ${slug}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Caveat:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<style>
:root{
  --cream:#fdf1e7; --cream-deep:#f7ddc9;
  --rose:#c2185b; --rose-deep:#96123f;
  --maroon-900:#200000; --maroon-800:#380000; --maroon-700:#4a0909;
  --gold:#e8c27a; --cream-text:#fdf3ea;
  --font-script:'Dancing Script',cursive; --font-hand:'Caveat',cursive;
  --font-serif:'Cormorant Garamond',serif; --font-ui:'Poppins',sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html,body{height:100%;margin:0;padding:0}
body{font-family:var(--font-ui);background:var(--maroon-800);color:var(--cream-text);overflow-x:hidden}
button{font-family:inherit;cursor:pointer}

.loading-gate{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:38px;padding:40px 20px;text-align:center;background:radial-gradient(circle at 50% 15%,#fffaf5 0%,var(--cream) 55%,var(--cream-deep) 100%)}
.loading-heart-wrap{position:relative;width:104px;height:90px;perspective:700px;animation:pulseHeartSlow 2.6s ease-in-out infinite}
.loading-heart-wrap.impact{animation:none;transform:scale(1.28);transition:transform .38s cubic-bezier(.34,1.56,.64,1)}
.heart-half{position:absolute;inset:0;transform-style:preserve-3d;transition:transform 2000ms cubic-bezier(.16,1,.3,1), opacity 1200ms ease 400ms}
.heart-half-left{clip-path:inset(0 50% 0 0);transform-origin:right center}
.heart-half-right{clip-path:inset(0 0 0 50%);transform-origin:left center}
.heart-open .heart-half-left{transform:rotateY(-120deg) translateX(-8px);opacity:0}
.heart-open .heart-half-right{transform:rotateY(120deg) translateX(8px);opacity:0}
.loading-arrow-layer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.cupid-arrow{animation:arrowFly 1350ms cubic-bezier(.22,1,.36,1) forwards}
@keyframes arrowFly{0%{transform:translate(80vw,-52vh) rotate(-40deg) scale(.7);opacity:0}10%{opacity:1}60%{transform:translate(19vw,-9vh) rotate(-31deg) scale(.94);opacity:1}100%{transform:translate(0,0) rotate(-27deg) scale(1);opacity:1}}
.loading-text{font-family:var(--font-hand);font-weight:600;font-size:clamp(1.1rem,3vw,1.45rem);color:var(--rose-deep)}
@keyframes pulseHeartSlow{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes shakeX{10%,90%{transform:translateX(-4px)}20%,80%{transform:translateX(6px)}30%,50%,70%{transform:translateX(-9px)}40%,60%{transform:translateX(9px)}}

${REDESIGNED_PASSCODE_CSS}

.intro-screen{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;background:radial-gradient(circle at 50% 40%,var(--maroon-700),var(--maroon-900) 80%);text-align:center;padding:20px}
.intro-title{font-family:var(--font-script);font-weight:700;font-size:clamp(1.9rem,6vw,3rem);color:var(--cream-text)}
.intro-play{position:relative;width:126px;height:114px;background:none;border:none;display:flex;align-items:center;justify-content:center;color:#fff}
.intro-play svg{width:100%;height:100%;animation:pulseHeartSlow 2.8s ease-in-out infinite}
.intro-sub{font-family:var(--font-hand);font-weight:600;font-size:1.25rem;color:#e9cdbf;max-width:380px}

.collage-screen{position:fixed;inset:0;z-index:15;background:radial-gradient(circle at 50% 42%,var(--maroon-700),var(--maroon-900) 78%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:26px 16px;overflow:hidden;transition:opacity 900ms ease}
.collage-screen.leaving{opacity:0}
.collage-title{font-family:var(--font-script);font-weight:700;color:var(--cream-text);font-size:clamp(1.7rem,5vw,2.5rem);opacity:0;transform:translateY(-12px);transition:opacity 1200ms ease, transform 1200ms ease}
.collage-title.in{opacity:1;transform:translateY(0)}
.collage-stage{position:relative;display:flex;align-items:center;justify-content:center}
.collage-glow{position:absolute;left:50%;top:50%;width:150%;height:150%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(232,135,159,.34),rgba(232,135,159,0) 62%);opacity:0;transition:opacity 1200ms ease}
.collage-glow.on{opacity:1}
.collage-glow.beating{animation:glowBeat 3200ms cubic-bezier(.4,0,.3,1) forwards}
@keyframes glowBeat{0%{opacity:.5;transform:translate(-50%,-50%) scale(1)}15%{opacity:.85;transform:translate(-50%,-50%) scale(1.08)}45%{opacity:.95;transform:translate(-50%,-50%) scale(1.14)}78%{opacity:1;transform:translate(-50%,-50%) scale(1.26)}100%{opacity:.9;transform:translate(-50%,-50%) scale(1.1)}}
.collage-heart{position:relative;transform-origin:50% 52%}
.collage-heart.beating{animation:heartTriple 3200ms cubic-bezier(.4,0,.3,1) forwards}
@keyframes heartTriple{0%{transform:scale(1)}15%{transform:scale(1.05)}45%{transform:scale(1.08)}78%{transform:scale(1.135)}100%{transform:scale(1.07)}}
.collage-tile{position:absolute;border-radius:4px;overflow:hidden;background:#3a1414;box-shadow:0 10px 22px rgba(0,0,0,.5);border:3px solid #fdf1e7;opacity:0}
.collage-tile img{width:100%;height:100%;object-fit:cover}
.shockwave{position:absolute;left:50%;top:52%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:2px solid rgba(255,240,230,.9);opacity:0}
.shockwave.go{animation:shock 1100ms cubic-bezier(.16,1,.3,1) forwards}
@keyframes shock{0%{opacity:.95;transform:scale(.4)}100%{opacity:0;transform:scale(26)}}
.collage-note{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-3deg) scale(.86);background:#fdf8ef;color:#3a2418;padding:16px 22px;border-radius:3px;box-shadow:0 14px 30px rgba(0,0,0,.45);text-align:center;max-width:min(56vw,250px);opacity:0;transition:opacity 1100ms ease, transform 1100ms cubic-bezier(.34,1.2,.6,1);z-index:999}
.collage-note.in{opacity:1;transform:translate(-50%,-50%) rotate(-3deg) scale(1)}
.collage-note.out{opacity:0;transform:translate(-50%,-50%) rotate(-3deg) scale(1.6)}

.flower-overlay{position:fixed;inset:0;z-index:9999;background-color:var(--cream);overflow:hidden;transition:background-color 2000ms ease .3s}
.flower-overlay.revealing{background-color:transparent;pointer-events:none}
.flower-wrap{position:absolute;top:50%;left:50%;width:0;height:0}
.flower-self{position:absolute;left:0;top:0;transform:translate(-50%,-50%);animation:selfSpin 16s linear infinite}
@keyframes selfSpin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}

.memories-screen{min-height:100vh;background:linear-gradient(180deg,var(--maroon-700),var(--maroon-900));display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 18px 96px;position:relative;overflow:hidden}
.memories-head{text-align:center;margin-bottom:28px}
.memories-head h2{font-family:var(--font-script);font-weight:700;font-size:clamp(2rem,5.4vw,3rem);margin:0;color:var(--cream-text)}
.slide-stage{position:relative;width:min(760px,94vw);height:min(74vh,540px);border-radius:20px;overflow:hidden;background:#140505;box-shadow:0 34px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(232,194,122,.28)}
.slide-item{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.slide-item img,.slide-item video{width:100%;height:100%;object-fit:cover}
.slide-item.kb-in img,.slide-item.kb-in video{animation:kenIn ease-out both}
.slide-item.kb-out img,.slide-item.kb-out video{animation:kenOut ease-out both}
@keyframes kenIn{from{transform:scale(1) translate(0,0)}to{transform:scale(1.11) translate(-1.2%,-1%)}}
@keyframes kenOut{from{transform:scale(1.11) translate(1.2%,1%)}to{transform:scale(1) translate(0,0)}}
.slide-caption{position:absolute;left:0;right:0;bottom:0;padding:44px 28px 22px;background:linear-gradient(0deg,rgba(0,0,0,.78),rgba(0,0,0,.25) 55%,transparent);color:#fff}
.fx-fade-enter{animation:fxFade 1200ms ease both}@keyframes fxFade{from{opacity:0}to{opacity:1}}
.fx-slide-left-enter{animation:fxSlideLeft 1100ms cubic-bezier(.16,1,.3,1) both}@keyframes fxSlideLeft{from{opacity:0;transform:translateX(56px)}to{opacity:1;transform:translateX(0)}}
.fx-slide-up-enter{animation:fxSlideUp 1100ms cubic-bezier(.16,1,.3,1) both}@keyframes fxSlideUp{from{opacity:0;transform:translateY(48px)}to{opacity:1;transform:translateY(0)}}
.fx-zoom-in-enter{animation:fxZoomIn 1150ms cubic-bezier(.16,1,.3,1) both}@keyframes fxZoomIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
.fx-zoom-out-enter{animation:fxZoomOut 1150ms cubic-bezier(.16,1,.3,1) both}@keyframes fxZoomOut{from{opacity:0;transform:scale(1.16)}to{opacity:1;transform:scale(1)}}
.fx-blur-focus-enter{animation:fxBlur 1300ms ease both}@keyframes fxBlur{from{opacity:0;filter:blur(18px)}to{opacity:1;filter:blur(0)}}
.fx-polaroid-enter{animation:fxPolaroid 1250ms cubic-bezier(.34,1.05,.64,1) both}@keyframes fxPolaroid{from{opacity:0;transform:translateY(-34px) rotate(-6deg)}to{opacity:1;transform:translateY(0) rotate(0)}}
.fx-circular-enter{animation:fxCircular 1300ms ease both}@keyframes fxCircular{from{opacity:0;clip-path:circle(0% at 50% 50%)}to{opacity:1;clip-path:circle(75% at 50% 50%)}}
.fx-heartbeat-enter{animation:fxHeartbeat 1300ms cubic-bezier(.3,1.1,.5,1) both}@keyframes fxHeartbeat{0%{opacity:0;transform:scale(.9)}45%{opacity:1;transform:scale(1.04)}70%{transform:scale(.99)}100%{opacity:1;transform:scale(1)}}
.slide-nav{display:flex;align-items:center;gap:18px;margin-top:22px}
.slide-arrow{width:44px;height:44px;border-radius:50%;border:1px solid rgba(232,194,122,.45);background:rgba(255,255,255,.06);color:var(--cream-text)}
.letter-screen{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:70px 20px;background:radial-gradient(circle at 50% 22%,var(--maroon-700),var(--maroon-900) 78%);text-align:center}
.envelope{position:relative;width:268px;height:176px;cursor:pointer;perspective:1000px}
.envelope-body{position:absolute;inset:0;background:linear-gradient(155deg,#f3e6d6,#e3cdae);border-radius:6px}
.envelope-flap{position:absolute;top:0;left:0;right:0;height:0;border-left:134px solid transparent;border-right:134px solid transparent;border-top:98px solid #d8bd97;transform-origin:top center;transition:transform 1100ms cubic-bezier(.4,0,.2,1);z-index:2}
.envelope.open .envelope-flap{transform:rotateX(180deg)}
.envelope-seal{position:absolute;top:60%;left:50%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;background:radial-gradient(circle,var(--rose),var(--rose-deep));display:flex;align-items:center;justify-content:center;color:#fff;z-index:3}
.letter-card{max-width:660px;width:100%;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:48px 42px;opacity:0;transform:translateY(22px);transition:opacity 1200ms ease, transform 1200ms ease}
.letter-card.show{opacity:1;transform:translateY(0)}
.letter-title{font-family:var(--font-script);font-weight:700;font-size:clamp(1.8rem,4.4vw,2.3rem);color:var(--gold);margin-bottom:14px}
.letter-body{font-family:var(--font-hand);font-size:clamp(1.2rem,2.5vw,1.45rem);line-height:1.95;color:var(--cream-text);white-space:pre-wrap;text-align:left}
#music-ctrl{position:fixed;right:18px;bottom:18px;z-index:10001;display:flex;align-items:center;gap:8px;background:rgba(32,0,0,.6);backdrop-filter:blur(10px);border:1px solid rgba(232,194,122,.35);border-radius:999px;padding:8px 10px}
</style>
</head>
<body>
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"><\/script>
<script type="text/babel" data-presets="react">
const PROJECT_SLUG = ${safeJsonForScript(slug)};
const ORDER_PAGE_URL = ${safeJsonForScript(orderPageUrl)};
/* DEFAULT_CONFIG:START */
const DEFAULT_CONFIG = ${safeJsonForScript(snapshot)};
/* DEFAULT_CONFIG:END */

function urlOf(item){ return !item ? null : (typeof item === "string" ? item : item.url || null); }
function HeartIcon(){return(<svg viewBox="0 0 32 28" fill="none"><path d="M16 27C10 22.5 2 16 2 9.2 2 4.4 5.7 1 10.1 1c2.6 0 5 1.3 6 3.4C17.1 2.3 19.5 1 22.1 1 26.5 1 30 4.4 30 9.2 30 16 22 22.5 16 27z" fill="#c2185b"/></svg>);}
function BackspaceIcon(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6.5-7L9 5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 10l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function CupidArrow(){return(<svg className="cupid-arrow" viewBox="0 0 140 36" width="140" height="36"><line x1="6" y1="18" x2="118" y2="18" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" /><path d="M118 18 L102 9 M118 18 L102 27" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>);}
function Typewriter({ text, speed = 40, delay = 0 }) {
  const [display, setDisplay] = React.useState("");
  React.useEffect(() => {
    let iv, idx = 0; setDisplay("");
    const st = setTimeout(() => { iv = setInterval(() => { idx++; setDisplay(text.slice(0, idx)); if (idx >= text.length) clearInterval(iv); }, speed); }, delay);
    return () => { clearTimeout(st); clearInterval(iv); };
  }, [text, speed, delay]);
  return <React.Fragment>{display}</React.Fragment>;
}

function insideHeart(x, y){ return Math.pow(x*x+y*y-1,3)-x*x*y*y*y<=0; }
function seededJitter(id){ const s=Math.sin(id*12.9898)*43758.5453; return s-Math.floor(s); }
function heartDepth(x, y){
  let best=0.62;
  for(let k=0;k<16;k++){const a=(2*Math.PI*k)/16,dx=Math.cos(a),dy=Math.sin(a);let d=0.62;for(let s=1;s<=22;s++){const t=(0.62*s)/22;if(!insideHeart(x+dx*t,y+dy*t)){d=t;break;}}if(d<best)best=d;}
  return best;
}
function buildHeartLayout(cols, rows){
  const xscale=2.9,xshift=1.45,yscale=2.497,yshift=1.328,slots=[];let id=0;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const nx=((c+0.5)/cols)*xscale-xshift,ny=yshift-((r+0.5)/rows)*yscale;if(!insideHeart(nx,ny))continue;
    const j1=seededJitter(id*2+1),j2=seededJitter(id*2+2),sh=seededJitter(id*7+3);
    const dep=Math.min(1,heartDepth(nx,ny)/0.46),base=(1/cols)*(1.02+0.7*Math.pow(dep,0.85)+j1*0.14);
    const xPct=(nx+xshift)/xscale,yPct=(yshift-ny)/yscale;
    slots.push({id,xPct,yPct,widthPct:base*(sh>=0.58&&sh<0.8?1.42:1),heightPct:base*(sh>=0.8?1.42:1),rotate:(j2-0.5)*15,dist:Math.sqrt(Math.pow(xPct-0.5,2)+Math.pow((yPct-0.46)*1.1,2))});
    id++;
  }
  slots.slice().sort((a,b)=>a.dist-b.dist).forEach((s,i)=>{s.order=i;});
  return slots;
}
const MOSAIC_LAYOUT = buildHeartLayout(9, 7);

function LoadingGate({ onDone }) {
  const [phase, setPhase] = React.useState("waiting");
  React.useEffect(() => { const t = setTimeout(() => setPhase("arrow"), 1700); return () => clearTimeout(t); }, []);
  React.useEffect(() => {
    if (phase === "arrow") { const t = setTimeout(() => setPhase("impact"), 1350); return () => clearTimeout(t); }
    if (phase === "impact") { const t = setTimeout(() => setPhase("opening"), 380); return () => clearTimeout(t); }
    if (phase === "opening") { const t = setTimeout(onDone, 1450); return () => clearTimeout(t); }
  }, [phase]);
  return (
    <div className={\`loading-gate \${phase === "opening" ? "heart-open" : ""}\`}>
      <div className={\`loading-heart-wrap \${phase === "impact" ? "impact" : ""}\`}>
        <div className="heart-half heart-half-left"><HeartIcon /></div>
        <div className="heart-half heart-half-right"><HeartIcon /></div>
        {(phase === "arrow" || phase === "impact") && <div className="loading-arrow-layer"><CupidArrow /></div>}
      </div>
      {phase === "waiting" && <div className="loading-text"><Typewriter text="Gathering every little memory…" speed={42} /></div>}
    </div>
  );
}

function LoginScreen({ correctPin, onCorrect }) {
  const maxLen = (correctPin || "250824").length || 6;
  const [digits, setDigits] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  React.useEffect(() => {
    if (success || digits.length < maxLen) return;
    const t = setTimeout(() => {
      if (digits === correctPin) { setSuccess(true); setTimeout(onCorrect, 600); }
      else { setShake(true); setTimeout(() => { setShake(false); setDigits(""); }, 550); }
    }, 240);
    return () => clearTimeout(t);
  }, [digits]);
  const press = (d) => !success && setDigits((p) => (p.length < maxLen ? p + d : p));
  return (
    <div className="login-screen">
      <div className="login-whisper">{success ? "Welcome inside." : "Only you know this secret code."}</div>
      <div className={\`login-heart \${shake ? "shake" : ""} \${success ? "success" : ""}\`}><HeartIcon /></div>
      <div className={\`pin-dots \${shake ? "shake" : ""}\`}>{Array.from({ length: maxLen }).map((_, i) => <span key={i} className={\`dot \${i < digits.length ? "filled" : ""} \${success ? "success" : ""}\`} />)}</div>
      <div className="keypad">
        {[1,2,3,4,5,6,7,8,9].map((n) => <button key={n} type="button" className="key" onClick={() => press(String(n))}>{n}</button>)}
        <button type="button" className="key key-alt" onClick={() => setDigits("")}>C</button>
        <button type="button" className="key" onClick={() => press("0")}>0</button>
        <button type="button" className="key key-alt" onClick={() => setDigits((p) => p.slice(0, -1))} aria-label="Backspace"><BackspaceIcon /></button>
      </div>
    </div>
  );
}

function CollageScreen({ images, names, day, month, year, quote, onDone }) {
  const [dims] = React.useState({ d: typeof window !== "undefined" ? Math.min(window.innerWidth*0.9, window.innerHeight*0.6, 560) : 340 });
  const [placed, setPlaced] = React.useState(0);
  const [phase, setPhase] = React.useState("placing");
  React.useEffect(() => {
    let i = 0; const timers = [];
    const iv = setInterval(() => {
      i++; setPlaced(i);
      if (i >= MOSAIC_LAYOUT.length) {
        clearInterval(iv);
        timers.push(setTimeout(() => setPhase("settled"), 700));
        timers.push(setTimeout(() => setPhase("beating"), 2200));
        timers.push(setTimeout(() => setPhase("exploding"), 5340));
        timers.push(setTimeout(onDone, 6400));
      }
    }, 78);
    return () => { clearInterval(iv); timers.forEach(clearTimeout); };
  }, []);
  const list = (images || []).filter(Boolean);
  return (
    <div className="collage-screen">
      {names && <div className="collage-title in">{names}</div>}
      <div className="collage-stage" style={{width:dims.d,height:dims.d}}>
        <div className={\`collage-glow \${phase !== "placing" ? "on" : ""} \${phase === "beating" ? "beating" : ""}\`} />
        <div className={\`shockwave \${phase === "exploding" ? "go" : ""}\`} />
        <div className={\`collage-heart \${phase === "beating" ? "beating" : ""}\`} style={{width:dims.d,height:dims.d}}>
          {MOSAIC_LAYOUT.map((slot) => {
            const w = slot.widthPct * dims.d, h = slot.heightPct * dims.d, img = list.length ? urlOf(list[slot.id % list.length]) : null;
            const style = phase === "exploding" ? {left:slot.xPct*dims.d-w/2,top:slot.yPct*dims.d-h/2,width:w,height:h,opacity:0,transform:\`translate(\${(slot.xPct-0.5)*700}px,\${(slot.yPct-0.5)*700}px) scale(1.2)\`,transition:"all 1100ms ease"} : {left:slot.xPct*dims.d-w/2,top:slot.yPct*dims.d-h/2,width:w,height:h,opacity:slot.order<placed?1:0,transform:\`rotate(\${slot.rotate}deg)\`,transition:"all 800ms ease"};
            return <div key={slot.id} className="collage-tile" style={style}>{img && <img src={img} alt="" />}</div>;
          })}
          {quote && <div className={\`collage-note \${phase === "settled" || phase === "beating" ? "in" : ""} \${phase === "exploding" ? "out" : ""}\`}><div className="collage-note-quote">{quote}</div><div>{[day,month,year].filter(Boolean).join(" ❤ ")}</div></div>}
        </div>
      </div>
    </div>
  );
}

function FlowerBurst({ images, onDone }) {
  const flowerImages = images || [];
  const [phase, setPhase] = React.useState("start");
  const flowers = React.useMemo(() => {
    const w = window.innerWidth, h = window.innerHeight, cols = w < 600 ? 6 : 9, rows = w < 600 ? 9 : 6, cellW = w/cols, cellH = h/rows, arr = [];
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){
      const px=(c+0.5)*cellW, py=(r+0.5)*cellH, dx=px-w/2, dy=py-h/2;
      arr.push({id:arr.length, dx, dy, dist:Math.sqrt(dx*dx+dy*dy), size:Math.max(cellW,cellH)*1.8, image:urlOf(flowerImages.length ? flowerImages[arr.length % flowerImages.length] : null)});
    }
    arr.sort((a,b)=>a.dist-b.dist);
    arr.forEach((f,i)=>{ f.packDelay=i*66; const side=f.dx>=0?1:-1; f.exitDx=f.dx+side*w*0.9; f.exitDy=f.dy; });
    return arr;
  }, []);
  React.useEffect(() => { const t = setTimeout(() => setPhase("packed"), 60); return () => clearTimeout(t); }, []);
  React.useEffect(() => {
    if (phase === "packed") { const t = setTimeout(() => setPhase("parting"), flowers.length*66 + 1600); return () => clearTimeout(t); }
    if (phase === "parting") { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }
  }, [phase]);
  return (
    <div className={\`flower-overlay \${phase === "parting" ? "revealing" : ""}\`}>
      {flowers.map((f) => (
        <div key={f.id} className="flower-wrap" style={phase==="start"?{transform:"scale(0)",opacity:0}:phase==="packed"?{transform:\`translate(\${f.dx}px,\${f.dy}px) scale(1)\`,opacity:1,transition:\`all 780ms ease \${f.packDelay}ms\`}:{transform:\`translate(\${f.exitDx}px,\${f.exitDy}px) scale(.8)\`,opacity:1,transition:"all 1900ms ease"}}>
          <div className="flower-self" style={{width:f.size,height:f.size}}>
            {f.image ? <img src={f.image} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} /> : <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#eb9bb0" /><circle cx="50" cy="50" r="10" fill="#fbdfe8" /></svg>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MemoriesStory({ config }) {
  const [idx, setIdx] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [showCard, setShowCard] = React.useState(false);
  const slides = config.memories && config.memories.length ? config.memories : [];
  const active = slides[idx];
  React.useEffect(() => {
    if (!active || active.type === "video") return;
    const ms = Math.max(1500, (Number(active.duration) || 6.5) * 1000);
    const t = setTimeout(() => setIdx((i) => (i + 1 < slides.length ? i + 1 : i)), ms);
    return () => clearTimeout(t);
  }, [idx, slides.length]);
  return (
    <React.Fragment>
      {slides.length > 0 && (
        <div className="memories-screen">
          <div className="memories-head"><h2>Our Memories Together</h2></div>
          <div className="slide-stage">
            <div key={idx} className={\`slide-item fx-\${active.transition || "fade"}-enter \${idx % 2 === 0 ? "kb-in" : "kb-out"}\`}>
              {active.type === "video" ? <video src={active.url} autoPlay muted={active.muted !== false} playsInline onEnded={() => idx + 1 < slides.length && setIdx(idx + 1)} /> : <img src={active.url} alt={active.caption || ""} />}
              {(active.caption || active.date || active.place) && (
                <div className="slide-caption"><div>{active.caption}</div><small>{[active.date, active.place].filter(Boolean).join(" · ")}</small></div>
              )}
            </div>
          </div>
          <div className="slide-nav">
            <button type="button" className="slide-arrow" onClick={() => setIdx((i) => Math.max(0, i - 1))}>&lsaquo;</button>
            <span>{idx + 1} / {slides.length}</span>
            <button type="button" className="slide-arrow" onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}>&rsaquo;</button>
          </div>
        </div>
      )}
      <div className="letter-screen" id="letter">
        {!showCard && (
          <div className={\`envelope \${open ? "open" : ""}\`} onClick={() => { setOpen(true); setTimeout(() => setShowCard(true), 800); }}>
            <div className="envelope-body" /><div className="envelope-seal">&#10084;</div><div className="envelope-flap" />
          </div>
        )}
        <div className={\`letter-card \${showCard ? "show" : ""}\`}>
          {showCard && <React.Fragment>
            <div className="letter-title">{config.letter_title}</div>
            <div className="letter-body">{config.letter_body}</div>
            <p style={{color:"var(--gold)",fontFamily:"var(--font-script)",fontSize:"1.45rem"}}>{config.final_message}</p>
            {ORDER_PAGE_URL && <a href={ORDER_PAGE_URL} style={{color:"rgba(255,255,255,.55)",fontSize:".9rem"}}>Made with Chasing Her</a>}
          </React.Fragment>}
        </div>
      </div>
    </React.Fragment>
  );
}

function App() {
  const [stage, setStage] = React.useState("preload");
  const audioRef = React.useRef({ voice: null, music: null });
  function beginDuet() {
    if (DEFAULT_CONFIG.voice_url) { const v = new Audio(DEFAULT_CONFIG.voice_url); audioRef.current.voice = v; v.play().catch(()=>{}); }
    if (DEFAULT_CONFIG.music_url) { const m = new Audio(DEFAULT_CONFIG.music_url); m.volume = DEFAULT_CONFIG.voice_url ? 0.24 : 0.62; m.currentTime = DEFAULT_CONFIG.music_start || 0; audioRef.current.music = m; m.play().catch(()=>{}); }
    setStage((DEFAULT_CONFIG.mosaic_images || []).length ? "collage" : "flowers");
  }
  return (
    <React.Fragment>
      {stage === "preload" && <LoadingGate onDone={() => setStage("login")} />}
      {stage === "login" && <LoginScreen correctPin={DEFAULT_CONFIG.pin} onCorrect={() => setStage("intro")} />}
      {stage === "intro" && (
        <div className="intro-screen">
          <div className="intro-title">{DEFAULT_CONFIG.hero_title}</div>
          <button type="button" className="intro-play" onClick={beginDuet} aria-label="Begin">&#10084;</button>
          <div className="intro-sub">{DEFAULT_CONFIG.hero_subtitle}</div>
        </div>
      )}
      {stage === "collage" && <CollageScreen images={DEFAULT_CONFIG.mosaic_images} names={DEFAULT_CONFIG.collage_names} day={DEFAULT_CONFIG.collage_day} month={DEFAULT_CONFIG.collage_month} year={DEFAULT_CONFIG.collage_year} quote={DEFAULT_CONFIG.collage_quote} onDone={() => setStage("flowers")} />}
      {stage === "flowers" && <FlowerBurst images={DEFAULT_CONFIG.flower_images} onDone={() => setStage("memories")} />}
      {stage === "memories" && <MemoriesStory config={DEFAULT_CONFIG} />}
    </React.Fragment>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
<\/script>
</body>
</html>`;
}
