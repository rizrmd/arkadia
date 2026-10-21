"""Evaluate the isolated source without rendering: anatomy, endpoints and world foot constraints."""
from pathlib import Path
source=Path('scripts/ember-warden/rig.py').read_text().split("actions=['idle'")[0]
exec(compile(source,'scripts/ember-warden/rig.py','exec'),globals())
def snapshot():
 bpy.context.view_layer.update();return {o.name:[v for row in o.matrix_world for v in row] for o in scene.objects if o.type=='MESH'}
records=[]
for action in ['flame-fan','cinder-step','ember-snare','furnace-heart','hurt']:
 pose(action,0);a=snapshot();pose(action,1);b=snapshot();error=max(abs(x-y) for name in a for x,y in zip(a[name],b[name]));records.append({'action':action,'endpointMatrixError':error,'pass':error<1e-6})
pose('death',.8);a=snapshot();pose('death',1);b=snapshot();error=max(abs(x-y) for name in a for x,y in zip(a[name],b[name]));records.append({'action':'death','terminalHoldMatrixError':error,'pass':error<1e-6})
contacts=[]
for action in ['run','flame-fan-moving']:
 previous={};slide=0;floor=0
 for i in range(241):
  t=i/240;pose(action,t);bpy.context.view_layer.update()
  for name,phase in [('Left',t%1),('Right',(t+.5)%1)]:
   p=legs[name][2].matrix_world@Vector((0,0,-.115));world_y=p.y-(.55/.6)*t
   if phase<.6:
    floor=max(floor,abs(p.z))
    if name in previous and previous[name][0]<phase:slide=max(slide,abs(world_y-previous[name][1]))
    previous[name]=(phase,world_y)
   else:previous.pop(name,None)
 contacts.append({'action':action,'samples':482,'maxStanceSlide':slide,'maxStanceFloorError':floor,'pass':slide<1e-5 and floor<1e-5})
floor=[]
for action in ['ember-snare','death']:
 minimum=1;where=0
 for i in range(41):
  t=i/40;pose(action,t);bpy.context.view_layer.update();z=min((o.matrix_world@v.co).z for o in scene.objects if o.type=='MESH' for v in o.data.vertices)
  if z<minimum:minimum=z;where=t
 floor.append({'action':action,'minimumMeshHeight':minimum,'atTime':where,'pass':minimum>=-.01})
report={'status':'source-constraints-not-final-art-acceptance','endpoints':records,'contacts':contacts,'floor':floor,'rightGauntlet':{'anatomicalSide':'Right','parent':arms['Right'][1].name,'mirroring':False}}
json.dump(report,open('docs/ember-warden/source-audit.json','w'),indent=2);print(json.dumps(report))
