const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function boot(saved){
 const elements={},listeners={},storage={value:saved||null};
 function el(){return {hidden:false,open:false,checked:false,disabled:false,value:'',tagName:'DIV',style:{},children:[],className:'',textContent:'',clientWidth:1000,clientHeight:480,
  classList:{add(){},remove(){},toggle(){}},setAttribute(){},getAttribute(){},addEventListener(type,fn){this[type]=fn},focus(){document.activeElement=this},close(){this.open=false},showModal(){this.open=true},click(){if(!this.disabled)this.onclick?.()},append(...children){this.children.push(...children);this.firstChild=this.children[0]},replaceChildren(){this.children=[];this.firstChild=null},querySelector(){return el()},scrollIntoView(){this.scrollCalls=(this.scrollCalls||0)+1}}}
 const drawing=new Proxy({createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}},{get(t,k){return t[k]??(()=>{})},set(t,k,v){t[k]=v;return true}});
 const canvas=el();canvas.width=1200;canvas.height=580;canvas.getContext=()=>drawing;elements.game=canvas;
 const document={hidden:false,getElementById:id=>elements[id]??=(el()),querySelector:selector=>elements[selector]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener(type,fn){listeners[type]=fn}};
 const context={console,document,window:{matchMedia(){return {matches:false}},addEventListener(type,fn){listeners[type]=fn}},localStorage:{getItem(){return storage.value},setItem(k,v){storage.value=v}},requestAnimationFrame(){},confirm:()=>true,assert};
 vm.createContext(context);vm.runInContext(fs.readFileSync('physics.js','utf8'),context);vm.runInContext(fs.readFileSync('game.js','utf8'),context);
 return {context,storage,listeners,elements,run:code=>vm.runInContext(code,context)};
}
const game=boot();
game.run(`running=true;$('gentle').checked=true;
 function tick(n){for(let t=0;t<n;t++)step(1/120)}
 function walkTo(x){keys.ArrowRight=player.x<x;keys.ArrowLeft=player.x>x;for(let i=0;i<3000&&Math.abs(player.x-x)>3&&!paused;i++){step(1/120);if((keys.ArrowRight&&player.x>=x)||(keys.ArrowLeft&&player.x<=x))break}clearKeys();}
 function solveGate(i){if(!paused)throw Error('Gate did not activate '+i);const label=lessons[world][i][2][lessons[world][i][3]];const choice=$('answers').children.find(b=>b.textContent===label);if(!choice)throw Error('No correct choice');choice.click();$('continue').click();}
 for(let w=0;w<3;w++){
  for(let i=0;i<3;i++){
   walkTo([716,1506,2646][i]);keys.ArrowUp=true;tick(250);clearKeys();walkTo(gates[i].x);
   solveGate(i);
  }
  if(w<2)$('continue').click();
 }
 if(progress.words.length!==9||progress.xp!==450)throw Error('French progression lost');
 if(progress.unlocked!==2)throw Error('Chapters did not unlock');
 draw();
`);
// Reload resumes the saved third chapter with all gates and coins intact.
let restored=boot(game.storage.value);
restored.run(`if(world!==2||gates.some(g=>!g.open)||player.x!==2825||player.y!==378)throw Error('Checkpoint restore');running=true;openChapterComplete();if($('quiz').hidden)throw Error('Completion screen missing');`);
// Earlier checkpoints respawn safely on their platform with collected coins preserved.
restored.run(`loadWorld(0,true);$('quiz').hidden=true;markCheckpoint(0);runState().coins=[685];persist();coins=1;player.y=620;paused=false;step(1/120);if(player.x!==935||player.y!==303||hearts!==3||coins!==1||!gates[0].open)throw Error('Unsafe respawn');
 const before=elapsed;paused=true;step(1);if(elapsed!==before)throw Error('Hazards moved while paused');
 paused=false;keys.ArrowRight=true;setPaused(true);if(keys.ArrowRight||$('pauseScreen').hidden)throw Error('Pause failed to clear input');setPaused(false);
`);
// Old saved data migrates without losing earned learning progress.
restored=boot(JSON.stringify({xp:150,words:['Bonjour = hello'],unlocked:1,current:1}));
restored.run(`if(world!==1||progress.xp!==150||progress.words.length!==1)throw Error('Old save migration');`);
console.log('PASS: physically traverse all 3 worlds, direct contextual quizzes, nine gate unlocks, XP, chapter transitions, reload checkpoints, safe respawn, pause, old save migration');



