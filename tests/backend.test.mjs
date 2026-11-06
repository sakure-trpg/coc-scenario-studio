import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialStore,validateDoc,applyOperations} from '../lib/model.ts';
test('backup JSON round trip remains valid',()=>{const d=JSON.parse(JSON.stringify(initialStore().doc));assert.doesNotThrow(()=>validateDoc(d));});
test('invalid objects and dangling references are rejected',()=>{for(const patch of [{id:12},{size:NaN},{color:123},{type:'entity',entityId:'missing'},{type:'image',src:''}]){const d=initialStore().doc;Object.assign(d.pages[0].objects[0],patch);assert.throws(()=>validateDoc(d));}});
test('bad operations cannot change the original document',()=>{const d=initialStore().doc,original=JSON.stringify(d);for(const op of [null,{action:'__proto__',value:{}},{action:'constructor',value:{}},{action:'update_page',targetId:'missing',value:{}}])assert.throws(()=>applyOperations(d,[op]));assert.equal(JSON.stringify(d),original);});
