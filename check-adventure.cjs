const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function boot(saved){
 const elements={},listeners={},storage={value:saved||null};
 function el(){return {hidden:false,open:false,checked:false,disabled:false,value:'',tagName:'DIV',style:{},children:[],className:'',textContent:'',clientWidth:1000,clientHeight:480,
  classList:{add(){},remove(){},toggle(){}},setAttribute(){},getAttribute(){},addEventListener(type,fn){this[type]=fn},focus(){},close(){this.open=false},showModal(){this.open=true},click(){this.onclick?.()},append(...children){this.children.push(...children);this.firstChild=this.children[0]},replaceChildren(){this.children=[];this.firstChild=null},querySelector(){return el()},scrollIntoView(){}}}
 const drawing=new Proxy({createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}},{get(t,k){return t[k]??(()=>{})},set(t,k,v){t[k]=v;return true}});
 const canvas=el();canvas.width=1200;canvas.height=580;canvas.getContext=()=>drawing;elements.game=canvas;
 const document={hidden:false,getElementById:id=>elements[id]??=(el()),querySelector:selector=>elements[selector]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener(type,fn){listeners[type]=fn}};
 const context={console,document,window:{matchMedia(){return {matches:false}},addEventListener(type,fn){listeners[type]=fn}},localStorage:{getItem(){return storage.value},setItem(k,v){storage.value=v}},requestAnimationFrame(){},confirm:()=>true};
 vm.createContext(context);vm.runInContext(fs.readFileSync('physics.js','utf8'),context);vm.runInContext(fs.readFileSync('game.js','utf8'),context);
 return {context,storage,run:code=>vm.runInContext(code,context)};
}
const game=boot();
game.run(`running=true;$('gentle').checked=true;
 function tick(n){for(let t=0;t<n;t++)step(1/120)}
 function walkTo(x){keys.ArrowRight=player.x<x;keys.ArrowLeft=player.x>x;for(let i=0;i<3000&&Math.abs(player.x-x)>3&&!paused;i++){step(1/120);if((keys.ArrowRight&&player.x>=x)||(keys.ArrowLeft&&player.x<=x))break}clearKeys();}
 function solveGate(i){if(!paused)throw Error('Gate did not activate '+i);$('continue').click();const label=lessons[world][i][2][lessons[world][i][3]];const choice=$('answers').children.find(b=>b.textContent===label);if(!choice)throw Error('No correct choice');choice.click();$('continue').click();}
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
console.log('PASS: physically traverse all 3 worlds, learn-first quizzes, nine gate unlocks, XP, chapter transitions, reload checkpoints, safe respawn, pause, old save migration');


