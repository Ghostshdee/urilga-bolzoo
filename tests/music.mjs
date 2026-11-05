import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('assets/music.js', 'utf8');
class Element {
  constructor() { this.hidden = false; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.textContent = ''; this.classList = { add: (...names) => names.forEach(n => this.classes.add(n)), remove: (...names) => names.forEach(n => this.classes.delete(n)), toggle: (n,v) => { if(v) this.classes.add(n); else this.classes.delete(n); }, contains: n => this.classes.has(n) }; this.classes = new Set(); }
  set innerHTML(_) { this.parts = Object.fromEntries(['#songFrame','#songArt','#songMin','#songToggle','.music-caption','.music-note'].map(k => [k,new Element()])); }
  querySelector(key) { return this.parts?.[key] || null; }
  append(child) { this.children.push(child); child.parentElement = this; }
  replaceChildren() { this.children = []; }
  setAttribute(key,value) { this.attrs[key] = value; }
  addEventListener(key,fn) { this.listeners[key] = fn; }
  getClientRects() { return this.hidden ? [] : [{}]; }
}
function run(style, gift, settings = {}) {
  const events = {}, body = new Element(), head = new Element(), host = new Element();
  const document = { body, head, hidden: false, addEventListener: (n,f) => { events[n] = f; }, createElement: () => new Element(), querySelector: () => host, getElementById: () => host };
  const location = { pathname: '/'+style+'.html', protocol:'https:', origin:'https://test.example', hash:gift ? '#d='+Buffer.from(JSON.stringify(gift)).toString('base64url') : '' };
  const context = { document, location, TextDecoder, Uint8Array, atob, URLSearchParams, CONFIG: {song: {youtube:'rg0KzIXexL8',start:0,...settings}}, MutationObserver:class { observe() {} } };
  context.window = context;
  vm.createContext(context); vm.runInContext(source, context); events.DOMContentLoaded();
  return { context, events, body, host, box: (body.children[0] || host.children[0]), click(id) { events.click({target:{closest:()=>({id})}}); } };
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
  assert.match(frame.src,/youtube-nocookie.com/); assert.match(frame.src,/enablejsapi=1/);
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
assert.equal(legacy.box.querySelector('#songFrame').children.length,0); assert.equal(legacy.box.querySelector('#songArt').hidden,true);
legacy.box.querySelector('#songMin').listeners.click(); assert.equal(legacy.box.querySelector('#songFrame').children.length,1);
const noSong=run('index',{to:'Нэр'}); assert.equal(noSong.box,undefined);
const invalid=run('index',{yt:'rg0KzIXexL8',dk:'bad',t:-12,to:'<Нэр>',ph:'bad'});
assert.doesNotMatch(invalid.box.className,/music-corner/);
const config={song:{}}; invalid.context.InvitationMusic.applyGift(config); assert.equal(config.to,'Нэр'); assert.equal(config.phone,''); assert.equal(config.song.start,0);
// API төлөв өөрчлөгдөхөд удирдлага, чимэглэл дагана.
const api=run('cyber'); api.click('yes'); let callbacks, pauses=0, plays=0;
api.context.YT={Player: class { constructor(frame,options){callbacks=options.events;} playVideo(){plays++;} pauseVideo(){pauses++;} destroy(){} }};
api.context.onYouTubeIframeAPIReady(); callbacks.onReady(); assert.equal(plays,1);
callbacks.onStateChange({data:1}); assert.ok(api.box.classList.contains('is-playing'));
api.box.querySelector('#songToggle').listeners.click(); assert.equal(pauses,1);
api.box.querySelector('#songMin').listeners.click(); assert.equal(pauses,2);
callbacks.onStateChange({data:1}); assert.equal(pauses,3,'late playback while collapsed is paused');
api.box.querySelector('#songMin').listeners.click(); assert.ok(plays>=2);
for(const name of ['index','envelope','scratch','stars','ticket','neon','cyber','glow','cafe','make']) {
 const html=fs.readFileSync(name+'.html','utf8');
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1],{filename:name+'.html'});
}
console.log('Music checks passed: nine styles, gift sanitization, legacy links, docking, acceptance, collapse/resume, API state, and script syntax.');
