"""Run up to two independent atlas jobs; stagger source saves and keep per-job logs."""
import subprocess,time,json,sys,os
jobs=[tuple(v.split(':')) for v in sys.argv[1:]]
active=[];completed=[];last_start=0
progress=os.environ.get('RIFT_PROGRESS_FILE')
def report(status):
 if progress:
  data={'pid':os.getpid(),'status':status,'queued':jobs,'active':[{'pid':p.pid,'action':a,'group':int(g)} for p,a,g in active],'completed':completed}
  tmp=progress+'.tmp';open(tmp,'w').write(json.dumps(data));os.replace(tmp,progress)
report('running')
while jobs or active:
 if jobs and len(active)<1 and time.monotonic()-last_start>=6:
  action,group=jobs.pop(0);p=subprocess.Popen(['scripts/rift-runner/render-body.sh',action,group],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);active.append((p,action,group));last_start=time.monotonic();report('running')
 for item in list(active):
  p,action,group=item
  if p.poll() is not None:
   output=p.communicate()[0]
   print(output.strip(),flush=True)
   if p.returncode:
    for child,_,_ in active:
     if child!=p and child.poll() is None:child.terminate()
    report('failed');raise SystemExit(p.returncode)
   completed.append({'action':action,'group':int(group),'status':'exported'});active.remove(item);report('running')
 time.sleep(.25)
print(json.dumps({'completed':completed}),flush=True)

report('completed')
