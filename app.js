(() => {
"use strict";

const $ = s => document.querySelector(s);
const view = $("#view");
const toast = $("#toast");
const navItems = [
  ["dashboard","⌂ Dashboard"],["workspace","▣ My Document"],["pdf","▤ PDF Studio"],
  ["enhance","✦ Enhance"],["crop","⌗ Advanced Crop"],["idcard","▥ ID Card Organizer"],
  ["image","◈ Image Tools"],["print","▦ Print Studio"],["scanner","⌁ Document Scanner"],
  ["utilities","⚙ Utilities"],["settings","⚙ Settings"]
];

const S = {
  file:null,name:"",type:"",pages:[],page:0,brightness:100,contrast:100,
  grayscale:false,history:[],future:[],print:{paper:"A4",ipp:4,margin:10,gap:4,fit:"contain",rotation:0},
  id:{w:85.6,h:53.98,gap:6,margin:10}
};

const PDF_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const ACCEPTED = /\.(jpe?g|png|webp|pdf)$/i;

function msg(x){ if(!toast)return; toast.innerHTML='<div class="toast">'+escapeHtml(x)+"</div>"; setTimeout(()=>toast.innerHTML="",2600); }
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function validFile(f){return !!f && (ACCEPTED.test(f.name||"") || /application\/pdf/i.test(f.type||""));}
function isPDF(f){return /\.pdf$/i.test(f.name||"") || /application\/pdf/i.test(f.type||"");}
function saveRecent(){
  try{localStorage.setItem("jdt-recent",JSON.stringify({
    name:S.name,type:S.type,date:Date.now(),thumb:S.pages[0]?.src||""
  }));}catch(e){}
}
function snapshot(){S.history.push(JSON.stringify(S.pages));if(S.history.length>20)S.history.shift();S.future=[];}
function noDoc(){msg("Upload a document first");go("dashboard");}

function renderNav(active="dashboard"){
  const nav=$("#nav"); if(!nav)return;
  nav.innerHTML=navItems.map(([id,t])=>'<button data-nav="'+id+'" class="'+(id===active?"active":"")+'">'+t+"</button>").join("");
  nav.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>go(b.dataset.nav));
}
function go(id){
  renderNav(id);
  const item=navItems.find(x=>x[0]===id);
  if($("#pageTitle"))$("#pageTitle").textContent=item?item[1].replace(/^[^ ]+ /,""):"Dashboard";
  const fn={dashboard,workspace,pdf:pdfStudio,enhance,crop,idcard,image:imageTools,print:printStudio,scanner,utilities,settings}[id]||dashboard;
  fn();
}

function openUpload(){$("#fileInput")?.click();}
function readData(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(r.error||new Error("File read failed")); r.readAsDataURL(file);
  });
}
function imageBitmap(src){
  return new Promise((resolve,reject)=>{
    const i=new Image(); i.onload=()=>resolve(i); i.onerror=()=>reject(new Error("Image decode failed")); i.src=src;
  });
}

async function renderPDF(file){
  if(!window.pdfjsLib)throw new Error("PDF.js is unavailable");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER;
  const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
    const p=await pdf.getPage(n), vp=p.getViewport({scale:1.5});
    const c=document.createElement("canvas"); c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height);
    const ctx=c.getContext("2d",{alpha:false});
    await p.render({canvasContext:ctx,viewport:vp}).promise;
    pages.push({src:c.toDataURL("image/jpeg",.92),name:"Page "+n,rotation:0,flip:false,source:file.name});
    c.width=1;c.height=1;
  }
  if(pdf.cleanup)pdf.cleanup();
  if(pdf.destroy)await pdf.destroy();
  return pages;
}

