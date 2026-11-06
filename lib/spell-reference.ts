import data from './spell-reference-data.json';

type SpellRecord = {
 id:string; name:string; book:string; cost:string; duration:string;
 photos:string[]; file:string; markdown:string;
};
const records: SpellRecord[] = data;

const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase('ja');
const metadata = (r: typeof records[number]) => ({id:r.id,name:r.name,book:r.book,cost:r.cost,duration:r.duration,photos:r.photos,file:r.file});
const indexed = records.map(record => ({record,name:normalize(record.name),metadata:normalize(record.cost+' '+record.duration),text:normalize(record.markdown)}));
export const spellReferenceInfo = {count:records.length,source:records.length?'ローカル参照資料':'資料未同梱',searchTool:'search_spells',readTool:'get_spell',browserPath:records.length?'/spell_reference/app/index.html':null,markdownPath:records.length?'/spell_reference/呪文一覧.md':null,instructions:'候補は検索で絞り込み、採用前にget_spellで個別Markdown全体を読む。効果・判定・距離・期間・制約・深層の魔術・別名を確認し、呪文IDを記録する。原文と独自の派生設定を区別し、原文にない数値や効果を補わない。'};

export function searchSpells(args: {query:string;book?:string;limit?:number;offset?:number}) {
 if(typeof args.query!=='string'||!args.query.trim()||args.query.length>200)throw Error('検索語を1〜200文字で指定してください。');
 const limit=args.limit??10,offset=args.offset??0;
 if(!Number.isInteger(limit)||limit<1||limit>30||!Number.isInteger(offset)||offset<0)throw Error('limitは1〜30、offsetは0以上の整数を指定してください。');
 if(args.book&&!['グランドグリモア1','グランドグリモア2'].includes(args.book))throw Error('出典の指定が不正です。');
 const terms=normalize(args.query).trim().split(/\s+/);
 const matches=indexed.filter(({record,text})=>(!args.book||record.book===args.book)&&terms.every(term=>text.includes(term)||normalize(record.id).includes(term))).map(entry=>({...entry,score:terms.reduce((sum,term)=>sum+10*Number(entry.name.includes(term))+3*Number(entry.metadata.includes(term)),0)})).sort((a,b)=>b.score-a.score||a.record.id.localeCompare(b.record.id));
 return {query:args.query,total:matches.length,offset,nextOffset:offset+limit<matches.length?offset+limit:null,results:matches.slice(offset,offset+limit).map(({record})=>metadata(record)),instructions:'この結果は検索用メタデータです。採用前にget_spellへidを渡し、全文を確認してください。'};
}

export function getSpell(id:string) {
 if(typeof id!=='string'||!/^S\d{4}$/.test(id))throw Error('S0001のような呪文IDを指定してください。');
 const record=records.find(r=>r.id===id);
 if(!record)throw Error('その呪文IDは資料にありません。search_spellsで確認してください。');
 return {...metadata(record),source:spellReferenceInfo.source,markdown:record.markdown,complete:true};
}
