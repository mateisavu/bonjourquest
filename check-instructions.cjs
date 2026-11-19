// Source-level control coverage; rendering/visibility is checked by check-responsive.html.
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const instructions=html.match(/<section class="controls instruction-controls"[\s\S]*?<button id="restart">[\s\S]*?<\/section>/)?.[0];
assert.ok(instructions,'Missing persistent instruction section');
for(const [id,heading] of [['controlsTitle','Controls &amp; guidance'],['keyboardTitle','Keyboard'],['touchTitle','Touch']]){
 assert.match(instructions,new RegExp('aria-labelledby="'+id+'"'),'Missing labelled group '+id);
 assert.match(instructions,new RegExp('<h[23] id="'+id+'">'+heading+'</h[23]>'),'Missing heading '+id);
}
for(const key of ['←','→','A','D','Space','↑','W','↓','S','E','Escape','Tab'])assert.ok(instructions.includes('<kbd>'+key+'</kbd>'),'Undocumented supported key: '+key);
for(const phrase of ['focus the game canvas','Release early for a shorter jump','beside a ladder','Pause / Resume button','hold the left or right button','Hold movement and Jump together','automatically when reached','no timer or heart penalty','Checkpoint gates save automatically','Gentle mode prevents barrel damage'])assert.ok(instructions.includes(phrase),'Missing instruction: '+phrase);
assert.ok(!/\bhidden\b|aria-hidden="true"/.test(instructions),'Main instructions must be visible');
assert.equal((html.match(/id="restart"/g)||[]).length,1,'Restart control duplicated');
assert.deepEqual([...html.matchAll(/data-key="([^"]+)"/g)].map(m=>m[1]),['ArrowLeft','ArrowRight','Space','ArrowUp','ArrowDown','KeyE'],'Touch controls changed');
assert.ok(html.includes('Free practice companion — no French experience needed.'),'Start-screen context removed');
console.log('PASS: labelled keyboard/touch sections, all supported keys, touch gestures, checkpoint/quiz guidance, visibility markup, unchanged six touch controls');
