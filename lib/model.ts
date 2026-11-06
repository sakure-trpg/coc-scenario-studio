export type Obj = {id:string; type:'text'|'entity'|'image'; x:number;y:number;w:number;h:number;text?:string;entityId?:string;src?:string;label?:string;size?:number;color?:string;};
export type Page = {section?:string;id:string;title:string;kind:string;objects:Obj[];notes:string;goal:string;choices:string;fallback:string;};
export type Entity = {id:string;name:string;type:string;description:string;image?:string;status:string;knowledge:string;motivation:string;};
export type Doc = {legacyPages?:Page[];title:string;pages:Page[];entities:Entity[];canon:{id:string;text:string;status:string}[];events:{id:string;time:string;text:string;entityId?:string}[];relationships:{id:string;from:string;to:string;label:string}[];issues:{id:string;text:string;severity:string;status:string}[];};
export type Operation = {action:'add_page'|'update_page'|'add_entity'|'update_entity'|'add_object'|'add_canon'|'add_event'|'add_relationship'|'add_issue'|'resolve_issue';targetId?:string;value:any};
export type Proposal={id:string;title:string;summary:string;baseRevision:number;operations:Operation[];review:{majorIssues:number;notes:string};status:string;createdAt:string};
export type Store = {scenarioId?:string;layoutVersion?:number;layoutBackup?:{doc:Doc;selection:{pageId:string;objectId?:string};contentRevision:number;savedAt:string};doc:Doc;contentRevision:number;selection:{pageId:string;objectId?:string};proposals:Proposal[];history:{doc:Doc;label:string;at:string}[];updatedAt:string};
export const uid=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
// Labels are editor prompts only. Unknown scenario content stays empty.
export const sectionLabels:Record<string,string>={title:'タイトルと概要',lead:'リード',introduction:'はじめに',kp:'KP向け情報',pl:'PL向け情報',npc:'主要なNPC',scene:'シーン',notes:'備考'};
const fixedSections=['title','lead','introduction','kp','pl'];
export const isReservedPage=(p:Page)=>fixedSections.includes(p.section||'')||p.section==='notes';
export const pageGroup=(p:Page)=>fixedSections.includes(p.section||'')?fixedSections.indexOf(p.section!):p.section==='notes'?7:p.section==='npc'||p.kind==='NPC'?5:6;
export function orderPages(pages:Page[]):Page[]{return pages.map((p,i)=>({p,i})).sort((a,b)=>pageGroup(a.p)-pageGroup(b.p)||a.i-b.i).map(x=>x.p);}
export function makePage(kind:string,title?:string,id=uid()):Page {
 const section=({概要:'title',リード:'lead',はじめに:'introduction','KP向け情報':'kp','PL向け情報':'pl',NPC:'npc',備考:'notes'} as Record<string,string>)[kind]||'scene';
 const fields:Record<string,string[]>={title:['シナリオタイトル','概要（導入から結末まで・400字程度／本編字数の対象外）'],lead:['募集用リード（物語の雰囲気・探索者の役割・戦闘の指針など）'],introduction:['必要なルールブック・ソースブック','プレイヤー人数・想定プレイ時間','適した職業・技能','シナリオのトーン'],kp:['キーパーだけが知る真相・背景・事件の全体像'],pl:['開始時に探索者・プレイヤーが知っている情報'],npc:['名前','背景','人物像','シナリオとの関わり','能力値・技能（必要な場合）'],scene:['場面・描写','探索情報・判定','イベント・分岐・次のシーン'],notes:['今後考えること・未決定事項・補足']};
 const names=fields[section];
 const objects:Obj[]=names.map((label,i)=>{
  let x=72,y=76,w=1136,h=548;
  if(section==='title'){y=i?210:76;h=i?410:94;}
  else if(names.length>1){const cols=section==='npc'?2:names.length===4?2:1;const rows=Math.ceil(names.length/cols);w=cols===2?548:1136;h=Math.floor(548/rows)-20;x=72+(i%cols)*588;y=76+Math.floor(i/cols)*(h+20);}
  return {id:id+'-field-'+i,type:'text',x,y,w,h,text:'',label,size:section==='title'&&i===0?38:22,color:'#303631'};
 });
 return {id,title:title||sectionLabels[section],kind,section,objects,notes:'',goal:'',choices:'',fallback:''};
}
export const countText=(text:string)=>Array.from(text.replace(/\s/g,'')).length;
// Page labels, design notes and the overview are outside the manuscript count.
export const manuscriptLength=(d:Doc)=>d.pages.filter(p=>p.section!=='title'&&p.kind!=='概要'&&p.section!=='notes'&&p.kind!=='備考').reduce((n,p)=>n+p.objects.filter(o=>o.type==='text').reduce((n,o)=>n+countText(o.text||''),0),0);
export function initialStore():Store {
 const doc:Doc={title:'新しいシナリオ',pages:[makePage('概要',undefined,'overview'),makePage('リード',undefined,'lead'),makePage('はじめに',undefined,'introduction'),makePage('KP向け情報',undefined,'kp-info'),makePage('PL向け情報',undefined,'pl-info'),makePage('備考',undefined,'remarks')],entities:[],canon:[],events:[],relationships:[],issues:[]};
 return {doc,layoutVersion:1,contentRevision:1,selection:{pageId:'overview'},proposals:[],history:[],updatedAt:new Date().toISOString()};
}
export function validateDoc(d:any):asserts d is Doc {
 if(!d||typeof d.title!=='string'||d.title.length>200)throw Error('シナリオ名を確認してください。');
 for(const key of ['pages','entities','canon','events','relationships','issues'])if(!Array.isArray(d[key]))throw Error('不足した配列: '+key);
 if(!d.pages.length||d.pages.length>200||d.entities.length>500)throw Error('ページ・素材数の上限を超えています。');
 const ids=new Set<string>();
 for(const collection of [d.pages,d.entities,d.canon,d.events,d.relationships,d.issues])for(const v of collection){if(!v||typeof v.id!=='string'||!v.id.trim()||v.id.length>200||ids.has(v.id))throw Error('IDが重複または未設定です。');ids.add(v.id);}
 const entityIds=new Set(d.entities.map((x:any)=>x.id));
 const textFields=(v:any,fields:string[])=>{for(const f of fields)if(typeof v[f]!=='string')throw Error('文字列が必要です: '+f);};
 const assetPattern=/^\/api\/assets\/[a-zA-Z0-9-]+$/;
 for(const p of d.pages){textFields(p,['title','kind','notes','goal','choices','fallback']);if(p.section!==undefined&&!Object.hasOwn(sectionLabels,p.section))throw Error('ページ区分が不正です。');}
 // Legacy documents without sections remain importable.
 if(d.pages.some((p:Page)=>p.section==='title')){
  for(const section of [...fixedSections,'notes'])if(d.pages.filter((p:Page)=>p.section===section).length!==1)throw Error('最初の5枚と最後の備考を各1枚確保してください。');
  const ordered=orderPages(d.pages);if(ordered.some((p,i)=>p.id!==d.pages[i].id))throw Error('最初の5枚 → NPC → シーン → 備考の順にしてください。');
 }
 for(const e of d.entities){textFields(e,['name','description','knowledge','motivation']);if(e.image&&!assetPattern.test(e.image))throw Error('素材画像の参照が不正です。');}
 for(const e of d.events){textFields(e,['time','text']);if(e.entityId&&!entityIds.has(e.entityId))throw Error('出来事の素材参照が不正です。');}
 for(const r of d.relationships)textFields(r,['label']);
 for(const i of d.issues){textFields(i,['text']);if(!['major','minor'].includes(i.severity)||!['open','resolved'].includes(i.status))throw Error('課題の形式が不正です。');}
 for(const e of d.entities){if(typeof e.name!=='string'||!['NPC','アイテム','呪文','神話存在'].includes(e.type)||!['confirmed','candidate','rejected','undecided'].includes(e.status))throw Error('素材の形式が不正です。');}
 for(const c of d.canon)if(typeof c.text!=='string'||!['confirmed','candidate','rejected','undecided'].includes(c.status))throw Error('設定の形式が不正です。');
 for(const p of d.pages){if(typeof p.title!=='string'||!Array.isArray(p.objects))throw Error('ページ形式が不正です。');if(p.objects.length>1000)throw Error('1枚の枠は1000個までです。');const objIds=new Set();for(const o of p.objects){if(!o||typeof o.id!=='string'||!o.id.trim()||o.id.length>200||objIds.has(o.id))throw Error('配置IDの重複');objIds.add(o.id);if(!['text','entity','image'].includes(o.type)||!['x','y','w','h'].every(k=>Number.isFinite(o[k]))||o.w<20||o.h<20||o.w>1280||o.h>720||o.x<0||o.y<0||o.x+o.w>1281||o.y+o.h>721)throw Error('配置サイズまたは位置が不正です。');if(o.size!==undefined&&(!Number.isFinite(o.size)||o.size<1||o.size>300))throw Error('文字サイズが不正です。');if(o.color!==undefined&&(typeof o.color!=='string'||!/^#[0-9a-fA-F]{3,8}$/.test(o.color)))throw Error('文字色が不正です。');if(o.label!==undefined&&typeof o.label!=='string')throw Error('枠のラベルが不正です。');if(o.type==='image'&&(typeof o.src!=='string'||!assetPattern.test(o.src)))throw Error('画像の参照が必要です。');if(o.type==='text'&&typeof o.text!=='string')throw Error('本文が必要です。');if(o.type==='entity'&&!entityIds.has(o.entityId))throw Error('存在しない素材を参照しています。');if(o.src&&!/^\/api\/assets\/[a-zA-Z0-9-]+$/.test(o.src))throw Error('画像は素材アップロードで追加してください。');}}
 for(const r of d.relationships)if(!entityIds.has(r.from)||!entityIds.has(r.to))throw Error('相関図の参照先がありません。');
 if(JSON.stringify(d).length>2500000)throw Error('シナリオデータが大きすぎます。画像はアップロードしてください。');
}
export function applyOperations(doc:Doc,ops:Operation[]):Doc {
 if(!Array.isArray(ops)||!ops.length||ops.length>100)throw Error('変更操作は1〜100件です。');
 const d=structuredClone(doc);
 for(const op of ops){
 if(!op||typeof op.action!=='string')throw Error('変更操作が不正です。');const v=op.value;if(!v||typeof v!=='object'||Array.isArray(v))throw Error('変更内容を確認してください。');
 const mappings:any={add_page:'pages',add_entity:'entities',add_canon:'canon',add_event:'events',add_relationship:'relationships',add_issue:'issues'};
 if(Object.hasOwn(mappings,op.action)){const key=mappings[op.action] as keyof Doc;(d[key] as any[]).push({...v,id:v.id||uid()});}
 else if(op.action==='update_page'||op.action==='update_entity'){
 const list=op.action==='update_page'?d.pages:d.entities;const index=list.findIndex(x=>x.id===op.targetId);if(index<0)throw Error('更新対象が見つかりません。');list[index]={...list[index],...v,id:list[index].id} as any;
 }else if(op.action==='add_object'){const p=d.pages.find(p=>p.id===op.targetId);if(!p)throw Error('対象ページがありません。');p.objects.push({...v,id:v.id||uid()});}
 else if(op.action==='resolve_issue'){const issue=d.issues.find(i=>i.id===op.targetId);if(!issue)throw Error('対象課題がありません。');issue.status='resolved';}
 else throw Error('未対応の操作: '+op.action);
 }
 d.pages=orderPages(d.pages);validateDoc(d);return d;
}
