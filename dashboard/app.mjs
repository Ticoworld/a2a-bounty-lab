import {normalize,summarize,selectRows,groupAgents,histogram,explorer,finite} from './model.mjs';
import {loadFeed} from './feed.mjs';
import {claimKey,checkable,inspectSettlement} from './settlement.mjs';
const $=s=>document.getElementById(s);
const state={feed:null,stats:null,registry:null,rows:[],agent:'',paused:false,busy:false,errors:{},updated:{},checks:new Map(),checking:new Set(),verifying:false};
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;}
const number=v=>v===null||v===undefined?'—':Number(v).toLocaleString('en-US');
const money=v=>v===null||v===undefined?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:4}).format(v);
const short=v=>typeof v==='string'&&v.length>18?v.slice(0,8)+'…'+v.slice(-6):(v||'Unknown');
const date=v=>v===null||v===undefined?'Unknown timestamp':new Intl.DateTimeFormat('en-GB',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(v))+' UTC';
const age=t=>{if(!t)return 'never';const s=Math.max(0,Math.floor((Date.now()-t)/1000));return s<60?s+'s ago':s<3600?Math.floor(s/60)+'m ago':Math.floor(s/3600)+'h ago';};
function link(text,url,cls){const n=el('a',text,cls);n.href=url;n.target='_blank';n.rel='noopener';return n;}
function metric(value,label){const n=el('div',undefined,'metric');n.append(el('span',value,'value'),el('span',label,'label'));return n;}
function renderStatus(){
 const failures=Object.keys(state.errors).length;const loaded=Object.keys(state.updated).length;
 $('sync-state').textContent=state.busy?'Refreshing':state.paused?'Paused':failures?'Partial data':loaded?'Connected':'Unavailable';
 $('sync-state').className='pill'+(failures||!loaded?' warn':'');
 $('sync-text').textContent=['feed','stats','registry'].map(k=>`${k}: ${age(state.updated[k])}`).join(' · ')+'. '+(state.paused?'Auto-refresh paused.':document.hidden?'Auto-refresh waits while tab is hidden.':'Auto-refresh every 30s.');
 $('refresh').disabled=state.busy;
 $('errors').replaceChildren(...Object.entries(state.errors).map(([k,msg])=>el('div',`${k}: ${msg}. ${state.updated[k]?'Showing the last successful response.':'No cached data is available.'}`,'error')));
}
function filteredRows(){
 const rows=selectRows(state.rows,{agent:state.agent,query:$('search').value,type:$('type').value,window:$('window').value});
 const mode=$('proof-filter').value;return mode==='all'?rows:rows.filter(r=>mode==='unchecked'?!state.checks.has(claimKey(r)):state.checks.get(claimKey(r))?.status===mode);
}
function render(){
 renderStatus();const s=state.stats;
 $('network').replaceChildren(metric(number(finite(s?.calls24h)),'API-reported calls / 24h'),metric(money(finite(s?.settled24h)),'API-reported settlement / 24h'),metric(number(finite(s?.agents)),'Registered agents'),metric(s?number(finite(s.p50ms))+' ms':'—','API-reported median latency'));
 const filters={agent:state.agent,query:$('search').value,type:$('type').value,window:$('window').value};
 const rows=filteredRows(),sample=summarize(rows);
 const raw=state.feed?.rows?.length||0,total=finite(state.feed?.total);
 $('coverage').textContent=state.feed?`${raw} loaded / ${total===null?'total unknown':total+' reported'}${state.feed.more?' · more history exists':''} · ${state.feed.pages} page(s)${state.feed.snapshotChanged?' · feed changed during loading':''}`:'Feed unavailable';
 const checked=rows.map(r=>state.checks.get(claimKey(r))).filter(Boolean);
 $('verification-summary').textContent=`${checked.length} checked in this filter: ${checked.filter(x=>x.status==='matched').length} matched, ${checked.filter(x=>x.status==='mismatch').length} mismatched, ${checked.filter(x=>x.status==='unavailable').length} unavailable. Checks prove transfers, not delivered answers.`;
 $('verify-batch').disabled=state.verifying||!rows.some(r=>checkable(r)&&!state.checks.has(claimKey(r)));
 $('sample').replaceChildren(...[[sample.paid,'Reported paid calls'],[sample.other,'Other-wallet paid calls'],[sample.same,'Same-wallet paid calls'],[sample.transfer,'Transfer-only events']].map(([n,t])=>{const d=el('div');d.append(el('strong',state.feed?number(n):'—'),el('small',t));return d;}));
 const bins=histogram(rows),max=Math.max(1,...bins.map(b=>b.count));
 $('histogram').replaceChildren(...bins.map(b=>{const n=el('div',undefined,'bar'+(!b.count?' zero':''));n.style.height=`${Math.max(2,b.count/max*90)}px`;n.title=`${date(b.at)}: ${b.count} loaded paid calls`;return n;}));
 $('histogram').setAttribute('aria-label',bins.map(b=>`${date(b.at)}: ${b.count}`).join('; '));
 $('event-title').textContent=(state.agent?state.agent+' · ':'')+`${rows.length} filtered events`;
 if(!state.feed){$('events').replaceChildren(el('p','No feed data is available. Refresh to retry.','empty'));}
 else if(!rows.length){$('events').replaceChildren(el('p','No loaded events match these filters. This does not establish that no activity occurred outside the loaded sample.','empty'));}
 else $('events').replaceChildren(...rows.map(r=>{
  const d=el('article',undefined,'event');
  const title=el('div',`${r.agentName||r.agent||'Unattributed agent'} / ${r.skill||'skill not reported'}`,'route');
  const amount=el('div',r.usdValue!==null?money(r.usdValue):(r.amount!==null&&r.amount!==undefined?`${r.amount} ${r.asset||''}`:'Value unknown'),'amount');
  const meta=el('div',undefined,'meta');
  const badgeNames={paid:'Reported paid',transfer:'Transfer only',signed:'Signed / holder',unknown:'Unclassified'};
  meta.append(el('span',badgeNames[r.kind],'badge'));
  if(r.kind==='paid')meta.append(el('span',r.relation==='same-wallet'?'Same wallet':r.relation==='other-wallet'?'Other wallet':'Payer unknown','badge'+(r.relation==='same-wallet'?' same':'')));
  meta.append(el('span',`${date(r.time)} · ${r.latency===null?'Latency not reported':r.latency+' ms'}`),el('br'),el('span',`${short(r.payer)} → ${short(r.payTo)}`));
  const receipt=el('div',undefined,'receipt');const url=explorer(r.tx);receipt.append(url?link('View transaction ↗',url):el('span','No transaction hash'));
  const key=claimKey(r),check=state.checks.get(key);
  if(checkable(r)){
   const button=el('button',state.checking.has(key)?'Checking...':check?.status==='matched'?'Check again':'Check USDG receipt','quiet check-button');button.type='button';button.disabled=state.verifying;button.addEventListener('click',()=>verifyRows([r]));receipt.append(button);
  }
  const proof=el('div',undefined,'proof '+(check?.status||''));
  if(check){proof.append(el('strong',check.status==='matched'?'Exact transfer matched':check.status==='mismatch'?'Claim mismatch':'Receipt unavailable'),el('span',check.reason));if(check.evidence)proof.append(el('small',`Chain 4663 / block ${BigInt(check.evidence.block).toString()} / ${check.evidence.amountAtomic} USDG base units`));}
  else proof.append(el('span',checkable(r)?'Receipt not checked.':r.kind==='signed'?'Signed / holder call: no payment receipt expected.':'Receipt check requires a complete USDG claim.'));
  d.append(title,amount,meta,receipt,proof);return d;
 }));
 const baseRows=selectRows(state.rows,{query:filters.query,type:filters.type,window:filters.window});
 const groups=groupAgents(state.registry?.agents||[],baseRows);
 $('agents').replaceChildren(...groups.map(a=>{const b=el('button',undefined,'agent');b.type='button';b.setAttribute('aria-pressed',String(a.id===state.agent));const name=el('span');name.append(el('i',undefined,'dot'+(a.status==='live'?' live':'')),document.createTextNode(a.name||a.id||'Unattributed'));b.append(name,el('span',a.summary.paid,'count'),el('small',`${a.status||'unknown'} · ${a.summary.other} other-wallet · ${a.summary.same} same-wallet`));b.addEventListener('click',()=>{state.agent=a.id===state.agent?'':a.id;render();});return b;}));
 $('detail').replaceChildren();
 const selected=groups.find(a=>a.id===state.agent);
 if(selected){$('detail').append(el('h3',selected.name||selected.id),el('p',selected.description||'This agent appears in the feed but no registry description is available.'),el('p',`${selected.summary.paid} reported paid calls in this filtered sample. ${selected.summary.unpriced} without a USD value; ${selected.summary.unknown} without complete payer addresses.`),el('p',`Known paid-call value: ${money(selected.summary.usd)}. Sample median latency: ${selected.summary.p50===null?'unknown':selected.summary.p50+' ms'} (${selected.summary.latencyN} records).`),link('Open agent page ↗','https://a2a.family/agents/view/?id='+encodeURIComponent(selected.id)));}
}
async function refresh(){
 if(state.busy)return;state.busy=true;renderStatus();
 const routes={feed:'/feed',stats:'/stats',registry:'/agents'};
 const names=Object.keys(routes);
 const results=await Promise.allSettled(names.map(async k=>{if(k==='feed')return loadFeed({maxPages:Number($('history').value)});const r=await fetch('https://api.a2a.family'+routes[k],{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);const v=await r.json();if(k==='feed'&&!Array.isArray(v.rows)||k==='registry'&&!Array.isArray(v.agents)||k==='stats'&&(!v||typeof v!=='object'||Array.isArray(v)))throw Error('Unexpected response shape');return v;}));
 results.forEach((r,i)=>{const k=names[i];if(r.status==='fulfilled'){state[k]=r.value;state.updated[k]=Date.now();delete state.errors[k];if(k==='feed')state.rows=normalize(r.value.rows);}else state.errors[k]=r.reason?.name==='TimeoutError'?'Request timed out':String(r.reason?.message||'Request failed');});
 state.busy=false;render();
}
async function verifyRows(rows){
 if(state.verifying)return;state.verifying=true;
 try{for(const row of rows){const key=claimKey(row);state.checking.add(key);render();state.checks.set(key,await inspectSettlement(row));state.checking.delete(key);render();}}finally{state.verifying=false;render();}
}
$('verify-batch').addEventListener('click',()=>verifyRows(filteredRows().filter(r=>checkable(r)&&!state.checks.has(claimKey(r))).slice(0,10)));
$('history').addEventListener('change',refresh);
for(const id of ['search','type','window','proof-filter'])$(id).addEventListener(id==='search'?'input':'change',render);
$('refresh').addEventListener('click',refresh);
$('pause').addEventListener('click',()=>{state.paused=!state.paused;$('pause').textContent=state.paused?'Resume auto-refresh':'Pause auto-refresh';$('pause').setAttribute('aria-pressed',String(state.paused));renderStatus();});
$('clear').addEventListener('click',()=>{state.agent='';render();});
$('export').addEventListener('click',()=>{const filters={agent:state.agent,query:$('search').value,type:$('type').value,window:$('window').value,proof:$('proof-filter').value};const body={exportedAt:new Date().toISOString(),sources:'https://api.a2a.family',sourceUpdated:state.updated,coverage:{loaded:state.rows.length,total:state.feed?.total,more:state.feed?.more,pages:state.feed?.pages,snapshotChanged:state.feed?.snapshotChanged},filters,caveat:'API-reported events, not independently verified task completion or customer identity',rows:filteredRows().map(r=>({...r,settlementCheck:state.checks.get(claimKey(r))||null}))};const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}));const a=link('',url);a.download='switchboard-filtered-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
setInterval(()=>{if(!state.paused&&!document.hidden)refresh();},30000);
setInterval(renderStatus,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.paused)refresh();else renderStatus();});
render();refresh();
