package sim

import "testing"

// Keep the cemetery's approach and two main avenues traversable in co-op.
func TestCemeteryRoutes(t *testing.T) {
	nav, err := LoadNav()
	if err != nil {
		t.Fatal(err)
	}
	b := NewBlocker(nav)
	routes := [][4]float64{{24, 34.5, 27, 36.5}, {27, 36.5, 31, 37}, {31, 37, 34, 39}, {34, 39, 34, 55}, {26.5, 46.5, 41.5, 46.5}}
	for _, r := range routes {
		for i := 0; i <= 80; i++ {
			f := float64(i) / 80
			u, v := r[0]+(r[2]-r[0])*f, r[1]+(r[3]-r[1])*f
			p := TilePoint(u, v)
			if b.Blocked(p.X, p.Y, true) {
				t.Errorf("cemetery route blocked at %.2f, %.2f", u, v)
			}
		}
	}
}
