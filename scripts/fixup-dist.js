/**
 * Post-processes the compiled output so both builds are loadable as published.
 *
 * 1. Writes a package.json into each build marking its module type. The root package has
 *    no "type" field, so without this Node would load the ESM build as CommonJS.
 * 2. Adds explicit file extensions to relative imports in the ESM build. TypeScript emits
 *    the specifier as written ("./Caches"), which bundlers resolve but Node's ESM loader
 *    rejects with ERR_MODULE_NOT_FOUND.
 */
const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const RELATIVE_SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.[^"']*)\2/g;

function walk(dir, suffixes) {
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            found.push(...walk(full, suffixes));
        } else if (suffixes.some(s => entry.name.endsWith(s))) {
            found.push(full);
        }
    }
    return found;
}

function resolveSpecifier(file, specifier) {
    if (/\.(js|mjs|cjs|json)$/.test(specifier)) {
        return specifier; // already explicit
    }
    const target = path.resolve(path.dirname(file), specifier);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        return `${ specifier }/index.js`;
    }
    return `${ specifier }.js`;
}

function addExtensions(dir) {
    let changed = 0;
    for (const file of walk(dir, [".js", ".d.ts"])) {
        const source = fs.readFileSync(file, "utf8");
        const updated = source.replace(RELATIVE_SPECIFIER,
            (match, keyword, quote, specifier) => `${ keyword }${ quote }${ resolveSpecifier(file, specifier) }${ quote }`);
        if (updated !== source) {
            fs.writeFileSync(file, updated);
            changed++;
        }
    }
    return changed;
}

function writeModuleType(dir, type) {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type }, null, 2) + "\n");
}

let failed = false;
for (const [name, type] of [["esm", "module"], ["cjs", "commonjs"]]) {
    const dir = path.join(DIST, name);
    if (!fs.existsSync(dir)) {
        console.error(`[fixup-dist] missing build output: dist/${ name } - did tsc run?`);
        failed = true;
        continue;
    }
    writeModuleType(dir, type);
    let message = `[fixup-dist] dist/${ name }: type="${ type }"`;
    if (type === "module") {
        message += `, added extensions in ${ addExtensions(dir) } files`;
    }
    console.log(message);
}

if (failed) {
    process.exitCode = 1;
}
