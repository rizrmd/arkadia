import bpy,math,os,json,sys
from mathutils import Vector
from math import sin,cos,pi
ROOT=os.path.abspath('public/rift-runner/v2');os.makedirs(ROOT+'/prototype',exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.cycles.device='CPU'
scene.render.resolution_x=384;scene.render.resolution_y=384;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.world=bpy.data.worlds.new('Ambient');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.36,.42,.48,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
texture=bpy.data.images.load(ROOT+'/source/material-atlas.png')
def mat(name,color,rough=.85,metal=0,tile=None,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if tile is not None:
  tex=n.new('ShaderNodeTexImage');tex.image=texture;coord=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY_ADD';mapping.inputs[1].default_value=(.43,.43,0);mapping.inputs[2].default_value=(.035+.5*(tile%2),.535-.5*(tile//2),0);m.node_tree.links.new(coord.outputs['Generated'],mapping.inputs[0]);m.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector']);mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.4;mix.inputs[2].default_value=(*color,1);m.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
teal=mat('Teal hood cloth',(.17,.28,.29),tile=0);rust=mat('Weathered rust scarf',(.53,.16,.08),tile=1);leather=mat('Warm worn leather',(.30,.17,.095),tile=2);pants=mat('Charcoal trousers',(.18,.18,.17),tile=3);skin=mat('Warm skin',(.49,.30,.19),rough=.85);dark=mat('Hood inner shadow',(.025,.035,.035));hair=mat('Brown hair',(.12,.065,.035));gold=mat('Muted brass',(.48,.34,.17),.5,.65);metal=mat('Dark steel gauntlet',(.15,.2,.22),.4,.7);cyan=mat('Cyan emitter crystal',(.03,.7,.83),.25,.2,emission=.65);white=mat('Pale linen',(.55,.51,.39));black=mat('Eyes',(.018,.016,.014))
def empty(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
root=empty('Root');pelvis=empty('Pelvis',(0,0,.94),root);torso=empty('Torso',(0,0,.08),pelvis);head=empty('Head',(0,0,.67),torso);head.scale=(.86,.86,.86)
def mesh(name,verts,faces,material,parent=None):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(material);o.parent=parent;return o
def sphere(name,loc,scale,material,parent=None,sub=2):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=(0,0,0));o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=material in [skin,leather,hair]
 return o
