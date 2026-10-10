"""Stall's Latin face subsets, cut again from upstream with the glyphs the app prints.

The faces Stall serves are Fontsource 5.3.0's subsets (`@fontsource-variable/
inter`, `/jetbrains-mono`, `/lora`), which are Google Fonts' own. Their Latin
subsets drew none of `WANTED`: glyphs the app prints that no served face held,
each drawn by a font of the reader's machine instead
(`every-glyph-the-app-prints-is-in-its-face`, scripts/served-faces.test.mjs).
The owner's decision (2026-10-06, PLAN § Decided "Glyphs a page prints are
drawn by Stall's own faces") is that the faces draw them. This script cuts each
Latin subset again from the very font Google Fonts cut it from — the same
version, checked by hash — to the Fontsource file's own coverage and layout
features plus every `WANTED` code point that font draws, and keeps the
Fontsource file's `name` and `STAT` tables. Every glyph the Fontsource file
held therefore draws, advances, kerns and shapes as before (checked by hand,
outlines at every named weight and HarfBuzz shaping of every character pair,
when this was first run); what the upstream font lacks stays lacking, and the
test's exception list says so.

The upstream fonts, from github.com/google/fonts (the files Google Fonts serves
and Fontsource subsets; the git blob id is what the repository lists):

    ofl/inter/Inter[opsz,wght].ttf             commit e1d6480102fe, blob 047c92f6e221, Version 4.001;git-66647c0bb
    ofl/jetbrainsmono/JetBrainsMono[wght].ttf  commit 2e05c1cf00a6, blob aa310be8b717, Version 2.211
    ofl/lora/Lora[wght].ttf                    commit b4c417dfee46, blob ee1914c37461, Version 3.008
    ofl/lora/Lora-Italic[wght].ttf             commit b4c417dfee46, blob e973ccf7e5c6, Version 3.008

Inter's file has an optical-size axis; Google Fonts serves it pinned at 14
(the Fontsource file draws exactly the opsz-14 outlines), and so is it here
(`CUTS`). The Vietnamese subsets are not touched.

Run it by hand (fontTools and brotli, not project dependencies; the committed
files were written with fontTools 4.60.2 and brotli 1.2.0, and another version
may write other bytes), from the repository root:

    python3 scripts/subset-faces.py <upstream dir> <fontsource dir> <lora dir>
    SOURCE_DATE_EPOCH=1790404501 python3 scripts/stall-serif.py <lora dir>

<upstream dir> holds the four fonts above under those names; <fontsource dir>
holds the Fontsource 5.3.0 files named in `FONTSOURCE` (from the three
packages' `files/`). It writes src/ui/fonts/inter-latin.woff2 and
jetbrains-mono-latin.woff2, and puts the two Lora Latin cuts beside copies of
Fontsource's Lora Vietnamese files in <lora dir>, which stall-serif.py renames
into the four stall-serif-*.woff2 (Lora's Reserved Font Name; its own
docstring). SOURCE_DATE_EPOCH keeps `head.modified` what it was, so the
Vietnamese files come out byte for byte as committed.
"""

import hashlib
import io
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parent.parent / 'src' / 'ui' / 'fonts'

# ≈ → ◆ (the rate line, `DESC_SUB` and the checklist, the ticker's separator),
# the quote units' signs ₹ ₪ ₩ ₦ ₱ ₺ ₽, and CNY's 元. What a Latin range may
# name from here is signs and symbols, never a letter of another script: a
# Latin subset's unicode-range that named one Cyrillic letter would draw that
# letter, and only that letter, of every Cyrillic word a seller writes in the
# shipped face and the rest in the machine's
# (`a-face-range-never-takes-one-letter-of-another-script`). RUB prints ₽ for
# that reason, not "р.". 元 is a Han letter and stays on this list because the
# test's pinned list of printed glyphs names it and must find it here; no font
# this script cuts draws it, so no Latin file or range takes it. The
# served-faces test reads this list back, so it stays one line of hex
# literals.
WANTED = [0x2248, 0x2192, 0x25C6, 0x20B9, 0x20AA, 0x20A9, 0x20A6, 0x20B1, 0x20BA, 0x20BD, 0x5143]

UPSTREAM = {
    'Inter[opsz,wght].ttf': '29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031',
    'JetBrainsMono[wght].ttf': '48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda',
    'Lora[wght].ttf': '822a6621ccbe8d97d20ac88c1c41f5615c9c2c202eaa75f272cd452aac6475a7',
    'Lora-Italic[wght].ttf': '22d8d8854b53807aa664ca34f2031a9ed57a1d0dea296b8b96cdd3aad937a2b3',
}

FONTSOURCE = {
    'inter-latin-wght-normal.woff2': '3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62',
    'jetbrains-mono-latin-wght-normal.woff2': '18be452724bfdc236c074ca94a249a7f41a86752c7d04ab258ce9ed5651f6a7e',
    'lora-latin-wght-normal.woff2': 'ddb8c66035104e233fc024669183aad3738b6daa16deee2ebb1241bd0f98ace1',
    'lora-latin-wght-italic.woff2': 'd824d807d4d832d12c87932d0b8ec1314dcfd502157a56dee6bb04cf8a3768ae',
    'lora-vietnamese-wght-normal.woff2': '98c22de85f6e83bcd6ae1a443e12e256fbc8de7142bec4f76b059f8ff9c2797e',
    'lora-vietnamese-wght-italic.woff2': '3acfc1db6992c092405884cf12763e512e21229cc040a1eea94549869006736a',
}

