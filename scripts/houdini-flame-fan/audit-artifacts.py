"""Audit existing PC-FATAN outputs without starting Houdini or the workstation."""
import hashlib,json,pathlib,zipfile,struct
root=pathlib.Path(__file__).resolve().parents[2]
a=root/'experiments/houdini-flame-fan';m=json.loads((a/'player/artifacts/manifest.json').read_text());checks=[]
with zipfile.ZipFile(a/'master-1280x720.zip') as z:
 for level in range(1,6):
  prefix=f'lv{level}-full/';m0=json.loads(z.read(prefix+'manifest.json'));l=m['levels'][level-1]
  for key in ['level','rangeGameUnits','visualReachGameUnits','fanAngleDegrees','intensity','seed','duration','fps','frameCount','frameWidth','frameHeight','pivot','camera','license','experimental','commercialEligible']:
   assert m0[key]==l[key],(level,key)
  assert m0['experimental'] and not m0['commercialEligible'] and 'Apprentice' in m0['license']
  assert len(z.read(prefix+'flame-fan.hipnc'))>1000
  assert 'USD_EXPORTED' in z.read(f'lv{level}-full.log').decode()
  names=[prefix+f'frames/fan.{i:04d}.png' for i in range(1,37)];assert set(names)=={n for n in z.namelist() if n.startswith(prefix+'frames/')}
  for name in names:
   b=z.read(name);assert b[:8]==b'\x89PNG\r\n\x1a\n';w,h,depth,color=struct.unpack('>IIBB',b[16:26]);assert (w,h,color)==(1280,720,6)
  for tier in ['mobile','desktop']:
   pages=l['variants'][tier]['pages'];assert sum(p['frames'] for p in pages)==36
   cursor=0
   for page in pages:
    atlas=json.loads((a/'player/artifacts'/page['json']).read_text());assert atlas['flameFan']['firstFrame']==cursor;assert atlas['flameFan']['fps']==24;assert atlas['flameFan']['productionApproved'] is False
    assert atlas['meta']['size']['w']<=2048 and atlas['meta']['size']['h']<=2048
    assert (a/'player/artifacts'/page['image']).is_file()
    for f in atlas['frames'].values():assert f['anchor']==l['pivot']
    cursor+=len(atlas['frames'])
  checks.append({'level':level,'rgbaMasters':36,'scene':'hipnc','cameraAndPivotMatch':True,'mobileAndDesktopFrameCoverage':True,'commercialPromotion':False})
p=json.loads((root/'docs/houdini-flame-fan/device-preview.json').read_text());b=json.loads((root/'docs/houdini-flame-fan/device-batch.json').read_text());assert p['status']==b['status']=='succeeded';assert p['exit_code']==b['exit_code']==0;assert p['finished_at']<b['created_at'];assert p['node_id']==b['node_id']=='ULc8291ec0aeea885a0cf29876'
r={'archiveSHA256':hashlib.sha256((a/'master-1280x720.zip').read_bytes()).hexdigest(),'previewBeforeMasterBatch':True,'pcFatanNodeVerified':True,'levels':checks,'scope':'Noncommercial reusable Houdini flipbook experiment; not commercial gameplay integration.'}
(root/'docs/houdini-flame-fan/artifact-audit.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