// Accessibility regression checks use the real game handlers and shared game state.
const accessible=boot();
accessible.run(`$('quiz').hidden=true;$('learningDialog').open=false;running=true;paused=false;syncAccessibleState();
 assert.match($('gameSummary').textContent,/3 of 3 hearts/);
 assert.match($('gameSummary').textContent,/Next: Gate 1/);
 assert.match($('routeDetails').textContent,/Position: x 60, feet y 520/);
 const savedBefore=JSON.stringify(progress);syncAccessibleState();assert.equal(JSON.stringify(progress),savedBefore,'text rendering must not mutate progress');
 hearts=2;coins=4;progress.xp=75;markCheckpoint(0);syncAccessibleState();
 assert.match($('gameSummary').textContent,/2 of 3 hearts. 4 coins. 75 XP/);
 assert.match($('gameSummary').textContent,/Checkpoint: Gate 1/);
 assert.match($('gameSummary').textContent,/Next: Gate 2/);
 player.x=716;player.climbing=true;player.ground=false;syncAccessibleState();assert.match($('routeDetails').textContent,/Climbing a ladder/);
 player=QuestPhysics.createPlayer(60);hearts=3;coins=0;loadWorld(0,true);$('quiz').hidden=true;
`);
function key(code,target=accessible.elements.game,shiftKey=false){const e={code,target,shiftKey,repeat:false,prevented:false,preventDefault(){this.prevented=true}};accessible.listeners.keydown(e);return e}
assert.equal(key('ArrowRight',accessible.elements.help).prevented,false);
accessible.run(`assert.ok(!keys.ArrowRight,'page buttons must not move the explorer')`);
assert.equal(key('ArrowRight').prevented,true);
accessible.run(`assert.equal(keys.ArrowRight,true)`);
accessible.elements.game.blur();
accessible.run(`assert.equal(keys.ArrowRight,false,'leaving canvas must clear held input')`);
key('Space');accessible.run(`assert.ok(player.jumpBuffer>0,'canvas Space queues a jump')`);
accessible.elements.game.blur();accessible.run(`assert.equal(player.jumpBuffer,0)`);
accessible.run(`openQuiz(0);
 const correct=lessons[0][0][2][lessons[0][0][3]];
 const wrong=$('answers').children.find(b=>b.textContent!==correct);
 const beforeHearts=hearts,beforeXP=progress.xp;wrong.focus();wrong.click();
 assert.ok(wrong.disabled);assert.notEqual(document.activeElement,wrong);
 assert.ok(!document.activeElement.disabled);assert.equal(hearts,beforeHearts);assert.equal(progress.xp,beforeXP);
 assert.ok(!gates[0].open,'wrong answer must not unlock a gate');
 $('answers').children.filter(b=>!b.disabled).at(-1).focus();
`);
assert.equal(key('Tab',accessible.context.document.activeElement).prevented,true);
accessible.run(`assert.equal(document.activeElement,$('quizListen'))`);
assert.equal(key('Tab',accessible.context.document.activeElement,true).prevented,true);
accessible.run(`assert.equal(document.activeElement,$('answers').children.filter(b=>!b.disabled).at(-1));
 $('answers').children.find(b=>b.textContent===lessons[0][0][2][lessons[0][0][3]]).click();
 assert.equal(document.activeElement,$('continue'));$('continue').click();assert.equal(document.activeElement,canvas);
 syncAccessibleState();assert.match($('gameSummary').textContent,/Checkpoint: Gate 1/);
 assert.match($('routeDetails').textContent,/Position: x 935, feet y 345/);
 setPaused(true);syncAccessibleState();assert.match($('gameSummary').textContent,/Paused/);
 assert.equal(document.activeElement,$('resume'));setPaused(false);assert.equal(document.activeElement,canvas);
 persist();
`);
accessible.run(`const countBefore=coins;items.forEach(c=>c.taken=true);syncAccessibleState();assert.match($('routeDetails').textContent,/No coins remaining/);assert.equal(coins,countBefore);`);
const accessibleReload=boot(accessible.storage.value);
accessibleReload.run(`syncAccessibleState();assert.match($('gameSummary').textContent,/Checkpoint: Gate 1/);assert.match($('routeDetails').textContent,/Position: x 935, feet y 345/)`);
console.log('PASS: state-derived text, no progress mutation, canvas-only keyboard input, blur clears controls, wrong-answer focus, quiz Tab/Shift+Tab containment, resume focus, reload synchronization');

