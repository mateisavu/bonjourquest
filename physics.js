/* Bonjour Quest movement. No dependencies; also exported for deterministic tests. */
(function (root) {
  'use strict';
  const WORLD_WIDTH = 3100;
  const platforms = [
    {x:0,y:520,w:3100,h:60}, {x:250,y:430,w:290,h:25},
    {x:640,y:345,w:330,h:25}, {x:1050,y:430,w:300,h:25},
    {x:1430,y:340,w:280,h:25}, {x:1800,y:430,w:280,h:25},
    {x:2180,y:350,w:270,h:25}, {x:2550,y:420,w:360,h:25}
  ];
  const ladders = [[340,430],[710,345],[1130,430],[1500,340],[1890,430],[2250,350],[2640,420]]
    .map(([x,top]) => ({x,top,bottom:520,w:38}));
  function createPlayer(x=60, floor=520) {
    return {x,y:floor-42,w:26,h:42,vx:0,vy:0,ground:true,inv:0,
      coyote:.12,jumpBuffer:0,climbing:false,ladder:null,facing:1,stride:0,land:0,ladderCooldown:0};
  }
  function queueJump(p) { p.jumpBuffer=.14; }
  function releaseJump(p) { if(p.vy< -5) p.vy=-5; }
  function ladderAt(p) {
    return ladders.find(l => Math.abs(p.x+p.w/2-(l.x+l.w/2))<25 &&
      p.y+p.h>=l.top-3 && p.y<l.bottom-3);
  }
  function step(p,input,seconds,barrier=Infinity) {
    const dt=Math.min(seconds,.025), f=dt*60;
    p.inv=Math.max(0,p.inv-dt); p.land=Math.max(0,p.land-dt);
    p.ladderCooldown=Math.max(0,p.ladderCooldown-dt);
    p.coyote=p.ground?.12:Math.max(0,p.coyote-dt);
    p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
    const direction=(input.right?1:0)-(input.left?1:0);
    const vertical=(input.down?1:0)-(input.up?1:0);
    const nearby=ladderAt(p);
    if(!p.climbing&&p.ladderCooldown===0&&nearby&&vertical && !(vertical>0&&p.y+p.h>=nearby.bottom-1)) {
      p.climbing=true;p.ladder=nearby;p.vx=0;p.vy=0;p.ground=false;
      p.jumpBuffer=0;p.coyote=0;
    }
    if(p.jumpBuffer>0&&(p.coyote>0||p.climbing)) {
      p.vy=-12.8;p.jumpBuffer=0;p.coyote=0;p.ground=false;p.climbing=false;p.ladder=null;p.ladderCooldown=.2;
    }
    if(direction)p.facing=direction;
    if(p.climbing) {
      const l=p.ladder;
      if(direction) {p.climbing=false;p.ladder=null;}
      else {
        p.x=l.x+l.w/2-p.w/2;p.vy=0;p.vx=0;
        p.y+=vertical*3.2*f;p.ground=false;
        if(p.y+p.h<=l.top) {p.y=l.top-p.h;p.climbing=false;p.ladder=null;p.ground=true;}
        if(p.y+p.h>=l.bottom) {p.y=l.bottom-p.h;p.climbing=false;p.ladder=null;p.ground=true;}
        if(vertical)p.stride+=dt*10;
        return;
      }
    }
    const target=direction*4.4, rate=(p.ground?.85:.55)*f;
    p.vx+=Math.sign(target-p.vx)*Math.min(Math.abs(target-p.vx),rate);
    p.x=Math.max(0,Math.min(WORLD_WIDTH-p.w,barrier-p.w,p.x+p.vx*f));
    const oldBottom=p.y+p.h,wasGround=p.ground;
    p.vy=Math.min(14,p.vy+.55*f);p.y+=p.vy*f;p.ground=false;
    if(p.vy>=0) {
      // Select the highest crossed one-way ledge, even after a long frame.
      const landing=platforms.filter(s=>p.x+p.w>s.x&&p.x<s.x+s.w&&
        oldBottom<=s.y+.1&&p.y+p.h>=s.y).sort((a,b)=>a.y-b.y)[0];
      if(landing){p.y=landing.y-p.h;p.vy=0;p.ground=true;if(!wasGround)p.land=.12;}
    }
    if(Math.abs(p.vx)>.2&&p.ground)p.stride+=Math.abs(p.vx)*dt*2.7;
  }
  const api={WORLD_WIDTH,platforms,ladders,createPlayer,queueJump,releaseJump,ladderAt,step};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.QuestPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);

