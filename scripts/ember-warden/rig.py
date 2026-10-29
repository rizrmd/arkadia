# Derived motion and mesh helpers from scripts/rift-runner/rig.py; Ember source is isolated.
import bpy,math,os,json,sys,hashlib,tempfile
from PIL import Image
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector,Quaternion
from math import sin,cos,pi
ROOT=os.path.abspath('public/ember-warden/v1');os.makedirs(ROOT+'/sheets',exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True;scene.cycles.device='CPU'
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
teal=mat('Teal hood cloth',(.65,.36,.085),tile=0);rust=mat('Weathered rust scarf',(.53,.16,.08),tile=1);leather=mat('Warm worn leather',(.30,.17,.095),tile=2);pants=mat('Charcoal trousers',(.13,.13,.14),tile=1);skin=mat('Warm skin',(.49,.30,.19),rough=.85);dark=mat('Hood inner shadow',(.025,.035,.035));hair=mat('Dark curls',(.018,.009,.005));gold=mat('Muted brass',(.52,.29,.09),.5,.65,tile=3);metal=mat('Dark steel gauntlet',(.45,.25,.07),.4,.7,tile=3);cyan=mat('Cyan emitter crystal',(1,.27,.018),.25,.2,emission=.65);white=mat('Pale linen',(.40,.37,.29));black=mat('Eyes',(.018,.016,.014))
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
mesh('Front linen wrap',[(-.12,-.142,.11),(.07,-.142,.11),(.16,-.145,.34),(-.08,-.145,.40)],[(0,1,2,3)],white,torso)
curve('Cross body strap',[(-.2,-.16,.43),(.02,-.17,.24),(.15,-.14,.04)],.032,leather,torso)
curve('Back harness',[(.18,.12,.43),(-.04,.15,.22),(-.14,.1,.03)],.026,leather,torso)
# Belt loops around waist.
for z in [.0,.055]:curve('Waist belt',[(.18*cos(j*2*pi/40),.12*sin(j*2*pi/40),z) for j in range(41)],.033,leather,torso)
box('Brass belt buckle',(0,-.155,.025),(.09,.027,.065),gold,torso,.005);box('Buckle recess',(0,-.172,.025),(.055,.012,.035),dark,torso,.002)
for side in [-1,1]:
 box('Belt pouch',(side*.19,-.015,-.02),(.10,.10,.14),leather,torso,.018);box('Pouch flap',(side*.19,-.07,.035),(.105,.025,.06),leather,torso,.009);box('Pouch clasp',(side*.19,-.086,.02),(.018,.01,.026),gold,torso,.002)
# Ragged tabard, split front and back tails.
for side in []:
 mesh('Split coat tail',[(side*.02,-.12,-.01),(side*.18,-.08,-.01),(side*.22,-.08,-.40),(side*.08,-.15,-.50)],[(0,1,2,3)],teal,torso)
curve('Tabard gold seam',[(-.08,-.157,-.06),(-.10,-.16,-.29),(-.06,-.16,-.37)],.006,gold,torso)
# Face: oriented forward (-Y), hood shell behind.
face=sphere('Face',(0,-.055,.12),(.15,.12,.215),skin,head)
for v in face.data.vertices:
 if v.co.z<0:v.co.x*=1+v.co.z*.3
sphere('Nose',(0,-.194,.10),(.025,.033,.045),skin,head)
for side in [-1,1]:
 sphere('Eye',(side*.059,-.178,.16),(.020,.009,.008),black,head)
 curve('Upper eyelid',[(side*.035,-.182,.171),(side*.061,-.186,.176),(side*.086,-.176,.169)],.005,skin,head)
 curve('Brow',[(side*.032,-.185,.197),(side*.10,-.17,.19)],.012,hair,head)
curve('Mouth',[(-.035,-.18,.025),(0,-.187,.019),(.035,-.18,.025)],.005,leather,head)
# Brown swept locks overlap forehead, not the eyes.
for i in range(7):
 x=(i-3)*.043;mesh('Hair fringe',[(x-.035,-.13,.28),(x+.035,-.13,.28),(x+.045,-.195,.18-abs(i-3)*.012)],[(0,1,2)],hair,head)
# Canonical Ember identity: exposed dark curls and a cropped work jacket, no hood/scarf.
for i in range(32):
 a=i*2.399963;z=.12+.20*((i%8)/7);r=.15 if z<.26 else .13
 sphere('Dark curl',(r*cos(a),.015+r*sin(a),z),(.055,.048,.055),hair,head)
sphere('Crown curls',(0,.025,.30),(.155,.145,.10),hair,head)
for side in [-1,1]:
 mesh('Ochre jacket lapel',[(side*.025,-.15,.19),(side*.08,-.16,.47),(side*.19,-.13,.40),(side*.10,-.16,.27)],[(0,1,2,3)],teal,torso)
curve('Jacket hem',[(.17*cos(j*2*pi/36),.12*sin(j*2*pi/36),.09) for j in range(37)],.012,gold,torso)
# Empty compatibility joints retained for the shared motion primitives.
scarf=empty('Unused cloth anchor',(0,.12,.55),torso)
tail=mesh('Unused hidden cloth',[],[],teal,scarf)
arms={};legs={}
for side,name in [(1,'Left'),(-1,'Right')]:
 shoulder=empty(name+' shoulder',(side*.24,0,.40),torso);elbow=empty(name+' elbow',(0,0,-.30),shoulder);wrist=empty(name+' wrist',(0,0,-.28),elbow);arms[name]=(shoulder,elbow,wrist)
 sphere(name+' upper arm',(0,0,-.135),(.082,.085,.18),teal,shoulder)
 if True:sphere('Rolled ochre sleeve',(0,.005,-.06),(.105,.11,.12),teal,shoulder)
 curve(name+' upper armband',[(.083*cos(j*2*pi/24),.085*sin(j*2*pi/24),-.16) for j in range(25)],.018,leather,shoulder)
 sphere(name+' forearm',(0,0,-.12),(.07,.074,.16),skin,elbow)
 for z in [-.04,-.20]:curve(name+' bracer strap',[(.073*cos(j*2*pi/24),.078*sin(j*2*pi/24),z) for j in range(25)],.018,metal if name=='Right' else skin,elbow)
 sphere(name+' fingerless glove',(0,-.005,-.05),(.064,.048,.085),leather,wrist)
 for j in range(4):sphere(name+' finger',((j-1.5)*.026,-.01,-.13),(.014,.022,.04),skin,wrist)
 sphere(name+' thumb',(-side*.066,-.02,-.055),(.022,.024,.045),skin,wrist)
 if name=='Right':
  box('Emitter steel housing',(-.05,-.015,-.12),(.085,.11,.23),metal,elbow,.015)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);gem=bpy.context.object;gem.name='Canonical RIGHT bronze fire core';gem.parent=elbow;gem.location=(-.10,-.025,-.12);gem.scale=(.035,.055,.115);gem.data.materials.append(cyan)
  for z in [-.21,-.025]:box('Emitter brass clamp',(-.07,-.02,z),(.09,.125,.02),gold,elbow,.004)
 hip=empty(name+' hip',(side*.17,0,0),pelvis);knee=empty(name+' knee',(0,0,-.43),hip);ankle=empty(name+' ankle',(0,0,-.39),knee);legs[name]=(hip,knee,ankle)
 sphere(name+' baggy thigh',(0,0,-.20),(.115,.13,.245),pants,hip);sphere(name+' knee',(0,-.01,-.015),(.092,.10,.10),pants,knee);sphere(name+' calf',(0,0,-.18),(.081,.088,.20),leather,knee)
 for z in [-.07,-.19,-.3]:curve(name+' boot wrap',[(.085*cos(j*2*pi/20),.09*sin(j*2*pi/20),z) for j in range(21)],.014,leather,knee)
 outline=[(-.065,.08),(.065,.08),(.082,-.08),(.057,-.21),(-.057,-.21),(-.082,-.08)]
 bv=[]
 for zlayer in [0,1]:
  for x,y in outline:bv.append((x,y,-.112 if zlayer==0 else (.02 if y>0 else -.035)))
 bf=[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(j,(j+1)%6,(j+1)%6+6,j+6) for j in range(6)]
 boot=mesh(name+' tapered leather boot',bv,bf,leather,ankle);bevel=boot.modifiers.new('Soft leather edges','BEVEL');bevel.width=.012;bevel.segments=2;boot.modifiers.new('Normals','WEIGHTED_NORMAL')
 sole=mesh(name+' thin sole',[(x,y,-.115) for x,y in outline]+[(x,y,-.092) for x,y in outline],bf,dark,ankle)
 curve(name+' boot laces',[(-.04,-.14,-.27),(.04,-.14,-.29),(-.04,-.14,-.31),(.04,-.14,-.33)],.009,gold,knee)
