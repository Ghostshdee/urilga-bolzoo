/* Бүх хэв маягийн дууны тохиргоо, харагдац, удирдлага. */
(() => {
  'use strict';
  function readGift() {
    const match = location.hash.match(/[#&]d=([A-Za-z0-9_-]{1,2000})/);
    if (!match) return null;
    try {
      const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(match[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
      const clean = (value, length) => typeof value === 'string' ? value.replace(/[<>"'`&]/g, '').trim().slice(0, length) : '';
      return { to: clean(raw.to, 24), from: clean(raw.from, 24), ask: clean(raw.ask, 120),
        yt: typeof raw.yt === 'string' && /^[\w-]{11}$/.test(raw.yt) ? raw.yt : '',
        t: Number.isInteger(raw.t) && raw.t >= 0 && raw.t <= 36000 ? raw.t : 0,
        dk: raw.dk === 'corner' ? 'corner' : 'inline', vid: raw.vid !== 0,
        ph: /^\+?[0-9]{6,15}$/.test(raw.ph) ? raw.ph : '',
        ms: /^[A-Za-z0-9.]{1,50}$/.test(raw.ms) ? raw.ms : '', when: raw.when !== 0 };
    } catch (_) { return null; }
  }
  const gift = readGift();
  window.InvitationMusic = {
    readGift,
    applyGift(config) {
      if (!gift) return;
      for (const key of ['to', 'from', 'ask']) if (gift[key]) config[key] = gift[key];
      config.phone = gift.ph;
      config.messenger = gift.ms;
      config.when = gift.when;
      Object.assign(config.song, { youtube: gift.yt, start: gift.t, dock: gift.dk, video: gift.vid });
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const style = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
    const config = typeof CONFIG !== 'undefined' ? CONFIG : {};
    const song = Object.assign({ youtube: 'rg0KzIXexL8', start: 0, dock: 'inline' }, config.song);
    if (gift) Object.assign(song, { youtube: gift.yt, start: gift.t, dock: gift.dk, video: gift.vid });
    if (!/^[\w-]{11}$/.test(song.youtube)) return;
    const targets = { index: '#reply', envelope: '#letter', scratch: '#plan', stars: '#yay', ticket: '#stage', neon: '#reply', cyber: '#reply', glow: '#card', cafe: '#accepted' };
    const host = document.querySelector(targets[style]) || document.querySelector('main') || document.body;
    const box = document.createElement('section');
    box.id = 'song';
    box.className = 'inv-music music-' + style + (song.dock === 'corner' ? ' music-corner' : '');
    box.hidden = true;
    box.setAttribute('aria-label', 'Манай дуу');
    const captions = { index: 'Бидний цомог', envelope: 'Захидлын дурсамж', scratch: 'Чамд зориулсан бэлэг', stars: 'Оддын дуран', ticket: 'Хамтдаа үзэх кино', neon: '♪ МАНАЙ ДУУ', cyber: 'AUDIO_STREAM', glow: 'Бидний дурсамж', cafe: 'Хоёр хүний радио' };
    box.innerHTML = '<div class="music-controls"><button id="songMin" type="button" aria-expanded="true" aria-controls="songArt" aria-label="Дууг хураах">−</button><button id="songToggle" type="button" aria-label="Дууг түр зогсоох">❚❚</button></div><div id="songArt" class="music-art"><div class="music-decoration" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p class="music-caption"></p><div id="songFrame"></div><p class="music-note" role="status">Дуу эхлээгүй бол ▶ дарна уу</p></div>';
    box.querySelector('.music-caption').textContent = captions[style] || 'Манай дуу';
    (song.dock === 'corner' ? document.body : host).append(box);
    const frameHost = box.querySelector('#songFrame');
    const art = box.querySelector('#songArt');
    const min = box.querySelector('#songMin');
    const toggle = box.querySelector('#songToggle');
    let frame, player, started = false, playing = false, collapsed = false, pending = false;
    function state(value) {
      playing = value;
      box.classList.toggle('is-playing', value);
      toggle.textContent = value ? '❚❚' : '▶';
      toggle.setAttribute('aria-label', value ? 'Дууг түр зогсоох' : 'Дууг тоглуулах');
    }
    function command(play) {
      pending = play;
      if (player && typeof player.playVideo === 'function') {
        if (play) player.playVideo(); else player.pauseVideo();
      } else if (!play && frame) {
        frameHost.replaceChildren(); frame = null; player = null;
      }
      if (!play) state(false);
    }
    function attachPlayer() {
      if (!frame || player || !window.YT || !YT.Player) return;
      player = new YT.Player(frame, { events: {
        onReady: () => { command(pending && !collapsed && !box.hidden); },
        onStateChange: event => {
          if (event.data === 1 && (collapsed || box.hidden)) { command(false); return; }
          if (event.data === 1) pending = true;
          if (event.data === 0 || event.data === 2) pending = false;
          state(event.data === 1);
        },
        onError: () => { state(false); box.querySelector('.music-note').textContent = 'Энэ дууг тоглуулах боломжгүй байна. Өөр дуу сонгоорой.'; }
      } });
    }
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (previousReady) previousReady(); attachPlayer(); };
    function start() {
      if (started) return;
      started = true;
      box.hidden = false;
      if (song.dock === 'corner') document.body.classList.add('music-reserved');
      if (song.video === false) { collapse(true); return; }
      createFrame();
    }
    function createFrame() {
      if (frame) { command(true); return; }
      pending = true;
      frame = document.createElement('iframe');
      const params = new URLSearchParams({ autoplay: '1', enablejsapi: '1', playsinline: '1', rel: '0', controls: '0', start: String(Number.isInteger(song.start) && song.start >= 0 && song.start <= 36000 ? song.start : 0) });
      if (/^https?:$/.test(location.protocol)) params.set('origin', location.origin);
      frame.src = 'https://www.youtube-nocookie.com/embed/' + song.youtube + '?' + params;
      frame.title = 'Манай дуу — YouTube';
      frame.width = '200'; frame.height = '200';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      frameHost.append(frame);
      if (!window.YT) {
        const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; document.head.append(script);
      }
      attachPlayer();
    }
    function collapse(value) {
      collapsed = value;
      command(!value);
      /* API ачаалаагүй үед тоглогчийг устгаж, далд дуугарахаас сэргийлнэ. */
      if (value && (!player || typeof player.pauseVideo !== 'function')) {
        frameHost.replaceChildren(); frame = null; player = null;
      }
      art.hidden = value; toggle.hidden = value;
      box.classList.toggle('is-collapsed', value);
      min.textContent = value ? '♪' : '−';
      min.setAttribute('aria-expanded', String(!value));
      min.setAttribute('aria-label', value ? 'Дууг дэлгэж тоглуулах' : 'Дууг хураах');
      if (song.dock === 'corner') document.body.classList.toggle('music-collapsed', value);
      if (!value) createFrame();
    }
    function stop() {
      pending = false;
      if (player && player.destroy) player.destroy();
      frameHost.replaceChildren(); frame = null; player = null;
      started = false; box.hidden = true; collapsed = false; art.hidden = false; toggle.hidden = false;
      box.classList.remove('is-collapsed'); min.textContent = '−'; min.setAttribute('aria-expanded', 'true');
      state(false); document.body.classList.remove('music-reserved', 'music-collapsed');
    }
    min.addEventListener('click', () => collapse(!collapsed));
    toggle.addEventListener('click', () => {
      if (playing || pending) command(false); else createFrame();
    });
    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (['yes', 'yesBtn'].includes(button.id)) {
        /* Хариуны дэлгэц солигдсоны дараа дууг байрлуулна. */
        start();
      }
      if (['again', 'restart', 'cardRestart', 'back', 'return', 'no'].includes(button.id)) stop();
    });
    /* Дэлгэц солигдож тоглогч нуугдвал дууг зогсооно. */
    new MutationObserver(() => {
      if (style === 'stars' && started && song.dock !== 'corner' && !document.getElementById('plan').hidden && box.parentElement !== document.getElementById('plan')) document.getElementById('plan').append(box);
      if (started && !box.hidden && !box.getClientRects().length) stop();
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    document.addEventListener('visibilitychange', () => { if (document.hidden) command(false); });
  });
})();
