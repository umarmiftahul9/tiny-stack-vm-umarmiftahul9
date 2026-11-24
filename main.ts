const fs=require('fs'),p=require('path');
const I=process.env.MAKEFUN_INPUT_DIR||'/input',O=process.env.MAKEFUN_OUTPUT_DIR||'/output';
// T: (pops<<2)|pushes per opcode as a hex digit. Two-phase: D() decodes one
// instruction on demand (cached); the loop re-checks per step, in spec
// order: step limit -> pc range -> unknown op -> truncated imm -> stack
// checks -> own traps, so a bad opcode traps exactly when reached.
const T='01146abf0000000099999995999599909990000000000000044000000000000058000000000000004414';
function R(f){try{return fs.readFileSync(f)}catch(e){return Buffer.alloc(0)}}
function run(pr,inp){
const n=pr.length,st=new Int32Array(257),cs=new Int32Array(64),mem=new Int32Array(256),out=Buffer.alloc(1<<16);
const op=new Int16Array(n).fill(-1),ar=new Int32Array(n),nx=new Int32Array(n);
let sp=0,cp=0,pc=0,ol=0,ip=0,k=0,e=0;
function D(q){
 const b=pr[q];let m=0;
 if(b==1)m=1;else if(b==2)m=4;else if(b>=48&&b<=51)m=2;
 if(!(b<8||b>=16&&b<=30||b>=32&&b<=34||b>=48&&b<=52||b>=64&&b<=65||b>=80&&b<=83))op[q]=-5;
 else if(q+m>=n)op[q]=-9;
 else{op[q]=b;nx[q]=q+1+m;ar[q]=b==1?(pr[q+1]<<24)>>24:b==2?pr[q+1]|pr[q+2]<<8|pr[q+3]<<16|pr[q+4]<<24:b>=48?b==51?pr[q+1]|pr[q+2]<<8:(pr[q+1]|pr[q+2]<<8)<<16>>16:0}
}
L:for(;;){
 if(k>=1e6){e=10;break}
 if(pc<0||pc>=n){e=9;break}
 if(op[pc]==-1)D(pc);
 const o=op[pc];
 if(o<0){e=-o;break}
 let c=T.charCodeAt(o);c=c>57?c-87:c-48;
 const q=c>>2,g=c&3;
 if(sp<q){e=2;break}
 if(sp-q+g>256){e=3;break}
 k++;
 const a=ar[pc],np=nx[pc];
 pc=np;
 switch(o){
  case 0:return[out.subarray(0,ol),0];
  case 1:case 2:st[sp++]=a;break;
  case 3:sp--;break;
  case 4:st[sp]=st[sp-1];sp++;break;
  case 5:{const t=st[sp-1];st[sp-1]=st[sp-2];st[sp-2]=t;break}
  case 6:st[sp]=st[sp-2];sp++;break;
  case 7:{const t=st[sp-3];st[sp-3]=st[sp-2];st[sp-2]=st[sp-1];st[sp-1]=t;break}
  case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
   const x=st[sp-2],y=st[sp-1];let r=0;
   if(o==16)r=x+y;else if(o==17)r=x-y;else if(o==18)r=Math.imul(x,y);
   else if(o>=19&&o<=22){if(!y){e=4;break L}r=o==19?Math.trunc(x/y):o==20?x%y:o==21?Math.floor((x>>>0)/(y>>>0)):(x>>>0)%(y>>>0)}
   else if(o==24)r=x&y;else if(o==25)r=x|y;else if(o==26)r=x^y;
   else if(o>=28&&o<=30)r=o==28?x<<(y&31):o==29?x>>(y&31):x>>>(y&31);
   else r=o==32?(x==y?1:0):o==33?(x<y?1:0):(x>>>0)<(y>>>0)?1:0;
   st[sp-2]=r|0;sp--;break}
  case 23:st[sp-1]=-st[sp-1];break;
  case 27:st[sp-1]=~st[sp-1];break;
  case 48:pc=np+a;break;
  case 49:if(st[--sp]==0)pc=np+a;break;
  case 50:if(st[--sp]!=0)pc=np+a;break;
  case 51:if(cp>=64){e=7;break L}cs[cp++]=np;pc=a;break;
  case 52:if(!cp){e=8;break L}pc=cs[--cp];break;
  case 64:{const d=st[sp-1];if(d<0||d>255){e=6;break L}st[sp-1]=mem[d];break}
  case 65:{const d=st[sp-1];if(d<0||d>255){e=6;break L}mem[d]=st[sp-2];sp-=2;break}
  case 80:{const s=String(st[--sp]);if(ol+s.length>65536){e=11;break L}out.write(s,ol);ol+=s.length;break}
  case 81:if(ol>=65536){e=11;break L}out[ol++]=st[--sp]&255;break;
  case 82:st[sp++]=ip<inp.length?inp[ip++]:-1;break;
  case 83:return[out.subarray(0,ol),st[--sp]&255];
 }
}
return[out.subarray(0,ol),e];
}
for(const id of fs.readdirSync(I).sort()){
 const d=p.join(I,id),o=p.join(O,id),r=run(R(d+'/program.bin'),R(d+'/input.bin'));
 fs.mkdirSync(o,{recursive:true});
 fs.writeFileSync(o+'/stdout.bin',r[0]);
 fs.writeFileSync(o+'/exit.txt',r[1]+'\n');
}
