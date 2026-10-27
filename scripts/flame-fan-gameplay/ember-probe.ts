import {Application,Container} from 'pixi.js';
import {createGameplayFlameFan} from '../../src/fx/flame-fan-gameplay';
export async function probe(width:number,height:number){
 console.log("probe init");const app=new Application();await app.init({width,height,preference:'webgl',background:0x182025,autoStart:false});document.body.style.margin="0";app.canvas.style.width=width+"px";app.canvas.style.height=height+"px";document.body.append(app.canvas);console.log("app initialized");
 const parent=new Container();app.stage.addChild(parent);const fx=createGameplayFlameFan(parent,undefined,undefined,app.renderer);console.log("preparing");await fx.prepare();console.log("prepared");const rows=[];
 for(let rank=1;rank<=5;rank++){fx.clear();fx.spawn(0,0,0,4.4*(1+(rank-1)*.18),rank);fx.frame(.14,{x:width*.12,y:height*.45,scale:width<600?.25:.8});app.render();rows.push(fx.snapshot()[0]);}
 return {rows,fx,app};
}
