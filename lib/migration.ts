import { makePage, orderPages, uid, validateDoc, type Doc, type Obj, type Page, type Store } from './model';

/** One atomic, lossless layout migration. No scenario facts are generated. */
export function migrateLayout(state:Store):Store {
 if(state.layoutVersion===1)return state;
 const next=structuredClone(state);
 // An imported/new template needs only the version marker.
 if(next.doc.pages.some(p=>p.section==='title')){next.layoutVersion=1;return next;}
 const original=structuredClone(state.doc),now=new Date().toISOString();
 next.layoutBackup={doc:original,selection:structuredClone(state.selection),contentRevision:state.contentRevision,savedAt:now};
 next.history.push({doc:structuredClone(original),label:'スライド構成の更新前',at:now});next.history=next.history.slice(-20);
 const ids=new Set([...original.pages,...original.entities,...original.canon,...original.events,...original.relationships,...original.issues].map(x=>x.id));
 const freshId=(prefix:string)=>{let id=prefix;while(ids.has(id))id=prefix+'-'+uid();ids.add(id);return id;};
 const cover=makePage('概要',undefined,freshId('studio-cover'));
 const lead=makePage('リード',undefined,freshId('studio-lead'));
 const intro=makePage('はじめに',undefined,freshId('studio-introduction'));
 const oldOverview=original.pages.find(p=>p.kind==='概要');
 const kp:Page=oldOverview?{...structuredClone(oldOverview),title:'KP向け情報',kind:'KP向け情報',section:'kp'}:makePage('KP向け情報',undefined,freshId('studio-kp'));
 const pl=makePage('PL向け情報',undefined,freshId('studio-pl'));
 const npcPages=original.entities.filter(e=>e.type==='NPC').map(e=>{
  const existing=original.pages.find(p=>p.kind==='NPC'&&p.title.includes(e.name));
  if(existing)return {...structuredClone(existing),section:'npc'};
  const p=makePage('NPC','NPC：'+e.name,freshId('studio-npc-'+e.id));
  p.objects[0].text=e.name;p.objects[1].text=e.description;p.objects[3].text=e.motivation;
  if(e.knowledge){const base=p.objects[4];p.objects.push({...base,id:p.id+'-knowledge',x:660,label:'知識・呪文の来歴',text:e.knowledge});}
  return p;
 });
 // Existing NPC pages are retained even if they have no matching shared entity.
 const usedNpc=new Set(npcPages.map(p=>p.id));
 npcPages.push(...original.pages.filter(p=>p.kind==='NPC'&&!usedNpc.has(p.id)).map(p=>({...structuredClone(p),section:'npc'})));
 const scenes=original.pages.filter(p=>['導入','探索','シーン','結末'].includes(p.kind)).map(p=>({...structuredClone(p),section:'scene'}));
 const retainedIds=new Set([kp,...npcPages,...scenes].map(p=>p.id));
 const supplements=original.pages.filter(p=>!retainedIds.has(p.id));
 const remarks=makePage('備考',undefined,freshId('studio-remarks'));
 // Supplementary pages remain verbatim in legacyPages and as editable notes.
 const combined=supplements.map(p=>[
  p.title,...p.objects.filter(o=>o.type==='text').map(o=>o.text||''),
  ...(['notes','goal','choices','fallback'] as const).filter(k=>p[k]).map(k=>({notes:'設計メモ',goal:'体験の核',choices:'PCの選択',fallback:'回避時の進行'})[k]+'：'+p[k])
 ].join('\n\n')).join('\n\n────────\n\n');
 remarks.objects[0].text=combined;
 // Retain original image/entity placements from supplementary documents.
 for(const p of supplements)for(const o of p.objects.filter(o=>o.type!=='text'))remarks.objects.push({...structuredClone(o),id:freshId('legacy-object-'+o.id)} as Obj);
 next.doc={...next.doc,legacyPages:original.pages,pages:orderPages([cover,lead,intro,kp,pl,...npcPages,...scenes,remarks])};
 validateDoc(next.doc);next.contentRevision++;next.layoutVersion=1;next.updatedAt=now;
 if(!next.doc.pages.some(p=>p.id===next.selection.pageId))next.selection={pageId:remarks.id};
 return next;
}