async function loadFiles(files){
  const list=[...(files||[])].filter(validFile);
  if(!list.length){msg("Choose JPG, PNG, WebP or PDF");return;}
  try{
    const fresh=!S.pages.length;
    if(fresh){S.file=list[0];S.name=list.length===1?list[0].name:list[0].name+" +"+(list.length-1);S.type=list[0].type||"";S.pages=[];S.page=0;S.history=[];S.future=[];}
    let added=0;
    for(const file of list){
      if(isPDF(file)){
        const pages=await renderPDF(file); S.pages.push(...pages); added+=pages.length;
      }else{
        S.pages.push({src:await readData(file),name:file.name,rotation:0,flip:false,source:file.name}); added++;
      }
    }
    S.page=Math.max(0,Math.min(S.page,S.pages.length-1));
    saveRecent(); msg(added+" page(s) ready"); go("workspace");
  }catch(e){console.error(e);msg("Could not load document: "+(e.message||"unknown error"));}
}
window.loadFiles=loadFiles; window.loadFile=f=>f?loadFiles([f]):null;

function dashboard(){
  view.innerHTML='<div class="hero"><div class="eyebrow">SMART DIGITAL WORKSPACE</div><h2>One upload. Many possibilities.</h2><p>Upload once, then crop, enhance, arrange, convert, build PDFs and prepare print-ready documents from the same Active Document.</p><button class="btn primary" onclick="openUpload()">＋ Upload Document</button><div class="drop" id="drop">Drop JPG, PNG, WebP or PDF here<br><small>Processing stays in your browser whenever possible.</small></div></div><div class="section-title"><h2>Frequently Used</h2></div><div class="cards">'+[
["▥","ID Card Organizer","Front + back cards on A4","idcard"],["✦","Enhance","Clean, sharpen and scan","enhance"],["⌗","Advanced Crop","Perspective correction","crop"],["▦","Print Studio","Realistic A4 layouts","print"],["▤","PDF Studio","Merge, split and arrange","pdf"],["◈","Image Tools","Resize and compress","image"]
].map(x=>'<div class="card" onclick="go(\''+x[3]+'\')"><div style="font-size:24px">'+x[0]+'</div><h3>'+x[1]+'</h3><p>'+x[2]+"</p></div>").join("")+"</div>";
  const d=$("#drop");
  if(d){d.ondragover=e=>{e.preventDefault();d.classList.add("drag")};d.ondragleave=()=>d.classList.remove("drag");d.ondrop=e=>{e.preventDefault();d.classList.remove("drag");loadFiles(e.dataTransfer.files)};}
}

function workspace(){
  if(!S.pages.length){view.innerHTML='<div class="empty"><h2>No active document</h2><p>Upload a document to start the shared workspace.</p><button class="btn primary" onclick="openUpload()">Upload Document</button></div>';return;}
  const p=S.pages[S.page];
  view.innerHTML='<div class="workspace"><div class="canvas-panel"><div class="preview"><img id="mainImg" src="'+p.src+'" style="transform:rotate('+p.rotation+'deg) scaleX('+(p.flip?-1:1)+')"></div><div class="toolbar"><button class="tool" onclick="rotate(90)">↻ Rotate</button><button class="tool" onclick="rotate(-90)">↺ Rotate</button><button class="tool" onclick="flip()">↔ Flip</button><button class="tool" onclick="undo()">Undo</button><button class="tool" onclick="redo()">Redo</button><button class="tool" onclick="resetPage()">Reset</button></div><div class="page-grid">'+S.pages.map((q,i)=>'<div class="thumb" onclick="S.page='+i+';workspace()"><img src="'+q.src+'"><small>Page '+(i+1)+'</small></div>').join("")+'</div></div><div class="tools-panel"><h3>Active Document</h3><p>'+escapeHtml(S.name)+'</p><p class="muted">'+S.pages.length+' page(s)</p><button class="btn primary" style="width:100%" onclick="downloadCurrent()">Export JPG</button><button class="btn" style="width:100%;margin-top:8px" onclick="imageToPDF()">Export PDF</button><hr><button class="tool" onclick="go(\'crop\')">Advanced Crop →</button><button class="tool" onclick="go(\'enhance\')">Enhance →</button><button class="tool" onclick="go(\'print\')">Print Studio →</button></div></div>';
}
function rotate(a){if(!S.pages.length)return;snapshot();S.pages[S.page].rotation=(S.pages[S.page].rotation+a+360)%360;workspace();saveRecent();}
function flip(){if(!S.pages.length)return;snapshot();S.pages[S.page].flip=!S.pages[S.page].flip;workspace();}
function resetPage(){if(!S.pages.length)return;snapshot();S.pages[S.page].rotation=0;S.pages[S.page].flip=false;workspace();}
function undo(){if(!S.history.length)return;S.future.push(JSON.stringify(S.pages));S.pages=JSON.parse(S.history.pop());workspace();}
function redo(){if(!S.future.length)return;S.history.push(JSON.stringify(S.pages));S.pages=JSON.parse(S.future.pop());workspace();}

