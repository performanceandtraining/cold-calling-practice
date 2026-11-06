/* Include this unchanged in any HTML activity hosted on a website connected to the helper. */
(() => {
 const owner=crypto.randomUUID(),pending=new Map();
 const native=typeof chrome!=='undefined'&&!!chrome.runtime?.id&&location.protocol==='chrome-extension:';
 window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.channel!=='metropolitan-playground/response/v1')return;
  const item=pending.get(event.data.request);if(!item)return;clearTimeout(item.timer);pending.delete(event.data.request);item.resolve(event.data.result);
 });
 async function request(payload,timeout=5000){
  let result;
  if(native)result=await chrome.runtime.sendMessage({...payload,owner});
  else result=await new Promise((resolve,reject)=>{
   const request=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(request);reject(Error('Helper not connected. Click the helper icon, connect the activity website, then refresh.'));},timeout);
   pending.set(request,{resolve,reject,timer});
   window.postMessage({channel:'metropolitan-playground/request/v1',request,payload:{...payload,owner}},location.origin);
  });
  if(!result?.ok)throw Error(result?.error||'The helper could not complete this request.');return result;
 }
 async function ready(){let error;for(let i=0;i<4;i++){try{return await request({type:'PING'},1100);}catch(e){error=e;}if(i<3)await new Promise(r=>setTimeout(r,150));}throw error;}
 async function launch({mode,prompt}){
  if(!['roleplay','simulation','practice','learn'].includes(mode))throw Error('Unsupported Playground activity.');
  if(typeof prompt!=='string'||prompt.length<20||prompt.length>1000)throw Error('Use a prompt between 20 and 1,000 characters.');
  return request({type:'LAUNCH',id:crypto.randomUUID(),mode,prompt},10000);
 }
 window.MetropolitanPlayground={ready,launch,status:id=>request({type:'STATUS',id}),request};
})();
