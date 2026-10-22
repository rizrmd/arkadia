package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"io/fs"
	"math"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/HugoSmits86/nativewebp"
	xdraw "golang.org/x/image/draw"
)

// Priority Stronghold game PNGs warmed first so initial page load and /asset-sizes.json
// immediately see cached WebP files without waiting to scan documentation folders.
var startupPNGs = []string{
	"/foundation-transitions/soil-moss.png",
	"/foundation-transitions/moss.png",
	"/modular-stronghold/v2/snowdrift-edge.png",
	"/modular-stronghold/v2/paving-warm-texture.png",
	"/modular-stronghold/v2/snow-soft-texture.png",
	"/modular-stronghold/v2/rampart-se.png",
	"/modular-stronghold/v2/rampart-ne.png",
	"/modular-stronghold/v2/gate-connector-left-v3.png",
	"/modular-stronghold/v2/gate-connector-right-v3.png",
	"/modular-stronghold/v2/bastion.png",
	"/modular-stronghold/v2/spruce-mature.png",
	"/modular-stronghold/v2/fir-young.png",
	"/modular-stronghold/v2/cliff-snow.png",
	"/modular-stronghold/v2/boulders-snow.png",
	"/modular-stronghold/v2/weeds-edge.png",
	"/modular-stronghold/v2/paving-worn.png",
	"/modular-stronghold/v2/wall-broken.png",
	"/modular-stronghold/v2/supply-cart.png",
	"/modular-stronghold/v2/brazier.png",
	"/modular-stronghold/crate.png",
	"/modular-stronghold/barrel.png",
	"/assets/stronghold/barracks.png",
	"/assets/stronghold/altar.png",
	"/assets/stronghold/mage.png",
	"/assets/stronghold/expedition-tent.png",
	"/assets/stronghold/mine.png",
	"/assets/characters/revenant.png",
	"/assets/characters/hero.png",
}

// maxDisplayWidths maps oversized Stronghold environment/terrain PNGs (authored at 1024-1200 px)
// to their maximum possible rendered backing-store width (@1.75x of world px in world-view.ts).
// Assets with source-pixel coordinate tables (characters/manifest.json, stronghold/light-anchors.ts)
// are intentionally omitted so their exact source pixel dimensions remain untouched.
var maxDisplayWidths = map[string]int{
	"/foundation-transitions/soil-moss.png":          160,
	"/foundation-transitions/moss.png":               128,
	"/modular-stronghold/v2/snowdrift-edge.png":      350,
	"/modular-stronghold/v2/paving-warm-texture.png": 400,
	"/modular-stronghold/v2/snow-soft-texture.png":   640,
	"/modular-stronghold/v2/rampart-se.png":          624,
	"/modular-stronghold/v2/rampart-ne.png":          624,
	"/modular-stronghold/v2/bastion.png":             320,
	"/modular-stronghold/v2/spruce-mature.png":       336,
	"/modular-stronghold/v2/fir-young.png":           336,
	"/modular-stronghold/v2/cliff-snow.png":          560,
	"/modular-stronghold/v2/boulders-snow.png":       324,
	"/modular-stronghold/v2/weeds-edge.png":          224,
	"/modular-stronghold/v2/paving-worn.png":         342,
	"/modular-stronghold/v2/wall-broken.png":         300,
	"/modular-stronghold/v2/supply-cart.png":         256,
	"/modular-stronghold/crate.png":                  256,
	"/modular-stronghold/barrel.png":                 256,
}

const cacheSchemaVersion = "v2"

// webpCacheDir returns the directory where converted WebP files are persisted.
func (s *Server) webpCacheDir() string {
	if s.CacheDir != "" {
		return s.CacheDir
	}
	if envDir := os.Getenv("WEBP_CACHE_DIR"); envDir != "" {
		return envDir
	}
	return filepath.Join(s.Site, ".webp-cache-"+cacheSchemaVersion)
}

func (s *Server) pathLock(key string) *sync.Mutex {
	v, _ := s.webpLocks.LoadOrStore(key, &sync.Mutex{})
	return v.(*sync.Mutex)
}

// acceptsWebP returns true unless the caller explicitly requests raw PNG (?format=png)
// or sends an Accept header that excludes image/webp and wildcards.
func acceptsWebP(r *http.Request) bool {
	if r.URL.Query().Get("format") == "png" || r.URL.Query().Get("raw") == "1" {
		return false
	}
	accept := r.Header.Get("Accept")
	if accept == "" {
		return true
	}
	return strings.Contains(accept, "image/webp") ||
		strings.Contains(accept, "image/*") ||
		strings.Contains(accept, "*/*")
}

