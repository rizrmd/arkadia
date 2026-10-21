"""Retain the early brown-hair idle sheet shown during source inspection.
This rejected lighting study is not part of the runtime manifest.
Run only after the production render finishes (shared temporary frame path).
"""
from pathlib import Path
import sys
p=Path('scripts/ember-warden/rig.py');source=p.read_text()
source=source.replace("hair=mat('Dark curls',(.018,.009,.005))","hair=mat('Brown hair',(.12,.065,.035))")
source=source.replace('for group in range(4):','for group in [1]:')
source=source.replace("bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/ember-warden/ember-warden.blend'))","# Keep final canonical scene intact during rejected-study reproduction.")
source=source.replace("atlas.save(ROOT+'/sheets/'+name+'.png')","atlas.save(ROOT+'/studies/initial-brown-hair-idle.png')")
source=source.replace("open(ROOT+'/metadata/'+name+'.json','w')","open(ROOT+'/studies/initial-brown-hair-idle.json','w')")
Path('public/ember-warden/v1/studies').mkdir(exist_ok=True)
sys.argv=['scripts/ember-warden/rig.py','idle']
exec(compile(source,str(p),'exec'),{'__file__':str(p)})
