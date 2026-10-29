"""Run with the verified PC-FATAN hython. Never import Apprentice assets into production."""
import argparse, json, math, pathlib, subprocess, os
import hou

p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--level',type=int,choices=range(1,6),default=1);p.add_argument('--quality',choices=['preview','full'],default='preview');p.add_argument('--range',type=float);p.add_argument('--angle',type=float,default=108);p.add_argument('--intensity',type=float);p.add_argument('--duration',type=float,default=1.5);p.add_argument('--seed',type=int,default=391);p.add_argument('--offset-y',type=float,default=.15,help='Upward framing offset as fraction of fixed camera span');p.add_argument('--render',action='store_true');a=p.parse_args()
root=pathlib.Path(a.output).resolve();root.mkdir(parents=True,exist_ok=True)
license=str(hou.licenseCategory());experimental='Apprentice' in license
if experimental and 'experiment' not in str(root).lower(): raise SystemExit('Apprentice requires a separate experiment output directory')
fps,width,height,voxel,samples=(12,320,180,.12,8) if a.quality=='preview' else (24,1280,720,.055,32)
nframes=math.ceil(a.duration*fps);radius=a.range or 4.4*(1+.18*(a.level-1));intensity=a.intensity or 1+.25*(a.level-1)
hou.hipFile.clear(suppress_save_prompt=True);hou.setFps(fps)
g=hou.node('/obj').createNode('geo','flame_fan')
for c in g.children():c.destroy()
ptg=g.parmTemplateGroup()
for name,label,value in [('range','Range (game units)',radius),('angle','Fan angle (degrees)',a.angle),('intensity','Intensity',intensity),('duration','Clip duration (seconds)',a.duration),('seed','Seed',a.seed)]:ptg.append(hou.FloatParmTemplate(name,label,1,default_value=(value,)))
g.setParmTemplateGroup(ptg)
def setp(n,key,value):
 q=n.parm(key)
 if q is None:raise RuntimeError('Installed Houdini lacks '+n.type().name()+'.'+key)
 print("SET",n.path(),key,flush=True)
 q.set(value)
 if key=="res_mode":q.pressButton()
src=g.createNode('attribwrangle','fan_source');setp(src,'class',0)
setp(src,'snippet',r'''
float t=@Time; float dur=chf("../duration");
if(t>min(.45,dur*.4))return;
float reach=chf("../range")/3;
for(int i=0;i<2400;i++){
 float seed=i+chf("../seed")*971;
 float ang=(float(rand(seed))-.5)*radians(chf("../angle"));
 vector dir=set(cos(ang),0,sin(ang));
 vector pos=dir*(.08+reach*sqrt(float(rand(seed+1)))*smooth(0,.22,t));
 pos.y=.12+float(rand(seed+2))*.16;
 int pt=addpoint(0,pos);
 setpointattrib(0,"v",pt,dir*.6+set(0,.1,0));
 setpointattrib(0,"pscale",pt,.16);
 float pulse=.8+.2*sin(t*20+seed);
 setpointattrib(0,"density",pt,.04*pulse);
 setpointattrib(0,"temperature",pt,1.5*pulse);
 setpointattrib(0,"burn",pt,chf("../intensity")*pulse);
}
''')
r=g.createNode('volumerasterizeattributes','rasterize_source');r.setInput(0,src);setp(r,'attributes','density temperature burn v');setp(r,'voxelsize',voxel)
sim=g.createNode('pyrosolver','fan_pyro');sim.setInput(0,r)
for k,v in {'divsize':voxel,'cachemaxsize':256,'enable_buoyancy':1,'buoyancylift':.15,'flames_lifespan':.3,'dissipation':.7,'enable_turbulence':1,'turbulence':.35,'turbulence_swirlsize':.35,'turbulence_seed':a.seed}.items():setp(sim,k,v)
cache=g.createNode('filecache::2.0','simulation_cache');cache.setInput(0,sim);setp(cache,'filemethod',1);setp(cache,'file',str(root/'cache'/'fan.$F4.bgeo.sc').replace('\\','/'))
(root/'cache').mkdir(exist_ok=True)
# Sequential cooks are mandatory for the solver; cache each frame before shading.
for f in range(1,nframes+1):
 hou.setFrame(f);geo=sim.geometry();geo.saveToFile(str(root/'cache'/('fan.%04d.bgeo.sc'%f)));print('CACHE',f,len(geo.prims()),flush=True)
