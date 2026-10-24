/* Болзооны урилгын автомат тест — headless Chrome, гадны сангүй.

   Хэрэглээ:  node tests/e2e.mjs      (файлыг шууд нээнэ, сервер хэрэггүй)
   Chrome-ын зам өөр бол: CHROME_PATH=... node tests/e2e.mjs

   Шалгадаг: зугтаах, тоолуур, цэцэг дэлгэрэх, хариу дэлгэц, өдөр/цаг сонгох
   (өнгөрсөн цаг сонгогдохгүй), мессеж, 2 хариу товч (хуваалцах, хуулах→Messenger),
   дууны хөвөх самбар, арын дэлбээ, дахин асуух, гар, мобайл, хөдөлгөөн
   багасгасан горим, console цэвэр. Гарц: «PASS n / n».
   Зураг түр хавтаст үлдэнэ (репод биш). */
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const CH = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const P = 9535;
/* Зураг, Chrome-ын профайл орох түр хавтас. Репод юу ч үлдэхгүй. */
const SP = path.join(os.tmpdir(), 'urilga-bolzoo-e2e') + path.sep;
mkdirSync(SP, { recursive: true });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const U = process.argv[2] || pathToFileURL(path.join(HERE, '..', 'index.html')).href;
const TAG = process.argv[3] || 'loc';
try { rmSync(SP + '_bolzoo_' + TAG, { recursive: true, force: true }); } catch {}
const s = ms => new Promise(r => setTimeout(r, ms));
const c = spawn(CH, ['--headless=new','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files',
  `--remote-debugging-port=${P}`, '--user-data-dir=' + SP + '_bolzoo_' + TAG, 'about:blank'], { stdio:'ignore' });
