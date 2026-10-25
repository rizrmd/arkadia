package sim

import (
 "math"
 "testing"
)

func TestFlameFanSectorEveryRank(t *testing.T) {
 for rank:=1;rank<=5;rank++ {
  area:=1+float64(rank-1)*.18
  for _, angle:=range []float64{0,.7,-.7} {
   if !flameFanContains(Vec{},Vec{1,0},Vec{2*math.Cos(angle),2*math.Sin(angle)},area) { t.Fatalf("rank %d misses fan target",rank) }
  }
  for _,target:=range []Vec{{-1,0},{0,2},{4.4*area+.4,0}} { if flameFanContains(Vec{},Vec{1,0},target,area) {t.Fatalf("rank %d hits excluded target %v",rank,target)} }
 }
}

func TestFlameFanAutoCastHitsAllTargetsAtLevelOne(t *testing.T) {
 w:=newTestWorld(t)
 p:=w.AddPlayer("fan","Fan",100)
 p.Hero="ember-warden"; p.Run=newProgressionForHero("ember-warden")
 at:=Vec{gateTile+4,gateTile+4}; px:=TilePoint(at.X,at.Y)
 p.X,p.Y,p.F.Pos=px.X,px.Y,at
 w.Enemies=nil
 for i:=0;i<6;i++ { pos:=Vec{at.X+1.2+float64(i)*.1,at.Y+.3}; e:=&Enemy{ID:i+1,F:newFighter(Revenant,pos),Home:pos};e.F.HP=100;w.Enemies=append(w.Enemies,e) }
 w.autoCastInAoE(p)
 for _,e:=range w.Enemies {if e.F.HP>=100 {t.Fatalf("Lv.1 missed target %d",e.ID)}}
}
