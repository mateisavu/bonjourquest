const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let saved;try{saved=JSON.parse(localStorage.getItem('bonjourQuest'))}catch{}let progress=saved&&Array.isArray(saved.words)&&Number.isFinite(saved.xp)?saved:{xp:0,words:[],unlocked:0};progress.unlocked=Math.max(0,Math.min(2,Number(progress.unlocked)||0));
const lessons=[[
['How do you say “hello” in French?','A friendly word for meeting someone.',['Bonjour','Merci','Au revoir','Pardon'],0,'Bonjour = hello'],
['Someone helps you. What do you say?','Show your appreciation.',['Bonsoir','Merci','Salut','Oui'],1,'Merci = thank you'],
['Which word means “goodbye”?','Until the next adventure!',['S’il vous plaît','Bonjour','Au revoir','Non'],2,'Au revoir = goodbye']],[
['How many is “trois”?','Count: un, deux, trois.',['One','Two','Three','Four'],2,'Trois = three'],
['What does “de l’eau” mean?','An explorer needs this to stay hydrated.',['Bread','Water','An apple','Milk'],1,'De l’eau = water'],
['Which word means “apple”?','A snack from the orchard.',['Le pain','Le chat','La pomme','La maison'],2,'La pomme = apple']],[
['What does “Je m’appelle Alex” mean?','Introduce yourself.',['I am hungry','My name is Alex','I live in Paris','Hello Alex'],1,'Je m’appelle… = my name is…'],
['How do you say “I would like some water”?','Je voudrais means “I would like”.',['Je suis de l’eau','J’ai une pomme','Je voudrais de l’eau','Au revoir l’eau'],2,'Je voudrais de l’eau = I would like some water'],
['What does “Où est la bibliothèque ?” mean?','Où est… asks where something is.',['What is your name?','Where is the library?','I like the library','The library is closed'],1,'Où est… ? = where is… ?']]];
const names=['THE EMERALD RUINS','SUNSET CANYON','MOONLIT TEMPLE'],colors=[['#142e2e','#365b43','#7a9564'],['#45323c','#956553','#c49762'],['#172440','#424b72','#8794a7']];
let world=0,running=false,paused=false,time=0,last=0,cam=0,hearts=3,coins=0,gates=[],items=[],hazards=[],player,checkpoint=60,questionGate=0,sound=false,audio;
const keys={};
const platforms=QuestPhysics.platforms;
let particles=[],noticeTimer=0,elapsed=0,accumulator=0;
let checkpointY=520,checkpointGate=-1;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function runState(){progress.expeditions??={};return progress.expeditions[world]??={gates:0,coins:[]}}
function setNotice(message){$('gameStatus').textContent=message;noticeTimer=5}
function resizeGame(){const stage=document.querySelector('.stage');canvas.width=Math.round(clamp(stage.clientWidth/stage.clientHeight*580,360,1200));canvas.height=580;cam=clamp(player?player.x-canvas.width*.34:0,0,3100-canvas.width)}
function burst(x,y,color,count=12){if(reducedMotion)return;for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*110,vy:-30-Math.random()*100,life:.55,max:.55,color})}
function markCheckpoint(i){gates[i].open=true;checkpointGate=i;checkpoint=gates[i].x+35;checkpointY=gates[i].y;runState().gates=i+1;burst(gates[i].x,gates[i].y-40,'#edce83',24);setNotice('Checkpoint saved · Gate '+(i+1)+' unlocked')}
function respawn(){player=QuestPhysics.createPlayer(checkpoint,checkpointY);player.inv=2;hearts=3;clearKeys();cam=clamp(player.x-canvas.width*.34,0,3100-canvas.width);setNotice(checkpointGate>=0?'Back at your saved gate. Your coins and French progress are safe.':'A fresh start. Try jumping over barrels, or turn on Gentle mode.');hud()}
function persist(){try{localStorage.setItem('bonjourQuest',JSON.stringify(progress))}catch{}updateUI()}
function updateUI(){$('stats').textContent=`${progress.xp} XP · ${progress.words.length} phrases practised`;$('rank').textContent=progress.unlocked>=2?'Lexicon adventurer':progress.xp>=100?'Word trailblazer':'Novice explorer';$('xpbar').style.width=Math.min(100,progress.xp/4.5)+'%';document.querySelectorAll('.world').forEach((b,i)=>{b.classList.toggle('selected',i===world);b.querySelector('i').textContent=i<=progress.unlocked?'↗':'⌑';b.setAttribute('aria-label',names[i]+(i>progress.unlocked?' locked':''))})}
function tone(freq=520){if(!sound)return;try{audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=freq;g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.start();o.stop(audio.currentTime+.18)}catch{}}
function loadWorld(n,restart=false){
 world=n;progress.current=n;progress.expeditions??={};if(restart)progress.expeditions[n]={gates:0,coins:[]};
 const run=runState();run.gates=clamp(Math.floor(Number(run.gates)||0),0,3);if(!Array.isArray(run.coins))run.coins=[];
 checkpointGate=Math.min(2,run.gates-1);hearts=3;particles=[];elapsed=0;
 gates=[{x:900,y:345,open:run.gates>0},{x:1670,y:340,open:run.gates>1},{x:2790,y:420,open:run.gates>2}];
 checkpoint=checkpointGate>=0?gates[checkpointGate].x+35:60;checkpointY=checkpointGate>=0?gates[checkpointGate].y:520;
 player=QuestPhysics.createPlayer(checkpoint,checkpointY);player.inv=1;cam=clamp(player.x-canvas.width*.34,0,3100-canvas.width);
 items=[];platforms.slice(1).forEach(p=>{for(let x=p.x+45;x<p.x+p.w-35;x+=65)items.push({x,y:p.y-45,taken:run.coins.includes(x)})});coins=items.filter(c=>c.taken).length;
 hazards=[{x:390,y:498,origin:390,range:110},{x:1170,y:498,origin:1170,range:120},{x:1950,y:498,origin:1950,range:125},{x:2380,y:498,origin:2380,range:100}];
 $('worldTitle').textContent='0'+(n+1)+' / '+names[n];document.querySelector('.difficulty').textContent=['A1 · FIRST WORDS','A1 · EVERYDAY WORDS','A1 · FIRST SENTENCES'][n];
 document.querySelector('.scene-label').textContent=names[n]+' ✦ EXPEDITION 0'+(n+1);clearKeys();updateUI();hud();
 setNotice(checkpointGate>=0?'Resumed at Gate '+(checkpointGate+1)+'. Your checkpoint is safe.':'Head right. Hold ↑ beside a ladder to climb.');
 if(running)persist();
}
function hud(){$('hud').textContent='♥ '.repeat(hearts)+'♡ '.repeat(3-hearts)+'   ◈ '+coins}
function jump(){if(running&&!paused){QuestPhysics.queueJump(player);tone(280)}}
function releaseKey(code){keys[code]=false;if(code==='Space')QuestPhysics.releaseJump(player)}
function isEditing(target){return target&&(/INPUT|TEXTAREA|SELECT/.test(target.tagName)||target.isContentEditable)}
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'&&running&&$('quiz').hidden&&!$('learningDialog').open){e.preventDefault();setPaused(!paused);return}
 if(paused||$('learningDialog').open||isEditing(e.target))return;
 if(e.target.tagName==='BUTTON'&&e.code==='Space')return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)&&running)e.preventDefault();
 keys[e.code]=true;if(e.code==='Space'&&!e.repeat)jump();if(e.code==='KeyE'&&!e.repeat)tryGate();
});
window.addEventListener('keyup',e=>releaseKey(e.code));
function interruption(){clearKeys();if(running&&!paused&&$('quiz').hidden&&!$('learningDialog').open)setPaused(true)}
window.addEventListener('blur',interruption);document.addEventListener('visibilitychange',()=>{if(document.hidden)interruption()});
const pointerKeys=new Map();
document.querySelectorAll('[data-key]').forEach(b=>{
 const key=b.dataset.key;
 b.onpointerdown=e=>{e.preventDefault();if(!running||paused)return;b.setPointerCapture(e.pointerId);pointerKeys.set(e.pointerId,key);keys[key]=true;b.classList.add('pressed');if(key==='Space')jump();if(key==='KeyE')tryGate()};
 const release=e=>{pointerKeys.delete(e.pointerId);if(![...pointerKeys.values()].includes(key))releaseKey(key);b.classList.remove('pressed')};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=release;
});
function setPaused(value){if(!running||!$('quiz').hidden||$('learningDialog').open)return;paused=value;clearKeys();$('pause').textContent=value?'Resume':'Pause';$('pauseScreen').hidden=!value;if(!value)canvas.focus();else {$('resume').focus();persist()}}
$('resume').onclick=()=>setPaused(false);
function tryGate(){if(!running||paused)return;const i=gates.findIndex(g=>!g.open&&Math.abs(player.x-g.x)<70&&Math.abs(player.y+42-g.y)<65);if(i>=0)openQuiz(i)}
function openQuiz(i){
 paused=true;clearKeys();questionGate=i;$('quiz').hidden=false;$('continue').hidden=false;
 const q=lessons[world][i],card=fieldNotes[world][i];
 $('quizTag').textContent=`GATE ${i+1} / 3 · LEARN FIRST`;
 $('question').textContent=card.fr;$('hint').textContent=card.en+' — '+card.context;
 $('answers').replaceChildren();$('feedback').textContent=card.tip;
 const listen=document.createElement('button');listen.textContent='Hear French';listen.onclick=()=>speakFrench(card.fr);$('answers').append(listen);
 $('continue').textContent='Ready? Try the quiz →';$('continue').onclick=()=>showGateQuestion(i);$('continue').focus();
}
function showGateQuestion(i){
 const q=lessons[world][i],card=fieldNotes[world][i];restoreContinue();
 $('continue').hidden=true;$('quizTag').textContent=`GATE ${i+1} / 3 · +50 XP`;
 $('question').textContent=q[0];$('hint').textContent=q[1];$('feedback').textContent='No timer. Mistakes never cost hearts.';$('answers').replaceChildren();
 const choices=q[2].map((label,j)=>({label,correct:j===q[3]}));
 for(let k=choices.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[choices[k],choices[j]]=[choices[j],choices[k]]}
 choices.forEach(choice=>{const b=document.createElement('button');b.textContent=choice.label;b.onclick=()=>{
 if(choice.correct){b.classList.add('correct');$('feedback').textContent='Très bien! '+card.fr+' — '+card.en+'. '+card.tip;$('note').textContent=q[4];[...$('answers').children].forEach(v=>v.disabled=true);$('continue').hidden=false;markCheckpoint(i);
 if(!progress.words.includes(q[4])){progress.words.push(q[4]);progress.xp+=50}persist();tone(780);$('continue').focus()
 }else{b.classList.add('wrong');b.disabled=true;$('feedback').textContent='Let’s revisit it: '+card.fr+' means “'+card.en+'”. '+card.tip+' Try again.';tone(180)}
 };$('answers').append(b)});$('answers').firstChild.focus()
}
$('continue').onclick=()=>{if(questionGate<2){paused=false;$('quiz').hidden=true;player.x=checkpoint;player=QuestPhysics.createPlayer(checkpoint,checkpointY);player.inv=1;clearKeys();canvas.focus()}else{progress.unlocked=Math.max(progress.unlocked,Math.min(2,world+1));persist();$('question').textContent=world===2?'The Lexicon is restored!':'Chapter complete. Très bien!';$('hint').textContent=world===2?'You practised nine French essentials. Open Study & recall to try remembering them without answer choices.':'A new world is unlocked. Your French is getting stronger.';$('answers').replaceChildren();$('feedback').textContent=`${coins} coins collected · ${progress.xp} total XP`;$('continue').textContent=world===2?'Play the expedition again →':'Explore the next world →';$('continue').onclick=()=>{loadWorld(world===2?0:world+1,true);paused=false;$('quiz').hidden=true;restoreContinue()}}};
const originalContinue=$('continue').onclick;function restoreContinue(){$('continue').textContent='Continue adventure →';$('continue').onclick=originalContinue}
$('play').onclick=()=>{running=true;paused=false;$('pauseScreen').hidden=true;$('start').hidden=true;$('pause').disabled=false;canvas.focus();persist();tone(600);if(runState().gates===3)openChapterComplete()};$('restart').onclick=()=>{if(!confirm('Restart this chapter? Its gates and coins will reset. Your French XP stays safe.'))return;loadWorld(world,true);paused=false;$('pauseScreen').hidden=true;$('pause').textContent='Pause';$('quiz').hidden=true;restoreContinue();if(running)canvas.focus()};document.querySelectorAll('.world').forEach((b,i)=>b.onclick=()=>{if(i<=progress.unlocked){loadWorld(i);paused=false;$('pauseScreen').hidden=true;$('pause').textContent='Pause';$('quiz').hidden=true;restoreContinue();if(running){canvas.focus();if(runState().gates===3)openChapterComplete()}}else{$('note').textContent='Complete the previous chapter’s three French gates to unlock this world.'}});$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪ Sound on':'♪ Sound off';tone()};$('reset').onclick=()=>{if(confirm('Reset your saved XP and unlocked worlds?')){progress={xp:0,words:[],unlocked:0};persist();loadWorld(0);paused=false;$('pauseScreen').hidden=true;$('pause').textContent='Pause';$('quiz').hidden=true;restoreContinue()}};
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function mountain(x,y,w,h,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.25,y-h*.75);ctx.lineTo(x+w*.48,y-h);ctx.lineTo(x+w*.62,y-h*.63);ctx.lineTo(x+w,y);ctx.fill()}
function palm(x,y,s,c){rect(x,y-130*s,10*s,130*s,c);ctx.strokeStyle=c;ctx.lineWidth=12*s;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x+5*s,y-130*s);ctx.quadraticCurveTo(x+i*35*s,y-175*s,x+i*48*s,y-125*s);ctx.stroke()}}
function draw(){const view=canvas.width;ctx.save();ctx.beginPath();ctx.rect(0,0,view,580);ctx.clip();const pal=colors[world];const grad=ctx.createLinearGradient(0,0,0,580);grad.addColorStop(0,pal[0]);grad.addColorStop(1,pal[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,view,580);ctx.fillStyle=world===1?'#eac188':'#e7e6b5';ctx.beginPath();ctx.arc(view*.8-cam*.025,110,world===2?36:50,0,Math.PI*2);ctx.fill();for(let i=0;i<9;i++)mountain(i*230-cam*.15-100,470,330,180+(i%3)*60,pal[1]);for(let i=0;i<12;i++){let x=i*180-cam*.35;rect(x,310-(i%3)*40,70,210,pal[0]+'90');rect(x-8,300-(i%3)*40,86,15,pal[0]+'90');for(let k=0;k<3;k++)rect(x+20,340+k*45-(i%3)*40,12,22,pal[1])}for(let i=0;i<18;i++)palm(i*190-cam*.5,535,1+(i%3)*.3,'#102922');ctx.save();ctx.translate(-cam,0);platforms.forEach((p,i)=>{rect(p.x,p.y,p.w,p.h,i?'#5c7060':'#273e2c');rect(p.x,p.y,p.w,6,'#9eab73');rect(p.x,p.y+6,p.w,5,'#698153');for(let x=p.x+10;x<p.x+p.w;x+=40){rect(x,p.y+15,30,2,'#273e2c');if(i)rect(x+15,p.y+10,2,12,'#394c40')}if(i){for(let x=p.x+18;x<p.x+p.w;x+=95){rect(x,p.y+p.h,5,24,'#4b713a');rect(x-3,p.y+p.h+12,12,5,'#5c8347')}}});
// ladders make the climb approachable on keyboard and touch
QuestPhysics.ladders.map(l=>[l.x,l.top,l.bottom]).forEach(([x,y,end])=>{rect(x,y,5,end-y,'#a58e5f');rect(x+33,y,5,end-y,'#a58e5f');for(let yy=y+10;yy<end;yy+=16)rect(x,yy,38,4,'#b29b6a')});
items.forEach(c=>{if(c.taken)return;ctx.fillStyle='#f0cd77';ctx.beginPath();ctx.ellipse(c.x,c.y+Math.sin(time/250+c.x)*4,8,11,0,0,Math.PI*2);ctx.fill();rect(c.x-2,c.y-6+Math.sin(time/250+c.x)*4,3,12,'#ac813b')});hazards.forEach(h=>{ctx.save();ctx.translate(h.x,h.y);ctx.rotate(time/350);rect(-14,-15,28,30,'#a87345');rect(-14,-11,28,4,'#483b31');rect(-14,8,28,4,'#483b31');rect(-4,-15,3,30,'#d3a66c');ctx.restore()});gates.forEach((g,i)=>{const glow=ctx.createRadialGradient(g.x,g.y-40,5,g.x,g.y-40,70);glow.addColorStop(0,g.open?'#b4df7950':'#e9ce8460');glow.addColorStop(1,'#e9ce8400');ctx.fillStyle=glow;ctx.fillRect(g.x-70,g.y-120,140,140);rect(g.x-24,g.y-75,48,75,'#354b40');rect(g.x-30,g.y-80,60,10,'#829071');rect(g.x-24,g.y-70,8,70,'#8b9574');rect(g.x+16,g.y-70,8,70,'#8b9574');rect(g.x-14,g.y-64,28,64,g.open?'#aacb7770':'#ead28d90');ctx.fillStyle='#f5e4a8';ctx.font='bold 18px Georgia';ctx.textAlign='center';ctx.fillText(g.open?'✓':'✦',g.x,g.y-34);ctx.font='10px sans-serif';ctx.fillText(g.open?'OPEN':`GATE 0${i+1}`,g.x,g.y-95);if(!g.open&&Math.abs(player.x-g.x)<90){ctx.fillStyle='#fff4ce';ctx.fillText('E · French challenge',g.x,g.y-115)}});
if(player.inv<=0||Math.floor(time/90)%2){
ctx.save();ctx.translate(player.x+13,player.y+42);ctx.scale(player.facing,1);let x=-13,y=-42;
const stride=reducedMotion?0:player.ground?Math.sin(player.stride)*4:player.climbing?Math.sin(player.stride)*3:0;
const bob=reducedMotion?0:player.climbing?Math.sin(player.stride)*1.5:player.ground?Math.abs(stride)*-.4:0;
y+=bob;ctx.translate(0,player.land>0&&!reducedMotion?2:0);
ctx.fillStyle='#07150e50';ctx.beginPath();ctx.ellipse(0,2,16,4,0,0,Math.PI*2);ctx.fill();
rect(x+4,y+35+stride,7,7,'#28352b');rect(x+17,y+35-stride,7,7,'#28352b');rect(x+3,y+18,22,19,'#d6aa62');rect(x,y+20-stride,5,14,'#e1b78d');rect(x+24,y+20+stride,5,14,'#e1b78d');rect(x+7,y+5,17,16,'#e7bd91');rect(x+3,y,24,8,'#edcf91');rect(x-1,y+7,32,5,'#ba8f52');rect(x+20,y+14,3,3,'#263c30');rect(x-3,y+20,8,17,'#75523f');rect(x+9,y+20,3,17,'#f1d48a');ctx.restore()}
particles.forEach(p=>{ctx.globalAlpha=p.life/p.max;rect(p.x,p.y,4,4,p.color)});ctx.globalAlpha=1;
const barrier=gates.find(g=>!g.open);if(barrier){rect(barrier.x+26,barrier.y,2,520-barrier.y,'#edce8325');
 if(Math.abs(player.x-barrier.x)<110&&player.y+player.h>barrier.y+65){ctx.fillStyle='#edce83';ctx.font='12px sans-serif';ctx.textAlign='right';ctx.fillText('↑ Climb to Gate '+(gates.indexOf(barrier)+1),barrier.x+14,player.y-12)}}
if(checkpointGate>=0){rect(checkpoint-5,checkpointY-34,3,34,'#a5c989');rect(checkpoint-2,checkpointY-34,17,12,'#edce83')}
ctx.restore();ctx.restore();}

function step(seconds){
 if(!running||paused)return;
 elapsed+=seconds;time=elapsed*1000;noticeTimer=Math.max(0,noticeTimer-seconds);
 const closed=gates.find(g=>!g.open);
 QuestPhysics.step(player,{left:keys.ArrowLeft||keys.KeyA,right:keys.ArrowRight||keys.KeyD,up:keys.ArrowUp||keys.KeyW,down:keys.ArrowDown||keys.KeyS},seconds,closed?closed.x+20:Infinity);
 items.forEach(c=>{if(!c.taken&&Math.abs(player.x+13-c.x)<24&&Math.abs(player.y+20-c.y)<34){c.taken=true;coins++;runState().coins.push(c.x);burst(c.x,c.y,'#f0cd77',7);tone(900);hud();persist()}});
 hazards.forEach((h,i)=>{h.x=h.origin+Math.sin(elapsed/.95+i)*h.range;
 if(!$('gentle').checked&&player.inv<=0&&Math.abs(player.x+13-h.x)<27&&player.y+player.h>h.y-14&&player.y<h.y+14){
 hearts--;player.inv=1.6;player.vy=-6;player.climbing=false;player.ladder=null;player.ground=false;burst(player.x+13,player.y+20,'#d79674',8);tone(130);hud();
 if(hearts<=0)respawn();else setNotice('Watch the barrels! '+hearts+' hearts left. Gentle mode prevents damage.')
 }});
 if(player.y>610)respawn();
 const cameraTarget=clamp(player.x-canvas.width*.34,0,3100-canvas.width);cam+= (cameraTarget-cam)*(1-Math.exp(-seconds*8));
 particles.forEach(p=>{p.x+=p.vx*seconds;p.y+=p.vy*seconds;p.vy+=180*seconds;p.life-=seconds});particles=particles.filter(p=>p.life>0);
 if(!noticeTimer){const g=gates.find(g=>!g.open),message=g?'Goal: Gate '+(gates.indexOf(g)+1)+' / 3 · Follow the platforms and ladders':'All gates unlocked · Chapter complete';if($('gameStatus').textContent!==message)$('gameStatus').textContent=message}
 tryGateNear();
}
function tryGateNear(){const i=gates.findIndex(g=>!g.open&&Math.abs(player.x-g.x)<36&&Math.abs(player.y+42-g.y)<15);if(i>=0)openQuiz(i)}

const fieldNotes=[
[{fr:'Bonjour',en:'Hello',context:'Greet the explorer at the ruins.',tip:'Use bonjour as a polite daytime greeting.'},{fr:'Merci',en:'Thank you',context:'Thank someone who helps you.',tip:'Merci beaucoup means thank you very much.'},{fr:'Au revoir',en:'Goodbye',context:'Say goodbye before moving on.',tip:'Use au revoir when you are leaving.'}],
[{fr:'Trois',en:'Three',context:'Count supplies: un, deux, trois.',tip:'Un = one, deux = two, trois = three.'},{fr:'De l’eau',en:'Some water',context:'Ask for water on your journey.',tip:'Eau means water. De l’eau means some water.'},{fr:'La pomme',en:'The apple',context:'Name a snack you find.',tip:'Pomme is feminine: learn it together with la or une.'}],
[{fr:'Je m’appelle Alex',en:'My name is Alex',context:'Introduce yourself to a new companion.',tip:'Replace Alex with your own name.'},{fr:'Je voudrais de l’eau',en:'I would like some water',context:'Make a polite request.',tip:'Je voudrais means I would like.'},{fr:'Où est la bibliothèque ?',en:'Where is the library?',context:'Ask for directions.',tip:'Où est… ? means Where is… ? La bibliothèque means the library.'}]
];
function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false);if(player)player.jumpBuffer=0;pointerKeys.clear();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('pressed'))}
function speakFrench(text){
 if(!('speechSynthesis' in window)){$('note').textContent='Speech is unavailable in this browser. Read the phrase and its meaning in the notebook.';return}
 window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='fr-FR';utterance.rate=.8;window.speechSynthesis.speak(utterance)
}
let dialogWasPaused=false,recallIndex=0,recallCards=[],recallScore=0,recallAttempted=false;
function showNotebook(title){dialogWasPaused=paused;paused=true;clearKeys();$('learningTitle').textContent=title;$('learningContent').replaceChildren();$('learningDialog').showModal()}
function closeNotebook(){$('learningDialog').close();paused=dialogWasPaused;clearKeys();if(running&&!paused&&$('quiz').hidden)canvas.focus()}
$('closeLearning').onclick=closeNotebook;
$('learningDialog').addEventListener('cancel',()=>{paused=dialogWasPaused;clearKeys()});
function addAction(text,action,primary=false){const b=document.createElement('button');b.textContent=text;if(primary)b.className='primary';b.onclick=action;$('learningContent').append(b);return b}
function showStudy(){showNotebook('Your French toolkit');const intro=document.createElement('p');intro.textContent='Choose a chapter, read the phrases, then try recalling them without multiple-choice answers. Audio uses your browser’s available French voice.';$('learningContent').append(intro);
 const list=document.createElement('div');list.className='word-list';
 fieldNotes.forEach((chapter,w)=>{const h=document.createElement('h3');h.textContent=names[w];list.append(h);chapter.forEach((card,i)=>{const block=document.createElement('div');block.className='word-card';const term=document.createElement('strong');term.lang='fr';term.textContent=card.fr;const desc=document.createElement('p');desc.textContent=card.en+' · '+card.tip;const listen=document.createElement('button');listen.textContent='Hear French';listen.onclick=()=>speakFrench(card.fr);block.append(term,desc,listen);list.append(block)})});$('learningContent').append(list);
 addAction('Try a recall check',()=>{recallCards=fieldNotes.flat().filter((c,i)=>progress.words.includes(lessons[Math.floor(i/3)][i%3][4]));if(!recallCards.length)recallCards=fieldNotes[0];recallIndex=0;recallScore=0;renderRecall()},true)
}
function normalizeAnswer(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()}
function renderRecall(){const root=$('learningContent');root.replaceChildren();$('learningTitle').textContent='Recall check';
 if(recallIndex>=recallCards.length){const p=document.createElement('p');p.textContent=`You recalled ${recallScore} of ${recallCards.length} phrases before seeing the answer. This is a practice check, not a fluency score. Revisit these tomorrow to see what stays with you.`;root.append(p);addAction('Back to notebook',()=>{closeNotebook();showStudy()});return}
 const card=recallCards[recallIndex];recallAttempted=false;const p=document.createElement('p');p.textContent=`${recallIndex+1} / ${recallCards.length} — Type the French for “${card.en}”.`;const input=document.createElement('input');input.id='recallAnswer';input.autocomplete='off';input.setAttribute('aria-label','Your French answer');const feedback=document.createElement('p');feedback.id='recallFeedback';feedback.setAttribute('aria-live','polite');root.append(p,input,feedback);
 const check=addAction('Check answer',()=>{if(!input.value.trim()){feedback.textContent='Type an answer, or choose Show answer.';return}const correct=normalizeAnswer(input.value)===normalizeAnswer(card.fr);if(!recallAttempted&&correct)recallScore++;recallAttempted=true;feedback.textContent=(correct?'Correct! ':'Keep practising. ')+card.fr+' — '+card.en+'. '+card.tip;input.disabled=true;check.disabled=true;reveal.disabled=true;next.hidden=false},true);
 const reveal=addAction('Show answer',()=>{recallAttempted=true;feedback.textContent=card.fr+' — '+card.en+'. '+card.tip;check.disabled=true;input.disabled=true;reveal.disabled=true;next.hidden=false});
 const next=addAction('Next phrase →',()=>{recallIndex++;renderRecall()});next.hidden=true;input.onkeydown=e=>{if(e.key==='Enter')check.click()};input.focus()
}
$('study').onclick=showStudy;
$('help').onclick=()=>{showNotebook('How to explore');const p=document.createElement('p');p.textContent='Move right with ← → or A / D. Jump with Space; release early for a shorter jump. Hold ↑ / W or ↓ / S beside a ladder to climb up or down. On touchscreens, use the controls below the scene. Glowing gates open a field note and quiz. Answer correctly to unlock the next section. You can pause at any time; Gentle mode prevents barrel damage. Quizzes have no timer or heart penalty.';$('learningContent').append(p);addAction('Back to adventure',closeNotebook,true)};
$('pause').onclick=()=>setPaused(!paused);
$('gentle').onchange=()=>{progress.gentle=$('gentle').checked;persist()};$('gentle').checked=!!progress.gentle;
canvas.tabIndex=0;
$('heroPlay').onclick=()=>{$('play').click();document.querySelector('.adventure').scrollIntoView({block:'start',behavior:'auto'})};
if(progress.xp>0)$('play').textContent='Continue adventure →';

function frame(t){const dt=last?Math.min(.1,(t-last)/1000):0;last=t;if(running&&!paused){accumulator+=dt;while(accumulator>=1/120){step(1/120);accumulator-=1/120;if(paused){accumulator=0;break}}}else accumulator=0;draw();requestAnimationFrame(frame)}loadWorld(clamp(Math.floor(Number(progress.current)||0),0,progress.unlocked));resizeGame();window.addEventListener('resize',resizeGame);requestAnimationFrame(frame);



function openChapterComplete(){paused=true;clearKeys();questionGate=2;$('quiz').hidden=false;originalContinue()}