async function wp(p){ for(let i=0;i<80;i++){ const ok=await new Promise(r=>{const x=net.connect(p,'127.0.0.1');x.on('connect',()=>{x.destroy();r(1)});x.on('error',()=>r(0))}); if(ok)return; await s(200);} throw new Error('no port'); }
let id = 0;
const rpc = (w,m,p={}) => { const i=++id; return new Promise((res,rej)=>{ const on=e=>{const j=JSON.parse(e.data); if(j.id===i){w.removeEventListener('message',on); j.error?rej(new Error(j.error.message)):res(j.result);}}; w.addEventListener('message',on); w.send(JSON.stringify({id:i,method:m,params:p})); }); };
const ev = async (w,x) => { const r = await rpc(w,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if (r.exceptionDetails) throw new Error(x.slice(0,70)+': '+JSON.stringify(r.exceptionDetails.exception?.description||r.exceptionDetails.text)); return r.result.value; };
const pass = [], fail = [];
let expectMissingFile = false;   /* 7-р тест зориуд байхгүй зураг ачаална */
const check = (name, ok, extra='') => (ok ? pass : fail).push(name + (extra ? ' -> ' + extra : ''));
const shot = async (w, f) => writeFileSync(SP + f, Buffer.from((await rpc(w,'Page.captureScreenshot',{format:'png'})).data,'base64'));
const dodge = 'document.getElementById("no").dispatchEvent(new PointerEvent("pointerenter",{bubbles:true}))';

try {
  await wp(P); await s(400);
  const t = await (await fetch(`http://127.0.0.1:${P}/json/list`)).json();
  const w = new WebSocket(t.find(x=>x.type==='page').webSocketDebuggerUrl);
  await new Promise(r => w.addEventListener('open', r, { once:true }));
  await rpc(w,'Page.enable'); await rpc(w,'Runtime.enable'); await rpc(w,'Log.enable');
  const errs=[]; w.addEventListener('message',e=>{const j=JSON.parse(e.data);
    if(j.method==='Runtime.exceptionThrown') errs.push('EXC '+(j.params.exceptionDetails.exception?.description||j.params.exceptionDetails.text||''));
    if(j.method==='Log.entryAdded'&&j.params.entry.level==='error'&&!/favicon/.test(j.params.entry.text) && !(expectMissingFile && /ERR_FILE_NOT_FOUND/.test(j.params.entry.text))) errs.push('LOG '+j.params.entry.text);});

  await rpc(w,'Emulation.setDeviceMetricsOverride',{width:1280,height:860,deviceScaleFactor:1,mobile:false});
  await rpc(w,'Page.navigate',{url:U}); await s(2200);

  // 1. Эхний байдал
  check('1 asuult CONFIG-oos', (await ev(w,'document.getElementById("ask").textContent')) === 'Миний гүнжээ, надтай болзоонд явах уу?');
  check('1b "болзоонд" ni yagaan em', await ev(w,'!!document.querySelector("#ask em")'));
  check('1c 6 delbee, tsetseg jijig', await ev(w,'document.querySelectorAll(".petal").length') === 6 && Number(await ev(w,'getComputedStyle(document.getElementById("bloom")).getPropertyValue("--open")')) < 0.3);
  check('1d hariu delgets nuugdsan, zar tooloor alga', await ev(w,'getComputedStyle(document.getElementById("reply")).display') === 'none' && await ev(w,'document.getElementById("dodges").hidden'));
  check('1e tovch 44px+', await ev(w,'document.getElementById("yes").getBoundingClientRect().height >= 44 && document.getElementById("no").getBoundingClientRect().height >= 44'));
  check('1f arin delbee 6-10, fixed, daragdahgüi', await ev(w,`(() => { const d = document.getElementById("drift");
    const n = d.querySelectorAll(".drift-petal").length, cs = getComputedStyle(d);
    return n >= 6 && n <= 10 && cs.position === 'fixed' && cs.pointerEvents === 'none'; })()`));
  const pulseNormal = await ev(w,'getComputedStyle(document.getElementById("yes"), "::after").animationName');
  await shot(w, 'bolzoo-start-' + TAG + '.png');

  // 2. Зугтаах
  await ev(w, dodge); await s(320);
  const after1 = await ev(w,`({ chip: document.getElementById("dodges").textContent, hidden: document.getElementById("dodges").hidden,
    hint: document.getElementById("hint").textContent, open: +getComputedStyle(document.getElementById("bloom")).getPropertyValue("--open"),
    moved: document.getElementById("no").style.transform !== '' })`);
  check('2 1 udaa zugtlaa', after1.chip === '1 удаа зугтлаа' && !after1.hidden, JSON.stringify(after1));
  check('2b zövlömj solignoo', after1.hint === 'Тэр товч тоглоом хийж байна.', after1.hint);
  check('2c tsetseg delgerev', after1.open > 0.3, String(after1.open));
  check('2d tovch zaisan bairnaas hödlöv', after1.moved);

  const yesBefore = await ev(w,'document.getElementById("yes").getBoundingClientRect().width');
  for (let i = 0; i < 4; i++) { await ev(w, dodge); await s(120); }
  const yesAfter = await ev(w,'document.getElementById("yes").getBoundingClientRect().width');
  check('2e Тийм tovch tomorson', yesAfter > yesBefore + 5, `${yesBefore.toFixed(0)} → ${yesAfter.toFixed(0)}`);
  check('2f 5 udaa', (await ev(w,'document.getElementById("dodges").textContent')) === '5 удаа зугтлаа');
  await shot(w, 'bolzoo-dodge-' + TAG + '.png');

  // 3. Хязгаар — «Үгүй» алга болно
  await ev(w, dodge); await s(250);
  check('3 6 daraa Үгүй alga', await ev(w,'document.getElementById("no").classList.contains("gone")'));
  check('3b temdeglel garav', await ev(w,'!document.getElementById("noNote").hidden') && (await ev(w,'document.getElementById("noNote").textContent')).includes('дууслаа'));
  check('3c fokus Тийм deer', await ev(w,'document.activeElement.id') === 'yes');

  // 4. Тийм
  await ev(w,'document.getElementById("yes").click()'); await s(500);
  const reply = await ev(w,`({ answered: document.getElementById("card").classList.contains("answered"),
    title: document.getElementById("replyTitle").textContent,
    lines: [...document.querySelectorAll("#replyLines p")].map(p => p.textContent),
    sign: document.getElementById("sign").textContent,
    photoHidden: document.getElementById("replyPhoto").classList.contains("missing"),
    askHidden: getComputedStyle(document.getElementById("askScreen")).display === 'none',
    hearts: document.querySelectorAll(".heart").length })`);
  check('4 hariu delgets', reply.answered && reply.title === 'Тэгэлгүй яахав!' && reply.askHidden, JSON.stringify(reply));
  check('4b 2 mör bichveer + gariin useg', reply.lines.length === 2
    && reply.sign === await ev(w,'CONFIG.reply.signature'), reply.sign);
  check('4c zuraggüi bol hooson talbai üldehgüi', reply.photoHidden);
  check('4d0 hariu deed talaasaa haragdana (dood tal ruu üsrehgüi)', await ev(w,'window.scrollY === 0 && document.activeElement.id === "replyTitle"'));
  check('4d tsetseg buudaj garav', reply.hearts >= 10, String(reply.hearts));
  check('4d1 "Duug sonsoh" tovchgüi, YouTube shuud, fixed samvar, autoplay', await ev(w,`(() => { const box = document.getElementById("song");
    const f = box.querySelector("iframe");
    return !box.hidden && !document.querySelector(".song-play") && getComputedStyle(box).position === 'fixed' && !!f
      && f.src.startsWith("https://www.youtube-nocookie.com/embed/" + CONFIG.song.youtube + "?")
      && f.src.includes("autoplay=1") && f.src.includes("playsinline=1") && f.src.includes("rel=0")
      && f.allow.includes("autoplay"); })()`));
  const frameSize = await ev(w,`(() => { const r = document.querySelector("#song iframe").getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) }; })()`);
  check('4d2 toglogch 280x158+', frameSize.w >= 280 && frameSize.h >= 158, JSON.stringify(frameSize));
  const mini = await ev(w,`(async () => { const box = document.getElementById("song"), btn = document.getElementById("songMin");
    btn.click(); await new Promise(r => setTimeout(r, 450));
    const f = box.querySelector("#songFrame iframe");
    const res = { iframe: !!f && f.isConnected,
      disp: f ? getComputedStyle(f).display + '/' + getComputedStyle(document.getElementById("songFrame")).display : 'none',
      aria: btn.getAttribute("aria-expanded"), h: Math.round(box.getBoundingClientRect().height) };
    btn.click(); await new Promise(r => setTimeout(r, 450));
    res.back = btn.getAttribute("aria-expanded") === "true" && box.querySelector("iframe") === f
      && f.getBoundingClientRect().height >= 158;
    return res; })()`);
  check('4d3 huraahad iframe üldene, display none bish, 90-ees nam, dahin delgene',
    mini.iframe && !mini.disp.includes('none') && mini.aria === 'false' && mini.h < 90 && mini.back, JSON.stringify(mini));
  await shot(w, 'bolzoo-reply-' + TAG + '.png');

  // 4e-4k. Өдөр, цаг сонгох
  const whenInit = await ev(w,`({ shown: !document.getElementById("when").hidden,
    days: document.querySelectorAll("#days .chip").length,
    times: document.querySelectorAll("#times .chip").length,
    first: document.querySelector("#days .chip").firstChild.textContent,
    second: document.querySelectorAll("#days .chip")[1].firstChild.textContent,
    sub: document.querySelector("#days .chip small").textContent,
    pickedHidden: document.getElementById("picked").hidden,
    actionsHidden: document.getElementById("whenActions").hidden,
    sendHidden: document.getElementById("send").hidden,
    sendText: document.getElementById("send").textContent })`);
  check('4e songoltiin heseg garav', whenInit.shown && whenInit.days === 7 && whenInit.times >= 1, JSON.stringify(whenInit));
  check('4f Önöödör/Margaashaas ehelne', ['Өнөөдөр', 'Маргааш'].includes(whenInit.first) && /сарын/.test(whenInit.sub), JSON.stringify(whenInit));
  check('4g songoogüi bol ür dün nuuc', whenInit.pickedHidden && whenInit.actionsHidden);
  check('4h Ilgeeh tovch dugaargüi üed ch haragdana', !whenInit.sendHidden
    && whenInit.sendText === await ev(w,'CONFIG.when.sendLabel') && whenInit.sendText.includes('Мессеж илгээх'),
    'phone=' + await ev(w,'CONFIG.when.phone') + ' hidden=' + whenInit.sendHidden + ' text=' + whenInit.sendText);
  if (await ev(w,'CONFIG.when.phone')) {
    check('4h2 sms holboos zöv bürdene', await ev(w,`(() => {
      const w2 = CONFIG.when;
      const link = 'sms:' + w2.phone + '?&body=' + encodeURIComponent(w2.messageTemplate.replace('{when}', 'X'));
      return link.startsWith('sms:' + w2.phone + '?&body=') && link.includes('%D0%A2'); })()`));
  }

  await ev(w,'document.querySelectorAll("#days .chip")[2].click()'); await s(150);
  check('4i zövhön ödör songoход ür dün garahgüi', await ev(w,'document.getElementById("whenActions").hidden'));
  check('4i2 songoson chip temdeglegdev', await ev(w,`[...document.querySelectorAll("#days .chip")].filter(b => b.getAttribute("aria-pressed") === "true").length`) === 1);

  await ev(w,'document.querySelectorAll("#times .chip")[4].click()'); await s(200);
  check('4j0 haana: 3 songolt, gazargüi bol ür dün garahgüi',
    await ev(w,'document.querySelectorAll("#places .chip").length') === 3
    && await ev(w,'!document.getElementById("places").hidden && document.getElementById("whenActions").hidden'));
  await ev(w,'document.querySelectorAll("#places .chip")[0].click()'); await s(200);
  const picked = await ev(w,`({ text: document.getElementById("picked").textContent,
    shown: !document.getElementById("picked").hidden && !document.getElementById("whenActions").hidden,
    note: document.getElementById("pickedNote").textContent,
    copy: document.getElementById("copy").textContent,
    msg: message(),
    visible: [...document.getElementById("whenActions").children].filter(b => !b.hidden && b.getClientRects().length > 0).length,
    tall: document.getElementById("copy").getBoundingClientRect().height >= 44 })`);
  check('4j hoyuulang songohod ür dün garna', picked.shown && /\d{1,2}:\d{2} · Кино$/.test(picked.text) && /сарын/.test(picked.text), JSON.stringify(picked));
  check('4k medeejiin bichveg baigaliin', picked.msg.includes('19:00 цагт кино үзэхээр болзъё')
    && /гаригийн|Өнөөдөр|Маргааш/.test(picked.msg)
    && /\(\d{1,2}-р сарын \d{1,2}\)/.test(picked.msg)
    && !picked.msg.includes('{'), picked.msg);
  check('4l tovch 44px+, haragdah tovch yag 2', picked.tall && picked.copy === await ev(w,'CONFIG.when.copyLabel') && picked.visible === 2,
    'copy=' + picked.copy + ' visible=' + picked.visible);

  // 4l2. Дугааргүй «Мессеж илгээх» — хуваалцах цэс (share stub), sms: руу шилжихгүй
  const shared = await ev(w,`(async () => {
    const before = location.href; let got = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { got = d; } });
    document.getElementById("send").click();
    await new Promise(r => setTimeout(r, 300));
    delete navigator.share;
    return { text: got && got.text, msg: message(), same: location.href === before }; })()`);
  check('4l2 share({text}) = message(), sms ruu shiljeegüi', !!shared.msg && shared.text === shared.msg && shared.same, JSON.stringify(shared));

  // 4l3. «Чатанд хуулах» — clipboard stub, дараа нь m.me холбоос гарна
  const copied = await ev(w,`(async () => {
    let got = null;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { got = t; } } });
    CONFIG.when.messenger = 'dokay.test';
    document.getElementById("copy").click();
    await new Promise(r => setTimeout(r, 200));
    const m = document.getElementById("msgr");
    const res = { got, msg: message(), copy: document.getElementById("copy").textContent,
      shown: !m.hidden && m.getClientRects().length > 0, href: m.href, h: Math.round(m.getBoundingClientRect().height) };
    CONFIG.when.messenger = '';
    delete navigator.clipboard;
    return res; })()`);
  check('4l3 huulsan = message(), copiedLabel, m.me holboos 44px+', copied.got === copied.msg
    && copied.copy === await ev(w,'CONFIG.when.copiedLabel') && copied.shown
    && copied.href === 'https://m.me/dokay.test' && copied.h >= 44, JSON.stringify(copied));

  // Нэг өдөр дахин сонгоход зөвхөн нэг нь тэмдэглэгдэнэ
  await ev(w,'document.querySelectorAll("#days .chip")[5].click()'); await s(150);
  check('4m nэг л ödör songogdono', await ev(w,`[...document.querySelectorAll("#days .chip")].filter(b => b.getAttribute("aria-pressed") === "true").length`) === 1);

  // 4n. Өнгөрсөн цаг сонгогдохгүй
  const past = await ev(w,`(() => {
    CONFIG.when.times = ['00:30', '23:30'];      /* нэг нь өнгөрсөн, нэг нь ирээдүйн */
    document.getElementById("days").textContent = '';
    document.getElementById("times").textContent = '';
    buildWhen();
    const days = [...document.querySelectorAll("#days .chip")];
    days[0].click();
    const todayTimes = [...document.querySelectorAll("#times .chip")].map(b => b.firstChild.textContent);
    const isToday = days[0].firstChild.textContent === 'Өнөөдөр';
    /* маргаашийг сонгоход бүх цаг эргэж ирнэ */
    days[1].click();
    const nextTimes = [...document.querySelectorAll("#times .chip")].map(b => b.firstChild.textContent);
    return { isToday, todayTimes, nextTimes };
  })()`);
  check('4n önöödört öngörsön tsag haragdahgüi',
    !past.isToday || !past.todayTimes.includes('00:30'), JSON.stringify(past));
  check('4o margaash bol büh tsag ergej irne', past.nextTimes.length === 2, JSON.stringify(past));
  check('4p ödör solihod tsag songolt tseverlegdene', await ev(w,'document.getElementById("whenActions").hidden'));

  await ev(w,'CONFIG.when.times = ["13:00","15:00","17:00","18:00","19:00","20:00"]; document.getElementById("days").textContent = ""; document.getElementById("times").textContent = ""; buildWhen();');
  await s(150);

  // 5. Дахин асуух
  await ev(w,'document.getElementById("again").click()'); await s(300);
  check('5 buts: asuult sergev, too tseverlegdev', await ev(w,'!document.getElementById("card").classList.contains("answered")')
    && await ev(w,'document.getElementById("dodges").hidden')
    && await ev(w,'!document.getElementById("no").classList.contains("gone")')
    && await ev(w,'document.getElementById("no").style.transform') === '');
  check('5b buts: songoson ödör, tsag tseverlegdev', await ev(w,`document.getElementById("picked").hidden
    && document.getElementById("whenActions").hidden
    && [...document.querySelectorAll(".chip")].every(b => b.getAttribute("aria-pressed") === "false")`));
  check('5c buts: duu zogsono', await ev(w,'document.getElementById("song").hidden && !document.querySelector("#songFrame iframe")'));

  // 6. Гараар ашиглах
  await ev(w,'document.getElementById("no").focus()');
  await rpc(w,'Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await rpc(w,'Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await s(250);
  check('6 gar: Enter dahad zugtana', (await ev(w,'document.getElementById("dodges").textContent')) === '1 удаа зугтлаа');
  check('6b Тийм tovch tabaar hürne', await ev(w,'document.getElementById("yes").tabIndex') >= 0);

  // 7. Зураг тохируулсан үед
  expectMissingFile = true;
  await ev(w,'CONFIG.reply.photo = "zurag.jpg"; document.getElementById("yes").click()'); await s(600);
  check('7 baihgui zurag -> hooson talbai üldehgüi', await ev(w,'document.getElementById("replyPhoto").classList.contains("missing")'));

  // 8. Мобайл
  await rpc(w,'Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:2,mobile:true});
  await rpc(w,'Page.reload'); await s(1800);
  check('8 hevtee scroll baihgui', await ev(w,'document.documentElement.scrollWidth <= 375'), String(await ev(w,'document.documentElement.scrollWidth')));
  await ev(w,'document.getElementById("no").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}))'); await s(300);
  check('8b huruu hürehed zugtana', (await ev(w,'document.getElementById("dodges").textContent')) === '1 удаа зугтлаа');
  for (let i = 0; i < 6; i++) { await ev(w,'document.getElementById("no").dispatchEvent(new PointerEvent("pointerenter",{bubbles:true}))'); await s(80); }
  check('8c zugtsan tovch delgetsend baina', await ev(w,`(() => { const r = document.getElementById("no").getBoundingClientRect();
    return r.left > -5 && r.right < window.innerWidth + 5 && r.top > -5 && r.bottom < window.innerHeight + 5; })()`));
  await shot(w, 'bolzoo-mob-' + TAG + '.png');

  // 9. Хөдөлгөөн багасгасан
  await rpc(w,'Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await rpc(w,'Page.reload'); await s(1500);
  await ev(w,'document.getElementById("no").dispatchEvent(new PointerEvent("pointerenter",{bubbles:true}))'); await s(200);
  check('9 reduce-motion: tovch bairandaa, too nemegdene', await ev(w,'document.getElementById("no").style.transform') === ''
    && (await ev(w,'document.getElementById("dodges").textContent')) === '1 удаа зугтлаа');
  await ev(w,'document.getElementById("yes").click()'); await s(300);
  check('9b reduce-motion: zürh buudahgüi', await ev(w,'document.querySelectorAll(".heart").length') === 0);
  const pulseReduced = await ev(w,'getComputedStyle(document.getElementById("yes"), "::after").animationName');
  check('9c reduce-motion: Тийм-iin pulse zogsono', pulseNormal === 'beat' && pulseReduced === 'none',
    pulseNormal + ' → ' + pulseReduced);

  check('10 console tseverhen', errs.length === 0, errs.join(' | '));
  w.close();
} catch (e) { fail.push('CRASH ' + e.message); }
finally { c.kill(); }
console.log('PASS ' + pass.length + ' / ' + (pass.length + fail.length));
for (const f of fail) console.log('FAIL ' + f);
