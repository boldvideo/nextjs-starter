"""One-off: move the Smart Bear light/green hard-codes onto Shift AI's dark tokens."""
import re, sys
MAP = [
 (r"text-white", "text-[#0a0a08]"),
 (r"(bg|border|ring|outline|fill|stroke|decoration)-\[#577544\](/\d+)?", r"\1-acid\2"),
 (r"text-\[#(577544|3f5631|2c3d22)\]", "text-acid"),
 (r"bg-\[#(eef1e6|e4ebd8)\]", "bg-raised"),
 (r"bg-\[#(f6f8f1|f4f6ef|fbfbf8|fbfcf8|f6f7f2|f2f2ee)\]", "bg-surface"),
 (r"border-\[#(9fb08a|c9d3b8)\]", "border-border"),
 (r"text-\[#9a3b1f\]", "text-[#ff6b47]"),
 (r"rounded-(2xl|xl|lg|md|\[20px\]|\[5px\]|\[6px\])", "rounded-[2px]"),
 (r"shadow-\[0_0_0_4px_rgba\(87,117,68,0\.12\)\]", "shadow-[0_0_0_4px_rgba(232,255,71,0.10)]"),
 (r"shadow-\[0_12px_32px_rgba\(20,20,20,0\.14\)\]", "shadow-[0_24px_60px_rgba(0,0,0,0.6)]"),
 (r'const GREEN = "#577544"', 'const GREEN = "#E8FF47"'),
 (r'const NAVY = "#152A45"', 'const NAVY = "#1A1A17"'),
 (r"font-heading font-bold", "font-medium"),
 (r"font-heading italic", "italic"),
 (r"font-heading", "font-sans"),
]
for p in sys.argv[1:]:
    s = open(p).read(); o = s
    for a, b in MAP: s = re.sub(a, b, s)
    # pills, not avatars: rounded-full on anything that is a button/chip
    s = re.sub(r'(inline-flex[^"`]*?)rounded-full', r"\1rounded-[2px]", s)
    s = re.sub(r'rounded-full( px-[\d.]+ min-h-)', r"rounded-[2px]\1", s)
    if s != o: open(p, "w").write(s); print("recoloured", p)
