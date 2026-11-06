import {notationInstructions,notationRules} from '../../lib/notation';
import { action, readStore, validateProposal, listScenarios, resolveScenarioId } from '../../lib/store';
import { applyOperations } from '../../lib/model';
import { architectRules } from '../../lib/architect';
import { spellReferenceInfo, searchSpells, getSpell } from '../../lib/spell-reference';
export const dynamic='force-dynamic';
const arg=(properties:any={},required:string[]=[])=>({type:'object',properties,required,additionalProperties:false});
const str={type:'string'};
const proposal=arg({scenarioId:str,title:str,summary:str,baseRevision:{type:'integer'},operations:{type:'array',items:{type:'object',properties:{action:{type:'string',enum:['add_page','update_page','add_entity','update_entity','add_object','add_canon','add_event','add_relationship','add_issue','resolve_issue']},targetId:str,value:{type:'object',additionalProperties:true}},required:['action','value']}},review:{type:'object',properties:{majorIssues:{type:'integer',minimum:0},notes:str},required:['majorIssues','notes']}},['scenarioId','title','baseRevision','operations','review']);
const definitions=[
 ['search_spells','ユーザー提供の呪文537件を名前・コスト・必要時間・本文から検索する。採用前にget_spellで個別本文全体を読む。空白区切りはAND検索。',arg({query:{type:'string',minLength:1,maxLength:200},book:{type:'string',enum:['グランドグリモア1','グランドグリモア2']},limit:{type:'integer',minimum:1,maximum:30},offset:{type:'integer',minimum:0}},['query'])],
 ['get_spell','呪文IDに対応するユーザー提供Markdown全文・出典・元画像名・コスト・必要時間を取得。数値や効果は創作で補わない。',arg({id:{type:'string',pattern:'^S[0-9]{4}$'}},['id'])],
 ['get_project_context','シナリオ一覧と対象の設定を取得。scenarioId省略時はWebで最後に開いたシナリオ。以後の操作には取得したscenarioIdを指定し、他シナリオを混ぜない。',arg({scenarioId:str})],
 ['get_page','シーン／資料ページの内容と配置を取得。',arg({id:str},['id'])],
 ['get_entity','NPC・呪文・アイテムの目的、知識の来歴を取得。',arg({id:str},['id'])],
 ['get_relationships','人物関係・知識や因果のつながりを取得。',arg()],
 ['get_timeline','別世界線を含む出来事を取得。timeはシナリオ内の表示ラベル。',arg()],
 ['list_open_issues','未解決の課題を取得。既知の解決済み問題を再提起しない。',arg()],
 ['get_architect_rules','取得したCoC Scenario Architect v1.9の原文を読む。pathはSKILL.mdまたはreferences/ファイル名.md。',arg({path:str})],
 ['validate_proposal','最新リビジョン、参照ID、配置・形式の検査。意味・心理の検証は別途必要。',proposal],
 ['propose_changes','変更候補のみ登録。確定設定は変更しない。Webの採用操作が必要。reviewに因果とNPC知識の検証結果を記録。',proposal]
].map(([name,description,inputSchema]:any[])=>({name,description,inputSchema:['get_page','get_entity','get_relationships','get_timeline','list_open_issues'].includes(name)?{...inputSchema,properties:{...inputSchema.properties,scenarioId:str},required:[...inputSchema.required,'scenarioId']}:inputSchema,annotations:{readOnlyHint:name!=='propose_changes',destructiveHint:false,idempotentHint:name!=='propose_changes'}}));
export async function POST(req:Request){
 let rpc:any;try{rpc=await req.json();if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
 let result:any;
 if(rpc.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
 else if(rpc.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'coc-scenario-studio',version:'0.3.0'},instructions:'個人用の複数シナリオ制作室。get_project_contextで対象を確認し、読取・提案ではscenarioIdを指定する。他シナリオの設定を混ぜない。'+notationInstructions+'シナリオの確定設定を維持し、v1.9規則を読んで変更候補を作る。採用はWeb上でユーザーが行う。呪文はユーザー提供537件をsearch_spellsで検索し、採用前にget_spellで個別本文全体を確認する。'};
 else if(rpc.method==='tools/list')result={tools:definitions};
 else if(rpc.method==='tools/call'){
 try{const {name,arguments:a={}}=rpc.params;let output:any;
 if(name==='search_spells')output=searchSpells(a);
 else if(name==='get_spell')output=getSpell(a.id);
 else if(name==='propose_changes')output=(await action(name,a)).result;
 else if(name==='get_architect_rules'){const path=a.path||'SKILL.md';if(!/^(SKILL\.md|references\/[a-zA-Z0-9_-]+\.md)$/.test(path))throw Error('SKILL.mdまたはreferences内のMarkdownを指定してください。');output=architectRules[path];if(!output)throw Error('規則ファイルがありません。');output+='\n\n## この制作室の表記ルール\n'+notationInstructions;}
 else{const id=name==='get_project_context'?a.scenarioId:await resolveScenarioId(a.scenarioId);const {state:s}=await readStore(id);
 if(name==='get_project_context')output={scenarioId:s.scenarioId,scenarios:await listScenarios(),scenarioInstructions:'以後の読み取り・提案にはこのscenarioIdを指定する。シナリオ名を確認し、別作品の設定を持ち込まない。',notationRules,notationInstructions,layoutVersion:s.layoutVersion,migrationBackup:s.layoutBackup?{available:true,contentRevision:s.layoutBackup.contentRevision,savedAt:s.layoutBackup.savedAt,pageCount:s.layoutBackup.doc.pages.length}:null,spellReference:spellReferenceInfo,title:s.doc.title,contentRevision:s.contentRevision,selection:s.selection,pages:s.doc.pages.map(({id,title,kind,section})=>({id,title,kind,section})),selectedPage:s.doc.pages.find(p=>p.id===s.selection.pageId),canon:s.doc.canon,entities:s.doc.entities,proposals:s.proposals.map(({id,title,status})=>({id,title,status})),operationGuide:{add_page:'value:{id,title,kind,section:npc|scene,objects:[],notes,goal,choices,fallback}。最初の5枚を維持しNPC→シーン→備考の順。未決定は空欄。概要は400字程度で本編字数から除外。',update_page:'targetId:pageId,value:部分更新（objectsは全置換）',add_entity:'value:{id,name,type:NPC|アイテム|呪文|神話存在,description,status:confirmed|candidate|rejected|undecided,knowledge,motivation}',add_object:'targetId:pageId,value:{id,type:text|entity|image,x,y,w,h,text?,entityId?,size?}。1280×720内。',add_canon:'value:{id,text,status}',add_event:'value:{id,time,text,entityId?}',add_relationship:'value:{id,from:entityId,to:entityId,label}',add_issue:'value:{id,text,severity:major|minor,status:open}',resolve_issue:'targetId:issueId,value:{}'},rules:'get_architect_rulesでSKILL.mdと該当するreferencesを読む。未解決重大問題はreview.majorIssuesに記録し0以外は採用不可。'};
 else if(name==='get_page')output=s.doc.pages.find(x=>x.id===a.id)||s.doc.legacyPages?.find(x=>x.id===a.id)||{error:'ページがありません'};
 else if(name==='get_entity')output=s.doc.entities.find(x=>x.id===a.id)||{error:'素材がありません'};
 else if(name==='get_relationships')output=s.doc.relationships;
 else if(name==='get_timeline')output=s.doc.events;
 else if(name==='list_open_issues')output=s.doc.issues.filter(x=>x.status==='open');
 else if(name==='validate_proposal')output={...validateProposal(s,a),preview:applyOperations(s.doc,a.operations)};
 else throw Error('Unknown tool');}
 result={content:[{type:'text',text:typeof output==='string'?output:JSON.stringify(output)}]};
 }catch(e){result={isError:true,content:[{type:'text',text:(e as Error).message}]};}
 }else return Response.json({jsonrpc:'2.0',id:rpc.id??null,error:{code:-32601,message:'Method not found'}});
 return Response.json({jsonrpc:'2.0',id:rpc.id??null,result});
 }catch(e){return Response.json({jsonrpc:'2.0',id:rpc?.id??null,error:{code:-32700,message:'Invalid request'}},{status:400});}
}
export async function GET(){return new Response('Use POST for MCP JSON-RPC.',{status:405,headers:{Allow:'POST'}});}
