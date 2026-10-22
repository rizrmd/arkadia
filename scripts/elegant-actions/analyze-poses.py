"""Independent MediaPipe pose observations, never an image editing or animation generator."""
import os,json,math,glob
os.environ['OPENBLAS_NUM_THREADS']='1';os.environ['OMP_NUM_THREADS']='1'
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
model='/home/dev/.local/pose-analysis/models/pose_landmarker_full.task'
options=vision.PoseLandmarkerOptions(base_options=python.BaseOptions(model_asset_path=model,delegate=python.BaseOptions.Delegate.CPU),num_poses=1,min_pose_detection_confidence=.3,min_pose_presence_confidence=.3)
records=[]
def angle(a,b,c):
 u=[a.x-b.x,a.y-b.y];v=[c.x-b.x,c.y-b.y];d=(u[0]*v[0]+u[1]*v[1])/max(1e-9,math.hypot(*u)*math.hypot(*v));return round(math.degrees(math.acos(max(-1,min(1,d)))),1)
with vision.PoseLandmarker.create_from_options(options) as detector:
 for path in sorted(glob.glob('docs/elegant-actions/v2/pose-analysis/*.png')):
  result=detector.detect(mp.Image.create_from_file(path));record={'file':path,'detected':bool(result.pose_landmarks)}
  if result.pose_landmarks:
   p=result.pose_landmarks[0];record.update({'landmarks':[{'x':q.x,'y':q.y,'z':q.z,'visibility':q.visibility,'presence':q.presence} for q in p], 'ankleDx':round(p[27].x-p[28].x,3),'wristDx':round(p[15].x-p[16].x,3),'leftKneeAngle':angle(p[23],p[25],p[27]),'rightKneeAngle':angle(p[24],p[26],p[28]),'minLegVisibility':round(min(p[i].visibility for i in [23,24,25,26,27,28]),3)})
  records.append(record);print(os.path.basename(path),{k:v for k,v in record.items() if k not in ['file','landmarks']},flush=True)
json.dump({'method':'MediaPipe PoseLandmarker full CPU; independent image observations, not ground truth anatomical identity under occlusion','records':records},open('docs/elegant-actions/v2/pose-analysis.json','w'),indent=2)
