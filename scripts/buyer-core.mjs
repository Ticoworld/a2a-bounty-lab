import {units,USDG} from '../dashboard/settlement.mjs';
export const API='https://api.a2a.family';
const ADDRESS=/^0x[0-9a-f]{40}$/i;
export function resource(value){
 const u=new URL(value);if(u.origin!==API||u.username||u.password||u.hash||!/^\/a\/[a-z0-9-]+\/v1\/[a-z0-9_]+$/.test(u.pathname))throw Error('Use a canonical api.a2a.family paid skill URL');return u;
}
export function sameResource(a,b){const x=resource(a),y=resource(b);x.searchParams.sort();y.searchParams.sort();return x.href===y.href;}
export function bindOffer(url,card,body,recipient,cap='0.01'){
 const u=resource(url),[, ,agent,,skill]=u.pathname.split('/');
 if(!ADDRESS.test(recipient))throw Error('Explicit recipient address is required');
 const ext=card.extensions?.find(e=>e.uri==='https://a2a.family/ext/x402')?.params;
 const advertised=ext?.skills?.[skill];
 if(ext?.network!=='eip155:4663'||ext.payTo?.toLowerCase()!==recipient.toLowerCase()||!advertised||!card.skills?.some(s=>s.id===skill))throw Error('Agent Card does not bind the requested skill and recipient');
 if(!sameResource(advertised.resource,u.origin+u.pathname))throw Error('Agent Card resource differs from requested route');
 const expected=units(String(advertised.price)),ceiling=units(cap);if(expected<=0n||expected>ceiling)throw Error('Advertised price exceeds the authorized cap');
 const quote=body.accepts?.find(q=>q.scheme==='a2a-tx'&&q.network==='robinhood'&&q.asset?.toLowerCase()===USDG&&q.payTo?.toLowerCase()===recipient.toLowerCase()&&sameResource(q.resource,url));
 if(!quote||!/^\d+$/.test(String(quote.maxAmountRequired))||BigInt(quote.maxAmountRequired)!==expected)throw Error('No exact USDG tx-hash quote bound to the card, resource and price');
 return {agent,skill,url:u.href,recipient,amountAtomic:expected.toString(),quote,cardName:card.name};
}
export function assertBudget(records,amount,maxService,reservedGas,maxGas){
 const service=records.reduce((sum,r)=>sum+BigInt(r.amountAtomic),0n),gas=records.reduce((sum,r)=>sum+BigInt(r.gasWei??r.reservedGasWei),0n);
 if(service+amount>maxService)throw Error('Cumulative local service budget would be exceeded');
 if(gas+reservedGas>maxGas)throw Error('Cumulative local gas budget would be exceeded');
}
