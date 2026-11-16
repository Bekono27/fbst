const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {groupStore}=require('../groups.cjs');
const G=require('../../group-tools.js');
test('regions and exact sizes retain unknown values',()=>{
 assert.equal(G.region('Arkhangai'),'Архангай');assert.equal(G.region('Khan-Uul district'),'Хан-Уул');
 assert.equal(G.bucket('Сүхбаатар дүүрэг'),'Улаанбаатар ба дүүрэг');
 assert.equal(G.region(''),'Тодорхойгүй');assert.equal(G.members('303,064'),303064);assert.equal(G.members(''),null);
 assert.throws(()=>G.members('12k'));assert.ok(G.csv([{name:'=cmd',region:'Улс'}]).includes("\"'=cmd\""));
});
test('additive group metadata migration preserves existing rows',()=>{
 const db=new DatabaseSync(':memory:');
 try{
 db.exec("CREATE TABLE groups(id TEXT PRIMARY KEY,name TEXT NOT NULL,url TEXT NOT NULL UNIQUE,group_id TEXT NOT NULL,privacy TEXT NOT NULL,members INTEGER,notes TEXT NOT NULL,updated_at TEXT NOT NULL)");
 db.prepare('INSERT INTO groups VALUES(?,?,?,?,?,?,?,?)').run('old','Old','https://www.facebook.com/groups/123/','123','unknown',null,'keep','2026-01-01');
 const store=groupStore(db);assert.equal(store.list()[0].notes,'keep');
 store.save({...store.list()[0],region:'Архангай',source:'uploaded.csv'});assert.equal(store.list()[0].region,'Архангай');
 groupStore(db);assert.equal(store.list().length,1);
 }finally{db.close();}
});
