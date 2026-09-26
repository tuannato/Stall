"""Stall Serif: Lora's Fontsource subsets, renamed as OFL 1.1 requires.

Lora is licensed under the SIL Open Font License 1.1 with the Reserved Font
Name "Lora". Fontsource's Latin and Vietnamese WOFF2 files are subsets of the
upstream font, so under the OFL they are a Modified Version, and a Modified
Version may not present the Reserved Font Name as its primary name without
the copyright holder's written permission (condition 3). This script renames
them: name IDs 1, 3, 4, 6 (and 16, 17 if present) say "Stall Serif"; the
copyright notice (ID 0), the version (ID 5) and the licence URL (ID 14) are
kept word for word, as condition 2 requires the notice to travel with it.
The glyphs, metrics and axes are untouched.

Run it by hand after any change to the Lora source files (the owner's
decision, 2026-09-26); it needs fontTools and brotli, which are not project
dependencies:

    python3 -m venv /tmp/ft && /tmp/ft/bin/pip install fonttools brotli
    /tmp/ft/bin/python scripts/stall-serif.py <fontsource-variable-lora>/package/files

It writes src/ui/fonts/stall-serif-*.woff2. The node test
`stall-serif-carries-no-reserved-name` reads the result back.
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont

FAMILY = 'Stall Serif'
PS_FAMILY = 'StallSerif'
OUT = Path(__file__).resolve().parent.parent / 'src' / 'ui' / 'fonts'

# source file (Fontsource 5.3.0) -> (output file, style name)
FILES = {
    'lora-latin-wght-normal.woff2': ('stall-serif-latin.woff2', 'Regular'),
    'lora-latin-wght-italic.woff2': ('stall-serif-latin-italic.woff2', 'Italic'),
    'lora-vietnamese-wght-normal.woff2': ('stall-serif-vietnamese.woff2', 'Regular'),
    'lora-vietnamese-wght-italic.woff2': ('stall-serif-vietnamese-italic.woff2', 'Italic'),
}


def rename(src: Path, dst: Path, style: str) -> None:
    font = TTFont(src)
    name = font['name']
    version = name.getDebugName(5) or ''
    number = version.replace('Version ', '').strip()
    values = {
        1: FAMILY,
        3: f'{number};STALL;{PS_FAMILY}-{style}',
        4: f'{FAMILY} {style}',
        6: f'{PS_FAMILY}-{style}',
        16: FAMILY,
        17: style,
    }
    for record in list(name.names):
        if record.nameID in values:
            name.setName(values[record.nameID], record.nameID, record.platformID,
                         record.platEncID, record.langID)
    for record in name.names:
        if record.nameID in (1, 3, 4, 6, 16, 17) and 'Lora' in record.toUnicode():
            raise SystemExit(f'{src.name}: name ID {record.nameID} still says Lora')
    font.flavor = 'woff2'
    font.save(dst)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('usage: stall-serif.py <fontsource lora files dir>')
    src_dir = Path(sys.argv[1])
    for source, (target, style) in FILES.items():
        rename(src_dir / source, OUT / target, style)
        print(f'wrote {OUT / target}')


if __name__ == '__main__':
    main()
