// Run only against the explicitly approved synthetic staging project.
// Credentials live outside the repository; never print tokens or passwords.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPaymentRequests } from '../src/utils/paymentRequests.js';
const c=JSON.parse(fs.readFileSync('/tmp/rk-staging-config.json'));
assert.equal(c.projectId,'lsgzpvhyuswmvpxokhdt');
assert.equal(c.url,'https://lsgzpvhyuswmvpxokhdt.supabase.co');
const credentials=JSON.parse(fs.readFileSync('/tmp/rk-staging-auth.json'));
const login=await fetch(c.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify(credentials)});
assert.equal(login.status,200);
const session=await login.json();
async function api(path,method='GET',body,anonymous=false,extra={}) {
 const r=await fetch(c.url+'/rest/v1/'+path,{method,headers:{apikey:c.key,...(!anonymous?{Authorization:'Bearer '+session.access_token}:{}),'Content-Type':'application/json',Prefer:'return=representation',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await r.text(); const value=text?JSON.parse(text):null;
 return {status:r.status,data:r.ok?value:null,error:r.ok?null:value};
}
async function ok(path,method,body){const r=await api(path,method,body);assert.equal(r.error,null,JSON.stringify(r.error));return r.data;}
const rpc=(id,op,payload)=>api('rpc/rk_payment_operation','POST',{p_request_id:id,p_operation:op,p_payload:payload});
const run=async(op,payload)=>{const r=await rpc(randomUUID(),op,payload);assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
const date='2026-09-01';
const customer=(await ok('customers','POST',{customer_name:'STAGING Synthetic Integrity',company_name:'Synthetic only'}))[0];
async function deal(label,term=1){return (await ok('deals','POST',{deal_tag:'STG-'+label+'-'+randomUUID().slice(0,8),customer_id:customer.id,total_amount:500*term,monthly_payment:500,term,due_day:1,start_date:'2026-08-01',payment_frequency:'Monthly',deal_type:'In-house'}))[0];}
const record=(d,amount,paid=0,promisedDate)=>({dealId:d.id,paymentDate:date,paymentMethod:'Cash',allocations:[{dueDate:date,amountPaid:amount,expectedPaid:paid,expectedRemaining:500-paid,...(promisedDate?{promisedDate}:{})}]});
const rows=(table,d)=>ok(table+'?deal_id=eq.'+d.id);
const cap=await ok('rpc/rk_payment_capabilities');
if(process.argv.includes('--before-activation')){
 assert.equal(cap.enabled,false);
 const d=await deal('PRE');
 assert.equal((await rpc(randomUUID(),'record',record(d,500))).error.code,'P0001');
 const p=await ok('payments','POST',{deal_id:d.id,payment_date:date,due_date:date,amount_paid:1});
 await ok('payments?id=eq.'+p[0].id,'DELETE');
 assert.equal((await api('rpc/rk_payment_capabilities','POST',{},true)).status,401);
 console.log('PASS disabled RPC, legacy direct writer, anonymous RPC denial');
 process.exit(0);
}
assert.equal(cap.enabled,true);
const full=await deal('FULL');
const f=await run('record',record(full,500));
assert.equal(f.balance,0);assert.equal(f.dealStatus,'Paid Off');assert.equal((await rows('payments',full)).length,1);assert.equal((await rows('payment_promises',full)).length,0);
console.log('PASS full payment');
const d=await deal('PARTIAL');
const first=await run('record',record(d,200,'0','2026-09-10'));
assert.equal(first.balance,300);assert.equal(first.promises[0].remaining_amount,300);
const second=await run('record',record(d,100,200));
assert.equal(second.balance,200);assert.equal(second.promises[0].remaining_amount,200);
const voided=await run('void',{dealId:d.id,paymentId:first.payments[0].id,reason:'Synthetic multiple-payment void'});
assert.equal(voided.balance,400);assert.equal(voided.promises[0].remaining_amount,400);
const voidSecond=await run('void',{dealId:d.id,paymentId:second.payments[0].id,reason:'Synthetic remaining-payment void'});
assert.equal(voidSecond.promises[0].remaining_amount,500);
console.log('PASS multiple partial payments and authoritative voids');
const root=voidSecond.promises[0];
const res=await run('reschedule',{dealId:d.id,promiseId:root.id,expectedRemaining:500,newPromisedDate:'2026-09-12',reason:'Synthetic reschedule'});
assert.equal(res.promises.find(p=>p.id===root.id).promise_status,'Rescheduled');
const child=res.promises.find(p=>p.parent_promise_id===root.id);
const partial=await run('promise_partial',{dealId:d.id,promiseId:child.id,expectedRemaining:500,amountPaid:200,paymentDate:date,paymentMethod:'Cash',newPromisedDate:'2026-09-13'});
const leaf=partial.promises.find(p=>p.promise_status==='Pending');
assert.equal(leaf.remaining_amount,300);
const paid=await run('promise_paid',{dealId:d.id,promiseId:leaf.id,expectedRemaining:300,paymentDate:date,paymentMethod:'Cash'});
assert.equal(paid.dealStatus,'Paid Off');assert.equal(paid.balance,0);
const reopened=await run('void',{dealId:d.id,paymentId:partial.payments[0].id,reason:'Synthetic payoff reopening'});
assert.equal(reopened.balance,200);assert.equal(reopened.dealStatus,'Active');assert.equal(reopened.promises.find(p=>p.id===leaf.id).remaining_amount,200);
console.log('PASS reschedule, partial promise replacement, promise settlement, paid-off reopening');
const broken=await deal('BROKEN');
const b=await run('record',record(broken,200,0,'2026-09-02'));
assert.equal(b.promises[0].promise_status,'Broken');
console.log('PASS controlled overdue promise');
const concurrent=await deal('CONCURRENT');const key=randomUUID();const payload=record(concurrent,200);
const [a1,a2]=await Promise.all([rpc(key,'record',payload),rpc(key,'record',payload)]);
assert.equal(a1.error,null);assert.deepEqual(a1.data,a2.data);assert.equal((await rows('payments',concurrent)).length,1);
await run('record',record(concurrent,100,200));assert.equal((await rows('payments',concurrent)).length,2);
console.log('PASS concurrent same-request retries and legitimate separate payments');
const recovery=await deal('RECOVERY');let stored=null;let lost=true;let sends=0;
const storage={getItem:()=>stored,setItem:(_k,v)=>stored=v,removeItem:()=>stored=null};
const client=()=>createPaymentRequests({storage,actorId:session.user.id,uuid:randomUUID,lock:(_k,work)=>work(),rpc:async(...args)=>{sends++;const r=await rpc(...args);if(lost){lost=false;throw Error('Synthetic lost response after database committed');}return r;}});
const firstClient=client();await assert.rejects(firstClient.run('record',record(recovery,200)),/lost response/);
const pendingKey=JSON.parse(stored).requestId;
const restarted=client();const recovered=await restarted.run(null,null,true);assert.equal(recovered.requestId,pendingKey);assert.equal((await rows('payments',recovery)).length,1);restarted.acknowledge(pendingKey);
const input=record(recovery,100,200);const [click1,click2]=await Promise.all([restarted.run('record',input),restarted.run('record',input)]);
assert.equal(click1.requestId,click2.requestId);assert.equal(sends,3);assert.equal((await rows('payments',recovery)).length,2);
console.log('PASS actual frontend request helper double-click and committed/lost-response recovery');
const atomic=await deal('ATOMIC',2);const request=record(atomic,200,0,'2026-09-10');request.allocations.push({dueDate:'2026-10-01',amountPaid:501,expectedPaid:0,expectedRemaining:500});
const rejected=await rpc(randomUUID(),'record',request);assert.equal(rejected.error.code,'P0001');assert.equal((await rows('payments',atomic)).length,0);assert.equal((await rows('payment_promises',atomic)).length,0);
assert.equal((await ok('deals?id=eq.'+atomic.id))[0].status,'Active');
console.log('PASS rollback after first allocation payment/promise creation');
if(process.argv.includes('--fault-injection')){
 const snapshot=async(target)=>({deal:await ok('deals?id=eq.'+target.id),payments:await ok('payments?deal_id=eq.'+target.id+'&order=id'),promises:await ok('payment_promises?deal_id=eq.'+target.id+'&order=id')});
 const failed=async(op,payload,target)=>{
  const before=await snapshot(target);
  const r=await rpc(randomUUID(),op,{...payload,stagingFault:'ledger'});
  assert.match(r.error?.message??'',/STAGING controlled failure/);
  assert.deepEqual(await snapshot(target),before);
 };
 const fault=await deal('FAULT');
 await failed('record',record(fault,500),fault);
 await failed('record',record(fault,200,0,'2026-09-10'),fault);
 const initial=await run('record',record(fault,200,0,'2026-09-10'));
 const p=initial.promises[0];
 await failed('promise_partial',{dealId:fault.id,promiseId:p.id,expectedRemaining:300,amountPaid:100,paymentDate:date,paymentMethod:'Cash',newPromisedDate:'2026-09-12'},fault);
 await failed('reschedule',{dealId:fault.id,promiseId:p.id,expectedRemaining:300,newPromisedDate:'2026-09-12',reason:'Synthetic fault'},fault);
 const settled=await run('promise_paid',{dealId:fault.id,promiseId:p.id,expectedRemaining:300,paymentDate:date,paymentMethod:'Cash'});
 await failed('void',{dealId:fault.id,paymentId:settled.payments[0].id,reason:'Synthetic fault'},fault);
 console.log('PASS injected ledger-completion failures restore payments, promises, reschedules, payoff and void state');
}
for(const table of ['payments','payment_promises']){
 const fields=table==='payments'?{payment_date:date,amount_paid:1}:{original_due_date:date,remaining_amount:1};
 assert.equal((await api(table,'POST',{deal_id:atomic.id,...fields})).error.code,'P0001');
}
const maintenance=(await ok('maintenance_jobs','POST',{customer_id:customer.id,job_title:'Synthetic maintenance',labor_amount:100}))[0];
assert.equal(maintenance.total_amount,100);
await ok('maintenance_payments','POST',{maintenance_job_id:maintenance.id,customer_id:customer.id,amount_paid:100,payment_method:'Cash'});
console.log('PASS direct writer guards and separate maintenance payment');
fs.writeFileSync('/tmp/rk-staging-test-results.json',JSON.stringify({projectId:c.projectId,customerId:customer.id,deals:{full:full.id,partial:d.id,broken:broken.id,atomic:atomic.id,concurrent:concurrent.id,recovery:recovery.id},passed:true},null,2));
