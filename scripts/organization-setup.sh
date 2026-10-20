#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
mkdir -p "$HOME/tools" "$HOME/.local/bin"
# HOME-only libraries for headless Chromium on Alpine; never installs host packages.
cat > "$HOME/tools/install-browser-libs.py" <<'BROWSER_PY'
import urllib.request,lzma,pathlib,re,io,tarfile,ctypes,concurrent.futures
home=pathlib.Path.home();root=home/'.local/browser-libs';root.mkdir(parents=True,exist_ok=True)
index=root/'Packages.xz'
if not index.exists():urllib.request.urlretrieve('https://archive.ubuntu.com/ubuntu/dists/noble/main/binary-amd64/Packages.xz',index)
packages={}
for block in lzma.decompress(index.read_bytes()).decode().split('\n\n'):
 d={}
 for line in block.splitlines():
  if ': ' in line and not line.startswith(' '):k,v=line.split(': ',1);d[k]=v
 if 'Package' in d:packages[d['Package']]=d
requested='libnspr4 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libudev1 libdbus-1-3'.split()
selected={}
def add(n):
 if n in selected or n not in packages:return
 p=packages[n];selected[n]=p
 for dep in (p.get('Pre-Depends','')+','+p.get('Depends','')).split(','):
  choices=[re.split(r'[ (:\[]',s.strip())[0] for s in dep.split('|')];nxt=next((x for x in choices if x in packages),None)
  if nxt:add(nxt)
for n in requested:add(n)
print('Installing',len(selected),'library packages under',root,flush=True)
def get(p):
 deb=root/(p['Package']+'.deb');mark=root/(p['Package']+'.ok')
 if mark.exists():return
 if not deb.exists():urllib.request.urlretrieve('https://archive.ubuntu.com/ubuntu/'+p['Filename'],deb)
 raw=deb.read_bytes();pos=8
 while pos+60<=len(raw):
  header=raw[pos:pos+60];size=int(header[48:58]);name=header[:16].decode().strip().rstrip('/');data=raw[pos+60:pos+60+size];pos+=60+size+(size%2)
  if name.startswith('data.tar'):
   if name.endswith('.zst'):
    z=ctypes.CDLL('libzstd.so.1');z.ZSTD_getFrameContentSize.restype=ctypes.c_ulonglong;z.ZSTD_getFrameContentSize.argtypes=[ctypes.c_void_p,ctypes.c_size_t];n=z.ZSTD_getFrameContentSize(data,len(data));z.ZSTD_decompressBound.restype=ctypes.c_ulonglong;z.ZSTD_decompressBound.argtypes=[ctypes.c_void_p,ctypes.c_size_t];n=z.ZSTD_decompressBound(data,len(data)) if n>2**63 else n;buf=ctypes.create_string_buffer(n);z.ZSTD_decompress.restype=ctypes.c_size_t;z.ZSTD_decompress.argtypes=[ctypes.c_void_p,ctypes.c_size_t,ctypes.c_void_p,ctypes.c_size_t];actual=z.ZSTD_decompress(buf,n,data,len(data));data=buf.raw[:actual]
   with tarfile.open(fileobj=io.BytesIO(data),mode='r:*') as t:t.extractall(root,filter='fully_trusted')
   break
 mark.touch()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(get,selected.values()))
print('Browser libraries ready',flush=True)
BROWSER_PY
python3 "$HOME/tools/install-browser-libs.py"
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$HOME/.local/bin" sh
fi
if [ ! -f "$HOME/tools/pydeps/bin/patchelf" ]; then
  uv pip install --target "$HOME/tools/pydeps" patchelf==0.19.1.0
fi
# After an application installs Playwright Chromium, rerun this setup to patch its
# interpreter to the matching HOME-only glibc loader. No global LD_LIBRARY_PATH:
# the sandbox Node/Python binaries use musl.
if [ -d "$HOME/.cache/ms-playwright" ]; then
  while IFS= read -r browser_binary; do
    "$HOME/.local/browser-libs/usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2" \
      --library-path "$HOME/.local/browser-libs/usr/lib/x86_64-linux-gnu" \
      "$HOME/tools/pydeps/bin/patchelf" --set-interpreter \
      "$HOME/.local/browser-libs/usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2" "$browser_binary"
  done < <(rg --files --hidden "$HOME/.cache/ms-playwright" | rg '/chrome-headless-shell$|/chrome$')
fi
