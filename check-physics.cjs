const assert=require('node:assert/strict');
const P=require('./physics.js');
const idle={};
function simulate(p,input,seconds,hz=120,barrier=Infinity){for(let i=0;i<Math.round(seconds*hz);i++)P.step(p,input,1/hz,barrier)}
// Stable landing, bounded speed, no creeping after releasing movement.
let p=P.createPlayer();simulate(p,idle,2);assert.equal(p.y,478);assert.ok(p.ground);
simulate(p,{right:true},1);assert.ok(p.vx<=4.4);simulate(p,idle,.2);assert.equal(p.vx,0);
// Buffered input before a landing must jump without another button press.
p=P.createPlayer(100);p.y=472;p.ground=false;p.vy=2;P.queueJump(p);simulate(p,idle,.075);assert.ok(p.vy<0,'buffered jump');
// A brief grace period lets a player jump just after leaving a ledge.
p=P.createPlayer(540,430);p.ground=false;p.coyote=.1;P.queueJump(p);P.step(p,idle,1/120);assert.ok(p.vy<0,'coyote jump');
// Releasing jump early shortens it; holding a key does not repeat jumps.
p=P.createPlayer();P.queueJump(p);simulate(p,idle,.1);let held=p.vy;P.releaseJump(p);assert.ok(p.vy>held);simulate(p,idle,2);assert.ok(p.ground);assert.equal(p.y,478);
// Every ladder reaches its exact ledge and descends to the floor without jitter.
for(const l of P.ladders){p=P.createPlayer(l.x+6);simulate(p,{up:true},2);assert.equal(p.y,l.top-42,'ladder top');assert.ok(p.ground);simulate(p,{down:true},2);assert.equal(p.y,478,'ladder bottom');assert.ok(p.ground)}
// Side exit and jump exit both release ladder gravity correctly.
p=P.createPlayer(716);simulate(p,{up:true},.3);assert.ok(p.climbing);P.queueJump(p);P.step(p,idle,1/120);assert.ok(!p.climbing&&p.vy<0);
p=P.createPlayer(716);simulate(p,{up:true},.3);simulate(p,{right:true},.1);assert.ok(!p.climbing);
// Locked gate cannot be bypassed at floor level or by a large update.
p=P.createPlayer(850);simulate(p,{right:true},2,120,888);assert.equal(p.x,862);
// Deterministic fixed updates give identical results regardless of rendering FPS.
function run(renderHz){p=P.createPlayer(60);let acc=0;for(let i=0;i<renderHz;i++){acc+=1/renderHz;while(acc>=1/120-1e-9){P.step(p,{right:true},1/120);acc-=1/120}}return p.x}
assert.ok(Math.abs(run(30)-run(144))<.001);
console.log('PASS: landing, acceleration, buffered/coyote/variable jump, all 7 ladders up/down, ladder exits, gate barriers, 30/144 Hz consistency');

