"""Run once through local-runs on PC-FATAN, after reviewing a lightweight preview."""
import pathlib,subprocess,sys,zipfile,json,hashlib
root=pathlib.Path(__file__).resolve().parent
for level in range(1,6):
 out=root/('lv%d-full'%level)
 with (root/('lv%d-full.log'%level)).open('w') as log:
  result=subprocess.run([sys.executable,str(root/'build.py'),'--output',str(out),'--quality','full','--level',str(level),'--seed','391','--render'],stdout=log,stderr=subprocess.STDOUT)
 print('LEVEL',level,'EXIT',result.returncode,flush=True)
 if result.returncode:raise SystemExit(result.returncode)
with zipfile.ZipFile(root/'experimental-flipbooks.zip','w',zipfile.ZIP_DEFLATED) as z:
 for level in range(1,6):
  out=root/('lv%d-full'%level)
  for f in [out/'manifest.json',out/'flame-fan.hipnc',*sorted((out/'frames').glob('*.png'))]:z.write(f,f.relative_to(root))
  z.write(root/('lv%d-full.log'%level),'lv%d-full.log'%level)
print('ARCHIVE',root/'experimental-flipbooks.zip',flush=True)