def box(name,loc,scale,material,parent=None,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:b=o.modifiers.new('Rounded edges','BEVEL');b.width=bevel;b.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def curve(name,pts,r,material,parent=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,v in zip(s.points,pts):p.co=(*v,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);o.parent=parent;return o
# Cloth torso: narrow waist, broader shoulder, angular lower hem.
verts=[];rings=[(0,.16,.105),(.15,.18,.13),(.37,.245,.14),(.47,.21,.11)]
for z,rx,ry in rings:
 for j in range(12):a=2*pi*j/12;verts.append((rx*cos(a),ry*sin(a),z))
faces=[tuple(range(11,-1,-1))]
for k in range(3):
 for j in range(12):a=k*12+j;b=k*12+(j+1)%12;faces.append((a,b,b+12,a+12))
faces.append(tuple(range(36,48)));body=mesh('Sleeveless teal coat',verts,faces,teal,torso)
# Linen wrap front, waist belt, shoulder harness.
mesh('Front linen wrap',[(-.13,-.142,.1),(.13,-.142,.1),(.19,-.145,.37),(-.09,-.145,.42)],[(0,1,2,3)],white,torso)
curve('Cross body strap',[(-.2,-.16,.43),(.02,-.17,.24),(.15,-.14,.04)],.032,leather,torso)
curve('Back harness',[(.18,.12,.43),(-.04,.15,.22),(-.14,.1,.03)],.026,leather,torso)
# Belt loops around waist.
for z in [.0,.055]:curve('Waist belt',[(.18*cos(j*2*pi/40),.12*sin(j*2*pi/40),z) for j in range(41)],.033,leather,torso)
box('Brass belt buckle',(0,-.155,.025),(.09,.027,.065),gold,torso,.005);box('Buckle recess',(0,-.172,.025),(.055,.012,.035),dark,torso,.002)
for side in [-1,1]:
 box('Belt pouch',(side*.19,-.015,-.02),(.10,.10,.14),leather,torso,.018);box('Pouch flap',(side*.19,-.07,.035),(.105,.025,.06),leather,torso,.009);box('Pouch clasp',(side*.19,-.086,.02),(.018,.01,.026),gold,torso,.002)
# Ragged tabard, split front and back tails.
for side in [-1,1]:
 mesh('Split coat tail',[(side*.02,-.12,-.01),(side*.18,-.08,-.01),(side*.22,-.08,-.40),(side*.08,-.15,-.50)],[(0,1,2,3)],teal,torso)
curve('Tabard gold seam',[(-.08,-.157,-.06),(-.10,-.16,-.29),(-.06,-.16,-.37)],.006,gold,torso)
# Face: oriented forward (-Y), hood shell behind.
face=sphere('Face',(0,-.055,.12),(.15,.12,.215),skin,head)
for v in face.data.vertices:
 if v.co.z<0:v.co.x*=1+v.co.z*.3
sphere('Nose',(0,-.194,.10),(.025,.033,.045),skin,head)
for side in [-1,1]:
 sphere('Eye white',(side*.064,-.178,.16),(.024,.009,.010),white,head);sphere('Eye iris',(side*.064,-.188,.16),(.009,.007,.010),black,head)
 curve('Brow',[(side*.032,-.185,.197),(side*.10,-.17,.19)],.012,hair,head)
curve('Mouth',[(-.035,-.18,.025),(0,-.187,.019),(.035,-.18,.025)],.005,leather,head)
# Brown swept locks overlap forehead, not the eyes.
for i in range(7):
 x=(i-3)*.043;mesh('Hair fringe',[(x-.035,-.13,.28),(x+.035,-.13,.28),(x+.045,-.195,.18-abs(i-3)*.012)],[(0,1,2)],hair,head)
verts=[]
for k,(y,rx,rz,zoff) in enumerate([(-.19,.215,.29,.13),(.02,.26,.33,.16),(.20,.18,.25,.16),(.24,.025,.055,.17)]):
 for j in range(24):a=2*pi*j/24;verts.append((rx*sin(a),y,zoff+rz*cos(a)+.08*max(0,cos(a))**12))
faces=[]
for k in range(3):
 for j in range(24):a=k*24+j;b=k*24+(j+1)%24;faces.append((a,b,b+24,a+24))
hood=mesh('Hood shell',verts,faces,teal,head);sol=hood.modifiers.new('Cloth thickness','SOLIDIFY');sol.thickness=.018
curve('Hood rim',[(.215*sin(j*2*pi/48),-.195,.13+.29*cos(j*2*pi/48)+.08*max(0,cos(j*2*pi/48))**12) for j in range(49)],.014,teal,head)
curve('Hood gold broken seam',[(-.06,-.205,.37),(0,-.205,.42),(.05,-.205,.35)],.005,gold,head)
# Scarf collar wraps lower face and shoulders.
for z,rx,ry in [(.51,.21,.15),(.55,.225,.16),(.59,.19,.15)]:curve('Scarf folds',[(rx*cos(j*2*pi/32),ry*sin(j*2*pi/32)-.025,z) for j in range(33)],.037,rust,torso)
scarf=empty('Scarf tail',(0,.12,.55),torso)
scarfverts=[]
for k in range(9):
 z=-k*.125;y=k*.035;x=.07*sin(k*.6)+k*.012
 for side in [-1,1]:scarfverts.append((x+side*(.09-.003*k),y,z+(0 if k<8 else (side+1)*.022)))
scarffaces=[(k*2,k*2+1,k*2+3,k*2+2) for k in range(8)];tail=mesh('Long rust scarf',scarfverts,scarffaces,rust,scarf);sol=tail.modifiers.new('Scarf thickness','SOLIDIFY');sol.thickness=.009
arms={};legs={}
for side,name in [(1,'Left'),(-1,'Right')]:
 shoulder=empty(name+' shoulder',(side*.24,0,.40),torso);elbow=empty(name+' elbow',(0,0,-.30),shoulder);wrist=empty(name+' wrist',(0,0,-.28),elbow);arms[name]=(shoulder,elbow,wrist)
 sphere(name+' upper arm',(0,0,-.135),(.082,.085,.18),skin,shoulder)
 if name=='Right':sphere('Short teal sleeve',(0,.005,-.06),(.105,.11,.12),teal,shoulder)
 curve(name+' upper armband',[(.083*cos(j*2*pi/24),.085*sin(j*2*pi/24),-.16) for j in range(25)],.018,leather,shoulder)
 sphere(name+' forearm',(0,0,-.12),(.07,.074,.16),leather,elbow)
 for z in [-.04,-.20]:curve(name+' bracer strap',[(.073*cos(j*2*pi/24),.078*sin(j*2*pi/24),z) for j in range(25)],.018,metal if name=='Right' else leather,elbow)
 sphere(name+' fingerless glove',(0,-.005,-.05),(.064,.048,.085),leather,wrist)
 for j in range(4):sphere(name+' finger',((j-1.5)*.026,-.01,-.13),(.014,.022,.04),skin,wrist)
 sphere(name+' thumb',(-side*.066,-.02,-.055),(.022,.024,.045),skin,wrist)
 if name=='Right':
  box('Emitter steel housing',(-.05,-.015,-.12),(.085,.11,.23),metal,elbow,.015)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);gem=bpy.context.object;gem.name='Canonical RIGHT cyan crystal';gem.parent=elbow;gem.location=(-.10,-.025,-.12);gem.scale=(.035,.055,.115);gem.data.materials.append(cyan)
  for z in [-.21,-.025]:box('Emitter brass clamp',(-.07,-.02,z),(.09,.125,.02),gold,elbow,.004)
 hip=empty(name+' hip',(side*.17,0,0),pelvis);knee=empty(name+' knee',(0,0,-.43),hip);ankle=empty(name+' ankle',(0,0,-.39),knee);legs[name]=(hip,knee,ankle)
 sphere(name+' baggy thigh',(0,0,-.20),(.115,.13,.245),pants,hip);sphere(name+' knee',(0,-.01,-.015),(.092,.10,.10),pants,knee);sphere(name+' calf',(0,0,-.18),(.081,.088,.20),leather,knee)
 for z in [-.07,-.19,-.3]:curve(name+' boot wrap',[(.085*cos(j*2*pi/20),.09*sin(j*2*pi/20),z) for j in range(21)],.014,leather,knee)
 sphere(name+' boot',(0,-.065,-.035),(.09,.15,.09),leather,ankle);box(name+' boot sole',(0,-.06,-.095),(.18,.28,.035),dark,ankle,.012)
 curve(name+' boot laces',[(-.04,-.14,-.27),(.04,-.14,-.29),(-.04,-.14,-.31),(.04,-.14,-.33)],.009,gold,knee)
# Lighting and fixed orthographic review camera.
def area(name,loc,power,size,color):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-3,-4,6),450,4,(1,.88,.72));area('Fill',(4,-1,3),170,3,(.65,.8,1));area('Rim',(1,4,4),300,3,(.60,.82,1))
bpy.ops.object.camera_add(location=(0,-6,4.4));cam=bpy.context.object;cam.name='Fixed orthographic camera';target=Vector((0,0,1.05));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.8;scene.camera=cam
# Shared rest pose, anatomically fixed emitter, deterministic direction rotation.
def place_foot(name,y,z,pelvis_z):
 h,k,a=legs[name];dy=y;dz=z-pelvis_z;L1=.43;L2=.39;d=min(.819,max(.1,math.hypot(dy,dz)))
 beta=pi-math.acos(max(-1,min(1,(L1*L1+L2*L2-d*d)/(2*L1*L2))))
 theta=math.atan2(dy,-dz)-math.atan2(L2*sin(beta),L1+L2*cos(beta))
 h.rotation_euler=(theta,0,0);k.rotation_euler=(beta,0,0);a.rotation_euler=(-theta-beta,0,0)