function enhance(){
  if(!S.pages.length)return noDoc();
  view.innerHTML='<div class="workspace"><div class="canvas-panel"><div class="preview"><img id="enhImg" src="'+S.pages[S.page].src+'"></div></div><div class="tools-panel"><h3>Enhancer</h3><label>Brightness <output id="bv">'+S.brightness+'</output></label><input id="br" type="range" min="40" max="160" value="'+S.brightness+'"><label>Contrast <output id="cv">'+S.contrast+'</output></label><input id="ct" type="range" min="40" max="180" value="'+S.contrast+'"><label>Scan mode</label><select id="mode"><option>Clean Document</option><option>Print Ready</option><option>Text Scan</option><option>B&W Scan</option><option>ID Card</option><option>Photo Document</option></select><button class="btn primary" style="width:100%;margin-top:16px" onclick="applyEnhance()">Apply Enhancement</button></div></div>';
  const update=()=>{S.brightness=+$("#br").value;S.contrast=+$("#ct").value;$("#bv").textContent=S.brightness;$("#cv").textContent=S.contrast;$("#enhImg").style.filter=filters();};
  $("#br").oninput=update;$("#ct").oninput=update;$("#mode").onchange=e=>{const v=e.target.value;if(v==="Print Ready"){S.brightness=108;S.contrast=125}else if(v==="ID Card"){S.brightness=105;S.contrast=115}S.grayscale=v==="B&W Scan"||v==="Text Scan";enhance();};
  update();
}
function filters(){return "brightness("+S.brightness+"%) contrast("+S.contrast+"%)"+(S.grayscale?" grayscale(1)":"");}
async function applyEnhance(){if(!S.pages.length)return;snapshot();const img=await imageBitmap(S.pages[S.page].src),c=document.createElement("canvas");c.width=img.width;c.height=img.height;const x=c.getContext("2d");x.filter=filters();x.drawImage(img,0,0);S.pages[S.page].src=c.toDataURL("image/jpeg",.94);saveRecent();msg("Enhancement applied");workspace();}

