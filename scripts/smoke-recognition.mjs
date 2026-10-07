import fs from 'node:fs/promises';

const src=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
new Function(src);
function assert(cond,msg){if(!cond)throw new Error(msg)}

const start=src.indexOf('async function runBatch(){');
const end=src.indexOf("\n$('#runBatch').onclick=runBatch;",start);
assert(start>=0&&end>start,'runBatch not found');
const run=src.slice(start,end);

assert(run.includes('glyphAnalyzeRows(state.batchRawRows)'),'shared glyph discriminator missing');
assert(!run.includes('createPaddleOCR('),'name flow must not start PaddleOCR');
assert(!run.includes('recognizeFixedParts('),'name flow must not OCR whole names');
assert(!run.includes('cvAnalyzeRows('),'browser-font CV must not be primary');
assert(!run.includes('isIOSLike('),'desktop/mobile must not split recognition core');
assert(run.includes('tesseractFooterTotal('),'footer count helper missing');
assert(src.includes('function splitWordGlyphs('),'glyph segmentation missing');
assert(src.includes('function buildGlyphClusters('),'glyph clustering missing');
assert(src.includes('function opaqueConstraintSolve('),'opaque database constraint solver missing');
assert(src.includes('function buildFieldTokens('),'age/hand shape tokens missing');
assert(src.includes("rowCrops(img,f.name,group)"),'roster group must feed shared row crops');
assert(src.includes("r.glyphCount>0&&r.candidates?.length"),'blank rows must be rejected by glyph evidence');

const badFontUse=/runBatch\([\s\S]*?(renderedWordBitmap|cvRenderedGlyphFeatures)/.test(src.slice(start,end));
assert(!badFontUse,'runtime must not render browser Japanese fonts for name recognition');

console.log('recognition smoke OK: one shared opaque-glyph pipeline for desktop and mobile');
