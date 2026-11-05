import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('assets/music.js', 'utf8');
class Element {
  constructor() { this.style = {}; this.hidden = false; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.textContent = ''; this.classList = { add: (...names) => names.forEach(n => this.classes.add(n)), remove: (...names) => names.forEach(n => this.classes.delete(n)), toggle: (n,v) => { if(v) this.classes.add(n); else this.classes.delete(n); }, contains: n => this.classes.has(n) }; this.classes = new Set(); }
  set innerHTML(_) { this.parts = Object.fromEntries(['#songFrame','#songArt','#songMin','#songToggle','#songPlay','.music-caption','.music-note'].map(k => [k,new Element()])); this.parts['#songPlay'].hidden = true; }
  querySelector(key) { return this.parts?.[key] || null; }
  append(child) { this.children.push(child); child.parentElement = this; }
  replaceChildren() { this.children = []; }
  setAttribute(key,value) { this.attrs[key] = value; }
  addEventListener(key,fn) { this.listeners[key] = fn; }
  getClientRects() { return this.hidden ? [] : [{}]; }
}
function run(style, gift, settings = {}) {
  const timers = new Map(); let timerId = 0;
  const events = {}, body = new Element(), head = new Element(), host = new Element();
  const document = { body, head, hidden: false, addEventListener: (n,f) => { events[n] = f; }, createElement: () => new Element(), querySelector: () => host, getElementById: () => host };
  const location = { pathname: '/'+style+'.html', protocol:'https:', origin:'https://test.example', hash:gift ? '#d='+Buffer.from(JSON.stringify(gift)).toString('base64url') : '' };
  const context = { document, location, navigator: {}, setTimeout: (fn, ms) => { assert.equal(ms, 2000); timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id), TextDecoder, Uint8Array, atob, URLSearchParams, CONFIG: {song: {youtube:'rg0KzIXexL8',start:0,...settings}}, MutationObserver:class { observe() {} } };
  context.window = context;
  vm.createContext(context); vm.runInContext(source, context); events.DOMContentLoaded();
  return { context, events, body, host, tick() { const tasks = [...timers.values()]; timers.clear(); tasks.forEach(fn => fn()); }, box: (body.children[0] || host.children[0]), click(id) { if (['yes','yesBtn'].includes(id)) context.InvitationMusic.start?.(); events.click({target:{closest:()=>({id})}}); } };
}
for (const style of ['index','envelope','scratch','stars','ticket','neon','cyber','glow','cafe']) {
  const test = run(style);
  assert.equal(test.box.hidden,true, style+' starts hidden');
  assert.equal(test.box.querySelector('#songFrame').children.length,0);
  test.click('open'); assert.equal(test.box.hidden,true);
  test.click(style==='scratch'?'yesBtn':'yes');
  assert.equal(test.box.hidden,false,style+' opens on yes');
  const frameHost=test.box.querySelector('#songFrame');
  const frame=frameHost.children[0];
  assert.match(frame.src,/youtube-nocookie.com/); assert.match(frame.src,/enablejsapi=1/); assert.match(frame.src,/controls=1/);
  const retry = test.box.querySelector('#songPlay'); assert.equal(retry.hidden,true);
  test.tick(); assert.equal(retry.hidden,false,'API байхгүй бол дахин тоглуулах товч гарна');
  retry.listeners.click(); assert.notEqual(frameHost.children[0],frame); assert.match(frameHost.children[0].src,/autoplay=1/);
  assert.equal(frame.width,'200'); assert.equal(frame.height,'200');
  test.box.querySelector('#songMin').listeners.click();
  assert.equal(frameHost.children.length,0,'collapse before API removes player');
  assert.equal(test.box.querySelector('#songArt').hidden,true);
  test.box.querySelector('#songMin').listeners.click(); assert.equal(frameHost.children.length,1);
  test.click('restart'); assert.equal(test.box.hidden,true); assert.equal(frameHost.children.length,0);
}
const loading=run('index'); loading.click('yes');
loading.box.querySelector('#songToggle').listeners.click();
assert.equal(loading.box.querySelector('#songFrame').children.length,0,'pause works before API loads');
loading.box.querySelector('#songToggle').listeners.click();
assert.equal(loading.box.querySelector('#songFrame').children.length,1);
const corner=run('index',{yt:'rg0KzIXexL8',dk:'corner',t:90}); corner.click('yes');
assert.match(corner.box.className,/music-corner/); assert.ok(corner.body.classList.contains('music-reserved'));
assert.match(corner.box.querySelector('#songFrame').children[0].src,/start=90/);
const legacy=run('index',{yt:'rg0KzIXexL8',vid:0}); legacy.click('yes');
assert.equal(legacy.box.querySelector('#songFrame').children.length,1); assert.equal(legacy.box.querySelector('#songArt').hidden,false);
legacy.box.querySelector('#songMin').listeners.click(); assert.equal(legacy.box.querySelector('#songFrame').children.length,0);
const noSong=run('index',{to:'Нэр'}); assert.equal(noSong.box,undefined);
const invalid=run('index',{yt:'rg0KzIXexL8',dk:'bad',t:-12,to:'<Нэр>',ph:'bad'});
assert.doesNotMatch(invalid.box.className,/music-corner/);
const config={song:{}}; invalid.context.InvitationMusic.applyGift(config); assert.equal(config.to,'Нэр'); assert.equal(config.phone,''); assert.equal(config.song.start,0);
// API төлөв өөрчлөгдөхөд удирдлага, чимэглэл дагана.
const api=run('cyber'); api.click('yes'); let callbacks, pauses=0, plays=0;
api.context.YT={Player: class { constructor(frame,options){callbacks=options.events;} playVideo(){plays++;} pauseVideo(){pauses++;} getPlayerState(){return 2;} destroy(){} }};
api.context.onYouTubeIframeAPIReady(); callbacks.onReady(); assert.equal(plays,1);
api.tick(); assert.equal(api.box.querySelector('#songPlay').hidden,false);
api.box.querySelector('#songPlay').listeners.click(); assert.equal(plays,2);
callbacks.onStateChange({data:1}); assert.equal(api.box.querySelector('#songPlay').hidden,true); assert.ok(api.box.classList.contains('is-playing'));
api.box.querySelector('#songToggle').listeners.click(); assert.equal(pauses,1);
api.box.querySelector('#songMin').listeners.click(); assert.equal(pauses,2);
callbacks.onStateChange({data:1}); assert.equal(pauses,3,'late playback while collapsed is paused');
api.box.querySelector('#songMin').listeners.click(); assert.ok(plays>=2);
for(const name of ['index','envelope','scratch','stars','ticket','neon','cyber','glow','cafe','make']) {
 const html=fs.readFileSync(name+'.html','utf8');
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1],{filename:name+'.html'});
}
console.log('Music checks passed: nine styles, gift sanitization, legacy links, docking, acceptance, collapse/resume, API state, and script syntax.');