// Distinct entry points: new adventure resets only the run; Continue never creates one.
let entry=boot();
entry.run(`assert.equal($('play').hidden,true);assert.equal($('play').disabled,true);
 $('play').onclick();assert.equal(running,false,'Continue must not create an adventure');
 $('heroPlay').click();assert.equal(running,true);assert.equal(world,0);assert.equal(player.x,60);
 assert.equal(progress.adventureStarted,true);assert.equal($('start').hidden,true);assert.equal($('pause').disabled,false);
 assert.equal(document.activeElement,canvas);assert.equal(document.querySelector('.adventure').scrollCalls,1);
 assert.equal(progress.xp,0);assert.equal($('play').disabled,false);
`);
let zeroXPReload=boot(entry.storage.value);
zeroXPReload.run(`assert.equal(progress.xp,0);assert.equal($('play').hidden,false,'A started zero-XP adventure can be continued');$('play').click();assert.equal(running,true);assert.equal(document.activeElement,canvas);assert.equal(document.querySelector('.adventure').scrollCalls,undefined)`);
const entrySave=JSON.stringify({xp:150,words:['Bonjour = hello'],unlocked:2,current:1,gentle:true,expeditions:{0:{gates:3,coins:[295]},1:{gates:1,coins:[685]}}});
entry=boot(entrySave);
entry.run(`assert.equal($('play').hidden,false);const before=JSON.stringify(progress);$('play').click();
 assert.equal(world,1);assert.equal(checkpointGate,0);assert.equal(player.x,935);assert.equal(coins,1);
 assert.equal(progress.xp,150);assert.equal(progress.words.length,1);assert.equal(progress.unlocked,2);
 assert.equal(JSON.stringify(progress),before,'Continue must preserve the saved adventure');
`);
entry.context.confirm=()=>false;
entry.run(`const beforeCancel=JSON.stringify(progress),beforeX=player.x;$('heroPlay').click();assert.equal(JSON.stringify(progress),beforeCancel);assert.equal(player.x,beforeX);assert.equal(world,1)`);
entry.context.confirm=()=>true;
entry.run(`$('heroPlay').click();assert.equal(world,0);assert.equal(player.x,60);assert.equal(coins,0);assert.ok(gates.every(g=>!g.open));
 assert.deepEqual(Object.keys(progress.expeditions),['0']);assert.equal(checkpointGate,-1);
 assert.equal(progress.xp,150);assert.equal(progress.words[0],'Bonjour = hello');assert.equal(progress.unlocked,2);assert.equal(progress.gentle,true);
 assert.equal(document.activeElement,canvas);assert.equal($('start').hidden,true);assert.equal($('quiz').hidden,true);assert.equal(paused,false);
`);
const resetRun=boot(entry.storage.value);
resetRun.run(`$('play').click();assert.equal(world,0);assert.equal(coins,0);assert.equal(progress.xp,150);assert.equal(checkpointGate,-1)`);
const completed=boot(JSON.stringify({xp:450,words:[],unlocked:2,current:2,adventureStarted:true,expeditions:{2:{gates:3,coins:[]}}}));
completed.run(`$('play').click();assert.equal(paused,true);assert.equal($('quiz').hidden,false);assert.equal($('question').textContent,'The Lexicon is restored!');
 $('heroPlay').click();assert.equal(world,0);assert.equal(paused,false);assert.equal($('quiz').hidden,true);assert.equal(progress.xp,450);
 $('reset').click();assert.equal($('play').hidden,true);assert.equal($('play').disabled,true);
`);
const markup=fs.readFileSync('index.html','utf8');
for(const [id,description] of [['heroPlay','newAdventureHint'],['play','continueHint']]){
 const button=markup.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>'))?.[0];assert.ok(button);
 assert.ok(button.includes('type="button"'));assert.ok(button.includes('aria-controls="game"'));assert.ok(button.includes('aria-describedby="'+description+'"'));
 assert.ok(markup.includes('id="'+description+'"'));
}
console.log('PASS: fresh Start, unavailable Continue, zero-XP resume, saved checkpoint/coin preservation, reset scope, cancellation, completion resume, focus, scrolling and entry descriptions');

