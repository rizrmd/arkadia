import lzma,tarfile,io,urllib.request,hashlib,os,sys
root='/home/dev/.local/rift-render-libs';os.makedirs(root,exist_ok=True)
index_path=os.path.join(root,'Packages.xz')
if not os.path.exists(index_path):urllib.request.urlretrieve('https://deb.debian.org/debian/dists/stable/main/binary-amd64/Packages.xz',index_path)
index=lzma.open(index_path,'rt').read();packages={}
for block in index.split('\n\n'):
 fields={}
 for line in block.splitlines():
  if ': ' in line and not line.startswith(' '):k,v=line.split(': ',1);fields[k]=v
 if 'Package' in fields:packages[fields['Package']]=fields
for name in sys.argv[1:]:
 f=packages[name];data=urllib.request.urlopen('https://deb.debian.org/debian/'+f['Filename']).read();assert hashlib.sha256(data).hexdigest()==f['SHA256'];assert data[:8]==b'!<arch>\n';p=8
 while p+60<=len(data):
  header=data[p:p+60];size=int(header[48:58]);n=header[:16].decode().strip().rstrip('/');blob=data[p+60:p+60+size];p+=60+size+(size%2)
  if n.startswith('data.tar'):
   with tarfile.open(fileobj=io.BytesIO(blob),mode='r:*') as tar:tar.extractall(root,filter='data')
 print(name,f['Version'])
