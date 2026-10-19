export const ADDRESS=/^0x[0-9a-f]{40}$/i;
export const HASH=/^0x[0-9a-f]{64}$/i;
export const finite = v => {
  if(typeof v!=='number'&&!(typeof v==='string'&&/^[+]?\d*\.?\d+(?:e[+-]?\d+)?$/i.test(v.trim())))return null;
  const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;
};
export function kind(r) {
  if(r.scheme==='transfer') return 'transfer';
  if(['a2a-sig','a2a-hold'].includes(r.scheme)) return 'signed';
  if(['exact','a2a-tx'].includes(r.scheme)) return 'paid';
  return 'unknown';
}
export function relation(r) {
  if(!ADDRESS.test(r.payer||'') || !ADDRESS.test(r.payTo||'')) return 'unknown';
  return r.payer.toLowerCase()===r.payTo.toLowerCase() ? 'same-wallet' : 'other-wallet';
}
export function normalize(rows) {
  const seen=new Set();
  return rows.filter(r=>r&&typeof r==='object').filter(r=>{
    const key=HASH.test(r.tx||'') ? `${r.tx.toLowerCase()}:${r.agent||''}:${r.skill||''}:${r.scheme||''}` : JSON.stringify(r);
    if(seen.has(key)) return false; seen.add(key);return true;
  }).map(r=>({...r,time:Number.isFinite(Date.parse(r.at))?Date.parse(r.at):null,usdValue:finite(r.usd),latency:finite(r.ms),kind:kind(r),relation:relation(r)}));
}
export function summarize(rows) {
  const paid=rows.filter(r=>r.kind==='paid');
  const priced=paid.filter(r=>r.usdValue!==null);
  const lat=paid.map(r=>r.latency).filter(v=>v!==null).sort((a,b)=>a-b);
  return {events:rows.length,paid:paid.length,transfer:rows.filter(r=>r.kind==='transfer').length,signed:rows.filter(r=>r.kind==='signed').length,usd:priced.reduce((s,r)=>s+r.usdValue,0),unpriced:paid.length-priced.length,same:paid.filter(r=>r.relation==='same-wallet').length,other:paid.filter(r=>r.relation==='other-wallet').length,unknown:paid.filter(r=>r.relation==='unknown').length,p50:lat.length?lat[Math.floor((lat.length-1)/2)]:null,latencyN:lat.length};
}
export function selectRows(rows,{agent='',query='',type='all',window='all',now=Date.now()}={}) {
  const q=query.trim().toLowerCase();
  return rows.filter(r=>(!agent||r.agent===agent)&&(type==='all'||r.kind===type)&&(window==='all'||(r.time!==null&&r.time>=now-86400000&&r.time<=now))&&(!q||[r.agent,r.agentName,r.skill,r.payer,r.payTo,r.tx].join(' ').toLowerCase().includes(q)));
}
export function groupAgents(registry,rows) {
  const map=new Map(registry.filter(a=>a&&typeof a.id==='string').map(a=>[a.id,{...a,rows:[]} ]));
  for(const row of rows){if(!map.has(row.agent))map.set(row.agent,{id:row.agent,name:row.agentName||row.agent||'Unattributed',status:'unknown',rows:[]});map.get(row.agent).rows.push(row);}
  return [...map.values()].map(a=>({...a,summary:summarize(a.rows)})).sort((a,b)=>b.summary.other-a.summary.other||b.summary.paid-a.summary.paid||String(a.name).localeCompare(String(b.name)));
}
export function histogram(rows,now=Date.now()) {
  const start=now-24*3600000;
  return Array.from({length:24},(_,i)=>({at:start+i*3600000,count:rows.filter(r=>r.kind==='paid'&&r.time!==null&&r.time>=start+i*3600000&&r.time<(i===23?now+1:start+(i+1)*3600000)).length}));
}
export const explorer=tx=>HASH.test(tx||'')?'https://robinhoodchain.blockscout.com/tx/'+tx:null;
