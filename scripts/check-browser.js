(async()=>{
 const failures=[],checks=[];const test=(condition,name)=>{(condition?checks:failures).push(name);};
 const state=()=>window.__ARKADIA__,world=window.__ARKADIA_APP__.stage.children[0],initial=state(),seed=initial.seed,hash=initial.hash;
 test(world.children[1].children.length===0&&world.children[2].sortableChildren,'floor grid beneath sorted props');
 test(initial.tiles===100&&initial.assets===15&&!initial.previewUsed,'100 individual tiles, twelve kit crops and three wall additions, no arena preview');
 document.querySelector('#generate').click();test(state().hash===hash,'same seed stable');document.querySelector('#next').click();test(state().hash!==hash,'different seed changes layout');document.querySelector('#seed').value=seed;document.querySelector('#generate').click();test(state().hash===hash,'restored seed matches');
 document.querySelector('#grid').click();test(world.children[1].children.length===100,'grid geometry visible');
 document.querySelector('#sort').click();test(!world.children[2].sortableChildren,'sort toggle off');document.querySelector('#sort').click();window.__ARKADIA_APP__.render();test(world.children[2].children.every((c,i,a)=>i===0||a[i-1].zIndex<=c.zIndex),'props sorted by ground Y');
 document.activeElement?.blur();window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));test(state().probeY===8,'depth probe keyboard movement');
 const view=document.querySelector('#viewport'),scale=world.scale.x;view.dispatchEvent(new WheelEvent('wheel',{deltaY:-200,clientX:800,clientY:400,bubbles:true,cancelable:true}));test(world.scale.x>scale,'cursor anchored zoom handler');
 const oldCapture=view.setPointerCapture;view.setPointerCapture=()=>{};const oldX=world.x;view.dispatchEvent(new PointerEvent('pointerdown',{clientX:700,clientY:400,pointerId:1,bubbles:true}));view.dispatchEvent(new PointerEvent('pointermove',{clientX:750,clientY:420,pointerId:1,bubbles:true}));view.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));view.setPointerCapture=oldCapture;test(world.x===oldX+50,'pan handler moves camera');document.querySelector('#reset').click();
 document.querySelector('#props').click();test(!world.children[2].visible,'floor only toggle');document.querySelector('#props').click();
 document.querySelector('#checker').click();test(view.style.background.includes('conic'),'transparency checker');document.querySelector('#checker').click();
 window.__VALIDATION__={checks,failures,seed,hash,renderer:window.__ARKADIA_APP__.renderer.type,tiles:state().tiles,props:state().props,url:location.href};return JSON.stringify(window.__VALIDATION__);
})()
