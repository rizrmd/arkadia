# Union each glyph's overlapping contours (static instances of variable fonts keep them). msdfgen 1.5 assumes
# non-overlapping contours and otherwise paints solid colour blocks into the atlas.
#   python remove-overlaps.py in.ttf out.ttf      (needs fonttools + skia-pathops)
import sys
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps
font = TTFont(sys.argv[1])
removeOverlaps(font)
font.save(sys.argv[2])