# Painterly form accents are actual geometry, consistent through rotation.
for name in ['Left','Right']:
 h,k,a=legs[name]
 for x,y,z in [(-.055,-.12,-.10),(.035,-.127,-.20),(-.025,-.11,-.30)]:curve(name+' trouser crease',[(x-.025,y,z+.05),(x,y-.01,z),(x+.025,y,z-.045)],.006,teal,h)
 if name=='Right':curve('Thigh equipment strap',[(.116*cos(j*2*pi/24),.13*sin(j*2*pi/24),-.24) for j in range(25)],.018,leather,h)
for offset in [0,.075]:curve('Linen wrap fold',[(-.10,-.152,.17+offset),(.0,-.158,.22+offset),(.10,-.154,.27+offset)],.005,pants,torso)
curve('Left shoulder cloth seam',[(.20,-.08,.43),(.16,-.13,.35),(.18,-.13,.24)],.006,gold,torso)
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
def arm_to(name,target_world,hand_orientation=None,weight=1):
 s,e,w=arms[name];qstart=s.rotation_euler.to_quaternion();estart=e.rotation_euler.to_quaternion();wstart=w.rotation_euler.to_quaternion();bpy.context.view_layer.update();A=Vector(s.location);B=torso.matrix_world.inverted()@Vector(target_world);D=B-A;distance=min(.579,max(.04,D.length));u=D.normalized();side=1 if name=='Left' else -1;pole=Vector((side*.8,.30,.32))-A;bend=pole-u*pole.dot(u)
 if bend.length<.001:bend=Vector((side,0,0))
 bend.normalize();along=(.30**2-.28**2+distance**2)/(2*distance);height=math.sqrt(max(0,.30**2-along**2));C=A+u*along+bend*height;B=A+u*distance
 q1=Vector((0,0,-1)).rotation_difference(C-A);q2=Vector((0,0,-1)).rotation_difference(B-C);s.rotation_mode=e.rotation_mode='QUATERNION';s.rotation_quaternion=qstart.slerp(q1,weight);e.rotation_quaternion=estart.slerp(q1.inverted()@q2,weight)
 if hand_orientation is not None:
  w.rotation_mode='QUATERNION';qworld=Quaternion((1,0,0),hand_orientation);desired=(torso.matrix_world.to_quaternion()@s.rotation_quaternion@e.rotation_quaternion).inverted()@qworld;w.rotation_quaternion=wstart.slerp(desired,weight)
 return B

