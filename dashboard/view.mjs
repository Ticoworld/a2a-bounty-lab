export function sortEvents(rows,mode='newest') {
 const field=mode==='value'?'usdValue':'time',direction=mode==='oldest'?1:-1;
 return [...rows].sort((a,b)=>{const av=a[field],bv=b[field];if(av===null||av===undefined)return bv===null||bv===undefined?0:1;if(bv===null||bv===undefined)return -1;return direction*(av-bv);});
}
export function eventPage(rows,page=1,size=15) {
 const perPage=[15,30,50].includes(Number(size))?Number(size):15;
 const pages=Math.max(1,Math.ceil(rows.length/perPage));
 const current=Math.min(pages,Math.max(1,Math.floor(Number(page))||1));
 const start=(current-1)*perPage;
 return {rows:rows.slice(start,start+perPage),page:current,pages,total:rows.length,start:rows.length?start+1:0,end:Math.min(rows.length,start+perPage)};
}
