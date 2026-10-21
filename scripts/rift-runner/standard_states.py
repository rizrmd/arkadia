"""Standard hurt/death states on the canonical rig. Death has a held terminal pose."""
canonical_pose=pose
_tail_rest=[v.co.copy() for v in tail.data.vertices]

def state_curve(t,values):
 times=[0,.12,.32,.55,.80,1]
 for i in range(5):
  if t<=times[i+1]:
   u=max(0,min(1,(t-times[i])/(times[i+1]-times[i])));u=u*u*(3-2*u);return values[i]*(1-u)+values[i+1]*u
 return values[-1]

def pose(action,t):
 for v,co in zip(tail.data.vertices,_tail_rest):v.co=co
 if action not in ['hurt','death']:return canonical_pose(action,t)
 canonical_pose('idle',0)
 if action=='hurt':
  hit=state_curve(t,[0,1,.75,.30,.05,0]);pelvis.location.z=.92-.12*hit;torso.rotation_euler.x=-.22*hit;torso.rotation_euler.y=.05*hit;head.rotation_euler.x=-.12*hit;head.rotation_euler.z=.08*hit
  for name in legs:place_foot(name,0,.115,pelvis.location.z)
  for name,(s,e,w) in arms.items():s.rotation_euler.x=-.1-.4*hit;s.rotation_euler.y=(-1 if name=='Left' else 1)*(.12+.20*hit);e.rotation_euler.x=.3+.7*hit
  scarf.rotation_euler.x=-.10*hit
 else:
  hit=state_curve(t,[0,1,.65,.25,0,0]);fall=state_curve(t,[0,-.10,-.35,-1.05,-pi/2,-pi/2]);settle=state_curve(t,[0,0,.1,.65,1,1]);root.rotation_euler.x=fall;root.location.y=state_curve(t,[0,0,-.06,-.28,-.48,-.48]);pelvis.location.z=.92-.09*hit;torso.rotation_euler.x=-.17*hit+.10*settle;head.rotation_euler.x=-.1*hit+.05*settle
  for name in legs:place_foot(name,0,.115,pelvis.location.z)
  for name,(s,e,w) in arms.items():s.rotation_euler.x=-.1-.25*hit;s.rotation_euler.y=(-1 if name=='Left' else 1)*(.12+.35*settle);e.rotation_euler.x=.3+.35*settle+.4*hit
  bpy.context.view_layer.update()
  # Lift only enough to keep actual body vertices above the ground while toppling.
  objects=[o for o in scene.objects if o.type=='MESH' and o!=tail]
  minimum=min((o.matrix_world@v.co).z for o in objects for v in o.data.vertices);root.location.z=max(0,.001-minimum)*settle;bpy.context.view_layer.update()
  # Relax the scarf onto the ground instead of using its standing shape as a support.
  relax=state_curve(t,[0,0,0,.6,1,1]);anchor=scarf.matrix_world.translation.copy();inverse=tail.matrix_world.inverted()
  for i,(v,base) in enumerate(zip(tail.data.vertices,_tail_rest)):
   progress=(i//2)/8;current=tail.matrix_world@base;target=Vector((anchor.x+base.x-.16*progress,anchor.y-.8*progress,.012+.07*(1-progress)));world=current.lerp(target,relax);world.z=max(.008,world.z);v.co=inverse@world
  tail.data.update()
