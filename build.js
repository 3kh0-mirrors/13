import {execSync} from "child_process";
import {copyFileSync, readFileSync, rmSync, writeFileSync} from "fs";

let report = [];
const files = ["public/index.js", "public/server.js", "public/index.html"];
const zipFolderFiles = ["zip/index.js", "zip/server.js", "zip/index.html"];
const isProd = process.argv.indexOf("--dev") < 0;
const envDef = isProd ? "production" : "development";

function del(...files) {
    for (const file of files) {
        try {
            rmSync(file);
        } catch {
        }
    }
}

function sz(...files) {
    let total = 0;
    for (const file of files) {
        try {
            const bytes = readFileSync(file);
            total += bytes.length;
        } catch {
            console.warn("file not found:", file);
        }
    }
    return total;
}

del("game.zip");
del(...files);
del(...zipFolderFiles);

execSync(`html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true -o public/index.html html/index.html`);

// execSync(`esbuild server/src/index.ts --bundle --minify --mangle-props=_$ --platform=node --target=node16 --format=esm --outfile=public/server.js`);
const esbuildArgs = [];
if (isProd) {
    esbuildArgs.push("--minify");
    esbuildArgs.push("--drop:console");
    esbuildArgs.push("--drop:debugger");
    esbuildArgs.push("--mangle-props=._$");
    esbuildArgs.push("--analyze");
}

execSync(`esbuild server/src/index.ts ${esbuildArgs.join(" ")} --bundle --format=esm --define:process.env.NODE_ENV='\"${envDef}\"' --platform=node --target=node16 --outfile=public/server0.js --metafile=dump/server-build.json`);
execSync(`esbuild src/lib/index.ts ${esbuildArgs.join(" ")} --bundle --format=esm --define:process.env.NODE_ENV='\"${envDef}\"' --outfile=public/index0.js --metafile=dump/index-build.json`);
report.push("BUILD: " + sz("public/index0.js", "public/server0.js", "public/index.html"));

const pureFunc = [
    'console.log',
    'console.warn',
    'console.info',
    'console.error',
    'Math.sin',
    'Math.cos',
    'Math.sqrt',
    'Math.hypot',
    'Math.floor',
    'Math.round',
    'Math.ceil',
    'Math.max',
    'Math.min',
    'Math.random',
    'Math.abs',
];

const compress = [
    "booleans_as_integers=true",
    "unsafe_arrows=true",
    "passes=100",
    "keep_fargs=false",
    "pure_getters=true",
    `pure_funcs=[${pureFunc.map(x => `'${x}'`).join(",")}]`,
    "unsafe_methods=true",
    //"inline=2",
];//"unsafe=true",

if (isProd) {
    compress.push("drop_console=true");
}

execSync(`terser public/server0.js --toplevel --module --ecma=2020 -c ${compress.join(",")} --mangle-props regex=/._$/ -m -o public/server.js`);
execSync(`terser public/index0.js --toplevel --module --ecma=2020 -c ${compress.join(",")} --mangle-props regex=/._$/ -m -o public/index.js`);

report.push("TERSER: " + sz(...files));

if (process.argv.indexOf("--zip") > 0) {

    // Include only files you need! Do not include some hidden files like .DS_Store (6kb)
    // execSync(`zip -9 -X -D game.zip public/index.js public/server.js public/index.html`);
    // report.push("ZIP: " + sz("game.zip"));

    execSync(`roadroller -D -O1 -- public/index.js -o zip/index.js`);
    copyFileSync("public/server.js", "zip/server.js");
    copyFileSync("public/index.html", "zip/index.html");

    report.push("ROADROLL: " + sz(...zipFolderFiles));

    try {
        // https://linux.die.net/man/1/advzip
        // execSync(`advzip --not-zip --shrink-insane --recompress game.zip`);
        const mode = "--shrink-insane";
        // const mode = "--shrink-extra";
        execSync(`advzip --not-zip ${mode} --iter=1000 --add game.zip ${zipFolderFiles.join(" ")}`);
        report.push("LZMA: " + sz("game.zip"));
    } catch {
        console.warn("please install `advancecomp`");
    }
}

console.info(report.join("\n"));

// Before:
// BUILD: 103525
// C2LET: 102717
// TERSER: 37641
// ROADROLL: 18455
// LZMA: 13620

// After:
// BUILD: 102866
// C2LET: 102072
// TERSER: 37396
// ROADROLL: 18413
// LZMA: 13590
