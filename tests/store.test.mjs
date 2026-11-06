import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'studio-test-'));
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE studio(id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
globalThis.__studioTestEnv={DB:{prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {async first(){return stmt.get(...args)},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}},async all(){return {results:stmt.all(...args)}}}},async run(){db.exec(sql)}}}}};
for(const name of ['model','migration','store']){let src=readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.__studioTestEnv;").replaceAll("'./model'","'./model.mjs'").replaceAll("'./migration'","'./migration.mjs'");writeFileSync(join(dir,name+'.mjs'),ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
const {readStore,action}=await import(join(dir,'store.mjs'));
test('selection writes do not change content or its version; stale saves fail',async()=>{const before=await readStore('main');await action('select',{scenarioId:'main',pageId:'lead'});const after=await readStore('main');assert.equal(after.version,before.version);assert.equal(after.state.selection.pageId,'lead');assert.deepEqual(after.state.doc,before.state.doc);const doc=structuredClone(after.state.doc);doc.title='Saved';await action('save',{scenarioId:'main',baseRevision:after.state.contentRevision,doc});await assert.rejects(action('save',{scenarioId:'main',baseRevision:before.state.contentRevision,doc:before.state.doc}));assert.equal((await readStore('main')).state.doc.title,'Saved');await assert.rejects(action('select',{scenarioId:'main',pageId:'lead',objectId:'missing'}));});
process.on('exit',()=>{db.close();rmSync(dir,{recursive:true,force:true});});