// cleanTransparentNRGBA converts an image to NRGBA and zeroes out RGB values where
// Alpha == 0. Removing invisible RGB noise under transparent pixels preserves 100%
// bit-exact visual output while substantially improving lossless VP8L compression.
func cleanTransparentNRGBA(src image.Image) *image.NRGBA {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if nrgba, ok := src.(*image.NRGBA); ok && b.Min.X == 0 && b.Min.Y == 0 && nrgba.Stride == w*4 {
		clone := image.NewNRGBA(image.Rect(0, 0, w, h))
		copy(clone.Pix, nrgba.Pix)
		zeroTransparentPixels(clone.Pix)
		return clone
	}
	dst := image.NewNRGBA(image.Rect(0, 0, w, h))
	draw.Draw(dst, dst.Bounds(), src, b.Min, draw.Src)
	zeroTransparentPixels(dst.Pix)
	return dst
}

func zeroTransparentPixels(pix []byte) {
	for i := 0; i+3 < len(pix); i += 4 {
		if pix[i+3] == 0 {
			pix[i], pix[i+1], pix[i+2] = 0, 0, 0
		}
	}
}

// scaleCatmullRomNRGBA resizes src to targetW (preserving aspect ratio) using
// unpremultiplied/premultiplied-safe Catmull-Rom bicubic resampling so transparent
// edges never acquire dark fringes.
func scaleCatmullRomNRGBA(src *image.NRGBA, targetW int) *image.NRGBA {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if targetW <= 0 || targetW >= w {
		return src
	}
	targetH := max(1, int(math.Round(float64(h)*float64(targetW)/float64(w))))
	// Resample in premultiplied RGBA so transparent pixels (alpha=0) cannot bleed into edges.
	rgbaSrc := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(rgbaSrc, rgbaSrc.Bounds(), src, b.Min, draw.Src)
	rgbaDst := image.NewRGBA(image.Rect(0, 0, targetW, targetH))
	xdraw.CatmullRom.Scale(rgbaDst, rgbaDst.Bounds(), rgbaSrc, rgbaSrc.Bounds(), xdraw.Over, nil)

	dst := image.NewNRGBA(image.Rect(0, 0, targetW, targetH))
	draw.Draw(dst, dst.Bounds(), rgbaDst, image.Point{}, draw.Src)
	zeroTransparentPixels(dst.Pix)
	return dst
}

// ConvertPNGToWebP decodes pngFile, strips invisible RGB noise under alpha=0 pixels,
// applies display-exact @1.75x Catmull-Rom sizing when configured for the asset path,
// encodes to VP8L WebP, and atomically writes cacheFile with srcModTime.
func ConvertPNGToWebP(cleanURLPath, pngFile, cacheFile string, srcModTime time.Time) (int64, error) {
	in, err := os.Open(pngFile)
	if err != nil {
		return 0, err
	}
	img, err := png.Decode(in)
	in.Close()
	if err != nil {
		return 0, err
	}

	nrgba := cleanTransparentNRGBA(img)
	if maxW, ok := maxDisplayWidths[cleanURLPath]; ok && nrgba.Bounds().Dx() > maxW {
		nrgba = scaleCatmullRomNRGBA(nrgba, maxW)
	}

	var buf bytes.Buffer
	if err := nativewebp.Encode(&buf, nrgba, nil); err != nil {
		return 0, err
	}

	if err := os.MkdirAll(filepath.Dir(cacheFile), 0o755); err != nil {
		return 0, err
	}
	tmpFile := fmt.Sprintf("%s.tmp.%d", cacheFile, time.Now().UnixNano())
	if err := os.WriteFile(tmpFile, buf.Bytes(), 0o644); err != nil {
		return 0, err
	}
	_ = os.Chtimes(tmpFile, srcModTime, srcModTime)
	if err := os.Rename(tmpFile, cacheFile); err != nil {
		_ = os.Remove(tmpFile)
		return 0, err
	}
	return int64(buf.Len()), nil
}

// ensureWebP returns the path and FileInfo of the cached WebP file for cleanURLPath,
// converting the source PNG on cache miss or when the source PNG's mtime changed.
func (s *Server) ensureWebP(cleanURLPath, pngFile string, srcStat os.FileInfo) (string, os.FileInfo, bool, error) {
	normPath := "/" + strings.TrimPrefix(path.Clean(cleanURLPath), "/")
	rel := strings.TrimPrefix(normPath, "/")
	cacheRoot := filepath.Clean(s.webpCacheDir())
	cacheFile := filepath.Join(cacheRoot, filepath.FromSlash(rel)+".webp")
	if !strings.HasPrefix(cacheFile, cacheRoot+string(filepath.Separator)) {
		return "", nil, false, os.ErrPermission
	}

	if st, err := os.Stat(cacheFile); err == nil && !st.IsDir() && st.Size() > 0 && st.ModTime().Unix() == srcStat.ModTime().Unix() {
		return cacheFile, st, true, nil
	}

	mu := s.pathLock(rel)
	mu.Lock()
	defer mu.Unlock()

	if st, err := os.Stat(cacheFile); err == nil && !st.IsDir() && st.Size() > 0 && st.ModTime().Unix() == srcStat.ModTime().Unix() {
		return cacheFile, st, true, nil
	}

	start := time.Now()
	size, err := ConvertPNGToWebP(normPath, pngFile, cacheFile, srcStat.ModTime())
	if err != nil {
		return "", nil, false, err
	}
	st, err := os.Stat(cacheFile)
	if err != nil {
		return "", nil, false, err
	}
	if s.Log != nil {
		s.Log.Info("converted png to webp",
			"path", normPath,
			"pngBytes", srcStat.Size(),
			"webpBytes", size,
			"savedPct", fmt.Sprintf("%.1f%%", float64(srcStat.Size()-size)*100/float64(max(1, srcStat.Size()))),
			"ms", time.Since(start).Milliseconds(),
		)
	}
	return cacheFile, st, false, nil
}

