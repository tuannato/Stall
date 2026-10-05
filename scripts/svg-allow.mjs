/**
 * A private look's SVG, read through an allow-list and written out again
 * (step 8b2; PROPOSAL §13.4, the step-8 critic's item 8).
 *
 * A look's art is served from this origin, the one that composes payments:
 * emitted at `/assets/<name>-<hash>.svg`, it is a document anyone can open
 * there. Opened as a page, an SVG carrying `foreignObject` or `<a>` is static
 * markup on stall.cash, and SMIL inside an image used as a mask animates
 * outside `document.getAnimations()`, the reduce block and the flash rule.
 * `script-src 'self'` stops a script; nothing stops the markup. So every SVG
 * a private look ships is parsed here, every element and attribute is held
 * to a list, every reference is local, and the build emits **this module's
 * re-serialisation, never the bytes it was given** — what reaches `dist` is
 * exactly what the reader understood, so no parser differential between this
 * reader and a browser's can carry anything past it.
 *
 * What is read: an optional XML declaration at the very start (dropped),
 * comments (dropped), whitespace between tags (dropped), and elements with
 * quoted attributes. Everything else is refused, never skipped: a DOCTYPE,
 * an entity declaration or a reference other than the five XML predefines
 * and numeric ones, a CDATA section, a processing instruction, text that is
 * not whitespace (no element on the list holds text), a namespaced element,
 * a duplicate attribute or id, more than one root, a root that is not `svg`.
 *
 * The elements are §13.4's list — the elements the first private look's
 * art and the shipped decorations use — plus `svg`, `clipPath` and
 * `radialGradient`, which that art uses and the list omitted. Refused by not being listed: `script`, `style`,
 * `foreignObject`, `image`, `feImage`, `a`, `text`, `tspan`, `textPath`,
 * every SMIL element (`animate`, `set`, `animateTransform`, `animateMotion`)
 * and anything else. The attributes are geometry, paint and filter
 * attributes; refused by not being listed: every `on*`, `xml:base`,
 * `xlink:href`, `class`. A reference is local or nothing: `href` is `#id`,
 * and every `url(` in a value is `url(#id)`; no other value may hold a `:`
 * (so no scheme reaches a value — `javascript:`, `data:`, `https:`), except
 * the root's `xmlns`, which is exactly the SVG namespace, and `style`, which
 * takes `property:value` pairs from a three-property list and nothing else.
 * Budgets per file: `MAX_SVG_ELEMENTS` elements, `MAX_SVG_FILTERS` filters,
 * `MAX_SVG_DEPTH` levels, each well above what the art it was set against
 * holds.
 *
 * Pure: a string in, a string and a list of problems out. Node built-ins
 * only, no dependency — the parser is small because the grammar it accepts
 * is. Test: `a-private-svg-outside-the-element-list-fails-the-build`
 * (`scripts/private-looks-build.test.mjs`).
 */

/** The elements a look's SVG may hold. */
export const SVG_ELEMENTS = Object.freeze([
    'svg',
    'g',
    'defs',
    'path',
    'rect',
    'circle',
    'ellipse',
    'use',
    'mask',
    'clipPath',
    'linearGradient',
    'radialGradient',
    'stop',
    'filter',
    'feGaussianBlur',
    'feColorMatrix',
    'feTurbulence',
    'feMorphology',
    'feComposite',
    'feDisplacementMap',
]);

/** The attributes those elements may carry: geometry, paint, filter and structure, nothing that loads or runs. */
export const SVG_ATTRIBUTES = Object.freeze([
    // structure
    'id',
    'xmlns',
    'viewBox',
    'preserveAspectRatio',
    'width',
    'height',
    'x',
    'y',
    'transform',
    'href',
    // geometry
    'd',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'fx',
    'fy',
    'x1',
    'y1',
    'x2',
    'y2',
    // paint
    'fill',
    'fill-opacity',
    'fill-rule',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-dasharray',
    'stroke-dashoffset',
    'opacity',
    'stop-color',
    'stop-opacity',
    'offset',
    'shape-rendering',
    'clip-rule',
    'clip-path',
    'mask',
    'filter',
    'color-interpolation-filters',
    'style',
    // gradient, mask, clip and filter units
    'gradientUnits',
    'gradientTransform',
    'spreadMethod',
    'maskUnits',
    'maskContentUnits',
    'clipPathUnits',
    'filterUnits',
    'primitiveUnits',
    // filter primitives
    'in',
    'in2',
    'result',
    'stdDeviation',
    'type',
    'values',
    'operator',
    'radius',
    'k1',
    'k2',
    'k3',
    'k4',
    'baseFrequency',
    'numOctaves',
    'seed',
    'stitchTiles',
    'scale',
    'xChannelSelector',
    'yChannelSelector',
    'edgeMode',
]);

