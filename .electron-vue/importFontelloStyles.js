const {resolve, basename} = require('path');
const {writeFileSync, createWriteStream} = require('fs');
const StreamZip = require('node-stream-zip');
    
const FONTELLO_ZIP_FILE = resolve(__dirname, '../static/fontello.zip');
const TARGET_CSS_FILE = resolve(__dirname, '../src/renderer/styles/fontello-generated.scss');
const TARGET_WOFF2_FILE = resolve(__dirname, '../src/renderer/assets/fonts/fontello.woff2');
const TARGET_WOFF2_URL = '~@/assets/fonts/fontello.woff2';
const SCRIPT_NAME = basename(__filename);
const TARGET_HEADER = `\n\n// ******* DO NOT EDIT - GENERATED BY ${SCRIPT_NAME} *********\n\n`;

const zip = new StreamZip({
    file: FONTELLO_ZIP_FILE,
    storeEntries: true
});

function fail(err) {
    console.error(err || 'Error while reading ' + FONTELLO_ZIP_FILE);
    zip.close();
    process.exit(1);
}

function findFileInZip(filename) {
    return Object.keys(zip.entries()).find(f => basename(f) === filename) 
        || fail(`Error: Missing ${filename} in ${basename(FONTELLO_ZIP_FILE)}`);
}

zip.on('error', fail);

zip.on('ready', () => {
    const LINES_TO_DELETE_REGEXES = [
        /src:[^;]+?fontello\.eot[^;]+?;/gm,
        /,[^;u]+?url\('[^']+?'\) format\('truetype'\)/gm
    ];
    
    const CSS_FILE_PATH = findFileInZip('fontello.css');
    const WOFF2_FILE_PATH = findFileInZip('fontello.woff2');
    
    Promise.all([
        new Promise((resolve, reject) => {
            zip.stream(CSS_FILE_PATH, (err, stream) => {
                let css = '';

                stream.on('data', function (data) {
                    css += data.toString();
                });
                stream.once('error', reject);
                stream.once('end', () => {
                    css = LINES_TO_DELETE_REGEXES.reduce((cleanCss, re) => cleanCss.replace(re, `/* REMOVED BY ${SCRIPT_NAME} */`), css);
                    css = css.replace('@font-face {\n', '@font-face {\n  src: url('+ TARGET_WOFF2_URL +') format(\'woff2\');\n');

                    writeFileSync(TARGET_CSS_FILE, TARGET_HEADER + css);
                    console.log(`Written Fontello styles to ${TARGET_CSS_FILE}`);
                    resolve();
                });
            });
        }),
        new Promise((resolve, reject) => {
            zip.stream(WOFF2_FILE_PATH, (err, stream) => {
                stream.pipe(createWriteStream(TARGET_WOFF2_FILE));
                stream.once('error', reject);
                stream.once('end', () => {
                    console.log('Extracted woff2 file to ' + TARGET_WOFF2_FILE);
                    resolve();
                });
            });
        })
    ]).then(() => {
        console.log('Successfully prepared fontello font');
        
    }).catch((err) => {
        console.warn(err);
        try {
            zip.close();
        } catch (zipErr) {
            console.warn(zipErr);
        }
    }).then(() => {
        zip.close();
    });
});