def neutral():
 root.rotation_euler=(0,0,0);torso.scale=(1,1,1);pelvis.location=(0,0,.92);pelvis.rotation_euler=(0,0,0);torso.rotation_euler=(0,0,0);head.rotation_euler=(0,0,0)
 for name,(s,e,w) in arms.items():s.rotation_euler=(-.1,(-.12 if name=='Left' else .12),0);e.rotation_euler=(.3,0,0);w.rotation_euler=(0,0,0)
 for name in legs:place_foot(name,0,.115,pelvis.location.z)
 scarf.rotation_euler=(0,0,0)
def pose(action,t):
 neutral()
 if action=='idle':
  breath=sin(t*2*pi);torso.scale=(1+breath*.009,1+breath*.012,1+breath*.005);scarf.rotation_euler.x=.025*sin(t*2*pi+.4)
 elif action=='run':
  torso.rotation_euler.x=.16;pelvis.location.z=.85+.018*cos(t*4*pi)
  for name,phase in [('Left',t),('Right',(t+.5)%1)]:
   if phase<.6:y=-.275+.55*phase/.6;z=.115
   else:
    u=(phase-.6)/.4;y=(2*u**3-3*u**2+1)*.275+(u**3-2*u**2+u)*(.55/.6*.4)+(-2*u**3+3*u**2)*(-.275)+(u**3-u**2)*(.55/.6*.4);z=.115+.16*sin(pi*u)**2
   place_foot(name,y,z,pelvis.location.z)
   s,el,w=arms[name];s.rotation_euler.x=-.65*cos(phase*2*pi);el.rotation_euler.x=.8
  scarf.rotation_euler.x=.55+.04*sin(t*4*pi)
 else:
  # Smooth zero-velocity envelopes guarantee shared neutral at both clip boundaries.
  e=sin(pi*t)**2
  if action=='pulse-shot':
   s,el,w=arms['Right'];s.rotation_euler.x=-1.45*e;el.rotation_euler.x=-.15*(1-e);torso.rotation_euler.x=-.10*e;legs['Left'][0].rotation_euler.x=.13*e;legs['Right'][0].rotation_euler.x=-.13*e
  elif action=='phase-dash':
   torso.rotation_euler.x=.7*e;pelvis.location.z=.94-.16*e
   for name,(h,k,a) in legs.items():h.rotation_euler.x=(.6 if name=='Left' else -.8)*e;k.rotation_euler.x=-.65*e
   for s,el,w in arms.values():s.rotation_euler.x=.6*e;el.rotation_euler.x=-.5*e
   scarf.rotation_euler.x=.8*e
  elif action=='rift-trap':
   pelvis.location.z=.94-.38*e;torso.rotation_euler.x=.55*e
   for h,k,a in legs.values():h.rotation_euler.x=.65*e;k.rotation_euler.x=-1.15*e;a.rotation_euler.x=.5*e
   s,el,w=arms['Right'];s.rotation_euler.x=-.42*e;el.rotation_euler.x=.15*e
  elif action=='overdrive':
   for name,(s,el,w) in arms.items():s.rotation_euler.y=(-.95 if name=='Left' else .95)*e;s.rotation_euler.x=-.15*e;el.rotation_euler.x=-.15*(1-e)
   torso.rotation_euler.x=-.1*e;head.rotation_euler.x=-.15*e
