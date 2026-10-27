package sim

import (
	"container/heap"
	"math"
)

// Bounded tile-space A*, mirrored by stronghold/detour.ts. Routes can move
// away from the goal to leave concave obstacles; each edge is collision swept.
type detourState struct {
	Points []Vec
	Target Vec
	TTL    float64
}
type detourNode struct {
	I, J   int
	G, H   float64
	Parent *detourNode
}
type detourHeap []*detourNode

func (h detourHeap) Len() int           { return len(h) }
func (h detourHeap) Less(i, j int) bool { return h[i].G+h[i].H < h[j].G+h[j].H }
func (h detourHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *detourHeap) Push(x any)        { *h = append(*h, x.(*detourNode)) }
func (h *detourHeap) Pop() any          { a := *h; n := a[len(a)-1]; *h = a[:len(a)-1]; return n }
func navClear(a, b Vec, free func(Vec) bool, cliff func(Vec, Vec) bool) bool {
	n := int(math.Max(1, math.Ceil(hypot(b.X-a.X, b.Y-a.Y)/.05)))
	prev := a
	for i := 1; i <= n; i++ {
		t := float64(i) / float64(n)
		p := Vec{a.X + (b.X-a.X)*t, a.Y + (b.Y-a.Y)*t}
		if !free(p) || cliff(prev, p) {
			return false
		}
		prev = p
	}
	return true
}
func planDetour(from, to Vec, clear func(Vec, Vec) bool) []Vec {
	const cell = .25
	point := func(n *detourNode) Vec { return Vec{from.X + float64(n.I)*cell, from.Y + float64(n.J)*cell} }
	heuristic := func(i, j int) float64 { return hypot(from.X+float64(i)*cell-to.X, from.Y+float64(j)*cell-to.Y) }
	start := &detourNode{H: heuristic(0, 0)}
	best := start
	queue := &detourHeap{}
	heap.Push(queue, start)
	costs := map[[2]int]float64{{0, 0}: 0}
	for count := 0; queue.Len() > 0 && count < 4096; count++ {
		n := heap.Pop(queue).(*detourNode)
		if n.G != costs[[2]int{n.I, n.J}] {
			continue
		}
		if n.H < best.H {
			best = n
		}
		if n.H < cell*1.5 && clear(point(n), to) {
			best = n
			break
		}
		for i := -1; i <= 1; i++ {
			for j := -1; j <= 1; j++ {
				if i == 0 && j == 0 {
					continue
				}
				ni, nj := n.I+i, n.J+j
				g := n.G + hypot(float64(i), float64(j))*cell
				k := [2]int{ni, nj}
				if old, ok := costs[k]; ok && g >= old {
					continue
				}
				next := &detourNode{ni, nj, g, heuristic(ni, nj), n}
				if !clear(point(n), point(next)) {
					continue
				}
				costs[k] = g
				heap.Push(queue, next)
			}
		}
	}
	var points []Vec
	for n := best; n.Parent != nil; n = n.Parent {
		points = append(points, point(n))
	}
	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}
	return points
}
func detourDirection(s *detourState, from, to Vec, dt float64, clear func(Vec, Vec) bool) (Vec, bool) {
	s.TTL -= dt
	if clear(from, to) {
		s.Points = nil
		s.Target = to
		s.TTL = 0
		return to, true
	}
	for len(s.Points) > 0 && hypot(s.Points[0].X-from.X, s.Points[0].Y-from.Y) < .001 {
		s.Points = s.Points[1:]
	}
	if s.TTL <= 0 || hypot(to.X-s.Target.X, to.Y-s.Target.Y) > .75 || len(s.Points) > 0 && !clear(from, s.Points[0]) {
		s.Points = planDetour(from, to, clear)
		s.Target = to
		s.TTL = 750
	}
	if len(s.Points) == 0 {
		return Vec{}, false
	}
	return s.Points[0], true
}