function crop(){
  if(!S.pages.length)return noDoc();
  view.innerHTML='<div class="workspace"><div class="canvas-panel"><div class="preview"><img id="cropImg" src="'+S.pages[S.page].src+'"></div></div><div class="tools-panel"><h3>Advanced Crop</h3><p class="muted">Choose a physical ratio or open four-point crop.</p><select id="cropPreset"><option value="free">Free</option><option value="a4">A4</option><option value="a5">A5</option><option value="id">ID Card</option><option value="passport">Passport</option></select><button class="btn primary" style="width:100%;margin-top:16px" onclick="cropPreset()">Apply Ratio Crop</button><button class="btn" style="width:100%;margin-top:8px" onclick="perspectiveCrop()">Four-Point Perspective Crop</button></div></div>';
}
async function cropPreset(){
  const p=$("#cropPreset").value;if(p==="free"){msg("Select a ratio preset");return;}
  const img=await imageBitmap(S.pages[S.page].src);const ratio=p==="a4"?210/297:p==="a5"?148/210:p==="id"?85.6/53.98:35/45;
  let w=img.width,h=img.height,tw=w,th=w/ratio;if(th>h){th=h;tw=h*ratio}
  const c=document.createElement("canvas");c.width=Math.round(tw);c.height=Math.round(th);c.getContext("2d").drawImage(img,(w-tw)/2,(h-th)/2,tw,th,0,0,tw,th);
  snapshot();S.pages[S.page].src=c.toDataURL("image/jpeg",.95);saveRecent();workspace();msg("Crop applied");
}
function perspectiveCrop(){
  if(!S.pages.length)return noDoc();
  view.innerHTML='<div class="workspace"><div class="canvas-panel"><h3>Four-Point Perspective Crop</h3><div class="preview"><canvas id="pcCanvas"></canvas></div></div><div class="tools-panel"><p class="muted">Drag all four points to the document corners.</p><button class="btn primary" style="width:100%" onclick="applyPerspective()">Apply Crop</button></div></div>';
  initPerspective();
}
async function initPerspective(){
  const img=await imageBitmap(S.pages[S.page].src),c=$("#pcCanvas"),max=680,scale=Math.min(1,max/img.width),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
  c.width=w;c.height=h;const x=c.getContext("2d");c._pc={img,w,h,pts:[{x:8,y:8},{x:w-8,y:8},{x:w-8,y:h-8},{x:8,y:h-8}],drag:-1};drawPC(c);
  c.onpointerdown=e=>{const r=c.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;c._pc.drag=c._pc.pts.findIndex(p=>Math.hypot(p.x-px,p.y-py)<22);if(c._pc.drag>=0)c.setPointerCapture(e.pointerId)};
  c.onpointermove=e=>{if(c._pc.drag<0)return;const r=c.getBoundingClientRect(),p=c._pc.pts[c._pc.drag];p.x=Math.max(0,Math.min(w,e.clientX-r.left));p.y=Math.max(0,Math.min(h,e.clientY-r.top));drawPC(c)};
  c.onpointerup=()=>c._pc.drag=-1;
}
function drawPC(c){const q=c._pc,x=c.getContext("2d");x.clearRect(0,0,q.w,q.h);x.drawImage(q.img,0,0,q.w,q.h);x.strokeStyle="#19d38a";x.lineWidth=3;x.beginPath();q.pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();x.stroke();q.pts.forEach((p,i)=>{x.fillStyle="#27b7ff";x.beginPath();x.arc(p.x,p.y,9,0,Math.PI*2);x.fill();x.fillStyle="#071525";x.font="bold 11px sans-serif";x.fillText(i+1,p.x-3,p.y+4);});}
async function applyPerspective(){
  const c=$("#pcCanvas");if(!c?._pc)return;const q=c._pc,pts=q.pts;
  const W=Math.max(100,Math.round((Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)+Math.hypot(pts[2].x-pts[3].x,pts[2].y-pts[3].y))/2));
  const H=Math.max(100,Math.round((Math.hypot(pts[3].x-pts[0].x,pts[3].y-pts[0].y)+Math.hypot(pts[2].x-pts[1].x,pts[2].y-pts[1].y))/2));
  const scaledPts=pts.map(p=>({x:p.x/Math.max(0.0001,q.w/q.img.width),y:p.y/Math.max(0.0001,q.h/q.img.height)}));
  const out=window.JangiraPerspective?.warp(q.img,scaledPts,W,H);
  if(!out){msg("Perspective engine unavailable");return;}
  snapshot();S.pages[S.page].src=out.toDataURL("image/jpeg",.95);saveRecent();msg("True perspective crop applied");workspace();
}

