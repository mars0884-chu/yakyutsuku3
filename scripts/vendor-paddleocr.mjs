import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require=createRequire(import.meta.url);
const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
const OUT=path.join(ROOT,'vendor','paddleocr');
const MODELS=path.join(OUT,'models');
const ORT=path.join(OUT,'ort');
await fs.mkdir(MODELS,{recursive:true});
await fs.mkdir(ORT,{recursive:true});

const entry=path.join(ROOT,'scripts','.paddle-browser-entry.mjs');
await fs.writeFile(entry,`import { PaddleOCR } from "@paddleocr/paddleocr-js";
globalThis.YT3PaddleOCR={PaddleOCR};`);
await build({
  entryPoints:[entry],
  bundle:true,
  outfile:path.join(OUT,'paddleocr.bundle.js'),
  format:'iife',
  platform:'browser',
  target:['safari15','chrome100'],
  minify:true,
  sourcemap:false,
  define:{global:'globalThis'}
});
await fs.rm(entry,{force:true});

const ortPkg=require.resolve('onnxruntime-web/package.json');
const ortDist=path.join(path.dirname(ortPkg),'dist');
for(const name of await fs.readdir(ortDist)){
  if(/^ort-wasm.*\.(?:wasm|mjs)$/.test(name)){
    await fs.copyFile(path.join(ortDist,name),path.join(ORT,name));
  }
}

const assets=[
  {
    name:'PP-OCRv5_mobile_det_onnx_infer.tar',
    url:'https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv5_mobile_det_onnx_infer.tar',
    sha256:'781056046c9ed77a15c94681605db6a0f62317c2e9cce6931c71da2478d4bc30'
  },
  {
    name:'PP-OCRv5_mobile_rec_onnx_infer.tar',
    url:'https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv5_mobile_rec_onnx_infer.tar',
    sha256:'f7e792bc836f36e7ef895ad47c426d75b0b75b1650caa6d63fe9418441ffba8c'
  }
];

for(const a of assets){
  const target=path.join(MODELS,a.name);
  let buf=null;
  try{buf=await fs.readFile(target)}catch{}
  const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
  if(!buf||digest(buf)!==a.sha256){
    console.log('downloading',a.name);
    const res=await fetch(a.url);
    if(!res.ok)throw new Error(`${a.name} download failed ${res.status}`);
    buf=Buffer.from(await res.arrayBuffer());
    const got=digest(buf);
    if(got!==a.sha256)throw new Error(`${a.name} sha256 mismatch ${got}`);
    await fs.writeFile(target,buf);
  }
  console.log(a.name,buf.length,digest(buf));
}
console.log('PaddleOCR browser assets ready:',OUT);
