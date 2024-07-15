import fse from "fs-extra";
import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import format from 'date-format'
import terser from '@rollup/plugin-terser';
import { defineConfig } from 'rollup'
const packages = fse.readJSONSync("./package.json");
function createBanner() {
    const today = format.asString('yyyy-MM-dd', new Date()); // today, formatted as yyyy-MM-dd
    const version = packages.version;  // module version

    return String(fse.readFileSync('./src/header.js'))
        .replace('@@date', today)
        .replace('@@version', version);
}
fse.emptyDirSync("./dist/");
fse.copyFileSync('./src/header.js', './dist/workerpool.min.js.LICENSE.txt')
const commonPlugin = [
    resolve({
        extensions: [".js", ".ts", ".html"],
        moduleDirectories: [],
        preferBuiltins: false,
        browser: true
    }),
    commonjs({
        ignore: ['os', 'worker_threads', 'child_process']
    }),
    babel({
        extensions: [".js", ".ts"],
        babelHelpers: "bundled",
        presets: ['@babel/env']
    }),
];
const commonOutput = {
    banner: createBanner(),
    format: "umd",
    sourcemap: true
}

/** generate embeddedWorker.js  */
const buildEmbeddedWorker = (bundledWorkerCode) => {
    const embedded = '/**\n' +
        ' * embeddedWorker.js contains an embedded version of worker.js.\n' +
        ' * This file is automatically generated,\n' +
        ' * changes made in this file will be overwritten.\n' +
        ' */\n' +
        'module.exports = ' + JSON.stringify(bundledWorkerCode) + ';\n';
    fse.writeFileSync('./src/generated/embeddedWorker.js', embedded);
}


export default defineConfig([
    {
        input: "./src/worker.js",
        output: {
            file: "./dist/worker.js",
            name: "worker",
            ...commonOutput
        },
        plugins: commonPlugin
    },
    {
        input: "./src/worker.js",
        output: {
            file: "./dist/worker.min.js",
            name: "worker",
            ...commonOutput,
            banner: ""
        },
        plugins: [
            ...commonPlugin,
            terser({
                maxWorkers: 4
            }),
            {
                name: "outputEmbeddedWorker",
                generateBundle(_, output) {
                    buildEmbeddedWorker(output['worker.min.js'].code)
                }
            }
        ],
    },
    {
        input: "./src/index.js",
        output: {
            file: "./dist/workerpool.js",
            name: "workerpool",
            exports: "named",
            ...commonOutput
        },
        plugins: commonPlugin
    },
    {
        input: "./src/index.js",
        output: {
            file: "./dist/workerpool.min.js",
            name: "workerpool",
            exports: "named",
            ...commonOutput,
            banner: "/*! For license information please see workerpool.min.js.LICENSE.txt */",
        },
        plugins: [
            ...commonPlugin,
            terser({
                maxWorkers: 4
            })
        ],
    },
]);