def keyvalue(t,values):
 times=[0,.20,.45,.60,.78,1]
 for i in range(5):
  if t<=times[i+1]:u=(t-times[i])/(times[i+1]-times[i]);u=max(0,min(1,u));u=u*u*(3-2*u);return values[i]*(1-u)+values[i+1]*u
 return values[-1]
def neutral():
 root.location=(0,0,0);root.rotation_euler=(0,0,0);torso.scale=(1,1,1);pelvis.location=(0,0,.92);pelvis.rotation_euler=(0,0,0);torso.rotation_euler=(0,0,0);head.rotation_euler=(0,0,0)
 for name,(s,e,w) in arms.items():
  s.rotation_mode=e.rotation_mode=w.rotation_mode='XYZ';s.rotation_euler=(-.1,(-.12 if name=='Left' else .12),0);e.rotation_euler=(.3,0,0);w.rotation_euler=(0,0,0)
 for name in legs:place_foot(name,0,.115,pelvis.location.z)
 scarf.rotation_euler=(0,0,0)
def pose(action,t):
 neutral()
 if action=='idle':
  breath=sin(t*2*pi);torso.scale=(1+breath*.009,1+breath*.012,1+breath*.005);scarf.rotation_euler.x=.025*(sin(t*2*pi+.4)-sin(.4))
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
  # Separate anticipation, activation/impact, hold and recovery poses, with shared rest endpoints.
  if t<=0 or t>=1:return
  if action=='flame-fan':
   pelvis.location.z=keyvalue(t,[.92,.80,.86,.85,.88,.92]);torso.rotation_euler.x=keyvalue(t,[0,.18,-.08,-.10,.04,0]);torso.rotation_euler.z=keyvalue(t,[0,-.12,.07,.06,.02,0])
   for name in legs:place_foot(name,0,.115,pelvis.location.z)
   bpy.context.view_layer.update();rest=arms['Right'][2].matrix_world.translation.copy();strength=keyvalue(t,[0,1,1,1,.45,0]);target=Vector((keyvalue(t,[rest.x,-.22,-.24,-.24,-.27,rest.x]),keyvalue(t,[rest.y,.10,-.52,-.50,-.15,rest.y]),keyvalue(t,[rest.z,1.22,1.40,1.38,1.02,rest.z])));arm_to('Right',target,weight=strength)
   arm_to('Left',(.34,-.05,1.03),weight=strength);scarf.rotation_euler.x=.12*strength
  elif action=='ember-snare':
   pelvis.location.z=keyvalue(t,[.92,.74,.292,.292,.64,.92]);torso.rotation_euler.x=keyvalue(t,[0,.20,.90,.90,.35,0])
   for name in legs:place_foot(name,0,.115,pelvis.location.z)
   bpy.context.view_layer.update();rest=arms['Right'][2].matrix_world.translation.copy();blend=keyvalue(t,[0,.15,1,1,.35,0]);shoulder=arms['Right'][0].matrix_world.translation;target=rest.lerp(Vector((shoulder.x,shoulder.y-.015,.043)),blend);arm_to('Right',target,-pi/2*blend,weight=blend)
   rest_l=arms['Left'][2].matrix_world.translation.copy();arm_to('Left',rest_l.lerp(Vector((.34,-.12,.64)),blend),weight=blend)
  elif action=='cinder-step':
   pelvis.location.z=keyvalue(t,[.92,.73,.88,.87,.70,.92]);root.location.z=keyvalue(t,[0,0,.18,.15,0,0]);torso.rotation_euler.x=keyvalue(t,[0,.30,.85,.85,.40,0]);q=keyvalue(t,[0,0,1,1,0,0])
   for name in legs:
    y=(-.30 if name=='Left' else .30)*q;z=.115+(.08 if name=='Left' else .20)*q;place_foot(name,y,z,pelvis.location.z)
   for s,e,w in arms.values():s.rotation_euler.x=keyvalue(t,[-.1,.35,.75,.70,.25,-.1]);e.rotation_euler.x=keyvalue(t,[.3,.85,.45,.45,.65,.3])
   scarf.rotation_euler.x=.8*q
  elif action=='furnace-heart':
   pelvis.location.z=keyvalue(t,[.92,.80,.94,.94,.87,.92]);torso.rotation_euler.x=keyvalue(t,[0,.15,-.10,-.10,.02,0]);head.rotation_euler.x=keyvalue(t,[0,.1,-.15,-.15,0,0])
   for name in legs:place_foot(name,0,.115,pelvis.location.z)
   bpy.context.view_layer.update()
   for name in arms:
    side=1 if name=='Left' else -1;rest=arms[name][2].matrix_world.translation.copy();blend=keyvalue(t,[0,1,1,1,.35,0]);target=Vector((keyvalue(t,[rest.x,side*.18,side*.76,side*.76,side*.36,rest.x]),keyvalue(t,[rest.y,-.16,-.10,-.10,-.08,rest.y]),keyvalue(t,[rest.z,1.25,1.43,1.43,1.04,rest.z])));arm_to(name,target,weight=blend)

