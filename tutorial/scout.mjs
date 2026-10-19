import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const mode=process.argv[2];
if(!['--preflight','--pay'].includes(mode))throw Error('Choose --preflight (no key or payment) or --pay (one 0.01 USDG call).');
process.env.PONSMCP_CHAIN='4663';
process.env.PONSMCP_RPC_URL='https://rpc.mainnet.chain.robinhood.com';
const sdk=await import(process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:'@ponsmcp/sdk');
const URL='https://api.a2a.family/a/scout/v1/grade_launches?n=5';
const TOKEN='0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const MERCHANT='0x0a64498810C29C3Ac3b9557940b70A095dc745D9';
const json=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2);
const quoteResponse=await fetch(URL,{signal:AbortSignal.timeout(15000)});
const quote=await quoteResponse.json();
const req=quote.accepts?.find(a=>a.scheme==='exact'&&a.asset?.toLowerCase()===TOKEN.toLowerCase());
if(quoteResponse.status!==402||!req||req.maxAmountRequired!=='10000'||req.payTo.toLowerCase()!==MERCHANT.toLowerCase()||req.resource!==URL||!/(4663|robinhood)/i.test(req.network))throw Error('Scout quote changed; stop and review it before paying.');
if(mode==='--preflight'){
 const client=new sdk.PonsMCPClient();
 const result=await new sdk.X402Client(client).fetch(URL);
 console.log(json({sdkVersion:'2.3.1',quotedUsd:'0.01',quotedBaseUnits:req.maxAmountRequired,token:TOKEN,merchant:MERCHANT,hasWallet:client.hasWallet,ok:result.ok,status:result.status,paid:result.paid,error:result.error}));
}else{
 const output=path.resolve(process.env.A2A_SCOUT_RESULT||'.local/scout-result.json');
 if(fs.existsSync(output))throw Error('A Scout attempt record already exists. Reconcile it before considering another payment.');
 const key=fs.readFileSync(0,'utf8').trim();
 const client=new sdk.PonsMCPClient({privateKey:key,policy:{maxPerTx:10000n,dailyLimit:10000n}});
 if(BigInt(await sdk.rpc('eth_chainId',[]))!==4663n)throw Error('Wrong RPC chain');
 const gp=BigInt(await sdk.rpc('eth_gasPrice',[]));
 const sdkGasPrice=gp>100000000n?gp*3n/2n:100000000n;
 const gasCeiling=BigInt(process.env.A2A_MAX_GAS_WEI||'12000000000000');
 if(120000n*sdkGasPrice>gasCeiling)throw Error('SDK maximum gas cost exceeds this run ceiling');
 const originalPay=client.pay.bind(client);let attempted=false;
 client.pay=async request=>{
  const q=await client.quote(request.amountUsd);
  if(attempted||request.payTo.toLowerCase()!==MERCHANT.toLowerCase()||q.amountBase!==10000n)throw Error('Payment does not match the reviewed single Scout call');
  attempted=true;fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,json({state:'attempt-started',at:new Date().toISOString(),address:client.address,url:URL,quote:req}));
  return originalPay(request);
 };
 const result=await new sdk.X402Client(client).fetch(URL,{}, {waitMs:30000});
 const record={at:new Date().toISOString(),sdkVersion:'2.3.1',address:client.address,url:URL,result};
 if(result.payment?.txHash){
  const receipt=await sdk.rpc('eth_getTransactionReceipt',[result.payment.txHash]);
  const topic='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const match=receipt?.logs?.some(l=>l.address.toLowerCase()===TOKEN.toLowerCase()&&l.topics[0]?.toLowerCase()===topic&&('0x'+l.topics[1]?.slice(-40)).toLowerCase()===client.address.toLowerCase()&&('0x'+l.topics[2]?.slice(-40)).toLowerCase()===MERCHANT.toLowerCase()&&BigInt(l.data)===10000n);
  record.receiptVerified=receipt?.status==='0x1'&&Boolean(match);
  record.gasWei=receipt?String(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)):null;
  record.block=receipt?.blockNumber;
 }
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,json(record));
 console.log(json({ok:result.ok,status:result.status,paid:result.paid,still402:result.still402,tx:result.payment?.txHash,receiptVerified:record.receiptVerified,gasWei:record.gasWei,error:result.error,response:result.json}));
 if(!result.ok||!result.paid||!record.receiptVerified)process.exitCode=1;
}