function pdfStudio(){
  view.innerHTML='<div class="hero"><div class="eyebrow">PDF STUDIO</div><h2>Build your PDF visually</h2><p>Select pages, reorder them, duplicate, rotate, delete, extract or split the current Active Document.</p><button class="btn primary" onclick="imageToPDF()">Export All PDF</button> <button class="btn" onclick="openUpload()">＋ Add PDF / Images</button></div>'+
  '<div class="section-title"><h2>Pages ('+S.pages.length+')</h2><div><button class="tool" onclick="selectAllPDF(true)">Select all</button> <button class="tool" onclick="selectAllPDF(false)">Clear</button></div></div>'+
  '<div class="page-grid">'+(S.pages.length?S.pages.map((p,i)=>'<div class="thumb"><label style="display:flex;gap:6px;align-items:center;margin:0 0 6px"><input type="checkbox" class="pdfSel" data-i="'+i+'"> Select</label><img src="'+p.src+'"><small>Page '+(i+1)+'<br><button class="tool" onclick="movePage('+i+',-1)">←</button><button class="tool" onclick="movePage('+i+',1)">→</button><button class="tool" onclick="rotatePagePDF('+i+')">↻</button><button class="tool" onclick="duplicatePage('+i+')">Duplicate</button><button class="tool" onclick="deletePage('+i+')">Delete</button></small></div>').join(""):'<div class="empty">No pages loaded.</div>')+'</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>Selected pages</h3><p>Apply an operation to checked pages.</p><button class="btn" onclick="deleteSelectedPDF()">Delete selected</button> <button class="btn" onclick="duplicateSelectedPDF()">Duplicate selected</button> <button class="btn" onclick="extractSelectedPDF()">Extract PDF</button></div>'+
  '<div class="card"><h3>Split PDF</h3><p>Choose how the active pages are divided into separate PDFs.</p><select id="splitMode"><option value="every">Every N pages</option><option value="range">Page range</option><option value="odd">Odd pages</option><option value="even">Even pages</option><option value="selected">Selected pages</option></select><input id="splitValue" type="text" placeholder="N or range e.g. 1-3" style="margin-top:8px"><button class="btn primary" style="margin-top:8px" onclick="splitPDF()">Split & Export</button></div></div>';
}
function selectedPDFIndices(){return [...document.querySelectorAll(".pdfSel:checked")].map(x=>+x.dataset.i).sort((a,b)=>a-b);}
function selectAllPDF(v){document.querySelectorAll(".pdfSel").forEach(x=>x.checked=v);}
function rotatePagePDF(i){snapshot();S.pages[i].rotation=(S.pages[i].rotation+90)%360;pdfStudio();}
function deleteSelectedPDF(){const ids=selectedPDFIndices();if(!ids.length)return msg("Select pages first");snapshot();S.pages=S.pages.filter((_,i)=>!ids.includes(i));S.page=Math.max(0,Math.min(S.page,S.pages.length-1));pdfStudio();}
function duplicateSelectedPDF(){const ids=selectedPDFIndices();if(!ids.length)return msg("Select pages first");snapshot();const out=[];S.pages.forEach((p,i)=>{out.push(p);if(ids.includes(i))out.push({...p,name:p.name+" copy"});});S.pages=out;pdfStudio();}
async function extractSelectedPDF(){const ids=selectedPDFIndices();if(!ids.length)return msg("Select pages first");await exportPagesToPDF(ids.map(i=>S.pages[i]),"extracted-pages.pdf","A4",10,4,1);}
function parseRange(v,max){const m=String(v||"").match(/^(\\d+)\\s*-\\s*(\\d+)$/);if(!m)return null;let a=Math.max(1,+m[1]),b=Math.min(max,+m[2]);if(a>b)[a,b]=[b,a];return Array.from({length:b-a+1},(_,i)=>a-1+i);}
async function splitPDF(){
  if(!S.pages.length)return noDoc();const mode=$("#splitMode").value,val=$("#splitValue").value.trim();let groups=[];
  if(mode==="every"){const n=Math.max(1,parseInt(val||"1",10));for(let i=0;i<S.pages.length;i+=n)groups.push(S.pages.slice(i,i+n));}
  else if(mode==="range"){const ids=parseRange(val,S.pages.length);if(!ids)return msg("Enter a range like 1-3");groups=[ids.map(i=>S.pages[i])];}
  else if(mode==="odd")groups=[S.pages.filter((_,i)=>i%2===0)];
  else if(mode==="even")groups=[S.pages.filter((_,i)=>i%2===1)];
  else {const ids=selectedPDFIndices();if(!ids.length)return msg("Select pages first");groups=[ids.map(i=>S.pages[i])];}
  for(let i=0;i<groups.length;i++) await exportPagesToPDF(groups[i],"split-"+(i+1)+".pdf","A4",10,4,1);
  msg(groups.length+" PDF file(s) exported");
}

