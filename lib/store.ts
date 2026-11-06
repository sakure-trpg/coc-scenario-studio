import { migrateLayout } from './migration';
import { env } from 'cloudflare:workers';
import { applyOperations, initialStore, uid, validateDoc, type Store, type Proposal } from './model';
export class Conflict extends Error {}
const workspaceKey='__workspace';
// UI selection has its own row; it must never contend with manuscript writes.
async function selectionTable(){await env.DB!.prepare('CREATE TABLE IF NOT EXISTS studio_selection (scenario_id TEXT PRIMARY KEY, data TEXT NOT NULL)').run();}
async function loadSelection(state:Store,id:string){
 await selectionTable();
 const row=await env.DB!.prepare('SELECT data FROM studio_selection WHERE scenario_id = ?').bind(id).first<{data:string}>();
 if(row){const selected=JSON.parse(row.data);const page=state.doc.pages.find(p=>p.id===selected.pageId);if(page)state.selection={pageId:page.id,...(page.objects.some(o=>o.id===selected.objectId)?{objectId:selected.objectId}:{})};}
 if(!state.doc.pages.some(p=>p.id===state.selection.pageId))state.selection={pageId:state.doc.pages[0].id};
 return state;
}

function checkScenarioId(id:string){if(!/^(main|scenario-[a-f0-9-]{16,64})$/.test(id))throw Error('シナリオIDが不正です。');return id;}
export async function activeScenarioId():Promise<string>{
 const db=env.DB;if(!db)throw Error('保存先が利用できません。');
 const row=await db.prepare('SELECT data FROM studio WHERE id = ?').bind(workspaceKey).first<{data:string}>();
 if(row)return checkScenarioId(JSON.parse(row.data).activeScenarioId);
 await db.prepare('INSERT OR IGNORE INTO studio (id,data,version) VALUES (?,?,0)').bind(workspaceKey,JSON.stringify({activeScenarioId:'main'})).run();
 return 'main';
}
export async function listScenarios(){
 await readStore('main');
 const result=await env.DB!.prepare("SELECT id,json_extract(data,'$.doc.title') AS title,json_extract(data,'$.updatedAt') AS updatedAt,json_array_length(json_extract(data,'$.doc.pages')) AS pageCount,json_array_length(json_extract(data,'$.doc.entities')) AS entityCount FROM studio WHERE id != ? ORDER BY id").bind(workspaceKey).all<{id:string;title:string;updatedAt:string;pageCount:number;entityCount:number}>();
 return result.results;
}
export async function resolveScenarioId(id?:string):Promise<string>{
 if(id!==undefined)return checkScenarioId(id);
 if((await listScenarios()).length>1)throw Error('シナリオIDを指定してください。get_project_contextで対象のscenarioIdを取得できます。');
 return 'main';
}
export async function openScenario(id:string){
 const {state}=await readStore(checkScenarioId(id));
 await env.DB!.prepare('INSERT OR IGNORE INTO studio (id,data,version) VALUES (?,?,0)').bind(workspaceKey,JSON.stringify({activeScenarioId:id})).run();
 await env.DB!.prepare('UPDATE studio SET data = ?, version = version + 1 WHERE id = ?').bind(JSON.stringify({activeScenarioId:id}),workspaceKey).run();
 return state;
}
export async function createScenario(title:string){
 if(typeof title!=='string'||!title.trim()||title.trim().length>200)throw Error('シナリオ名を1〜200文字で入力してください。');
 await readStore('main');
 const id='scenario-'+uid(),state=initialStore();state.scenarioId=id;state.doc.title=title.trim();
 await env.DB!.prepare('INSERT INTO studio (id,data,version) VALUES (?,?,0)').bind(id,JSON.stringify(state)).run();
 return openScenario(id);
}
export async function readStore(scenarioId?:string,attempt=0):Promise<{state:Store;version:number}>{
 if(attempt>=5)throw new Conflict('同時更新がありました。再試行してください。');
 const db=env.DB;if(!db)throw Error('保存先が利用できません。');
 const id=checkScenarioId(scenarioId??await activeScenarioId());
 let row=await db.prepare('SELECT data, version FROM studio WHERE id = ?').bind(id).first<{data:string;version:number}>();
 if(!row){if(id!=='main')throw Error('シナリオが見つかりません。');const data=initialStore();data.scenarioId=id;await db.prepare('INSERT OR IGNORE INTO studio (id,data,version) VALUES (?,?,0)').bind(id,JSON.stringify(data)).run();row=await db.prepare('SELECT data,version FROM studio WHERE id = ?').bind(id).first<{data:string;version:number}>();}
 const state=JSON.parse(row!.data) as Store;state.scenarioId=id;
 if(state.layoutVersion!==1){
  const migrated=migrateLayout(state);
  const changed=await db.prepare('UPDATE studio SET data = ?, version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(migrated),id,row!.version).run();
  if(changed.meta.changes)return {state:await loadSelection(migrated,id),version:row!.version+1};
  return readStore(id,attempt+1);
 }
 return {state:await loadSelection(state,id),version:row!.version};
}
export async function mutate(fn:(s:Store)=>any,scenarioId:string){
 for(let tries=0;tries<5;tries++){const {state,version}=await readStore(scenarioId);const result=fn(state);state.updatedAt=new Date().toISOString();const changed=await env.DB!.prepare('UPDATE studio SET data = ?, version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(state),scenarioId,version).run();if(changed.meta.changes)return {state,result};}
 throw new Conflict('同時更新がありました。再試行してください。');
}
export function remember(s:Store,label:string){s.history.push({doc:structuredClone(s.doc),label,at:new Date().toISOString()});s.history=s.history.slice(-20);}
export function validateProposal(s:Store,p:any){
 if(p.scenarioId!==undefined&&p.scenarioId!==s.scenarioId)throw new Conflict('別のシナリオの提案です。対象を確認してください。');
 if(typeof p.title!=='string'||!p.title.trim()||p.title.length>200||(p.summary!==undefined&&(typeof p.summary!=='string'||p.summary.length>20000))||!Number.isInteger(p.baseRevision))throw Error('提案名とbaseRevisionが必要です。');
 if(p.baseRevision!==s.contentRevision)throw new Conflict('参照した設定が更新されています。最新版で提案を作り直してください。');
 if(!p.review||!Number.isInteger(p.review.majorIssues)||p.review.majorIssues<0||typeof p.review.notes!=='string')throw Error('検証結果（majorIssues、notes）が必要です。');
 applyOperations(s.doc,p.operations);
 return {valid:true,semanticReview:'AIによる因果・心理検証はreviewに記録してください。形式検査のみでは保証されません。',blocking:p.review.majorIssues>0};
}
export async function action(name:string,args:any){
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('操作の形式が不正です。');
 const scenarioId=await resolveScenarioId(args.scenarioId);
 const scoped=(fn:(s:Store)=>any)=>mutate(fn,scenarioId);
 if(name==='save')return scoped(s=>{if(args.baseRevision!==s.contentRevision)throw new Conflict('他の編集が保存されています。入力をJSONで退避してから最新版を読み込んでください。');validateDoc(args.doc);remember(s,'手動編集');s.doc=args.doc;s.contentRevision++;});
 if(name==='select'){
  const {state}=await readStore(scenarioId),page=state.doc.pages.find(p=>p.id===args.pageId);
  if(!page)throw Error('ページがありません。');
  if(args.objectId!==undefined&&!page.objects.some(o=>o.id===args.objectId))throw Error('選択した枠がありません。');
  state.selection={pageId:page.id,...(args.objectId!==undefined?{objectId:args.objectId}:{})};
  await env.DB!.prepare('INSERT INTO studio_selection (scenario_id,data) VALUES (?,?) ON CONFLICT(scenario_id) DO UPDATE SET data=excluded.data').bind(scenarioId,JSON.stringify(state.selection)).run();
  return {state,result:undefined};
 }
 if(name==='propose_changes')return scoped(s=>{validateProposal(s,args);const p:Proposal={id:uid(),title:args.title,summary:args.summary||'',baseRevision:args.baseRevision,operations:args.operations,review:args.review,status:'pending',createdAt:new Date().toISOString()};s.proposals.push(p);s.proposals=s.proposals.slice(-100);return {proposalId:p.id,status:p.status};});
 if(name==='approve')return scoped(s=>{const p=s.proposals.find(p=>p.id===args.id);if(!p||p.status!=='pending')throw Error('採用待ちの提案がありません。');validateProposal(s,p);if(p.review.majorIssues)throw Error('重大な未解決問題が残っています。再検証を依頼してください。');remember(s,'AI提案の採用：'+p.title);s.doc=applyOperations(s.doc,p.operations);s.contentRevision++;p.status='accepted';});
 if(name==='reject')return scoped(s=>{const p=s.proposals.find(p=>p.id===args.id);if(!p||p.status!=='pending')throw Error('採用待ちの提案がありません。');p.status='rejected';});
 if(name==='undo')return scoped(s=>{if(args.baseRevision!==s.contentRevision)throw new Conflict('更新されています。最新版を確認してください。');const h=s.history.pop();if(!h)throw Error('戻せる履歴がありません。');s.doc=h.doc;s.contentRevision++;});
 throw Error('未対応の操作');
}
