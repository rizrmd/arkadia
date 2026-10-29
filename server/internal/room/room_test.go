package room

import (
	"strings"
	"testing"
)

func TestCleanNameKeepsGuestNamesShortAndPrintable(t *testing.T) {
	for in, want := range map[string]string{
		"  Ayu  ":                    "Ayu",
		"Bima\t the \n  Bold":        "Bima the Bold",
		"a\x00b\x1bc":                "abc",
		"Rizky the Unbreakable Wall": "Rizky the Unbrea",
	} {
		if got, ok := CleanName(in); !ok || got != want {
			t.Errorf("CleanName(%q) = %q, %v; want %q", in, got, ok, want)
		}
	}
	for _, in := range []string{"", "   ", "\x00\x01"} {
		if _, ok := CleanName(in); ok {
			t.Errorf("CleanName(%q) accepted", in)
		}
	}
}

func TestCodesAreUnambiguousAndTypedCodesNormalize(t *testing.T) {
	for i := 0; i < 200; i++ {
		c := newCode()
		if len(c) != codeLength || strings.ContainsAny(c, "0O1IL") {
			t.Fatalf("code %q", c)
		}
	}
	if got := NormalizeCode(" ab-c d2 "); got != "ABCD2" {
		t.Fatalf("NormalizeCode = %q", got)
	}
}
