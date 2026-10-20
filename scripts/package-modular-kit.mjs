import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
// Python's standard ZIP implementation keeps this downloadable bundle dependency-free.
execFileSync('python3',['-c',`import zipfile,pathlib
with zipfile.ZipFile('public/modular-stronghold/kit.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in pathlib.Path('public/modular-stronghold').iterdir():
  if p.suffix in ['.png','.json','.js','.html'] and not p.name.startswith(('runtime-','editor.png','contact-sheet')): z.write(p,'modular-stronghold/'+p.name)
 for p in pathlib.Path('public/assets/stronghold').glob('*.png'): z.write(p,'assets/stronghold/'+p.name)
 for p in pathlib.Path('public/fortress-ui').glob('forge-*.webp'): z.write(p,'fortress-ui/'+p.name)
 z.write('docs/modular-stronghold/README.md','README.md')
`]);console.log('Runtime kit ZIP:',(await fs.stat('public/modular-stronghold/kit.zip')).size,'bytes');
