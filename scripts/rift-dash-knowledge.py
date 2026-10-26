import json,subprocess
from pathlib import Path
id='NKBD9e0bb13ac2dffbd264a34d98'
p=json.loads(subprocess.check_output(['fural-agent','knowledge','get',id],text=True));m=p['markdown']
m=m.replace('| **Auto-Cast Trigger** | Fires automatically when a living Revenant enters the hero\'s AoE detection ring (`2.2 × reach` tiles) outside the Safe Zone |','| **Cast Trigger** | Manual directional cast only. Mobile: hold and drag the hexagonal control, then release. Desktop: aim the cursor and press the equipped slot key or click the control. Other skills retain auto-cast. |')
m=m.replace('Hexagonal control styling and generated in-use artwork are pending confirmation; these references do not change the published mechanics above.','The hexagonal control and manual directional exception were approved and implemented. Both original reference images remain inline below.')
m=m.replace('Implementation and device verification are in progress.','The artwork illustrates the approved direction; device verification screenshots below show actual gameplay.')
marker='\n\n## Manual controls and verification'
m=m.split(marker)[0]+marker+'\n\nRift Dash is the only manual Rift Runner active. Equip it through the Pixi Skill Tree. On touch, hold the gold hexagonal button, drag at least 12 CSS pixels to aim, and release to dash. A tap without dragging opens skill equip even during cooldown. On desktop, aim at the world and press the equipped slot key (1, 2, or 3), or click the hexagonal button to cast toward the last world cursor aim. Right-click inspects the skill; K opens the Skill Tree. Other skill sockets keep their existing equip and auto-cast behavior.\n\nThe hero moves up to 1.5 ground tiles. A sweep every 0.05 tile stops at blockers or cliffs; a fully blocked cast consumes no cooldown. Arrival phase-slash damage uses the swept endpoint. The aim arrow, hexagon, runner glyph, cooldown overlay and tapered cyan-violet trail are Pixi graphics. Releasing a cancelled pointer, losing focus or rotating the device cancels aiming. No game HTML/React controls were added.\n\nLocal desktop (1440 × 900), portrait touch (390 × 844), and landscape touch (844 × 390) checks passed: hold does not cast, release displaces in the selected direction, cooldown locks recasting, and skill equip stays accessible. Go tests also cover queued online input, invalid directions, unequipped casts, cooldown enforcement and preserving Rift Bolt auto-cast.\n'
base='/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Frift-dash%2F'
for f in sorted(Path('docs/rift-dash').glob('*.png')):
 if f.name=='in-use-concept.png':continue
 m+=f'\n![Actual gameplay — {f.stem.replace("-"," ")}]({base}{f.name})\n'
if Path('docs/rift-dash/live-verification.json').exists():m+='\nLive desktop, portrait touch, and landscape touch checks also passed at https://ark-whachat.fural.space. See the tracked verification reports and release record in docs/rift-dash.\n'
subprocess.run(['fural-agent','knowledge','update',id,'--markdown',m],check=True,stdout=subprocess.DEVNULL)
Path('docs/rift-dash/knowledge.md').write_text(m)
print('Updated existing Rift Dash page in place; original references and parent/order preserved.')
