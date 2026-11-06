import ts from 'typescript';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const js=ts.transpileModule(readFileSync('lib/model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {initialStore,validateDoc,applyOperations,makePage,orderPages,manuscriptLength}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const s=initialStore();validateDoc(s.doc);
assert.equal(s.doc.title,'新しいシナリオ');
assert.equal(s.doc.pages.length,6);assert.ok(s.doc.pages.every(p=>p.objects.every(o=>o.text==='')));
assert.equal(s.selection.pageId,s.doc.pages[0].id);
for(const key of ['entities','canon','events','relationships','issues'])assert.deepEqual(s.doc[key],[]);
assert.deepEqual(s.proposals,[]);assert.deepEqual(s.history,[]);
const original=structuredClone(s.doc);
const updated=applyOperations(s.doc,[{action:'add_object',targetId:'overview',value:{id:'test-object',type:'text',x:80,y:500,w:700,h:150,text:'研究記録',size:21}}]);
assert.equal(updated.pages.find(p=>p.id==='overview').objects.at(-1).text,'研究記録');
assert.deepEqual(s.doc,original,'提案のプレビューは原文を変更しない');
assert.throws(()=>applyOperations(s.doc,[{action:'add_object',targetId:'missing',value:{}}]));
assert.throws(()=>applyOperations(s.doc,[{action:'add_object',targetId:'overview',value:{id:'broken',type:'entity',entityId:'unknown',x:0,y:0,w:100,h:100}}]));
assert.throws(()=>applyOperations(s.doc,[{action:'add_object',targetId:'overview',value:{id:'broken',type:'text',x:1250,y:0,w:100,h:100}}]));
const entity={id:'test-entity',name:'テスト素材',type:'NPC',description:'',knowledge:'',motivation:'',status:'candidate'};
assert.throws(()=>applyOperations(s.doc,[{action:'add_entity',value:entity},{action:'add_entity',value:entity}]));
assert.throws(()=>applyOperations(s.doc,[{action:'add_object',targetId:'overview',value:{id:'broken',type:'image',src:'javascript:alert(1)',x:0,y:0,w:100,h:100}}]));
assert.throws(()=>applyOperations(s.doc,[{action:'arbitrary_write',value:{}}]));
const resolved=applyOperations(s.doc,[{action:'add_issue',value:{id:'test-issue',text:'検証用',severity:'minor',status:'open'}},{action:'resolve_issue',targetId:'test-issue',value:{}}]);assert.equal(resolved.issues[0].status,'resolved');
console.log('PASS: initial document, immutable preview, valid additions, invalid references, bounds, duplicate IDs, unsafe images, unsupported operations, issue resolution');

assert.deepEqual(s.doc.pages.map(p=>p.section),['title','lead','introduction','kp','pl','notes']);
const ordered=applyOperations(s.doc,[{action:'add_page',value:makePage('導入','導入','scene-intro')},{action:'add_page',value:makePage('NPC','NPC甲','npc-a')},{action:'add_page',value:makePage('結末','結末','scene-end')},{action:'add_page',value:makePage('NPC','NPC乙','npc-b')}]);
assert.deepEqual(ordered.pages.map(p=>p.id),['overview','lead','introduction','kp-info','pl-info','npc-a','npc-b','scene-intro','scene-end','remarks']);
assert.equal(s.doc.pages.length,6,'追加時にも初期データを変更しない');
const removed=structuredClone(ordered);removed.pages=removed.pages.filter(p=>p.id!=='pl-info');assert.throws(()=>validateDoc(removed));
const moved=structuredClone(ordered);[moved.pages[0],moved.pages[1]]=[moved.pages[1],moved.pages[0]];assert.throws(()=>validateDoc(moved));
const draft=structuredClone(ordered);draft.pages[0].objects[1].text='あ'.repeat(400);draft.pages.find(p=>p.id==='remarks').objects[0].text='検討事項';
assert.equal(manuscriptLength(draft),0,'概要400字と備考は本編に数えない');
draft.pages[1].objects[0].text='夏の町。\n 探索開始。';assert.equal(manuscriptLength(draft),9,'リードから空白・改行を除いて数える');
const duplicate=structuredClone(ordered);duplicate.pages.push({...structuredClone(duplicate.pages[1]),id:'lead-copy'});assert.throws(()=>validateDoc(duplicate));
for(const kind of ['概要','リード','はじめに','KP向け情報','PL向け情報','NPC','導入','探索','結末','備考']){
 const fresh=makePage(kind);assert.ok(fresh.objects.every(o=>o.text===''));validateDoc({...s.doc,pages:kind==='NPC'||['導入','探索','結末'].includes(kind)?orderPages([...s.doc.pages,fresh]):s.doc.pages});
}
console.log('PASS: fixed five slots, blank fields, NPC/scene insertion, final remarks, manuscript count and layout validation');
