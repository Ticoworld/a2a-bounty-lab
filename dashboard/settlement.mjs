export const CHAIN_ID=4663n;
export const USDG='0x5fc5360d0400a0fd4f2af552add042d716f1d168';
export const RPC='https://rpc.mainnet.chain.robinhood.com';
export const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ADDRESS=/^0x[0-9a-f]{40}$/i,HASH=/^0x[0-9a-f]{64}$/i,WORD=/^0x[0-9a-f]{64}$/i;
export function units(value){
 if(typeof value!=='string'||!/^\d+(?:\.\d{1,6})?$/.test(value))throw Error('Expected a nonnegative USDG amount with at most six decimals');
 const [whole,fraction='']=value.split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
}
export function claimKey(row){return JSON.stringify([row.tx,row.payer,row.payTo,row.asset,row.amount,row.scheme]);}
export function checkable(row){return HASH.test(row.tx||'')&&!['a2a-sig','a2a-hold'].includes(row.scheme)&&row.asset==='USDG'&&ADDRESS.test(row.payer||'')&&ADDRESS.test(row.payTo||'')&&typeof row.amount==='string'&&/^\d+(?:\.\d{1,6})?$/.test(row.amount)&&units(row.amount)>0n;}
export function assessSettlement(row,receipt,chain){
 const result=(status,reason,evidence)=>({status,reason,...(evidence?{evidence}:{}),checkedAt:new Date().toISOString()});
 if(!checkable(row))return result('unsupported','No complete USDG settlement claim to check. Signed/free calls have no expected payment receipt.');
 if(chain!=='0x1237')return result('unavailable','RPC returned a different chain; no settlement conclusion.');
 if(!receipt)return result('unavailable','Receipt is not available from this RPC. Retry later.');
 if(!HASH.test(receipt.transactionHash||'')||receipt.transactionHash.toLowerCase()!==row.tx.toLowerCase())return result('unavailable','RPC receipt does not identify the requested transaction.');
 if(receipt.status==='0x0')return result('mismatch','Transaction reverted on chain.');
 if(receipt.status!=='0x1'||!Array.isArray(receipt.logs)||!/^0x[0-9a-f]+$/i.test(receipt.blockNumber||''))return result('unavailable','Receipt has no usable success status or event logs.');
 const expected=units(row.amount);
 for(const log of receipt.logs){
  if(log.removed===true||String(log.address).toLowerCase()!==USDG||!Array.isArray(log.topics)||log.topics.length!==3||log.topics[0]?.toLowerCase()!==TRANSFER||!WORD.test(log.topics[1]||'')||!WORD.test(log.topics[2]||'')||!WORD.test(log.data||''))continue;
  if(!/^0x0{24}/i.test(log.topics[1])||!/^0x0{24}/i.test(log.topics[2]))continue;
  const from='0x'+log.topics[1].slice(-40).toLowerCase(),to='0x'+log.topics[2].slice(-40).toLowerCase();
  if(from===row.payer.toLowerCase()&&to===row.payTo.toLowerCase()&&BigInt(log.data)===expected){
   const evidence={chainId:4663,transaction:receipt.transactionHash,block:receipt.blockNumber,token:USDG,payer:from,payTo:to,amountAtomic:expected.toString(),logIndex:log.logIndex};
   return result('matched','Exact USDG transfer matched. This does not verify the delivered answer, customer identity or agent attribution.',evidence);
  }
 }
 return result('mismatch','Successful transaction has no USDG Transfer matching the claimed payer, recipient and exact amount.');
}
export async function rpcCall(method,params,fetcher=fetch){
 const r=await fetcher(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('RPC HTTP '+r.status);const j=await r.json();if(j.error||!Object.hasOwn(j,'result'))throw Error('RPC did not return a usable result');return j.result;
}
export async function inspectSettlement(row,fetcher=fetch){
 if(!checkable(row))return assessSettlement(row,null,'0x1237');
 try{const chain=await rpcCall('eth_chainId',[],fetcher);if(chain!=='0x1237')return assessSettlement(row,null,chain);return assessSettlement(row,await rpcCall('eth_getTransactionReceipt',[row.tx],fetcher),chain);}
 catch(error){return {status:'unavailable',reason:error.name==='TimeoutError'?'RPC timed out. No settlement conclusion.':'RPC unavailable. No settlement conclusion.',checkedAt:new Date().toISOString()};}
}