/** The properties a `style` attribute may set: a mask's blend, and nothing that can name a file. */
export const SVG_STYLE_PROPERTIES = Object.freeze(['mix-blend-mode', 'isolation', 'opacity']);

/** The SVG namespace, the one value the root's `xmlns` may hold. */
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const MAX_SVG_ELEMENTS = 4000;
export const MAX_SVG_FILTERS = 32;
export const MAX_SVG_DEPTH = 64;

const ELEMENTS = new Set(SVG_ELEMENTS);
const ATTRIBUTES = new Set(SVG_ATTRIBUTES);
const STYLE_PROPERTIES = new Set(SVG_STYLE_PROPERTIES);
const NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const ATTRIBUTE_NAME = /[A-Za-z_][A-Za-z0-9_:.-]*/y;
const ID = /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/;
const LOCAL_URL = /url\(\s*#([A-Za-z_][A-Za-z0-9_.-]*)\s*\)/g;
const PREDEFINED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const SPACE = /[ \t\r\n]/;

/** At most 64 characters of what was refused, controls escaped, for a message. */
function shown(text) {
    const cut = text.length > 64 ? `${text.slice(0, 64)}…` : text;
    return JSON.stringify(cut);
}

/** An attribute value with its references decoded; `undefined` for a reference this reader does not know. */
function decodeValue(raw) {
    let out = '';
    for (let i = 0; i < raw.length; i += 1) {
        const c = raw[i];
        if (c === '<') {
            return undefined;
        }
        if (c !== '&') {
            out += c;
            continue;
        }
        const end = raw.indexOf(';', i);
        if (end === -1) {
            return undefined;
        }
        const ref = raw.slice(i + 1, end);
        let decoded;
        if (Object.hasOwn(PREDEFINED, ref)) {
            decoded = PREDEFINED[ref];
        } else if (/^#[0-9]{1,7}$/.test(ref)) {
            decoded = String.fromCodePoint(Number(ref.slice(1)));
        } else if (/^#x[0-9a-fA-F]{1,6}$/.test(ref)) {
            decoded = String.fromCodePoint(parseInt(ref.slice(2), 16));
        } else {
            return undefined;
        }
        out += decoded;
        i = end;
    }
    return out;
}

/** An attribute value written back: the four characters that could end or open markup, escaped. */
function escapeValue(value) {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Why a `style` value is refused, or its re-serialised form. */
function styleValue(value) {
    const out = [];
    for (const part of value.split(';')) {
        if (part.trim() === '') {
            continue;
        }
        const m = /^\s*([a-z-]+)\s*:\s*([A-Za-z0-9.%-]+)\s*$/.exec(part);
        if (m === null || !STYLE_PROPERTIES.has(m[1])) {
            return { why: `style takes only ${SVG_STYLE_PROPERTIES.join(', ')} with a plain value, not ${shown(part)}` };
        }
        out.push(`${m[1]}:${m[2]}`);
    }
    return { value: out.join(';') };
}

/** Why the value of `name` on `element` is refused, or the value to write. */
function attributeValue(element, name, value, root) {
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
        return { why: `${name} holds a control character` };
    }
    if (name === 'xmlns') {
        return root && value === SVG_NAMESPACE
            ? { value }
            : { why: `xmlns is the root's, and exactly ${SVG_NAMESPACE}` };
    }
    if (name === 'style') {
        return styleValue(value);
    }
    if (name === 'href') {
        return /^#[A-Za-z_][A-Za-z0-9_.-]*$/.test(value)
            ? { value }
            : { why: `href is a reference inside the file (#id), not ${shown(value)}` };
    }
    if (name === 'id') {
        return ID.test(value) ? { value } : { why: `id ${shown(value)} is not a plain name` };
    }
    // Every url( is a local one; nothing else may hold a colon, so no scheme
    // (javascript:, data:, https:) reaches a value.
    const withoutLocal = value.replace(LOCAL_URL, '');
    if (/url\s*\(/i.test(withoutLocal)) {
        return { why: `${name} names something outside the file: ${shown(value)}` };
    }
    if (withoutLocal.includes(':') || withoutLocal.includes('\\')) {
        return { why: `${name} holds a scheme or an escape: ${shown(value)}` };
    }
    void element;
    return { value };
}

/**
 * `text` read as a look's SVG: `{ svg, problems }` — the re-serialisation
 * when nothing was refused (`svg` is `undefined` otherwise), and every
 * problem found, each a sentence a reader can act on.
 */
export function sanitizeSvg(text) {
    const problems = [];
    const refuse = (why) => {
        problems.push(why);
        return { svg: undefined, problems };
    };
    if (typeof text !== 'string') {
        return refuse('not text');
    }
    let at = text.startsWith('\uFEFF') ? 1 : 0;
    if (text.startsWith('<?xml', at)) {
        const end = text.indexOf('?>', at);
        if (end === -1) {
            return refuse('an XML declaration that does not close');
        }
        const decl = text.slice(at, end + 2);
        if (!/^<\?xml\s+version\s*=\s*["']1\.[0-9]["'](?:\s+encoding\s*=\s*["'][Uu][Tt][Ff]-8["'])?(?:\s+standalone\s*=\s*["'](?:yes|no)["'])?\s*\?>$/.test(decl)) {
            return refuse(`an XML declaration this reader does not read: ${shown(decl)}`);
        }
        at = end + 2;
    }
    const ids = new Set();
    const stack = [];
    const out = [];
    let elements = 0;
    let filters = 0;
    let roots = 0;
    let closedRoot = false;
    while (at < text.length) {
        const lt = text.indexOf('<', at);
        const between = lt === -1 ? text.slice(at) : text.slice(at, lt);
        if (!/^[ \t\r\n]*$/.test(between)) {
            return refuse(`text outside an element, or inside one that holds none: ${shown(between.trim())}`);
        }
        if (lt === -1) {
            break;
        }
        at = lt;
        if (text.startsWith('<!--', at)) {
            const end = text.indexOf('-->', at + 4);
            if (end === -1) {
                return refuse('a comment that does not close');
            }
            at = end + 3;
            continue;
        }
        if (text.startsWith('<!', at)) {
            return refuse(`a declaration, a DOCTYPE or a CDATA section: ${shown(text.slice(at, at + 24))}`);
        }
        if (text.startsWith('<?', at)) {
            return refuse(`a processing instruction: ${shown(text.slice(at, at + 24))}`);
        }
        if (text.startsWith('</', at)) {
            const end = text.indexOf('>', at);
            const name = end === -1 ? undefined : text.slice(at + 2, end).trim();
            const open = stack.pop();
            if (name === undefined || open === undefined || open !== name) {
                return refuse(`a closing tag that closes nothing open: ${shown(text.slice(at, at + 24))}`);
            }
            out.push(`</${name}>`);
            at = end + 1;
            if (stack.length === 0) {
                closedRoot = true;
            }
            continue;
        }
        // A start tag.
        let i = at + 1;
        const nameMatch = /^[A-Za-z][A-Za-z0-9:_.-]*/.exec(text.slice(i, i + 64));
        if (nameMatch === null) {
            return refuse(`a tag this reader does not read: ${shown(text.slice(at, at + 24))}`);
        }
        const name = nameMatch[0];
        i += name.length;
        if (!NAME.test(name) || !ELEMENTS.has(name)) {
            return refuse(`<${name}> is not an element a look's art may hold (allowed: ${SVG_ELEMENTS.join(', ')})`);
        }
        if (stack.length === 0) {
            roots += 1;
            if (roots > 1 || closedRoot) {
                return refuse('more than one root element');
            }
            if (name !== 'svg') {
                return refuse(`the root is <${name}>, where it is <svg>`);
            }
        }
        elements += 1;
        if (name === 'filter') {
            filters += 1;
        }
        if (elements > MAX_SVG_ELEMENTS) {
            return refuse(`more than ${MAX_SVG_ELEMENTS} elements`);
        }
        if (filters > MAX_SVG_FILTERS) {
            return refuse(`more than ${MAX_SVG_FILTERS} filters`);
        }
        const attrs = [];
        const seen = new Set();
        let selfClosing = false;
        for (;;) {
            const ws = i;
            while (i < text.length && SPACE.test(text[i])) {
                i += 1;
            }
            if (i >= text.length) {
                return refuse(`<${name}> does not close`);
            }
            if (text[i] === '>') {
                i += 1;
                break;
            }
            if (text.startsWith('/>', i)) {
                i += 2;
                selfClosing = true;
                break;
            }
            if (i === ws) {
                return refuse(`<${name}>: attributes are separated by space`);
            }
            ATTRIBUTE_NAME.lastIndex = i;
            const attrMatch = ATTRIBUTE_NAME.exec(text);
            if (attrMatch === null) {
                return refuse(`<${name}>: an attribute this reader does not read: ${shown(text.slice(i, i + 24))}`);
            }
            const attr = attrMatch[0];
            i += attr.length;
            while (i < text.length && SPACE.test(text[i])) {
                i += 1;
            }
            if (text[i] !== '=') {
                return refuse(`<${name}> ${attr}: an attribute without a value`);
            }
            i += 1;
            while (i < text.length && SPACE.test(text[i])) {
                i += 1;
            }
            const quote = text[i];
            if (quote !== '"' && quote !== "'") {
                return refuse(`<${name}> ${attr}: a value that is not quoted`);
            }
            const close = text.indexOf(quote, i + 1);
            if (close === -1) {
                return refuse(`<${name}> ${attr}: a value that does not close`);
            }
            const raw = text.slice(i + 1, close);
            i = close + 1;
            if (seen.has(attr)) {
                return refuse(`<${name}> carries ${attr} twice`);
            }
            seen.add(attr);
            if (!ATTRIBUTES.has(attr)) {
                problems.push(`<${name}> ${attr}: not an attribute a look's art may carry`);
                continue;
            }
            const value = decodeValue(raw);
            if (value === undefined) {
                problems.push(`<${name}> ${attr}: a reference other than &amp; &lt; &gt; &quot; &apos; or a number, or a raw <`);
                continue;
            }
            const checked = attributeValue(name, attr, value, stack.length === 0);
            if (checked.why !== undefined) {
                problems.push(`<${name}> ${checked.why}`);
                continue;
            }
            if (attr === 'id') {
                if (ids.has(value)) {
                    problems.push(`<${name}> id ${shown(value)} is used twice`);
                    continue;
                }
                ids.add(value);
            }
            attrs.push(` ${attr}="${escapeValue(checked.value)}"`);
        }
        if (stack.length === 0 && !seen.has('xmlns')) {
            problems.push(`<svg> carries no xmlns="${SVG_NAMESPACE}"`);
        }
        if (selfClosing) {
            out.push(`<${name}${attrs.join('')}/>`);
            if (stack.length === 0) {
                closedRoot = true;
            }
        } else {
            out.push(`<${name}${attrs.join('')}>`);
            stack.push(name);
            if (stack.length > MAX_SVG_DEPTH) {
                return refuse(`elements nested deeper than ${MAX_SVG_DEPTH}`);
            }
        }
        at = i;
    }
    if (stack.length > 0) {
        return refuse(`<${stack[stack.length - 1]}> does not close`);
    }
    if (roots === 0) {
        return refuse('no <svg> element');
    }
    if (problems.length > 0) {
        return { svg: undefined, problems };
    }
    return { svg: out.join(''), problems };
}
