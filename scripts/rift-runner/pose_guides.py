"""Low-sample pose-only guides, never final character artwork."""
import sys,runpy,os,math,json
from PIL import Image
sys.argv=['rig.py','audit'];g=runpy.run_path('scripts/rift-runner/rig.py');bpy=g['bpy'];scene=g['scene'];cam=g['cam'];Vector=g['Vector'];project=g['world_to_camera_view'];pose=g['pose'];facing=g['apply_facing'];order=['N','NE','E','SE','S','SW','W','NW'];angles=dict(g['DIRECTIONS'])
scene.render.resolution_x=scene.render.resolution_y=320;cam.data.ortho_scale=3.5;cam.data.shift_y=0;bpy.context.view_layer.update();y0=project(scene,cam,Vector((0,0,0))).y;cam.data.shift_y=.1;bpy.context.view_layer.update();y1=project(scene,cam,Vector((0,0,0))).y;cam.data.shift_y=(.3-y0)/(y1-y0)*.1
scene.cycles.samples=1;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=1
root='public/rift-runner/v3/reference';os.makedirs(root,exist_ok=True);tmp='/home/dev/.tmp/rift-pose-guide.png';records=[]
for direction in order:
 sheet=Image.new('RGBA',(960,960));frames=[]
 for n in range(9):
  action='idle' if n==0 else 'run';t=0 if n==0 else (n-1)/8;pose(action,t);facing(angles[direction]);bpy.context.view_layer.update();scene.render.filepath=tmp;bpy.ops.render.render(write_still=True);frame=Image.open(tmp).convert('RGBA');sheet.paste(frame,(n%3*320,n//3*320));feet={name:[round(project(scene,cam,g['legs'][name][2].matrix_world@Vector((0,0,-.115))).x*320,4),round((1-project(scene,cam,g['legs'][name][2].matrix_world@Vector((0,0,-.115))).y)*320,4)] for name in g['legs']};heights={name:round((g['legs'][name][2].matrix_world@Vector((0,0,-.115))).z,6) for name in g['legs']};frames.append({'footHeightWorld':heights,'rootHeight':round(g['root'].location.z,6),'action':action,'phase':t,'cell':[n%3,n//3],'feet':feet})
 path=root+'/run-'+direction+'-nine-pose-guide-v3.png';sheet.save(path);records.append({'direction':direction,'path':path,'frames':frames,'purpose':'pose and phase guide only; rejected 3D style must not appear in final sprites'});print('POSE_GUIDE',direction,flush=True)
json.dump(records,open('docs/rift-runner-v3/pose-guides-v3.json','w'),indent=2)
