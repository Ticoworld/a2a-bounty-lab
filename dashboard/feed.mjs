import {normalize} from './model.mjs';
export async function loadFeed({fetcher=fetch,maxPages=5}={}){
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>10)throw Error('Choose one to ten pages');
 const rows=[];let more=true,total=null,pages=0,offset=0,changed=false;
 while(more&&pages<maxPages){
  const r=await fetcher('https://api.a2a.family/feed?limit=100&offset='+offset,{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Feed page '+(pages+1)+' returned HTTP '+r.status);
  const j=await r.json();if(!Array.isArray(j.rows)||typeof j.more!=='boolean')throw Error('Unexpected feed page shape');
  if(total!==null&&total!==j.total)changed=true;total=j.total;pages++;
  if(!j.rows.length){more=j.more;break;}
  rows.push(...j.rows);offset+=j.rows.length;more=j.more;
 }
 return {rows:normalize(rows),total,more,pages,rawLoaded:rows.length,snapshotChanged:changed};
}