neutral()
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/rift-runner-v2/rift-runner-rig.blend'))
DIRECTIONS=[('S',0),('SW',-pi/4),('W',-pi/2),('NW',-3*pi/4),('N',pi),('NE',3*pi/4),('E',pi/2),('SE',pi/4)]
mode=sys.argv[1] if len(sys.argv)>1 else 'turnaround'
if mode=='run-se':
 os.makedirs(ROOT+'/run-proof',exist_ok=True)
 for f in range(12):
  pose('run',f/12);root.rotation_euler.z=pi/4;scene.render.filepath=ROOT+f'/run-proof/frame-{f:02d}.png';bpy.ops.render.render(write_still=True)
else:
 for direction,angle in DIRECTIONS:
  pose('idle',0);root.rotation_euler.z=angle;scene.render.filepath=ROOT+'/prototype/neutral-'+direction+'.png';bpy.ops.render.render(write_still=True)
# Dense numerical audit of actual evaluated scene transforms.
samples=[];previous={};max_stance_slide=0;max_floor_error=0
for i in range(241):
 t=i/240;pose('run',t);bpy.context.view_layer.update()
 for name,phase in [('Left',t%1),('Right',(t+.5)%1)]:
  foot=legs[name][2].matrix_world@Vector((0,0,-.115));world_y=foot.y-(.55/.6)*t;stance=phase<.6
  if stance:
   max_floor_error=max(max_floor_error,abs(foot.z))
   if name in previous and previous[name]['stance'] and phase>previous[name]['phase']:max_stance_slide=max(max_stance_slide,abs(world_y-previous[name]['worldY']))
  record={'frame':i,'time':t,'foot':name,'phase':phase,'stance':stance,'worldY':world_y,'height':foot.z};samples.append(record);previous[name]=record
report={'model':'single canonical rig, emitter on anatomical right arm, matching concept front view','sampleCount':len(samples),'maxPlantedFootDisplacementPerSample':max_stance_slide,'maxStanceFloorError':max_floor_error,'stanceAuditPass':max_stance_slide<1e-5 and max_floor_error<1e-5,'samples':samples}
with open('docs/rift-runner-v2/run-contact-audit.json','w') as f:json.dump(report,f,indent=2)
print('RENDER_COMPLETE',report['stanceAuditPass'],max_stance_slide,max_floor_error)