# Add hurt/death on this identity, with a distinct moving-attack body state.
exec(compile(open('scripts/ember-warden/standard_states.py').read(),'standard_states.py','exec'),globals())
state_pose=pose
def pose(action,t):
 if action!='flame-fan-moving':return state_pose(action,t)
 state_pose('run',t)
 bpy.context.view_layer.update()
 arm_to('Right',(-.24,-.50,1.32),weight=1)
 arm_to('Left',(.32,-.05,1.02),weight=.6)
DIRECTIONS=[('N',pi),('NE',3*pi/4),('E',pi/2),('SE',pi/4),('S',0),('SW',-pi/4),('W',-pi/2),('NW',-3*pi/4)]
scene.render.resolution_x=scene.render.resolution_y=256;cam.data.ortho_scale=3.5
scene.render.threads_mode='FIXED';scene.render.threads=2
cam.data.shift_y=0;bpy.context.view_layer.update();y0=world_to_camera_view(scene,cam,Vector((0,0,0))).y;cam.data.shift_y=.1;bpy.context.view_layer.update();y1=world_to_camera_view(scene,cam,Vector((0,0,0))).y;cam.data.shift_y=(.3-y0)/(y1-y0)*.1
neutral();bpy.context.view_layer.update();bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/ember-warden/ember-warden.blend'))
actions=['idle','run','flame-fan','flame-fan-moving','cinder-step','ember-snare','furnace-heart','hurt','death']
if len(sys.argv)>1:actions=[sys.argv[1]]
source_hash=hashlib.sha256(open(__file__,'rb').read()+open('scripts/ember-warden/standard_states.py','rb').read()+open(ROOT+'/source/material-atlas.png','rb').read()).hexdigest()[:12]
def project(v):
 p=world_to_camera_view(scene,cam,v);return [round(p.x*256,4),round((1-p.y)*256,4)]
