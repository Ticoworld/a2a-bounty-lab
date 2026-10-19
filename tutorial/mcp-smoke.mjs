import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const mode=process.argv[2];if(!['--readonly','--pay'].includes(mode))throw Error('Choose --readonly or --pay');
const mcp=process.argv[3]?path.resolve(process.argv[3]):path.join(path.dirname(require.resolve('@ponsmcp/sdk')),'mcp.js');
const output=path.resolve(process.env.A2A_MCP_RESULT||'.local/mcp-result.json');
if(mode==='--pay'&&fs.existsSync(output))throw Error('Attempt record exists; reconcile it before any new payment');
const env={...process.env,PONSMCP_CHAIN:'4663',PONSMCP_RPC_URL:'https://rpc.mainnet.chain.robinhood.com',PONSMCP_MAX_PER_TX:'10000',PONSMCP_DAILY_LIMIT:'10000',PONSMCP_POLICY_STATE:path.resolve(process.env.A2A_MCP_POLICY||'.local/mcp-policy.json')};
delete env.PONSMCP_PRIVATE_KEY;
if(mode==='--pay')env.PONSMCP_PRIVATE_KEY=fs.readFileSync(0,'utf8').trim();
fs.mkdirSync(path.dirname(output),{recursive:true});fs.mkdirSync('.local',{recursive:true});
const child=spawn(process.execPath,[mcp],{env,stdio:['pipe','pipe','pipe'],windowsHide:true});
const lines=createInterface({input:child.stdout});const pending=new Map();let next=1;
lines.on('line',line=>{let response;try{response=JSON.parse(line)}catch{return}const p=pending.get(response.id);if(!p)return;clearTimeout(p.timer);pending.delete(response.id);response.error?p.reject(Error(response.error.message)):p.resolve(response.result);});
function request(method,params){const id=next++;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP request timed out; inspect any payment record before retrying'));},45000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
const decode=r=>JSON.parse(r.content.find(c=>c.type==='text').text);
try{
 const init=await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'a2a-field-notes',version:'1.0.0'}});
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const list=await request('tools/list',{});
 const needed=['pons_chain_info','pons_quote','x402_fetch','pons_tx_status'];
 if(!needed.every(n=>list.tools.some(t=>t.name===n)))throw Error('Expected SDK tools missing');
 const quote=decode(await request('tools/call',{name:'pons_quote',arguments:{amountUsd:'0.01',chain:4663}}));
 if(quote.chain!==4663||quote.amountBase!=='10000')throw Error('Unexpected quote');
 const report={at:new Date().toISOString(),packageVersion:'2.3.1',mode,server:init.serverInfo,tools:needed,quote};
 if(mode==='--pay'){
  fs.writeFileSync(output,JSON.stringify({...report,state:'payment-request-started'},null,2));
  report.call=decode(await request('tools/call',{name:'x402_fetch',arguments:{url:'https://api.a2a.family/a/scout/v1/grade_launches?n=5',waitMs:30000}}));
  fs.writeFileSync(output,JSON.stringify(report,null,2));
  if(!report.call.ok||!report.call.paid||report.call.status!==200)throw Error('Paid call did not return success; inspect the saved record');
  report.recheck=decode(await request('tools/call',{name:'pons_tx_status',arguments:{txHash:report.call.payment.txHash}}));
 }
 fs.writeFileSync(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({server:report.server,chain:quote.chain,amountBase:quote.amountBase,toolsDiscovered:needed,paid:report.call?.paid||false,status:report.call?.status,tx:report.call?.payment?.txHash,recheck:report.recheck},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}finally{
 for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('MCP session closed'));}
 child.stdin.end();child.kill();lines.close();
}
