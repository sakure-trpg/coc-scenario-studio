import ts from 'typescript';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const uri=p=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const {resizeBox,resizeDirections,resizePanel,fitPanels}=await import(uri('lib/layout.ts'));
const {initialStore,validateDoc}=await import(uri('lib/model.ts'));
const box={x:200,y:100,w:300,h:200};
assert.deepEqual(resizeBox(box,'nw',-40,-30),{x:160,y:70,w:340,h:230});
assert.deepEqual(resizeBox(box,'e',50,900),{x:200,y:100,w:350,h:200});
assert.deepEqual(resizeBox(box,'w',900,0),{x:480,y:100,w:20,h:200});
for(const dir of resizeDirections)for(const dx of [-4000,-23,0,41,4000])for(const dy of [-4000,-19,0,37,4000]){
 const next=resizeBox(box,dir,dx,dy);
 assert.ok(next.x>=0&&next.y>=0&&next.w>=20&&next.h>=20&&next.x+next.w<=1280&&next.y+next.h<=720);
 if(dir.includes('w'))assert.equal(next.x+next.w,box.x+box.w);else assert.equal(next.x,box.x);
 if(dir.includes('n'))assert.equal(next.y+next.h,box.y+box.h);else assert.equal(next.y,box.y);
 if(!dir.includes('w')&&!dir.includes('e'))assert.equal(next.w,box.w);
 if(!dir.includes('n')&&!dir.includes('s'))assert.equal(next.h,box.h);
 const doc=initialStore().doc;Object.assign(doc.pages[0].objects[0],next);validateDoc(doc);
}
const widths={left:235,right:213};
for(const total of [780,1000,1363,2400])for(const side of ['left','right'])for(const delta of [-4000,-10,0,10,4000]){
 const resized=resizePanel(widths,side,delta,total);
 assert.ok(resized.left>=170&&resized.right>=170&&total-resized.left-resized.right>=320);
 assert.equal(resized[side==='left'?'right':'left'],widths[side==='left'?'right':'left']);
}
assert.deepEqual(fitPanels({left:600,right:600},780),{left:290,right:170});
assert.equal(resizePanel(widths,'right',4000,780,true).right,460);
assert.deepEqual(box,{x:200,y:100,w:300,h:200});assert.deepEqual(widths,{left:235,right:213});
console.log('PASS: 8 resize directions, opposite-edge anchoring, minimum sizes, page bounds, valid saved geometry, panel bounds, collapsed panel and immutable inputs');
