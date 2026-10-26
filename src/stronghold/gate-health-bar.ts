import {BlurFilter, Container, Graphics} from 'pixi.js';
import {MsdfText} from '../typography/text';
import {ROLES} from '../typography/tokens';

/** World-attached Pixi meter. Damage reveals it for one second after the latest hit. */
export class GateHealthBar extends Container {
 private plate = this.addChild(new Graphics());
 private fill = this.addChild(new Graphics());
 private caption = this.addChild(new MsdfText({...ROLES['hud-value'], font:'console', size:15, fill:0xfff8e7,
  outline:{color:0x050507, alpha:1, width:1}}, ''));
 private blur = new BlurFilter({strength:3, quality:3});
 private hp = 100;
 private max = 100;
 private clearUntil = 0;
 private blurred = true;
 constructor() {
  super();
  this.caption.text = 'GATE  100 / 100';
  this.caption.place(0, 0, .5);
  this.plate.roundRect(-120, -20, 240, 30, 4).fill({color:0x080e15,alpha:.9}).stroke({color:0xadc5cb,width:1});
  this.filters = [this.blur];
  this.eventMode = 'none';
  this.redraw();
 }
 setHealth(hp:number, max=100, now=performance.now()) {
  const next = Number.isFinite(hp) ? Math.max(0,hp) : 0;
  const nextMax = Number.isFinite(max) ? Math.max(1,max) : 1;
  if(next < this.hp) this.clearUntil = now + 1000;
  if(next !== this.hp || nextMax !== this.max) {
   this.hp = next; this.max = nextMax; this.redraw();
  }
  this.tick(now);
 }
 tick(now=performance.now()) {
  const blurred = now >= this.clearUntil;
  if(blurred === this.blurred) return;
  this.blurred = blurred;
  this.filters = blurred ? [this.blur] : null;
 }
 private redraw() {
  const ratio = Math.min(1,this.hp / this.max);
  this.fill.clear();
  if(ratio > 0) this.fill.rect(-115, 3, 230*ratio, 4).fill(0x00d5ed);
  this.caption.text = `GATE  ${Math.floor(this.hp)} / ${Math.floor(this.max)}`;
  this.caption.place(0, 0, .5);
 }
 override destroy() {
  super.destroy({children:true});
  this.blur.destroy();
 }
}
