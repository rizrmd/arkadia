"""Audit evaluated left/right foot paths and real two-foot support intervals."""
results=[]
for action,spec in LOCOMOTION.items():
 max_mirror_error=0;floor_error=0;flight=0;double_support=0;arm_errors=[]
 for i in range(240):
  t=i/240;pose(action,t);bpy.context.view_layer.update()
  a=legs['Left'][2].matrix_world@Vector((0,0,-.115));sa=arms['Left'][0].rotation_euler.x
  pose(action,(t+.5)%1);bpy.context.view_layer.update();b=legs['Right'][2].matrix_world@Vector((0,0,-.115));sb=arms['Right'][0].rotation_euler.x
  max_mirror_error=max(max_mirror_error,abs(a.y-b.y),abs(a.z-b.z));arm_errors.append(abs(sa-sb))
  phases=[t,(t+.5)%1];support=sum(p<spec['stance'] for p in phases);flight+=support==0;double_support+=support==2
  pose(action,t);bpy.context.view_layer.update()
  for name,p in zip(['Left','Right'],phases):
   if p<spec['stance']:floor_error=max(floor_error,abs((legs[name][2].matrix_world@Vector((0,0,-.115))).z))
 pose(action,0);bpy.context.view_layer.update();left_arm=arms['Left'][0].rotation_euler.x
 result={'action':action,'samples':240,'leftRightFootPathMaxError':max_mirror_error,'leftRightArmPhaseMaxError':max(arm_errors),'stanceFloorMaxError':floor_error,'flightFraction':flight/240,'doubleSupportFraction':double_support/240,'frontFootHasOppositeArm':left_arm>0,'periodSeconds':spec['period']}
 result['pass']=max_mirror_error<1e-5 and max(arm_errors)<1e-5 and floor_error<1e-5 and result['frontFootHasOppositeArm'] and (flight>0 if action=='run' else double_support>0)
 results.append(result)
json.dump({'status':'evaluated-source-proof-visual-review-still-required','results':results},open('docs/rift-runner-v2/locomotion-audit.json','w'),indent=2)
print('LOCOMOTION_AUDIT',json.dumps(results))
if not all(r['pass'] for r in results):raise RuntimeError('Locomotion phase/contact audit failed')
