import ts from 'typescript';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE studio(id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
globalThis.__TEST_ENV={DB:{prepare(statement){const stmt=sql.prepare(statement);let values=[];return {bind(...args){values=args;return this;},async first(){return stmt.get(...values)||null;},async all(){return {results:stmt.all(...values)};},async run(){const r=stmt.run(...values);return {meta:{changes:Number(r.changes)}};}}}}};
const trans=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const model='data:text/javascript;base64,'+Buffer.from(trans('lib/model.ts')).toString('base64');
const migration='data:text/javascript;base64,'+Buffer.from(trans('lib/migration.ts').replace(/from ['\"]\.\/model['\"]/, 'from '+JSON.stringify(model))).toString('base64');
const code=trans('lib/store.ts').replace(/from ['\"]\.\/migration['\"]/, 'from '+JSON.stringify(migration)).replace(/import \{ env \} from ['"]cloudflare:workers['"];?/, 'const env=globalThis.__TEST_ENV;').replace(/from ['"]\.\/model['"]/,'from '+JSON.stringify(model));
const {readStore,action,Conflict,createScenario,openScenario,listScenarios}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let s=(await readStore()).state;assert.equal(s.contentRevision,1);
const emptyObjectCount=s.doc.pages[0].objects.length;assert.equal(s.doc.pages.length,6);assert.ok(s.doc.pages.every(p=>p.objects.every(o=>o.text==='')));assert.deepEqual(s.doc.entities,[]);
assert.deepEqual((await readStore()).state,s,'再読込で初期状態を維持');
const proposal={title:'検証用の提案',baseRevision:1,operations:[{action:'add_object',targetId:'overview',value:{id:'proposal-1',type:'text',x:80,y:540,w:600,h:80,text:'テスト'}}],review:{majorIssues:0,notes:'検証用'}};
let result=await action('propose_changes',proposal);const id=result.result.proposalId;
assert.equal(result.state.contentRevision,1);assert.equal(result.state.doc.pages[0].objects.length,emptyObjectCount);
result=await action('approve',{id});assert.equal(result.state.contentRevision,2);assert.equal(result.state.doc.pages[0].objects.length,emptyObjectCount+1);assert.equal(result.state.proposals[0].status,'accepted');
await assert.rejects(()=>action('approve',{id}));
await assert.rejects(()=>action('save',{baseRevision:1,doc:s.doc}),Conflict);
await assert.rejects(()=>action('propose_changes',proposal),Conflict);
result=await action('propose_changes',{...proposal,title:'未解決を含む案',baseRevision:2,operations:[{action:'add_issue',value:{id:'test-issue',text:'検討',severity:'major',status:'open'}}],review:{majorIssues:1,notes:'重大な未解決問題'}});
await assert.rejects(()=>action('approve',{id:result.result.proposalId}));
const before=result.state.doc;result=await action('select',{pageId:'overview'});assert.equal(result.state.contentRevision,2);assert.deepEqual(result.state.doc,before);
result=await action('undo',{baseRevision:2});assert.equal(result.state.contentRevision,3);assert.equal(result.state.doc.pages[0].objects.length,emptyObjectCount);
const secondPage={...structuredClone(result.state.doc.pages[0]),id:'test-page',title:'テスト用ページ',kind:'探索',section:'scene'};
const edit=structuredClone(result.state.doc);edit.pages.splice(edit.pages.length-1,0,secondPage);
await action('save',{baseRevision:3,doc:edit});
await Promise.all([action('select',{pageId:'overview'}),action('select',{pageId:'test-page'})]);assert.ok(['overview','test-page'].includes((await readStore()).state.selection.pageId));
console.log('PASS: D1 persistence, propose without canon mutation, atomic approval, duplicate approval rejection, stale save/proposal conflicts, major issue gate, selection, undo, concurrent CAS retry');
// Two simultaneous requests must commit the legacy layout exactly once.
const legacy=structuredClone(s);delete legacy.layoutVersion;legacy.doc.pages=[{...legacy.doc.pages[0]}];delete legacy.doc.pages[0].section;
sql.prepare('UPDATE studio SET data=?,version=0 WHERE id=?').run(JSON.stringify(legacy),'main');
const migrated=await Promise.all([readStore(),readStore()]);
for(const r of migrated){assert.equal(r.state.contentRevision,2);assert.deepEqual(r.state.layoutBackup.doc,legacy.doc);assert.equal(r.state.history.length,1);}
assert.equal(sql.prepare('SELECT version FROM studio WHERE id=?').get('main').version,1);
await action('undo',{baseRevision:2});const undone=(await readStore()).state;assert.equal(undone.contentRevision,3);assert.deepEqual(undone.doc,legacy.doc);assert.equal(undone.layoutVersion,1);
console.log('PASS: atomic one-time migration under concurrent reads and undo without remigration');

const mainSnapshot=structuredClone((await readStore('main')).state);
const a=await createScenario('別作品A'),b=await createScenario('別作品B');
assert.notEqual(a.scenarioId,b.scenarioId);assert.equal(a.doc.pages.length,6);assert.equal(b.doc.entities.length,0);assert.equal(b.proposals.length,0);assert.equal(b.history.length,0);
assert.deepEqual((await readStore('main')).state,mainSnapshot,'新規作成で既存の作品を上書きしない');
assert.equal((await readStore()).state.scenarioId,b.scenarioId,'最後に開いた作品を既定で読む');
const aDoc=structuredClone(a.doc);aDoc.pages[1].objects[0].text='Aにだけ存在する本文';aDoc.entities.push({id:'npc-a',name:'Aの人物',type:'NPC',description:'',motivation:'',knowledge:'',status:'candidate'});
await action('save',{scenarioId:a.scenarioId,baseRevision:1,doc:aDoc});
const bBefore=structuredClone((await readStore(b.scenarioId)).state);
const pA={...proposal,scenarioId:a.scenarioId,baseRevision:2};
const pAResult=await action('propose_changes',pA);const proposalId=pAResult.result.proposalId;
await assert.rejects(()=>action('approve',{scenarioId:b.scenarioId,id:proposalId}));
await assert.rejects(()=>action('propose_changes',{...pA,scenarioId:b.scenarioId}));
await assert.rejects(()=>action('save',{baseRevision:1,doc:b.doc}),/シナリオID/);
await action('approve',{scenarioId:a.scenarioId,id:proposalId});
assert.deepEqual((await readStore(b.scenarioId)).state,bBefore,'別作品には本文・NPC・AI案・履歴が入らない');
assert.equal((await readStore(a.scenarioId)).state.doc.entities[0].name,'Aの人物');
await action('undo',{scenarioId:a.scenarioId,baseRevision:3});assert.deepEqual((await readStore(b.scenarioId)).state,bBefore);
await Promise.all([action('select',{scenarioId:a.scenarioId,pageId:'overview'}),action('select',{scenarioId:b.scenarioId,pageId:'lead'})]);
assert.equal((await readStore(a.scenarioId)).state.selection.pageId,'overview');assert.equal((await readStore(b.scenarioId)).state.selection.pageId,'lead');
await openScenario('main');assert.equal((await readStore()).state.scenarioId,'main');assert.deepEqual((await readStore('main')).state,mainSnapshot);
assert.equal((await listScenarios()).length,3);await assert.rejects(()=>readStore('__workspace'));await assert.rejects(()=>readStore('scenario-00000000-0000-0000-0000-000000000000'));await assert.rejects(()=>createScenario('  '));
console.log('PASS: independent scenarios, blank creation, existing story preservation, scoped save/undo/selection/proposals, cross-project approval rejection, explicit scope and active selection');
// Exercise the real MCP routing against the same isolated database.
globalThis.__MCP_STORE={action,readStore,validateProposal:(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).validateProposal,listScenarios,resolveScenarioId:(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).resolveScenarioId};
let rpcCode=trans('app/mcp/route.ts')
.replace(/import \{([^}]+)\} from ['"]\.\.\/\.\.\/lib\/store['"];?/, 'const {$1}=globalThis.__MCP_STORE;')
.replace(/from ['"]\.\.\/\.\.\/lib\/model['"]/, 'from '+JSON.stringify(model))
.replace(/import \{[^}]+\} from ['"]\.\.\/\.\.\/lib\/notation['"];?/, 'const notationInstructions="test";const notationRules=[];')
.replace(/import \{[^}]+\} from ['"]\.\.\/\.\.\/lib\/architect['"];?/, 'const architectRules={};')
.replace(/import \{[^}]+\} from ['"]\.\.\/\.\.\/lib\/spell-reference['"];?/, 'const spellReferenceInfo={};const searchSpells=()=>[];const getSpell=()=>({});');
const {POST:rpc}=await import('data:text/javascript;base64,'+Buffer.from(rpcCode).toString('base64'));
const call=async(name,args={})=>{const response=await rpc(new Request('https://studio.test/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));return (await response.json()).result;};
let context=JSON.parse((await call('get_project_context',{scenarioId:a.scenarioId})).content[0].text);assert.equal(context.scenarioId,a.scenarioId);assert.equal(context.title,'別作品A');assert.equal(context.scenarios.length,3);
assert.equal((await call('get_page',{id:'overview'})).isError,true,'IDなしの読取は複数作品で拒否');
const pageA=await call('get_page',{scenarioId:a.scenarioId,id:'overview'});assert.equal(JSON.parse(pageA.content[0].text).id,'overview');
const meta=await rpc(new Request('https://studio.test/mcp',{method:'POST',body:JSON.stringify({id:2,method:'tools/list'})}));const definitions=(await meta.json()).result.tools;
for(const name of ['get_page','get_entity','get_timeline','get_relationships','list_open_issues','propose_changes','validate_proposal'])assert.ok(definitions.find(t=>t.name===name).inputSchema.required.includes('scenarioId'));
console.log('PASS: real MCP dispatch, scenario list/context, explicit read scope and tool schema requirements');
