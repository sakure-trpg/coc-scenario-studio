import ts from 'typescript';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const trans=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const uri=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const model=uri(trans('lib/model.ts'));
const {initialStore,validateDoc}=await import(model);
const {migrateLayout}=await import(uri(trans('lib/migration.ts').replace(/from ['"]\.\/model['"]/, 'from '+JSON.stringify(model))));
let old=initialStore();delete old.layoutVersion;
old.doc.pages=[{id:'old-overview',title:'旧概要',kind:'概要',objects:[{id:'body',type:'text',x:60,y:90,w:1000,h:500,text:'旧本文《呪文名》'}],notes:'旧メモ',goal:'',choices:'',fallback:''}, {id:'legacy-notes',title:'補足',kind:'資料',objects:[{id:'supp',type:'text',x:60,y:90,w:1000,h:500,text:'未決定の補足'}],notes:'保留情報',goal:'',choices:'',fallback:''}];
old.doc.entities=[{id:'n',name:'NPC名',type:'NPC',description:'背景',motivation:'動機',knowledge:'知識の来歴',status:'confirmed'}];old.selection={pageId:'legacy-notes'};
old.doc.issues=[{id:'resolved',text:'既に解決',severity:'minor',status:'resolved'}];old.proposals=[{id:'proposal',title:'保持対象',summary:'',baseRevision:1,operations:[],review:{majorIssues:0,notes:''},status:'accepted',createdAt:'2026-11-05'}];
const before=structuredClone(old),next=migrateLayout(old);validateDoc(next.doc);
assert.deepEqual(old,before);assert.deepEqual(next.layoutBackup.doc,old.doc);assert.deepEqual(next.layoutBackup.selection,old.selection);assert.deepEqual(next.doc.legacyPages,old.doc.pages);assert.deepEqual(next.proposals,old.proposals);assert.deepEqual(next.doc.entities,old.doc.entities);assert.deepEqual(next.doc.issues,old.doc.issues);
assert.deepEqual(next.doc.pages.slice(0,5).map(p=>p.section),['title','lead','introduction','kp','pl']);assert.equal(next.doc.pages[5].kind,'NPC');assert.equal(next.doc.pages.at(-1).kind,'備考');assert.equal(next.doc.pages[3].objects[0].text,'旧本文《呪文名》');assert.ok(next.doc.pages.at(-1).objects[0].text.includes('未決定の補足'));assert.ok(next.doc.pages.at(-1).objects[0].text.includes('保留情報'));assert.equal(next.selection.pageId,next.doc.pages.at(-1).id);assert.equal(next.contentRevision,old.contentRevision+1);assert.deepEqual(migrateLayout(next),next);
for(const i of [0,1,2,4])assert.ok(next.doc.pages[i].objects.every(o=>o.text===''));
const restored={...next,doc:structuredClone(old.doc)};assert.deepEqual(migrateLayout(restored),restored,'undo must not trigger another migration');
console.log('PASS: lossless migration, resolved issues/proposals preserved, reserved slots, NPC pages, supplements, blank unknowns, idempotence and undo');
if(process.argv[2]){
 const fixture=JSON.parse(readFileSync(process.argv[2],'utf8'));const migrated=migrateLayout(fixture);validateDoc(migrated.doc);
 for(const key of ['entities','canon','events','relationships','issues'])assert.deepEqual(migrated.doc[key],fixture.doc[key]);
 assert.deepEqual(migrated.layoutBackup.doc,fixture.doc);assert.deepEqual(migrated.doc.legacyPages,fixture.doc.pages);
 console.log('PASS: current project migration; '+migrated.doc.pages.length+' slides; '+migrated.doc.entities.length+' materials retained');
}
