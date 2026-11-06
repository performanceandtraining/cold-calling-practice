(() => {
  const $=id=>document.getElementById(id), random='random';
  const cache=new Map();
  let resolvedScenario=null, job=null, polling=null, busy=false, editing=false, installed=false, launchTime=0;
  const choose=list=>list[Math.floor(Math.random()*list.length)];
  function pick(key,value,options){if(value!==random)return value;if(!cache.has(key))cache.set(key,choose(options));return cache.get(key);}
  function option(value,label){const el=document.createElement('option');el.value=value;el.textContent=label;return el;}
  function options(el,items,keep=random){el.replaceChildren(option(random,'Select one for me'),...items.map(x=>option(x.value,x.label)));el.value=items.some(x=>x.value===keep)?keep:random;}
  function message(text,kind=''){ $('status').textContent=text; $('status').className='status '+kind; }
  function send(payload){return MetropolitanPlayground.request(payload);}
  function controls(s){
    const previous=$('stage').value, stages=COLD.availableStages(s.id);
    options($('stage'),stages,previous===random?random:stages.some(x=>x.value===previous)?previous:s.id==='opening'?'opening':'full');
    $('branch-fields').replaceChildren();
    for(const f of s.fields){
      const label=document.createElement('label');label.append(document.createTextNode(f.label));
      const select=document.createElement('select');select.id='detail-'+f.id;select.dataset.detail=f.id;
      options(select,f.options);label.append(select);$('branch-fields').append(label);
      select.addEventListener('change',()=>{cache.delete('detail-'+f.id);render();});
    }
    $('brief-title').textContent=s.name;$('brief').textContent=s.brief;
    $('checklist').replaceChildren(...s.checklist.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    $('source').textContent='Source: Secondary Cold-Calling Scripts · PDF page'+(s.pages.includes('–')?'s ':' ')+s.pages+'.';
  }
  function scenarioChanged(){
    cache.clear();resolvedScenario=null;render();
  }
  function count(){
    const length=$('prompt').value.length,invalid=length<20||length>COLD.maxLength;
    $('count').textContent=length+' / 1,000';
    $('limit').textContent=length>COLD.maxLength?`${length-1000} characters over. Shorten extra context or edit the prompt.`:'Fits the Playground character limit.';
    $('prompt').setCustomValidity(invalid?'Use a prompt between 20 and 1,000 characters.':'');
    $('launch').disabled=invalid||busy;$('copy').disabled=invalid;
  }
  function render(){
    const scenarioId=pick('scenario',$('scenario').value,COLD.scenarios.map(s=>s.id));
    const s=COLD.getScenario(scenarioId);
    if(resolvedScenario!==scenarioId){resolvedScenario=scenarioId;controls(s);}
    const stage=pick('stage',$('stage').value,COLD.availableStages(s.id).map(x=>x.value));
    const difficulty=pick('difficulty',$('difficulty').value,COLD.difficulties.map(x=>x.value));
    const property=pick('property',$('property').value,['Apartment','Villa','Townhouse']);
    const details=Object.fromEntries(s.fields.map(f=>[f.id,pick('detail-'+f.id,$('detail-'+f.id).value,f.options.map(x=>x.value))]));
    const v={scenario:scenarioId,stage,difficulty,property,details,area:$('area').value.trim()||'Dubai',amount:$('amount').value.trim(),context:$('context').value.trim()};
    $('resolved-name').textContent='Selected: '+s.name+' · '+COLD.availableStages(s.id).find(x=>x.value===stage).label+' · '+difficulty;
    $('prompt').value=COLD.generate(v);editing=false;count();
  }
  options($('scenario'),COLD.scenarios.map(s=>({value:s.id,label:s.name})));
  options($('difficulty'),COLD.difficulties,'Cautious');
  $('scenario').addEventListener('change',scenarioChanged);
  ['stage','difficulty','property'].forEach(id=>$(id).addEventListener('change',()=>{cache.delete(id);render();}));
  ['area','amount','context'].forEach(id=>$(id).addEventListener('input',render));
  $('shuffle').addEventListener('click',()=>{cache.clear();render();message('Random choices refreshed. Specific selections have been kept.');});
  $('prompt').addEventListener('input',()=>{editing=true;count();});
  function lock(value){busy=value;for(const el of document.querySelectorAll('.settings input,.settings select,.settings textarea,#shuffle'))el.disabled=value;count();}
  function stop(){clearInterval(polling);polling=null;lock(false);}
  async function check(){
    if(Date.now()-launchTime>10*60*1000){stop();message('Transfer timed out. Check Playground or launch again.','error');return;}
    try{const r=await send({type:'STATUS',id:job});if(!r?.ok)throw Error(r?.error||'Could not read transfer status.');message(r.detail,r.state==='filled'?'success':r.state==='blocked'?'error':'');if(r.state!=='waiting')stop();}
    catch(e){stop();message(e.message,'error');}
  }
  $('practice').addEventListener('submit',async e=>{
    e.preventDefault();const prompt=$('prompt').value.trim();
    if(prompt.length<20||prompt.length>1000){message('Shorten the prompt to 1,000 characters.','error');return;}
    if(!installed){message('This is preview mode. Install the extension to launch automatically, or copy the prompt and open Playground manually.');return;}
    lock(true);job=crypto.randomUUID();launchTime=Date.now();message('Opening Role Play with your prepared prompt…');
    try{const r=await send({type:'LAUNCH',id:job,mode:'roleplay',prompt});if(!r?.ok)throw Error(r?.error||'Transfer failed.');polling=setInterval(check,1600);check();}
    catch(e){stop();message(e.message,'error');}
  });
  $('copy').addEventListener('click',async()=>{
    if($('prompt').value.length>1000)return;
    try{await navigator.clipboard.writeText($('prompt').value);message('Prompt copied. Paste it into the first Role Play prompt field.','success');}
    catch{$('prompt').focus();$('prompt').select();message('Prompt selected. Use Ctrl+C (Command+C on Mac) to copy.');}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&polling)check();});
  render();
  MetropolitanPlayground.ready().then(r=>{installed=!!r?.ok;$('connection').textContent='Helper connected · v'+r.version;message('Ready. This course activity uses your general Playground Helper.');}).catch(()=>{$('connection').textContent='Helper not connected';message('Click the general helper icon, connect the website hosting this activity, then refresh. Copy prompt remains available.');});
})();
