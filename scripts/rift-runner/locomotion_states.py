"""Symmetric, weight-bearing locomotion. One recipe drives all eight headings."""
prior_pose=pose
LOCOMOTION={'run':{'stance':.42,'stride':.50,'lift':.23,'period':.8},'walk':{'stance':.62,'stride':.40,'lift':.085,'period':1.2}}
def pose(action,t):
 if action not in LOCOMOTION:return prior_pose(action,t)
 prior_pose('idle',0);t=t%1;spec=LOCOMOTION[action];stance=spec['stance'];stride=spec['stride']
 # Two identical half-cycles: compression at mid-support, rise during transfer/flight.
 cycle=4*pi*(t-stance/2)
 pelvis.location.z=(.865-.025*cos(cycle)) if action=='run' else (.89-.012*cos(cycle))
 torso.rotation_euler.x=.12 if action=='run' else .035
 torso.rotation_euler.z=.035*sin(2*pi*t)
 head.rotation_euler.x=-torso.rotation_euler.x*.55;head.rotation_euler.z=-torso.rotation_euler.z*.6
 for name,phase in [('Left',t),('Right',(t+.5)%1)]:
  if phase<stance:y=-stride/2+stride*phase/stance;z=.115
  else:
   u=(phase-stance)/(1-stance);v=stride/stance*(1-stance)
   y=(2*u**3-3*u*u+1)*stride/2+(u**3-2*u*u+u)*v+(-2*u**3+3*u*u)*(-stride/2)+(u**3-u*u)*v
   z=.115+spec['lift']*sin(pi*u)**2
  place_foot(name,y,z,pelvis.location.z)
  # Counter-swing arms continuously, with the same amplitude on both sides.
  s,e,w=arms[name];s.rotation_euler.x=-.1+(.60 if action=='run' else .28)*cos(2*pi*phase)
  e.rotation_euler.x=(.95 if action=='run' else .45)+.08*sin(2*pi*phase)
 scarf.rotation_euler.x=(.42 if action=='run' else .15)+.035*sin(4*pi*t)