function movePage(i,d){if(i+d<0||i+d>=S.pages.length)return;snapshot();[S.pages[i],S.pages[i+d]]=[S.pages[i+d],S.pages[i]];S.page=i+d;pdfStudio();}
function duplicatePage(i){snapshot();S.pages.splice(i+1,0,{...S.pages[i],name:S.pages[i].name+" copy"});pdfStudio();}
function deletePage(i){snapshot();S.pages.splice(i,1);S.page=Math.max(0,Math.min(S.page,S.pages.length-1));S.pages.length?pdfStudio():go("dashboard");}
async function imageToPDF(){
  if(!S.pages.length)return noDoc();const {jsPDF}=window.jspdf||{};if(!jsPDF)return msg("PDF engine unavailable");
  const pdf=new jsPDF("p","mm","a4");
  for(let i=0;i<S.pages.length;i++){if(i)pdf.addPage();const img=await imageBitmap(S.pages[i].src),r=img.width/img.height;let w=190,h=w/r;if(h>277){h=277;w=h*r}pdf.addImage(S.pages[i].src,"JPEG",(210-w)/2,(297-h)/2,w,h);}
  pdf.save((S.name||"document").replace(/\.[^.]+$/,"")+".pdf");msg("PDF exported");
}

function idcard(){
  if(!S.pages.length)return noDoc();const d=S.id;
  const front=S.id.front||S.pages[0]?.src||"",back=S.id.back||S.pages[1]?.src||"";
  view.innerHTML='<div class="workspace"><div class="canvas-panel"><h3>ID Card Organizer</h3><p class="muted">Add front and back sides separately, then arrange them at the exact physical card size.</p><div class="cards"><div class="card"><h3>Front</h3><input id="idFront" type="file" accept="image/*"><img src="'+front+'" style="width:100%;max-height:180px;object-fit:contain;margin-top:8px"></div><div class="card"><h3>Back</h3><input id="idBack" type="file" accept="image/*"><img src="'+back+'" style="width:100%;max-height:180px;object-fit:contain;margin-top:8px"></div></div></div><div class="tools-panel"><h3>Physical Card Size</h3><label>Width (mm)</label><input id="idW" type="number" step=".01" value="'+d.w+'"><label>Height (mm)</label><input id="idH" type="number" step=".01" value="'+d.h+'"><label>Gap (mm)</label><input id="idG" type="number" step=".5" value="'+d.gap+'"><label>Margin (mm)</label><input id="idM" type="number" step=".5" value="'+d.margin+'"><label>Layout</label><select id="idLayout"><option value="side">Front + Back</option><option value="pages">Use Active Pages</option></select><button class="btn primary" style="width:100%;margin-top:16px" onclick="exportIDCards()">Export A4 PDF</button></div></div>';
  $("#idFront").onchange=async e=>{if(e.target.files[0]){S.id.front=await readData(e.target.files[0]);idcard();}};
  $("#idBack").onchange=async e=>{if(e.target.files[0]){S.id.back=await readData(e.target.files[0]);idcard();}};
}
async function exportIDCards(){
  S.id={...S.id,w:+$("#idW").value||85.6,h:+$("#idH").value||53.98,gap:+$("#idG").value||6,margin:+$("#idM").value||10};
  const {jsPDF}=window.jspdf,pdf=new jsPDF("p","mm","a4"),cols=Math.max(1,Math.floor((210-2*S.id.margin+S.id.gap)/(S.id.w+S.id.gap))),rows=Math.max(1,Math.floor((297-2*S.id.margin+S.id.gap)/(S.id.h+S.id.gap))),layout=$("#idLayout").value;
  const cards=[];
  if(layout==="side" && S.id.front){cards.push(S.id.front);if(S.id.back)cards.push(S.id.back);}
  else cards.push(...S.pages.map(p=>p.src));
  for(let i=0;i<Math.min(cards.length,cols*rows);i++){const col=i%cols,row=Math.floor(i/cols);pdf.addImage(cards[i],"JPEG",S.id.margin+col*(S.id.w+S.id.gap),S.id.margin+row*(S.id.h+S.id.gap),S.id.w,S.id.h);}
  pdf.save("id-card-a4.pdf");msg("A4 ID card PDF exported");
}

