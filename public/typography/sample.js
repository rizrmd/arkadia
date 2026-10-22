const canvas=document.querySelector('canvas');
function paint(){
 const dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=300*dpr;canvas.height=110*dpr;
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 c.font='600 14px Georgia, serif';c.lineWidth=2;c.strokeStyle='#160e08';
 c.strokeText('CRITICAL',150,32);c.fillStyle='#f3e6c5';c.fillText('CRITICAL',150,32);
 c.font='600 32px Georgia, serif';c.lineWidth=2;c.strokeText('248',150,64);
 const light=c.createLinearGradient(0,48,0,80);light.addColorStop(0,'#fff4d4');light.addColorStop(.5,'#e8bd62');light.addColorStop(1,'#a67635');
 c.fillStyle=light;c.fillText('248',150,64);
}
window.addEventListener('resize',paint);paint();
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
 document.body.dataset.light=button.dataset.mode;
 for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b===button));
});
document.querySelector('input').addEventListener('input',e=>{
 const value=Number(e.target.value);
 document.querySelector('#hp').textContent=`${value} / 100 HP`;
 document.querySelector('.hp i').style.width=`${value}%`;
});
