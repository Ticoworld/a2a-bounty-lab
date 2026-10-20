import {normalize,summarize,selectRows,groupAgents,histogram,explorer,finite} from './model.mjs';
import {loadFeed} from './feed.mjs';
import {claimKey,checkable,inspectSettlement} from './settlement.mjs';
import {sortEvents,eventPage} from './view.mjs';
const $=s=>document.getElementById(s);
const state={feed:null,stats:null,registry:null,rows:[],agent:'',page:1,inspected:null,paused:false,busy:false,errors:{},updated:{},checks:new Map(),checking:new Set(),verifying:false};
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;}
const number=v=>v===null||v===undefined?'—':Number(v).toLocaleString('en-US');
const money=v=>v===null||v===undefined?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:4}).format(v);
const short=v=>typeof v==='string'&&v.length>18?v.slice(0,6)+'…'+v.slice(-4):(v||'Unknown');
const formatDate=(v,options)=>v===null||v===undefined?'Unknown':new Intl.DateTimeFormat('en-GB',{...options,timeZone:'UTC'}).format(new Date(v));
const date=v=>formatDate(v,{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})+' UTC';
const age=t=>{if(!t)return 'not loaded';const s=Math.max(0,Math.floor((Date.now()-t)/1000));return s<60?s+'s ago':s<3600?Math.floor(s/60)+'m ago':Math.floor(s/3600)+'h ago';};
function link(text,url,cls){const n=el('a',text,cls);n.href=url;n.target='_blank';n.rel='noopener';return n;}
const initials=name=>(name||'?').split(/[\s-]+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
function metric(value,label,context,icon){const n=el('div',undefined,'metric');n.append(el('span',icon,'metric-icon'),el('span',label,'label'),el('span',value,'value'),el('span',context,'metric-context'));return n;}
function renderStatus(){
 const failures=Object.keys(state.errors).length,loaded=Object.keys(state.updated).length;
 $('sync-state').textContent=state.busy?'Refreshing':state.paused?'Paused':failures?'Partial data':loaded?'Live data':'Unavailable';
 $('sync-state').className='pill'+(failures||!loaded?' warn':'');
 $('sync-text').textContent=['feed','stats','registry'].map(k=>`${k[0].toUpperCase()+k.slice(1)} ${age(state.updated[k])}`).join(' · ')+(state.paused?' · Auto-refresh paused':document.hidden?' · Updates wait while hidden':'');
 $('refresh').disabled=state.busy;
 $('errors').replaceChildren(...Object.entries(state.errors).map(([k,msg])=>el('div',`${k}: ${msg}. ${state.updated[k]?'Showing the last successful response.':'No cached data available.'}`,'error')));
}
function filteredRows(){
 const rows=selectRows(state.rows,{agent:state.agent,query:$('search').value,type:$('type').value,window:$('window').value});
 const mode=$('proof-filter').value;const selected=mode==='all'?rows:rows.filter(r=>mode==='unchecked'?!state.checks.has(claimKey(r)):state.checks.get(claimKey(r))?.status===mode);
 return sortEvents(selected,$('sort').value);
}
function receiptLabel(row){const check=state.checks.get(claimKey(row));if(state.checking.has(claimKey(row)))return ['Checking…',''];if(check)return [check.status==='matched'?'✓ Matched':check.status==='mismatch'?'Claim mismatch':'Unavailable',check.status];return [checkable(row)?'Unchecked':row.kind==='signed'?'No receipt needed':'Not checkable',''];}
function openInspector(row){state.inspected=row;$('copy-status').textContent='';renderInspector();$('inspector').showModal();}
function detailField(list,label,value,cls){const row=el('div'),dd=el('dd',undefined,cls);dd.append(typeof value==='string'?document.createTextNode(value):value);row.append(el('dt',label),dd);list.append(row);}
function renderInspector(){
 if(!state.inspected)return;const row=state.inspected,key=claimKey(row),check=state.checks.get(key);const body=$('inspector-body');
 const heading=el('h2',row.agentName||row.agent||'Unattributed');heading.id='inspector-title';
 const sub=el('p',(row.skill||'Skill not reported')+' · '+date(row.time),'inspector-sub');
 const list=el('dl');detailField(list,'Claimed value',row.usdValue!==null?money(row.usdValue):row.amount?`${row.amount} ${row.asset||''}`:'Unknown');detailField(list,'Asset amount',row.amount!==null&&row.amount!==undefined?`${row.amount} ${row.asset||''}`:'Not reported');detailField(list,'Event type',{paid:'Reported paid call',transfer:'Transfer only',signed:'Signed / holder call',unknown:'Unclassified'}[row.kind]);detailField(list,'Payer',row.payer||'Not reported','address-full');detailField(list,'Recipient',row.payTo||'Not reported','address-full');detailField(list,'Transaction',row.tx||'No hash reported','address-full');detailField(list,'Latency',row.latency===null?'Not reported':number(row.latency)+' ms');
 const result=el('div',undefined,'check-result '+(check?.status||''));result.append(el('strong',receiptLabel(row)[0]),el('p',check?.reason||(checkable(row)?'Compare this claim with the exact USDG sender, recipient and amount in the chain receipt.':row.kind==='signed'?'Signed and holder access does not require a payment receipt.':'The feed does not provide a complete USDG claim for this check.')));
 if(check?.evidence){const evidence=check.evidence;result.append(el('p',`Chain ${evidence.chainId} · Block ${BigInt(evidence.block)} · ${evidence.amountAtomic} USDG base units`),el('p','Checked '+date(Date.parse(check.checkedAt))));}
 body.replaceChildren(heading,sub,list,result);
 const url=explorer(row.tx);if(url)body.append(link('Open transaction on Blockscout ↗',url,'inspector-link'));
 $('inspect-check').hidden=!checkable(row);$('inspect-check').disabled=state.verifying;$('inspect-check').textContent=state.checking.has(key)?'Checking receipt…':check?'Check receipt again':'Check USDG receipt';$('inspect-copy').hidden=!url;
}
function renderEvents(rows){
 const focusKey=document.activeElement?.classList?.contains('inspect-button')?document.activeElement.dataset.claimKey:null;
 const page=eventPage(rows,state.page,$('page-size').value);state.page=page.page;
 $('event-count').textContent=state.feed?number(rows.length):'—';
 $('page-info').textContent=state.feed?`${page.start}–${page.end} of ${number(page.total)} events`:'Loading events…';$('page-number').textContent=`${page.page} / ${page.pages}`;$('previous').disabled=page.page<=1;$('next').disabled=page.page>=page.pages;
 if(!state.feed||!rows.length){const td=el('td',undefined,'empty-cell');td.colSpan=7;td.append(el('strong',state.feed?'No matching events':'Waiting for the feed'),document.createTextNode(state.feed?'Try a different search or reset your filters.':'Public records will appear here when the source responds.'));const tr=el('tr');tr.append(td);$('events').replaceChildren(tr);return;}
 $('events').replaceChildren(...page.rows.map(row=>{
  const tr=el('tr');const a=el('td'),cell=el('div',undefined,'agent-cell'),labels=el('span');labels.append(el('span',row.agentName||row.agent||'Unattributed','agent-name'),el('span',row.skill||'No skill reported','skill-name'));cell.append(el('span',initials(row.agentName||row.agent),'agent-avatar'),labels);a.append(cell);
  const type=el('td');type.append(el('span',{paid:'Paid call',transfer:'Transfer only',signed:'Signed / holder',unknown:'Unclassified'}[row.kind],'event-type '+row.kind));
  const value=el('td',undefined,'numeric');value.append(el('span',row.usdValue!==null?money(row.usdValue):row.amount!==null&&row.amount!==undefined?`${row.amount} ${row.asset||''}`:'Unknown','value-primary'));if(row.usdValue!==null)value.append(el('span','USD equivalent','value-secondary'));
  const wallets=el('td');wallets.append(el('span',short(row.payer)+' → '+short(row.payTo),'wallet-address'),el('span',row.relation==='same-wallet'?'Same wallet':row.relation==='other-wallet'?'Other wallet':'Relationship unknown','wallet-relation '+(row.relation==='same-wallet'?'same':'')));
  const receipt=el('td'),[label,status]=receiptLabel(row);receipt.append(el('span',label,'receipt-status '+status));
  const time=el('td');time.append(el('span',formatDate(row.time,{hour:'2-digit',minute:'2-digit',second:'2-digit'}),'event-time'),el('span',formatDate(row.time,{day:'2-digit',month:'short'}),'event-date'));
  const action=el('td'),button=el('button','↗','inspect-button');button.type='button';button.dataset.claimKey=claimKey(row);button.setAttribute('aria-label',`Inspect ${row.agentName||row.agent||'unattributed'} ${row.skill||'event'} ${date(row.time)}`);button.addEventListener('click',()=>openInspector(row));action.append(button);tr.append(a,type,value,wallets,receipt,time,action);return tr;
 }));
 if(focusKey){const target=[...document.querySelectorAll('.inspect-button')].find(b=>b.dataset.claimKey===focusKey);(target||$('search')).focus({preventScroll:true});}
}
function renderMix(sample){
 const d=el('div',undefined,'donut');const other=sample.paid?sample.other/sample.paid*100:0,same=sample.paid?sample.same/sample.paid*100:0;
 d.style.background=sample.paid?`conic-gradient(#7775df 0% ${other}%,#c8c6ed ${other}% ${other+same}%,#e7e9f0 ${other+same}% 100%)`:'#e7e9f0';d.setAttribute('role','img');d.setAttribute('aria-label',state.feed?`${sample.other} other-wallet, ${sample.same} same-wallet, ${sample.unknown} unknown paid calls`:'Wallet relationships not loaded');const n=el('span',state.feed?number(sample.paid):'—');n.append(el('small','paid calls'));d.append(n);
 const legend=el('div',undefined,'mix-legend');for(const [label,value,color]of [['Other wallet',sample.other,'#7775df'],['Same wallet',sample.same,'#c8c6ed'],['Unknown',sample.unknown,'#e7e9f0']]){const row=el('div'),i=el('i');i.style.background=color;row.append(i,el('span',label),el('b',state.feed?number(value):'—'));legend.append(row);} $('wallet-mix').replaceChildren(d,legend);
}
function renderDirectory(){
 const focusId=document.activeElement?.classList?.contains('agent')?document.activeElement.dataset.agentId:null;
 const base=selectRows(state.rows,{query:$('search').value,type:$('type').value,window:$('window').value});const mode=$('proof-filter').value;const baseRows=mode==='all'?base:base.filter(r=>mode==='unchecked'?!state.checks.has(claimKey(r)):state.checks.get(claimKey(r))?.status===mode);
 const groups=groupAgents(state.registry?.agents||[],baseRows);$('registry-count').textContent=state.registry?number(state.registry.agents.length):'—';
 $('agents').replaceChildren(...groups.map(a=>{const b=el('button',undefined,'agent');b.type='button';b.dataset.agentId=a.id;b.setAttribute('aria-pressed',String(a.id===state.agent));const name=el('span');name.append(el('span',a.name||a.id||'Unattributed','name'));const small=el('small');small.append(el('i',undefined,'dot'+(a.status==='live'?' live':'')),document.createTextNode(`${a.status||'unknown'} · ${a.summary.other} other · ${a.summary.same} same`));name.append(small);b.append(el('span',initials(a.name||a.id),'agent-avatar'),name,el('span',a.summary.paid,'count'));b.addEventListener('click',()=>{state.agent=a.id===state.agent?'':a.id;state.page=1;render();});return b;}));
 if(focusId){[...$('agents').querySelectorAll('button')].find(b=>b.dataset.agentId===focusId)?.focus({preventScroll:true});}
 const selected=groups.find(a=>a.id===state.agent);$('active-agent').hidden=!selected;$('active-agent-name').textContent=selected?'Filtered to '+(selected.name||selected.id):'';$('detail').replaceChildren();
 if(selected){$('detail').append(el('span','AGENT DETAILS','detail-label'),el('h3',selected.name||selected.id),el('p',selected.description||'No registry description available.'),el('p',`${selected.summary.paid} reported paid calls · ${money(selected.summary.usd)} known value in the filtered sample.`),el('p',`${selected.summary.unpriced} calls without a USD value. ${selected.summary.unknown} without complete wallet addresses. Median response: ${selected.summary.p50===null?'unknown':number(selected.summary.p50)+' ms'} (${selected.summary.latencyN} records).`),link('Open hosted agent ↗','https://a2a.family/agents/view/?id='+encodeURIComponent(selected.id)));}
 else $('detail').append(el('div','⊞','empty-detail-mark'),el('h3','Get to know an agent'),el('p','Select a name to see its description, payment mix and reported activity in your current filters.'),el('p','“Live” is its public registry status. It does not assess answer quality.'));
}
function render(){
 renderStatus();const s=state.stats;
 $('network').replaceChildren(metric(number(finite(s?.calls24h)),'Agent calls','Reported · last 24 hours','↗'),metric(money(finite(s?.settled24h)),'Settled value','Reported · last 24 hours','◇'),metric(number(finite(s?.agents)),'Registered agents','Network-reported total','⊞'),metric(finite(s?.p50ms)===null?'—':number(finite(s.p50ms))+' ms','Median response','Network-reported p50','◷'));
 const rows=filteredRows(),sample=summarize(rows),total=finite(state.feed?.total);
 $('coverage').textContent=state.feed?`${state.rows.length} loaded / ${total===null?'total unknown':total+' reported'} · ${state.feed.pages} pages${state.feed.more?' · more history available':''}${state.feed.snapshotChanged?' · feed changed during loading':''}`:'Connecting to the public feed';
 const checked=rows.map(r=>state.checks.get(claimKey(r))).filter(Boolean);
 $('verification-summary').textContent=`${checked.length} checked · ${checked.filter(x=>x.status==='matched').length} matched · ${checked.filter(x=>x.status==='mismatch').length} mismatched · ${checked.filter(x=>x.status==='unavailable').length} unavailable`;
 $('verify-batch').disabled=state.verifying||!rows.some(r=>checkable(r)&&!state.checks.has(claimKey(r)));$('verify-batch').textContent=state.verifying?'Checking receipts…':'Check 10 USDG receipts';$('export').disabled=!state.feed;
 $('sample').replaceChildren(...[[sample.paid,'paid calls'],[sample.same,'same wallet'],[sample.transfer,'transfers only'],[sample.signed,'signed / holder']].map(([n,t])=>{const d=el('span');d.append(el('strong',state.feed?number(n):'—'),document.createTextNode(t));return d;}));
 const bins=histogram(rows),max=Math.max(2,Math.ceil(Math.max(0,...bins.map(b=>b.count))/2)*2);$('chart-total').textContent=state.feed?number(bins.reduce((n,b)=>n+b.count,0)):'—';
 $('chart-scale').replaceChildren(...[max,Math.round(max/2),0].map(v=>el('span',state.feed?number(v):'—')));
 $('histogram').replaceChildren(...bins.map(b=>{const n=el('div',undefined,'bar'+(!b.count?' zero':''));n.style.height=b.count?`${b.count/max*100}%`:'2px';n.title=`${date(b.at)}: ${b.count} loaded paid calls`;return n;}));$('histogram').setAttribute('aria-label',state.feed?bins.map(b=>`${date(b.at)}: ${b.count}`).join('; '):'Activity not loaded');
 renderMix(sample);renderEvents(rows);renderDirectory();if($('inspector').open)renderInspector();updateNavigation();
}
async function refresh(){
 if(state.busy)return;state.busy=true;renderStatus();const names=['feed','stats','registry'];const routes={stats:'/stats',registry:'/agents'};
 const results=await Promise.allSettled(names.map(async k=>{if(k==='feed')return loadFeed({maxPages:Number($('history').value)});const r=await fetch('https://api.a2a.family'+routes[k],{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);const v=await r.json();if(k==='registry'&&!Array.isArray(v.agents)||k==='stats'&&(!v||typeof v!=='object'||Array.isArray(v)))throw Error('Unexpected response shape');return v;}));
 results.forEach((r,i)=>{const k=names[i];if(r.status==='fulfilled'){state[k]=r.value;state.updated[k]=Date.now();delete state.errors[k];if(k==='feed')state.rows=normalize(r.value.rows);}else state.errors[k]=r.reason?.name==='TimeoutError'?'Request timed out':String(r.reason?.message||'Request failed');});state.busy=false;render();
}
async function verifyRows(rows){if(state.verifying)return;state.verifying=true;try{for(const row of rows){const key=claimKey(row);state.checking.add(key);render();try{state.checks.set(key,await inspectSettlement(row));}finally{state.checking.delete(key);}render();}}finally{state.verifying=false;render();}}
$('verify-batch').addEventListener('click',()=>verifyRows(filteredRows().filter(r=>checkable(r)&&!state.checks.has(claimKey(r))).slice(0,10)));
$('history').addEventListener('change',()=>{state.page=1;refresh();});
for(const id of ['search','type','window','proof-filter','sort','page-size'])$(id).addEventListener(id==='search'?'input':'change',()=>{state.page=1;render();});
$('previous').addEventListener('click',()=>{state.page--;render();});$('next').addEventListener('click',()=>{state.page++;render();});$('refresh').addEventListener('click',refresh);
$('pause').addEventListener('click',()=>{state.paused=!state.paused;$('pause').textContent=state.paused?'Resume updates':'Pause updates';$('pause').setAttribute('aria-pressed',String(state.paused));renderStatus();});
const clearAgent=()=>{state.agent='';state.page=1;render();};$('clear').addEventListener('click',clearAgent);$('clear-selection').addEventListener('click',clearAgent);
$('reset').addEventListener('click',()=>{state.agent='';state.page=1;$('search').value='';for(const id of ['type','window','proof-filter'])$(id).value='all';$('sort').value='newest';render();});
$('close-inspector').addEventListener('click',()=>$('inspector').close());$('inspector').addEventListener('close',()=>{const key=state.inspected?claimKey(state.inspected):null;const trigger=[...document.querySelectorAll('.inspect-button')].find(b=>b.dataset.claimKey===key);(trigger||$('search')).focus();state.inspected=null;});$('inspect-check').addEventListener('click',()=>{if(state.inspected)verifyRows([state.inspected]);});
$('inspect-copy').addEventListener('click',async()=>{if(!state.inspected?.tx)return;try{await navigator.clipboard.writeText(state.inspected.tx);$('copy-status').textContent='Transaction hash copied.';}catch{$('copy-status').textContent='Clipboard access unavailable. Select the transaction hash above to copy it.';}});
$('export').addEventListener('click',()=>{const filters={agent:state.agent,query:$('search').value,type:$('type').value,window:$('window').value,proof:$('proof-filter').value,sort:$('sort').value};const body={exportedAt:new Date().toISOString(),sources:'https://api.a2a.family',sourceUpdated:state.updated,coverage:{loaded:state.rows.length,total:state.feed?.total,more:state.feed?.more,pages:state.feed?.pages,snapshotChanged:state.feed?.snapshotChanged},filters,caveat:'API-reported events, not independently verified task completion or customer identity. Export includes all filtered rows, across display pages.',rows:filteredRows().map(r=>({...r,settlementCheck:state.checks.get(claimKey(r))||null}))};const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}));const a=link('',url);a.download='switchboard-filtered-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const sections=[...document.querySelectorAll('main>section')];
function updateNavigation(){
 const atBottom=innerHeight+Math.ceil(scrollY)>=document.documentElement.scrollHeight-2;
 const active=atBottom?sections.at(-1):sections.filter(s=>s.getBoundingClientRect().top<=140).at(-1)||sections[0];
 for(const a of document.querySelectorAll('.sidebar nav a')){const selected=a.hash==='#'+active.id;a.classList.toggle('current',selected);if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}
 document.querySelector('.topbar>div>span:last-child').textContent={overview:'Overview',activity:'Activity',directory:'Agent directory',method:'Data & method'}[active.id];
}
let navFrame=false;
window.addEventListener('scroll',()=>{if(navFrame)return;navFrame=true;requestAnimationFrame(()=>{updateNavigation();navFrame=false;});},{passive:true});
updateNavigation();
setInterval(()=>{if(!state.paused&&!document.hidden)refresh();},30000);setInterval(renderStatus,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.paused)refresh();else renderStatus();});render();refresh();
