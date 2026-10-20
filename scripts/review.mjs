import fs from 'node:fs';
import {loadFeed} from '../dashboard/feed.mjs';
import {inspectSettlement,assessSettlement,rpcCall} from '../dashboard/settlement.mjs';
const feed=await loadFeed();const external=feed.rows.filter(r=>r.agent==='scout'&&r.payer?.toLowerCase()!==r.payTo?.toLowerCase()&&r.asset==='USDG'&&r.scheme==='a2a-tx').slice(0,2);
const checks=[];for(const row of external)checks.push({claim:row,check:await inspectSettlement(row)});
const source=feed.rows.find(r=>r.tx==='0x49bd7bb0fa8b968cfac94fc8e2ee0641c612af29116b192cdd1b497d66e5f231');
let negativeCheck=null;
if(source){const receipt=await rpcCall('eth_getTransactionReceipt',[source.tx]);negativeCheck={label:'Deliberately altered local claim, not an actual feed row',originalTx:source.tx,changedAmount:'99.000000',result:assessSettlement({...source,amount:'99.000000'},receipt,await rpcCall('eth_chainId',[]))};}
const report={at:new Date().toISOString(),readOnly:true,noWalletOrPayment:true,feed:{loaded:feed.rows.length,reported:feed.total,pages:feed.pages,more:feed.more,snapshotChanged:feed.snapshotChanged},externalMerchantChecks:checks,negativeCheck};
console.log(JSON.stringify(report,null,2));
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
if(checks.length<1||checks.some(r=>r.check.status!=='matched')||negativeCheck?.result.status!=='mismatch')process.exitCode=1;