os.makedirs(ROOT+'/metadata',exist_ok=True);os.makedirs('/home/dev/.tmp',exist_ok=True)
for action in actions:
 count=8 if action in ['idle','hurt'] else 16 if action=='death' else 12
 loop=action in ['idle','run','flame-fan-moving'];fps=5 if action=='idle' else 15 if action in ['run','flame-fan-moving'] else 10 if action=='hurt' else 12
 cols=8 if count in [8,16] else 6;rows=math.ceil(count/cols)
 for group in range(4):
  name=action+'-'+str(group);atlas=Image.new('RGBA',(256*cols,256*rows*2));clips=[]
  for di,(direction,angle) in enumerate(DIRECTIONS[group*2:group*2+2]):
   frames=[]
   for f in range(count):
    t=f/count if loop else f/(count-1);pose(action,t);root.rotation_euler.z=angle;root.location=Quaternion((0,0,1),angle)@root.location;bpy.context.view_layer.update()
    tmp='/home/dev/.tmp/ember-render.png';scene.render.filepath=tmp;bpy.ops.render.render(write_still=True)
    frame=Image.open(tmp).convert('RGBA');bounds=frame.getchannel('A').getbbox()
    if bounds is None:raise RuntimeError('Empty frame')
    col=f%cols;row=di*rows+f//cols;atlas.paste(frame,(col*256,row*256))
    feet={n:project(legs[n][2].matrix_world@Vector((0,0,-.115))) for n in legs}
    muzzle=arms['Right'][2].matrix_world@Vector((0,-.005,-.15));worldfeet={n:list(legs[n][2].matrix_world@Vector((0,0,-.115))) for n in legs}
    frames.append({'rect':[col*256,row*256,256,256],'alphaBounds':list(bounds),'pivot':[128,179.2],'muzzle':project(muzzle),'feet':feet,'worldFeet':worldfeet,'time':t})
   events=[] if action in ['idle','run'] else [{'frame':1 if action=='hurt' else 2 if action=='death' else 5,'name':'impact' if action in ['hurt','death'] else 'activate'}]
   if action=='flame-fan':events += [{'frame':8,'name':'stop-emission'},{'frame':11,'name':'recover'}]
   clips.append({'id':action+'-'+direction,'action':action,'direction':direction,'image':'sheets/'+name+'.png','frames':frames,'fps':fps,'loop':loop,'holdLastFrame':action=='death','returnTo':None if action=='death' else 'idle','events':events,'locomotionSpeed':1.1458333333 if action in ['run','flame-fan-moving'] else 0,'phases':{'anticipation':[0,3],'activation':[4,7],'recovery':[8,count-1]} if action not in ['idle','run','hurt','death','flame-fan-moving'] else None})
  atlas.save(ROOT+'/sheets/'+name+'.png');json.dump({'sourceHash':source_hash,'clips':clips},open(ROOT+'/metadata/'+name+'.json','w'),indent=2)
  print('EMBER_EXPORT',name,len(clips)*count,flush=True)