// Every gate opens on choices, with optional audio and no written answer preview.
const harder=boot();
harder.context.SpeechSynthesisUtterance=function(text){this.text=text};
harder.context.spoken=[];
harder.context.window.speechSynthesis={cancel(){},speak(utterance){harder.context.spoken.push(utterance)}};
harder.run(`running=true;$('learningDialog').open=false;
 for(let w=0;w<3;w++){
  loadWorld(w,true);
  for(let i=0;i<3;i++){
   const q=lessons[w][i],answer=q[2][q[3]];openQuiz(i);
   assert.equal($('question').textContent,q[0]);assert.equal($('answers').children.length,4);
   assert.equal(new Set(q[2]).size,4,'All choices must be distinct');assert.ok(q[3]>=0&&q[3]<4);
   assert.equal($('continue').hidden,true);assert.equal($('quizListen').hidden,false);
   const preamble=$('question').textContent+' '+$('hint').textContent+' '+$('feedback').textContent;
   assert.ok(!preamble.includes(quizExplanations[w*3+i]),'Explanation leaked before answering');
   assert.notEqual($('question').textContent,fieldNotes[w][i].fr,'Old answer-first card returned');assert.ok(!$('note').textContent.includes(q[4]),'Previous field note leaked a solution');
   assert.notEqual($('hint').textContent,fieldNotes[w][i].en+' — '+fieldNotes[w][i].context);
   const beforeXP=progress.xp,beforeHearts=hearts;
   $('quizListen').click();assert.equal(spoken.at(-1).text,quizAudio[w*3+i]);assert.equal(spoken.at(-1).lang,'fr-FR');assert.equal(progress.xp,beforeXP);assert.equal(hearts,beforeHearts);assert.ok(!gates[i].open);
   $('answers').children.find(button=>button.textContent!==answer).click();
   assert.equal(progress.xp,beforeXP);assert.equal(hearts,beforeHearts);assert.ok(!gates[i].open);
   assert.ok(!$('feedback').textContent.includes(quizExplanations[w*3+i]),'Wrong answer disclosed explanation');
   assert.ok(!$('feedback').textContent.includes(quizAudio[w*3+i]),'Wrong answer disclosed solution');
   assert.equal($('continue').hidden,true);assert.equal($('quizListen').disabled,false);
   $('quizListen').click();assert.equal(spoken.at(-1).text,quizAudio[w*3+i]);
   $('answers').children.find(button=>button.textContent===answer).click();
   assert.ok(gates[i].open);assert.equal(progress.xp,beforeXP+50);assert.equal($('continue').hidden,false);
   assert.ok($('feedback').textContent.includes(quizExplanations[w*3+i]));
   $('continue').click();if(i===2)assert.equal($('quizListen').hidden,true,'Audio from the previous question must not remain on completion');
  }
 }
 assert.equal(progress.xp,450);assert.equal(progress.words.length,9);
`);
const noAudio=boot();
noAudio.run(`running=true;openQuiz(0);$('quizListen').click();assert.match($('note').textContent,/unavailable/);assert.equal($('answers').children.length,4);assert.equal($('continue').hidden,true)`);
console.log('PASS: all 9 harder gates open directly on choices, French audio during answering/retries, no answer-first card, no written solution after mistakes, correct-only rewards, audio fallback');