MAXP_LIMITS = (
    'maxPoints', 'maxContours', 'maxCompositePoints', 'maxCompositeContours', 'maxZones', 'maxTwilightPoints',
    'maxStorage', 'maxFunctionDefs', 'maxInstructionDefs', 'maxStackElements', 'maxSizeOfInstructions',
    'maxComponentElements', 'maxComponentDepth',
)

# (upstream font, Fontsource Latin subset it re-cuts, where it goes, axes pinned)
CUTS = [
    ('Inter[opsz,wght].ttf', 'inter-latin-wght-normal.woff2', 'out:inter-latin.woff2', {'opsz': 14}),
    ('JetBrainsMono[wght].ttf', 'jetbrains-mono-latin-wght-normal.woff2', 'out:jetbrains-mono-latin.woff2', {}),
    ('Lora[wght].ttf', 'lora-latin-wght-normal.woff2', 'lora:lora-latin-wght-normal.woff2', {}),
    ('Lora-Italic[wght].ttf', 'lora-latin-wght-italic.woff2', 'lora:lora-latin-wght-italic.woff2', {}),
]


def checked(path: Path, sha256: str) -> Path:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != sha256:
        raise SystemExit(f'{path.name}: sha256 {digest}, expected {sha256} — not the file this script was written for')
    return path


def features(font: TTFont) -> list:
    tags = set()
    for tag in ('GSUB', 'GPOS'):
        if tag in font:
            tags |= {record.FeatureTag for record in font[tag].table.FeatureList.FeatureRecord}
    return sorted(tags)


def cut(source: Path, base_path: Path, dest: Path, pin: dict) -> None:
    base = TTFont(base_path)
    font = TTFont(source, recalcTimestamp=False)
    if pin:
        font = instancer.instantiateVariableFont(font, pin, updateFontNames=False)
        # The subsetter fails on the instancer's in-memory gvar (a KeyError on
        # '.notdef', fontTools 4.60.2); read back from bytes, it does not.
        buf = io.BytesIO()
        font.save(buf)
        buf.seek(0)
        font = TTFont(buf, recalcTimestamp=False)
    held = font.getBestCmap()
    added = [cp for cp in WANTED if cp in held]
    lacking = [cp for cp in WANTED if cp not in held]
    options = subset.Options()
    options.layout_features = features(base)
    options.glyph_names = True
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    options.prune_codepage_ranges = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=sorted(set(base.getBestCmap()) | set(added)))
    subsetter.subset(font)
    # The Fontsource file's names (no trademark line, Google's own IDs) and the
    # STAT that refers to them.
    font['name'] = base['name']
    font['STAT'] = base['STAT']
    old, new = base.getBestCmap(), font.getBestCmap()
    if any(new.get(cp) != name for cp, name in old.items()):
        raise SystemExit(f'{dest.name}: a code point the Fontsource file held maps elsewhere')
    if set(base.getGlyphOrder()) - set(font.getGlyphOrder()):
        raise SystemExit(f'{dest.name}: a glyph the Fontsource file held is gone')
    if base['fvar'].compile(base) != font['fvar'].compile(font):
        raise SystemExit(f'{dest.name}: the axes or named instances moved')
    # Font-wide numbers a renderer reads, as Google's cut wrote them: the head
    # bounding box, hhea's extents, maxp's limits (the whole font's for
    # JetBrains Mono and Lora, which Google's pipeline left as they were; the
    # subset's for Inter) and OS/2's average width. fontTools recomputes them
    # for the cut, and recomputed they moved ordinary text by a level or two of
    # antialiasing on nearly every Neo and Rural shot, and a few Modern pixels
    # (pnpm looks:diff, 2026-10-09; kept, those shots are identical). Each
    # bound takes the Fontsource file's value where that still encloses the
    # cut and the cut's own where it does not; the average width is the
    # Fontsource file's.
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    cut_font = TTFont(buf, recalcBBoxes=False, recalcTimestamp=False)
    head, hhea, maxp = cut_font['head'], cut_font['hhea'], cut_font['maxp']
    for table, wider, fields in (
        (head, min, ('xMin', 'yMin')),
        (head, max, ('xMax', 'yMax')),
        (hhea, max, ('advanceWidthMax', 'xMaxExtent')),
        (hhea, min, ('minLeftSideBearing', 'minRightSideBearing')),
        (maxp, max, MAXP_LIMITS),
    ):
        source = base[table.tableTag]
        for field in fields:
            setattr(table, field, wider(getattr(table, field), getattr(source, field)))
    cut_font['OS/2'].xAvgCharWidth = base['OS/2'].xAvgCharWidth
    cut_font.flavor = 'woff2'
    cut_font.save(dest)
    names = lambda cps: ' '.join(chr(cp) for cp in cps) or 'none'
    print(f'wrote {dest.name}: added {names(added)}; upstream lacks {names(lacking)}')


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit('usage: subset-faces.py <upstream dir> <fontsource dir> <lora dir>')
    upstream, fontsource, lora = (Path(arg) for arg in sys.argv[1:])
    for name, sha in UPSTREAM.items():
        checked(upstream / name, sha)
    for name, sha in FONTSOURCE.items():
        checked(fontsource / name, sha)
    lora.mkdir(parents=True, exist_ok=True)
    for source, base, dest, pin in CUTS:
        where, name = dest.split(':')
        cut(upstream / source, fontsource / base, (OUT if where == 'out' else lora) / name, pin)
    for name in ('lora-vietnamese-wght-normal.woff2', 'lora-vietnamese-wght-italic.woff2'):
        shutil.copyfile(fontsource / name, lora / name)
    print(f'now: SOURCE_DATE_EPOCH=1790404501 python3 scripts/stall-serif.py {lora}')


if __name__ == '__main__':
    main()