function imageTools(){
  if(!S.pages.length)return noDoc();
  view.innerHTML='<div class="cards"><div class="card"><h3>Convert</h3><p>Export current page.</p><button class="btn" onclick="downloadCurrent(\'png\')">PNG</button> <button class="btn" onclick="downloadCurrent(\'jpg\')">JPG</button></div><div class="card"><h3>Resize</h3><label>Width (px)</label><input id="rw" type="number" value="1200"><button class="btn primary" style="margin-top:10px" onclick="resizeImage()">Resize & Export</button></div><div class="card"><h3>Compression</h3><label>Quality</label><input id="quality" type="range" min="20" max="100" value="85"><button class="btn primary" onclick="compressImage()">Compress & Export</button></div></div>';
}
async function resizeImage(){const img=await imageBitmap(S.pages[S.page].src),w=Math.max(1,+$("#rw").value||img.width),h=Math.round(img.height*w/img.width),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);downloadData(c.toDataURL("image/jpeg",.92),"resized.jpg");}
async function compressImage(){const img=await imageBitmap(S.pages[S.page].src),c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);downloadData(c.toDataURL("image/jpeg",+$("#quality").value/100),"compressed.jpg");}
function downloadCurrent(ext="jpg"){if(!S.pages.length)return noDoc();downloadData(S.pages[S.page].src,ext==="png"?"page.png":"page.jpg");}
function downloadData(data,name){const a=document.createElement("a");a.href=data;a.download=name;a.click();}

function printStudio(){
  if(!S.pages.length)return noDoc();const p=S.print;
  view.innerHTML='<div class="workspace"><div class="canvas-panel"><h3>'+p.paper+' Print Preview</h3><div style="background:#fff;color:#111;max-width:500px;min-height:650px;margin:auto;padding:28px;display:grid;grid-template-columns:repeat('+Math.ceil(Math.sqrt(p.ipp))+',1fr);gap:'+p.gap+'px">'+S.pages.map(q=>'<div style="border:1px solid #aaa;min-height:80px;display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="'+q.src+'" style="max-width:100%;max-height:100%;object-fit:'+p.fit+';transform:rotate('+p.rotation+'deg)"></div>').join("")+'</div></div><div class="tools-panel"><h3>Print Layout Studio</h3><label>Paper</label><select id="psPaper">'+["A4","A5","A3","Letter","Legal"].map(x=>'<option '+(p.paper===x?"selected":"")+">"+x+"</option>").join("")+'</select><label>Items per page</label><select id="psIpp">'+[1,2,4,6,8].map(n=>'<option '+(p.ipp===n?"selected":"")+" value="+n+">"+n+"</option>").join("")+'</select><label>Margin (mm)</label><input id="psMargin" type="number" value="'+p.margin+'"><label>Gap (mm)</label><input id="psGap" type="number" value="'+p.gap+'"><label>Fit</label><select id="psFit"><option value="contain" '+(p.fit==="contain"?"selected":"")+'>Fit</option><option value="cover" '+(p.fit==="cover"?"selected":"")+'>Fill</option></select><button class="btn primary" style="width:100%;margin-top:16px" onclick="applyPrintSettings()">Update Preview</button><button class="btn" style="width:100%;margin-top:8px" onclick="exportPrintPDF()">Export Print PDF</button><button class="btn" style="width:100%;margin-top:8px" onclick="window.print()">Print</button></div></div>';
}
function applyPrintSettings(){S.print={paper:$("#psPaper").value,ipp:+$("#psIpp").value,margin:+$("#psMargin").value||0,gap:+$("#psGap").value||0,fit:$("#psFit").value,rotation:S.print.rotation||0};printStudio();}
async function exportPrintPDF(){await exportPagesToPDF(S.pages,"print-layout.pdf",S.print.paper,S.print.margin,S.print.gap,S.print.ipp);}
async function exportPagesToPDF(pages,name,paper,margin,gap,ipp){
  const {jsPDF}=window.jspdf,sz={A4:[210,297],A5:[148,210],A3:[297,420],Letter:[215.9,279.4],Legal:[215.9,355.6]}[paper]||[210,297],pdf=new jsPDF("p","mm",sz);
  let k=0,n=0;while(k<pages.length){if(n++)pdf.addPage(sz,"p");const cols=Math.ceil(Math.sqrt(ipp)),rows=Math.ceil(ipp/cols),cw=(sz[0]-2*margin-(cols-1)*gap)/cols,ch=(sz[1]-2*margin-(rows-1)*gap)/rows;for(let i=0;i<ipp&&k<pages.length;i++,k++){const im=await imageBitmap(pages[k].src);let w=cw,h=w*im.height/im.width;if(h>ch){h=ch;w=h*im.width/im.height}const col=i%cols,row=Math.floor(i/cols);pdf.addImage(pages[k].src,"JPEG",margin+col*(cw+gap)+(cw-w)/2,margin+row*(ch+gap)+(ch-h)/2,w,h);}}
  pdf.save(name);msg("PDF exported");
}