// servePNGAsWebP intercepts a .png static file request, converts & caches it as
// WebP, and serves the cached WebP. Returns false to fall back to raw PNG.
func (s *Server) servePNGAsWebP(w http.ResponseWriter, r *http.Request, cleanURLPath, pngFile string, srcStat os.FileInfo) bool {
	if !acceptsWebP(r) {
		return false
	}
	cacheFile, cacheStat, hit, err := s.ensureWebP(cleanURLPath, pngFile, srcStat)
	if err != nil {
		if s.Log != nil {
			s.Log.Warn("webp conversion fallback to png", "path", cleanURLPath, "err", err)
		}
		return false
	}
	wf, err := os.Open(cacheFile)
	if err != nil {
		return false
	}
	defer wf.Close()

	w.Header().Set("Content-Type", "image/webp")
	w.Header().Set("Vary", "Accept")
	w.Header().Set("X-Asset-Format", "webp-lossless")
	w.Header().Set("X-Asset-Original-Bytes", strconv.FormatInt(srcStat.Size(), 10))
	if hit {
		w.Header().Set("X-Asset-Cache", "HIT")
	} else {
		w.Header().Set("X-Asset-Cache", "MISS")
	}
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeContent(w, r, cacheStat.Name(), cacheStat.ModTime(), wf)
	return true
}

// WarmWebPCache converts and caches the priority Stronghold PNG assets so startup
// downloads and /asset-sizes.json are ready immediately.
func (s *Server) WarmWebPCache(ctx context.Context) {
	siteRoot := filepath.Clean(s.Site)
	for _, relURL := range startupPNGs {
		select {
		case <-ctx.Done():
			return
		default:
		}
		pngFile := filepath.Join(siteRoot, filepath.FromSlash(strings.TrimPrefix(relURL, "/")))
		st, err := os.Stat(pngFile)
		if err != nil || st.IsDir() {
			continue
		}
		_, _, _, _ = s.ensureWebP(relURL, pngFile, st)
	}
}

// serveAssetSizes serves /asset-sizes.json with byte counts updated to reflect the
// cached WebP size for every PNG asset.
func (s *Server) serveAssetSizes(w http.ResponseWriter, r *http.Request) {
	siteRoot := filepath.Clean(s.Site)
	sizes := map[string]int64{}

	rawPath := filepath.Join(siteRoot, "asset-sizes.json")
	if data, err := os.ReadFile(rawPath); err == nil {
		_ = json.Unmarshal(data, &sizes)
	}
	if len(sizes) == 0 {
		_ = filepath.WalkDir(siteRoot, func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				if strings.HasPrefix(d.Name(), ".webp-cache") {
					return filepath.SkipDir
				}
				return nil
			}
			ext := strings.ToLower(filepath.Ext(d.Name()))
			if ext == ".png" || ext == ".webp" {
				if info, err := d.Info(); err == nil {
					rel, err := filepath.Rel(siteRoot, p)
					if err == nil {
						sizes["/"+filepath.ToSlash(rel)] = info.Size()
					}
				}
			}
			return nil
		})
	}

	if acceptsWebP(r) {
		s.WarmWebPCache(r.Context())

		cacheRoot := filepath.Clean(s.webpCacheDir())
		for urlPath := range sizes {
			if !strings.HasSuffix(strings.ToLower(urlPath), ".png") {
				continue
			}
			rel := strings.TrimPrefix(path.Clean(urlPath), "/")
			pngFile := filepath.Join(siteRoot, filepath.FromSlash(rel))
			srcStat, err := os.Stat(pngFile)
			if err != nil || srcStat.IsDir() {
				continue
			}
			cacheFile := filepath.Join(cacheRoot, filepath.FromSlash(rel)+".webp")
			if cst, err := os.Stat(cacheFile); err == nil && !cst.IsDir() && cst.Size() > 0 && cst.ModTime().Unix() == srcStat.ModTime().Unix() {
				sizes[urlPath] = cst.Size()
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Vary", "Accept")
	_ = json.NewEncoder(w).Encode(sizes)
}
