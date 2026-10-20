#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
import {Wallet,JsonRpcProvider,Contract,formatEther} from 'ethers';
import {bindOffer,resource,assertBudget} from './buyer-core.mjs';
import {units,USDG,RPC,assessSettlement} from '../dashboard/settlement.mjs';
const {values:o}=parseArgs({options:{url:{type:'string'},recipient:{type:'string'},payer:{type:'string'},id:{type:'string'},pay:{type:'boolean'},resume:{type:'boolean'},max:{type:'string',default:'0.01'},budget:{type:'string',default:'0.01'},'gas-budget':{type:'string',default:'0.000002'},journal:{type:'string',default:'.local/buyer'},help:{type:'boolean'}}});
const save=(f,j)=>fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n',{mode:0o600});
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
async function json(url,init={}){const r=await fetch(url,{...init,signal:AbortSignal.timeout(45000)});const data=await r.json();return {status:r.status,data,paymentResponse:r.headers.get('X-PAYMENT-RESPONSE')};}
async function inspect(){
 const u=resource(o.url),slug=u.pathname.split('/')[2];const card=await json('https://api.a2a.family/a/'+slug+'/.well-known/agent-card.json');if(card.status!==200)throw Error('Card unavailable');const q=await json(u.href);if(q.status!==402)throw Error('Expected an unpaid HTTP 402 quote');return bindOffer(u.href,card.data,q.data,o.recipient,o.max);
}
const claim=r=>({tx:r.tx,payer:r.payer,payTo:r.recipient,asset:'USDG',amount:r.amountUSDG,scheme:'a2a-tx'});
async function finish(file,record,provider){
 resource(record.url);
 if(!record.tx)throw Error('Previous broadcast outcome is unknown. Reconcile its payer/nonce on chain before any new payment; automatic repurchase is refused.');
 const chain=await provider.send('eth_chainId',[]);const receipt=await provider.send('eth_getTransactionReceipt',[record.tx]);const check=assessSettlement(claim(record),receipt,chain);record.settlement=check;save(file,record);
 if(check.status!=='matched')throw Error(check.reason);
 record.gasWei=(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)).toString();record.status=record.response?.status===200?'completed':'settled';save(file,record);
 if(record.response?.status===200){console.log(JSON.stringify({id:record.id,status:'already completed',tx:record.tx,resultFile:file}));return;}
 const header=Buffer.from(JSON.stringify({x402Version:1,scheme:'a2a-tx',network:'robinhood',payload:{txHash:record.tx}})).toString('base64');
 const response=await json(record.url,{headers:{'X-PAYMENT':header}});record.attempts??=[];record.attempts.push({at:new Date().toISOString(),...response});record.response=response;record.status=response.status===200?'completed':'settled-response-pending';save(file,record);
 console.log(JSON.stringify({id:record.id,tx:record.tx,httpStatus:response.status,settlement:check.status,amountUSDG:record.amountUSDG,gasETH:formatEther(record.gasWei),resultFile:file,answer:response.data},null,2));
 if(response.status!==200)throw Error('Payment is settled but the response is not complete. Use --resume with the same id; never repurchase automatically.');
}
async function main(){
 if(o.help){console.log('Read-only: node scripts/hire-agent.mjs --url URL --recipient ADDRESS\nPay once: add --pay --id UNIQUE --payer ADDRESS; supply key only on stdin.\nResume same transaction: --resume --id UNIQUE (no key).\nLimits: --max 0.01 --budget 0.01 --gas-budget 0.000002; cumulative journal is local, not a custody system.');return;}
 if(o.pay&&o.resume)throw Error('Choose pay or resume');
 if(!o.pay&&!o.resume){console.log(JSON.stringify({mode:'read-only',offer:await inspect(),noMoneySpent:true},null,2));return;}
 if(!/^[a-z0-9-]{1,64}$/.test(o.id||''))throw Error('Use a unique lowercase id');
 const dir=path.resolve(o.journal);fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,o.id+'.json'),lock=path.join(dir,'runner.lock');
 const handle=fs.openSync(lock,'wx',0o600);let provider;
 try{
  provider=new JsonRpcProvider(RPC,4663,{staticNetwork:true});if(await provider.send('eth_chainId',[])!=='0x1237')throw Error('Wrong chain');
  if(o.resume){if(!fs.existsSync(file))throw Error('Unknown id');return await finish(file,read(file),provider);}
  if(fs.existsSync(file))throw Error('This id already exists. Use --resume; duplicate payment refused.');
  const offer=await inspect();if(!/^0x[0-9a-f]{40}$/i.test(o.payer||''))throw Error('Explicit payer is required');
  const amount=BigInt(offer.amountAtomic),budget=units(o.budget);if(budget<=0n||budget>100000n)throw Error('Choose a local service budget greater than zero and at most 0.10 USDG');
  if(!/^0\.\d{1,18}$/.test(o['gas-budget']))throw Error('Gas budget must be a decimal ETH amount below one');
  const gasBudget=BigInt(o['gas-budget'].slice(2).padEnd(18,'0'));if(gasBudget<=0n||gasBudget>50000000000000n)throw Error('Gas budget must be positive and at most 0.00005 ETH');
  const secret=fs.readFileSync(0,'utf8').trim();if(!/^0x[0-9a-f]{64}$/i.test(secret))throw Error('Supply a valid private key only on stdin');let wallet;try{wallet=new Wallet(secret,provider);}catch{throw Error('The supplied key could not be loaded');}if(wallet.address.toLowerCase()!==o.payer.toLowerCase())throw Error('Key does not match explicit payer');
  const token=new Contract(USDG,['function balanceOf(address) view returns(uint256)','function transfer(address,uint256) returns(bool)'],wallet);
  if(await token.balanceOf(wallet.address)<amount)throw Error('Insufficient USDG');
  const gasPrice=BigInt(await provider.send('eth_gasPrice',[]))*125n/100n;const gasLimit=(await token.transfer.estimateGas(offer.recipient,amount))*120n/100n+1000n;const reservedGas=gasPrice*gasLimit;
  const records=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read(path.join(dir,f)));assertBudget(records,amount,budget,reservedGas,gasBudget);
  if(await provider.getBalance(wallet.address)<reservedGas)throw Error('Insufficient ETH for capped gas');
  const record={id:o.id,createdAt:new Date().toISOString(),status:'prepared',...offer,payer:wallet.address,amountUSDG:(amount/1000000n).toString()+'.'+(amount%1000000n).toString().padStart(6,'0'),reservedGasWei:reservedGas.toString(),nonce:await provider.getTransactionCount(wallet.address,'pending'),selfFundedTest:wallet.address.toLowerCase()===offer.recipient.toLowerCase()};
  save(file,record); // reserve the id and budget BEFORE any network broadcast
  const tx=await token.transfer(offer.recipient,amount,{type:0,gasPrice,gasLimit,nonce:record.nonce});record.tx=tx.hash;record.status='broadcast';save(file,record);
  await tx.wait(1,60000);await finish(file,record,provider);
 }finally{provider?.destroy();fs.closeSync(handle);fs.unlinkSync(lock);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