function scanner(){view.innerHTML='<div class="hero"><div class="eyebrow">DOCUMENT SCANNER</div><h2>Camera capture</h2><p>Capture pages with your phone camera and add them to the same document.</p><input type="file" accept="image/*" capture="environment" multiple onchange="loadFiles(this.files)" style="margin-top:16px"><button class="btn" style="margin-top:10px" onclick="openUpload()">Open Gallery / Files</button></div>';}
function utilities(){view.innerHTML='<div class="cards">'+[["Blank A4","Generate a clean A4 PDF"],["Image Dimensions","Inspect current image"],["File Size","Check selected file size"],["PDF Page Counter","Count active pages"],["Metadata","Show file metadata"],["Page Extraction","Export selected page"],["Rename","Change export filename"],["Signature Resize","Resize signature using image tools"]].map((x,i)=>'<div class="card"><h3>'+x[0]+'</h3><p>'+x[1]+'</p><button class="btn" onclick="utility('+i+')">Open</button></div>').join("")+'</div>';}
function utility(i){if(i===1&&S.pages.length)imageBitmap(S.pages[S.page].src).then(x=>msg(x.width+" × "+x.height+" px"));else if(i===2&&S.file)msg((S.file.size/1024).toFixed(1)+" KB");else if(i===3)msg(S.pages.length+" page(s)");else msg("Utility ready");}
function settings(){view.innerHTML='<div class="cards"><div class="card"><h3>Privacy</h3><p>Processing is client-side where possible.</p></div><div class="card"><h3>Recent documents</h3><p>Stored locally in browser storage.</p><button class="btn danger" onclick="localStorage.removeItem(\'jdt-recent\');msg(\'Recent data cleared\')">Clear recent</button></div><div class="card"><h3>About</h3><p>Jangira E Mitra — Smart Document Toolkit<br>One Upload. Many Possibilities.</p></div></div>';}

window.openUpload=openUpload;window.go=go;window.dashboard=dashboard;window.workspace=workspace;window.pdfStudio=pdfStudio;window.enhance=enhance;window.crop=crop;window.idcard=idcard;window.imageTools=imageTools;window.printStudio=printStudio;window.scanner=scanner;window.utilities=utilities;window.settings=settings;window.imageToPDF=imageToPDF;window.downloadCurrent=downloadCurrent;window.resizeImage=resizeImage;window.compressImage=compressImage;window.applyEnhance=applyEnhance;window.cropPreset=cropPreset;window.perspectiveCrop=perspectiveCrop;window.applyPerspective=applyPerspective;window.rotate=rotate;window.flip=flip;window.resetPage=resetPage;window.undo=undo;window.redo=redo;window.movePage=movePage;window.duplicatePage=duplicatePage;window.deletePage=deletePage;window.exportPrintPDF=exportPrintPDF;window.applyPrintSettings=applyPrintSettings;window.exportIDCards=exportIDCards;window.utility=utility;window.saveRecent=saveRecent;

const input=$("#fileInput");if(input)input.onchange=e=>{loadFiles(e.target.files);e.target.value="";};
const upload=$("#uploadBtn");if(upload)upload.onclick=openUpload;
const recent=$("#openRecent");if(recent)recent.onclick=()=>{try{const r=JSON.parse(localStorage.getItem("jdt-recent")||"null");if(r?.thumb){S.name=r.name||"Recent document";S.pages=[{src:r.thumb,name:S.name,rotation:0,flip:false}];go("workspace");}else msg("No recent document");}catch{msg("No recent document");}};
const menu=$("#menu");if(menu)menu.onclick=()=>$(".sidebar")?.classList.toggle("open");
renderNav("dashboard");dashboard();
})();