// Хариу илгээх дараалал: SMS → хуваалцах → хуулах ба Messenger.
const reply = run('index'); let copied = '', shared = '';
const button = new Element(); button.parentElement = new Element(); button.parentElement.parts = {};
reply.context.navigator.clipboard = {writeText: async text => { copied = text; }};
reply.context.navigator.share = async data => { shared = data.text; };
await reply.context.InvitationMusic.sendReply('Тийм ээ', '99112233', '', button);
assert.match(reply.context.location.href, /^sms:99112233/); assert.equal(shared, '');
await reply.context.InvitationMusic.sendReply('Тийм ээ', '', '', button);
assert.equal(shared, 'Тийм ээ'); assert.equal(copied, '');
reply.context.navigator.share = async () => { throw {name:'AbortError'}; };
await reply.context.InvitationMusic.sendReply('Цуцалсан', '', '', button); assert.equal(copied, '');
delete reply.context.navigator.share;
await reply.context.InvitationMusic.sendReply('Тийм ээ', '', 'dokay.test', button);
assert.equal(copied,'Тийм ээ'); assert.equal(button.parentElement.children[0].href,'https://m.me/dokay.test');
reply.context.navigator.share = async () => { throw {name:'NotAllowedError'}; };
await reply.context.InvitationMusic.sendReply('Дахин', '', '', button); assert.equal(copied,'Дахин');
for (const style of ['index','envelope','scratch','stars','ticket','neon','cyber','glow','cafe']) {
  const html=fs.readFileSync(style+'.html','utf8');
  assert.match(html,/InvitationMusic.start\?\.\(\)/,style+' шууд эхлүүлнэ');
  assert.match(html,/InvitationMusic.sendReply\(/,style+' ижил илгээх логиктой');
  assert.doesNotMatch(html,/Миний даалт|Ундаагаа өөрчлөх/);
  assert.ok(source.indexOf('id="songFrame"') < source.indexOf('id="songPlay"'));
}
for (const style of ['neon','cyber','glow','cafe']) {
  const test=run(style,{yt:'rg0KzIXexL8',ph:'99112233',ms:'dokay.test'}), config={song:{}};
  test.context.InvitationMusic.applyGift(config); assert.equal(config.phone,'99112233'); assert.equal(config.messenger,'dokay.test');
  assert.match(fs.readFileSync(style+'.html','utf8'),/💬 Мессеж илгээх/);
}
assert.match(fs.readFileSync('cafe.html','utf8'),/Би даая/);
assert.match(fs.readFileSync('cafe.html','utf8'),/Уух зүйлээ өөрчлөх/);
console.log('Хариу илгээх, холбоосын өгөгдөл, шинэ үгсийн шалгалт тэнцлээ.');

// API төлөвийг шалгах, хураахад хүлээгдсэн товч дахин гаргахгүй байх.
const active=run('cafe'); active.click('yes');
active.context.YT={Player:class {getPlayerState(){return 1;} playVideo(){} pauseVideo(){} }};
active.context.onYouTubeIframeAPIReady(); active.tick(); assert.equal(active.box.querySelector('#songPlay').hidden,true);
const stopped=run('ticket'); stopped.click('yes'); stopped.click('restart'); stopped.tick();
assert.equal(stopped.box.querySelector('#songPlay').hidden,true);
// Clipboard API байхгүй үед хуучин хуулах арга ажиллана.
delete reply.context.navigator.clipboard; delete reply.context.navigator.share;
reply.context.document.createElement=()=>{const field=new Element();field.select=()=>{};field.remove=()=>{};return field;};
reply.context.document.execCommand=()=>true;
await reply.context.InvitationMusic.sendReply('Хариу', '', '', button);
assert.match(button.textContent,/Хуулагдлаа/);
console.log('Дахин тоглуулах төлөв, зогсоох, хуучин хуулах аргын шалгалт тэнцлээ.');

/* Кодчилолын хамгаалалт (2026-11-05): PowerShell-ээр бичихэд кирилл «???» болж эвдэрсэн тохиолдол гарсан */
{
  const fs = await import('node:fs'); const path = await import('node:path'); const { fileURLToPath } = await import('node:url');
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files = fs.readdirSync(root).filter((f) => /\.html$/.test(f)).concat(['assets/music.js', 'assets/music.css']);
  const bad = files.filter((f) => /\?{3,}/.test(fs.readFileSync(path.join(root, f), 'utf8')));
  if (bad.length) { console.error('КОДЧИЛОЛ ЭВДЭРСЭН («???»):', bad.join(', ')); process.exit(1); }
  console.log('Кодчилол: «???» алга —', files.length, 'файл');
}