setp(cache,'loadfromdisk',1)
mask=g.createNode('volumewrangle','registered_envelope');mask.setInput(0,cache)
setp(mask,'snippet','''float r=length(set(@P.x,0,@P.z));
float edge=chf("../range")/3;
float ang=abs(atan2(@P.z,@P.x));
float m=(1-smooth(edge*.9,edge,r))*(1-smooth(radians(chf("../angle")*.45),radians(chf("../angle")*.5),ang));
m*=smooth(-.05,.05,@P.y)*(1-smooth(.65,1.0,@P.y));
m*=1-smooth(chf("../duration")-.45,chf("../duration")-1.0/$FPS,@Time);
@density*=m;@flame*=m;@temperature*=m;
'''.replace('$FPS',str(fps)))
bake=g.createNode('pyrobakevolume','fire_look');bake.setInput(0,mask)
for k,v in {'enablefire':1,'kfire':.7,'enablesmoke':1,'densityscale':.3,'firecolormode':0}.items():setp(bake,k,v)
bake.setDisplayFlag(True);bake.setRenderFlag(True);g.layoutChildren()
st=hou.node('/stage');scene=st.createNode('sceneimport','cached_fire');setp(scene,'objects','/obj/flame_fan');setp(scene,'asreference',0);setp(scene,'importmats',0)
lib=st.createNode('materiallibrary','karma_fire_material');lib.setInput(0,scene)
shader=lib.createNode('kma_pyroshader','fire');shader.setMaterialFlag(True)
for k,v in {'enablefire':1,'fireintscale':.015,'fireint_volumename':'flame','firecolor_volumename':'flame','densityscale':.25,'smokecolorr':.12,'smokecolorg':.09,'smokecolorb':.07}.items():setp(shader,k,v)
for k,v in {'matnode1':'fire','matpath1':'/materials/fire','assign1':1,'geopath1':'/flame_fan/**'}.items():setp(lib,k,v)
cam=st.createNode('camera','registered_camera');cam.setInput(0,lib)
# Orthographic camera looking down 30 degrees gives the game's 0.5 ground projection.
for k,v in {'primpath':'/cameras/flame','projection':'orthographic','horizontalAperture':8000,'verticalAperture':8000,'aspectratiox':16,'aspectratioy':9,'tx':2.4,'ty':10-4.5*a.offset_y*.8660254,'tz':17.320508+2.25*a.offset_y,'exposure':-2,'rx':-30}.items():setp(cam,k,v)
settings=st.createNode('karmarenderproperties','flipbook_settings');settings.setInput(0,cam)
(root/'frames').mkdir(exist_ok=True)
for k,v in {'camera':'/cameras/flame','picture':str(root/'frames'/'fan.$F4.png').replace('\\','/'),'res_mode':'manual','resolutionx':width,'resolutiony':height,'samplesperpixel':samples,'pathtracedsamples':samples,'enablemblur':0,'engine':'cpu'}.items():setp(settings,k,v)
rop=st.createNode('usd_rop','export_cached_stage');rop.setInput(0,settings);setp(rop,'lopoutput',str(root/('fan.usdnc' if experimental else 'fan.usd')).replace('\\','/'));setp(rop,'savestyle','flattenalllayers');setp(rop,'errorsavingimplicitpaths',0);setp(rop,'trange',1);setp(rop,'f1',1);setp(rop,'f2',nframes)
st.layoutChildren()
meta={'level':a.level,'visualReachGameUnits':radius*2/3,'rangeGameUnits':radius,'fanAngleDegrees':a.angle,'intensity':intensity,'seed':a.seed,'duration':a.duration,'fps':fps,'frameCount':nframes,'frameWidth':width,'frameHeight':height,'pivot':{'x':.2,'y':.5-a.offset_y},'framing':{'offsetY':a.offset_y,'reservedBottomFraction':.2,'rawWatermarkPreserved':True},'camera':{'projection':'orthographic','groundYScale':.5,'horizontalSpan':8,'originGameUnitsPerHoudiniUnit':2},'license':license,'experimental':experimental,'commercialEligible':not experimental,'houdini':hou.applicationVersionString(),'quality':a.quality,'initialHitOnly':a.level<3,'burnSoil':{'durationMs':1000 if a.level>=3 else 0,'tickOffsetsMs':[200,400,600,800,1000] if a.level>=3 else [],'damagePerTick':None},'castReleaseSeconds':.42}
(root/'manifest.json').write_text(json.dumps(meta,indent=2));hou.hipFile.save(str(root/('flame-fan.hipnc' if experimental else 'flame-fan.hip')))
if a.render:
 rop.render(frame_range=(1,nframes));print('USD_EXPORTED',flush=True)
 husk=str(pathlib.Path(hou.getenv('HFS'))/'bin'/'husk.exe') if os.name=='nt' else str(pathlib.Path(hou.getenv('HFS'))/'bin'/'husk')
 subprocess.run([husk,'--engine','cpu','-j','2','-f','1','-n',str(nframes),'-o',str(root/'frames'/'fan.$F4.png'),'--make-output-path',str(root/('fan.usdnc' if experimental else 'fan.usd'))],check=True)
hou.releaseLicense()
