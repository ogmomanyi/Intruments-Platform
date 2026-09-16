import { useState, useEffect, useCallback } from "react";

const DEFAULT_SPECS = [
  { id:"s1",  label:"All 6 Detection Modes",          weight:10, description:"Abs, FI, TRF, FP, Luminescence, AlphaScreen/AlphaLISA" },
  { id:"s2",  label:"Hybrid Optics / Variable BW",    weight:8,  description:"Monochromator + filter, 9–50 nm, 1 nm steps" },
  { id:"s3",  label:"FI Sensitivity <0.15 pM FITC",   weight:9,  description:"Top read fluorescence intensity" },
  { id:"s4",  label:"FP <0.5 mP SD @ 1 nM FITC",     weight:9,  description:"Fluorescence polarization precision" },
  { id:"s5",  label:"Luminescence <0.4 pM ATP",       weight:9,  description:"Top read luminescence sensitivity" },
  { id:"s6",  label:"TRF <20 fM Europium",            weight:9,  description:"Time-resolved fluorescence" },
  { id:"s7",  label:"AlphaScreen <5 pM P-Tyr-100",    weight:9,  description:"AlphaScreen / AlphaLISA sensitivity" },
  { id:"s8",  label:"Absorbance <1% @ 2 OD, 0–4 OD", weight:7,  description:"Photometric accuracy and range" },
  { id:"s9",  label:"Micro-volume ≥2 µL",             weight:6,  description:"Low-volume sample measurement" },
  { id:"s10", label:"Temp to 70°C + CO₂/O₂",         weight:8,  description:"Environmental control for live-cell assays" },
  { id:"s11", label:"6–1536 Well Plates",             weight:7,  description:"Full plate format compatibility" },
  { id:"s12", label:"Read Speed ≤8 s / 96-well",      weight:6,  description:"Throughput in flying/single flash mode" },
  { id:"s13", label:"21 CFR Pt 11 / GLP Software",    weight:10, description:"Audit trails, role-based access, electronic signatures" },
  { id:"s14", label:"IQ/OQ/PQ Documentation",         weight:10, description:"Full validation docs for GLP/GMP regulatory inspection" },
  { id:"s15", label:"LIMS / QMS Data Export",         weight:7,  description:"Compatible data export formats" },
  { id:"s16", label:"East Africa Service Centre",     weight:10, description:"Authorised service in Kenya / East Africa" },
  { id:"s17", label:"AMC/SLA 3–5 yrs post-warranty",  weight:9,  description:"Annual maintenance contract availability" },
  { id:"s18", label:"Modularity / Upgrade Path",      weight:7,  description:"Expandable to imaging or automation platforms" },
];

const DEFAULT_INSTRUMENTS = [
  {
    id:"i1", name:"Molecular Devices", model:"SpectraMax i3x", distributor:true,
    url:"https://www.moleculardevices.com/products/microplate-readers/multi-mode-readers/spectramax-i3x-readers",
    notes:"Your distribution product. Strongest GLP compliance portfolio (SoftMax Pro GxP). FP sensitivity gap vs tender — same issue as the reference instrument Neo2.",
    scores:{ s1:2,s2:1,s3:1,s4:0,s5:2,s6:1,s7:2,s8:2,s9:2,s10:1,s11:2,s12:2,s13:2,s14:2,s15:2,s16:2,s17:2,s18:2 }
  },
  {
    id:"i2", name:"Tecan", model:"Spark Multimode Reader", distributor:true,
    url:"https://www.tecan.com/spark",
    notes:"Your distribution product. Unique Fusion Optics (filter+mono independent selection) and Te-Cool active cooling differentiate technically. Request AlphaScreen and FP specs from Tecan before bidding.",
    scores:{ s1:2,s2:2,s3:1,s4:1,s5:1,s6:1,s7:1,s8:2,s9:2,s10:2,s11:1,s12:2,s13:1,s14:2,s15:2,s16:2,s17:2,s18:2 }
  },
  {
    id:"i3", name:"Agilent BioTek", model:"Synergy Neo2", distributor:false,
    url:"https://www.agilent.com/en/product/microplate-instrumentation/microplate-readers/multimode-microplate-readers/biotek-synergy-neo2-hybrid-multimode-reader-1623195",
    notes:"Tender spec written around this instrument ('Gen5 or equivalent'). FP publishes 1 mP — also above the 0.5 mP threshold. Not in your distribution portfolio.",
    scores:{ s1:2,s2:2,s3:1,s4:0,s5:2,s6:2,s7:2,s8:2,s9:2,s10:2,s11:2,s12:2,s13:2,s14:2,s15:2,s16:1,s17:1,s18:2 }
  },
  {
    id:"i4", name:"BMG Labtech", model:"PHERAstar FSX", distributor:false,
    url:"https://www.bmglabtech.com/en/pherastar-fsx/",
    notes:"Highest raw sensitivity of all 5 instruments. Only one that fully meets the FP <0.5 mP spec. Limited East Africa service presence is the key tender disqualifier.",
    scores:{ s1:2,s2:1,s3:2,s4:2,s5:2,s6:2,s7:2,s8:2,s9:2,s10:1,s11:2,s12:2,s13:2,s14:2,s15:2,s16:0,s17:1,s18:1 }
  },
  {
    id:"i5", name:"Revvity", model:"EnVision Nexus / VICTOR Nivo", distributor:false,
    url:"https://www.revvity.com/category/plate-readers",
    notes:"Invented AlphaScreen technology — strongest Alpha pedigree. 30+ years in regulated pharma labs. East Africa service presence needs confirmation from Revvity.",
    scores:{ s1:2,s2:1,s3:1,s4:1,s5:2,s6:2,s7:2,s8:2,s9:1,s10:2,s11:2,s12:2,s13:2,s14:2,s15:2,s16:1,s17:1,s18:1 }
  },
];

const SCORE_LABELS = ["Fails / N/A","Partial / Needs confirmation","Fully meets spec"];
const SCORE_ICONS  = ["✗","~","✓"];
const SCORE_COLOR  = ["#D64545","#C47D1A","#1F9162"];
const SCORE_BG     = ["#FEF0F0","#FFFAED","#EDFAF4"];

function uid(){ return "x"+Math.random().toString(36).slice(2,9); }

function calcScore(inst, specs){
  let w=0, mx=0;
  specs.forEach(s=>{ w+=(inst.scores[s.id]??1)*s.weight; mx+=2*s.weight; });
  return mx===0?0:Math.round(w/mx*100);
}

async function loadState(){
  try{ const r=await window.storage.get("icp_v1"); if(r) return JSON.parse(r.value); }catch{}
  return null;
}
async function saveState(st){
  try{ await window.storage.set("icp_v1",JSON.stringify(st)); }catch{}
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function RingScore({score}){
  const c = score>=80?"#1F9162":score>=60?"#C47D1A":"#D64545";
  const bg= score>=80?"#EDFAF4":score>=60?"#FFFAED":"#FEF0F0";
  return(
    <div style={{width:52,height:52,borderRadius:"50%",border:`2.5px solid ${c}`,background:bg,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:c,lineHeight:1}}>{score}</span>
      <span style={{fontSize:9,color:c,opacity:.7}}>%</span>
    </div>
  );
}

function Pill({children,color="#111",bg="#f0f0f0"}){
  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:600,color,background:bg}}>{children}</span>;
}

function Btn({children,onClick,variant="ghost",style={}}){
  const base={border:"none",cursor:"pointer",fontWeight:500,fontSize:13,borderRadius:8,padding:"8px 16px",transition:"opacity .15s"};
  const v={
    primary:{background:"#111",color:"#fff"},
    danger:{background:"#FEF0F0",color:"#D64545"},
    ghost:{background:"#f4f4f4",color:"#444"},
    green:{background:"#1F9162",color:"#fff"},
  };
  return <button onClick={onClick} style={{...base,...v[variant],...style}}>{children}</button>;
}

function ScoreChip({val}){
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:7,
      background:SCORE_BG[val],color:SCORE_COLOR[val],fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>
      {SCORE_ICONS[val]} <span style={{fontWeight:400,fontSize:11}}>{val===2?"Meets":val===1?"Partial":"Fails"}</span>
    </span>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function Dashboard({instruments,specs,setView,setEditing,filterDist,setFilterDist}){
  const list=[...instruments].filter(i=>filterDist?i.distributor:true).sort((a,b)=>calcScore(b,specs)-calcScore(a,specs));
  return(
    <div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>setFilterDist(!filterDist)} style={{
          padding:"7px 14px",border:"1.5px solid",borderColor:filterDist?"#1F9162":"#ddd",
          borderRadius:8,background:filterDist?"#EDFAF4":"white",
          color:filterDist?"#1F9162":"#666",fontWeight:500,fontSize:13,cursor:"pointer"
        }}>{filterDist?"★ Your products only":"All instruments"}</button>
        <span style={{fontSize:12,color:"#aaa"}}>{list.length} instrument{list.length!==1?"s":""} · {specs.length} specs</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>
        {list.map((inst,rank)=>{
          const score=calcScore(inst,specs);
          const met=specs.filter(s=>(inst.scores[s.id]??1)===2).length;
          const part=specs.filter(s=>(inst.scores[s.id]??1)===1).length;
          const fail=specs.filter(s=>(inst.scores[s.id]??1)===0).length;
          const barColor=score>=80?"#1F9162":score>=60?"#C47D1A":"#D64545";
          return(
            <div key={inst.id} style={{background:"white",borderRadius:14,
              border:`1.5px solid ${inst.distributor?"#1F9162":"#e8e8e8"}`,overflow:"hidden"}}>
              {inst.distributor&&<div style={{background:"#1F9162",color:"white",fontSize:11,fontWeight:700,padding:"4px 14px",letterSpacing:".06em"}}>★ YOUR DISTRIBUTION PRODUCT</div>}
              <div style={{padding:"16px 18px"}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                  <div style={{width:30,height:30,borderRadius:8,background:"#f5f5f5",display:"flex",
                    alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",
                    fontWeight:700,fontSize:13,color:"#ccc",flexShrink:0}}>#{rank+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,color:"#111"}}>{inst.name}</div>
                    <div style={{fontSize:12,color:"#888"}}>{inst.model}</div>
                  </div>
                  <RingScore score={score}/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginBottom:6}}>
                    <div style={{height:"100%",width:`${score}%`,background:barColor,borderRadius:3}}/>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {[{v:met,l:"Met",c:SCORE_COLOR[2],b:SCORE_BG[2]},{v:part,l:"Partial",c:SCORE_COLOR[1],b:SCORE_BG[1]},{v:fail,l:"Fails",c:SCORE_COLOR[0],b:SCORE_BG[0]}].map(({v,l,c,b})=>(
                      <div key={l} style={{flex:1,textAlign:"center",background:b,borderRadius:6,padding:"5px 2px"}}>
                        <div style={{fontWeight:700,fontSize:15,color:c}}>{v}</div>
                        <div style={{fontSize:10,color:c,opacity:.8}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {inst.notes&&<div style={{fontSize:12,color:"#666",lineHeight:1.6,marginBottom:12,
                  borderLeft:"3px solid #f0f0f0",paddingLeft:10}}>{inst.notes}</div>}
                <div style={{display:"flex",gap:8}}>
                  {inst.url&&<a href={inst.url} target="_blank" rel="noopener noreferrer" style={{
                    flex:1,textAlign:"center",padding:"7px 0",borderRadius:8,border:"1px solid #e8e8e8",
                    fontSize:12,color:"#555",textDecoration:"none",fontWeight:500}}>🔗 Product page</a>}
                  <button onClick={()=>{setEditing({...inst,scores:{...inst.scores}});setView("edit");}}
                    style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #e8e8e8",
                      background:"white",fontSize:12,color:"#555",cursor:"pointer",fontWeight:500}}>✏️ Edit scores</button>
                </div>
              </div>
            </div>
          );
        })}
        <div onClick={()=>setView("instruments")} style={{background:"#fafafa",borderRadius:14,
          border:"2px dashed #e0e0e0",display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",gap:8,minHeight:200,cursor:"pointer",color:"#ccc"}}>
          <div style={{fontSize:36}}>+</div>
          <div style={{fontSize:13,fontWeight:500}}>Add instrument</div>
        </div>
      </div>
    </div>
  );
}

function Matrix({instruments,specs,filterDist}){
  const list=[...instruments].filter(i=>filterDist?i.distributor:true).sort((a,b)=>calcScore(b,specs)-calcScore(a,specs));
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:680}}>
        <thead>
          <tr>
            <th style={{textAlign:"left",padding:"10px 14px",background:"#fafafa",borderBottom:"2px solid #e8e8e8",
              position:"sticky",left:0,zIndex:2,minWidth:180,fontWeight:600,color:"#555"}}>Specification</th>
            <th style={{padding:"8px 6px",background:"#fafafa",borderBottom:"2px solid #e8e8e8",
              fontSize:11,color:"#aaa",fontWeight:500,textAlign:"center"}}>Wt</th>
            {list.map(inst=>(
              <th key={inst.id} style={{padding:"8px 10px",background:inst.distributor?"#EDFAF4":"#fafafa",
                borderBottom:`2px solid ${inst.distributor?"#1F9162":"#e8e8e8"}`,minWidth:130,textAlign:"center"}}>
                {inst.distributor&&<div style={{fontSize:9,fontWeight:800,color:"#1F9162",letterSpacing:".07em",marginBottom:2}}>★ YOURS</div>}
                <div style={{fontWeight:700,fontSize:12,color:inst.distributor?"#1F9162":"#222"}}>{inst.name}</div>
                <div style={{fontWeight:400,fontSize:11,color:"#999"}}>{inst.model}</div>
              </th>
            ))}
          </tr>
          <tr>
            <td style={{padding:"8px 14px",background:"#f5f5f5",fontWeight:700,fontSize:12,
              position:"sticky",left:0,borderBottom:"1px solid #e8e8e8"}}>Overall Score</td>
            <td style={{background:"#f5f5f5",borderBottom:"1px solid #e8e8e8"}}/>
            {list.map(inst=>(
              <td key={inst.id} style={{textAlign:"center",padding:8,background:inst.distributor?"#EDFAF499":"#f5f5f5",borderBottom:"1px solid #e8e8e8"}}>
                <RingScore score={calcScore(inst,specs)}/>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map((spec,i)=>(
            <tr key={spec.id} style={{background:i%2===0?"white":"#fafafa"}}>
              <td style={{padding:"9px 14px",position:"sticky",left:0,background:i%2===0?"white":"#fafafa",
                borderBottom:"1px solid #f0f0f0"}}>
                <div style={{fontWeight:500,fontSize:12,color:"#222"}}>{spec.label}</div>
                {spec.description&&<div style={{fontSize:11,color:"#bbb",marginTop:1}}>{spec.description}</div>}
              </td>
              <td style={{textAlign:"center",fontSize:11,color:"#bbb",borderBottom:"1px solid #f0f0f0"}}>×{spec.weight}</td>
              {list.map(inst=>{
                const val=inst.scores[spec.id]??1;
                return(
                  <td key={inst.id} style={{textAlign:"center",padding:"6px 8px",borderBottom:"1px solid #f0f0f0",
                    background:inst.distributor?`${SCORE_BG[val]}88`:SCORE_BG[val]}}>
                    <ScoreChip val={val}/>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManageSpecs({specs,updateSpecs}){
  const [ns,setNs]=useState({label:"",weight:7,description:""});
  const [editing,setEditing]=useState(null);
  return(
    <div style={{maxWidth:700}}>
      <div style={{background:"white",borderRadius:14,border:"1px solid #e8e8e8",overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"13px 18px",background:"#fafafa",borderBottom:"1px solid #f0f0f0",fontWeight:600,fontSize:13}}>Add specification</div>
        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:10}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>LABEL</label>
              <input value={ns.label} onChange={e=>setNs({...ns,label:e.target.value})}
                placeholder="e.g. FP <0.5 mP SD @ 1 nM"
                style={{width:"100%",padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:13}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>WEIGHT</label>
              <input type="number" min="1" max="10" value={ns.weight} onChange={e=>setNs({...ns,weight:+e.target.value})}
                style={{width:"100%",padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:13}}/>
            </div>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>DESCRIPTION (optional)</label>
            <input value={ns.description} onChange={e=>setNs({...ns,description:e.target.value})}
              placeholder="Context or source reference"
              style={{width:"100%",padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:13}}/>
          </div>
          <Btn variant="primary" style={{alignSelf:"flex-start"}} onClick={()=>{
            if(!ns.label.trim())return;
            updateSpecs([...specs,{id:uid(),label:ns.label.trim(),weight:ns.weight,description:ns.description.trim()}]);
            setNs({label:"",weight:7,description:""});
          }}>Add specification</Btn>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {specs.map(spec=>(
          <div key={spec.id} style={{background:"white",borderRadius:10,border:"1px solid #e8e8e8",
            padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
            {editing?.id===spec.id?(
              <>
                <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 70px",gap:8}}>
                  <input value={editing.label} onChange={e=>setEditing({...editing,label:e.target.value})}
                    style={{padding:"6px 10px",border:"1px solid #e0e0e0",borderRadius:7,fontSize:13}}/>
                  <input type="number" min="1" max="10" value={editing.weight} onChange={e=>setEditing({...editing,weight:+e.target.value})}
                    style={{padding:"6px 10px",border:"1px solid #e0e0e0",borderRadius:7,fontSize:13}}/>
                  <input value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}
                    placeholder="description" style={{padding:"6px 10px",border:"1px solid #e0e0e0",borderRadius:7,fontSize:12,gridColumn:"span 2"}}/>
                </div>
                <Btn variant="green" style={{padding:"6px 14px",fontSize:12}} onClick={()=>{
                  updateSpecs(specs.map(s=>s.id===spec.id?editing:s)); setEditing(null);
                }}>Save</Btn>
                <Btn style={{padding:"6px 12px",fontSize:12}} onClick={()=>setEditing(null)}>Cancel</Btn>
              </>
            ):(
              <>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,fontSize:13,color:"#222"}}>{spec.label}</div>
                  {spec.description&&<div style={{fontSize:11,color:"#bbb"}}>{spec.description}</div>}
                </div>
                <Pill>×{spec.weight}</Pill>
                <Btn style={{padding:"5px 12px",fontSize:12}} onClick={()=>setEditing({...spec})}>Edit</Btn>
                <Btn variant="danger" style={{padding:"5px 12px",fontSize:12}} onClick={()=>updateSpecs(specs.filter(s=>s.id!==spec.id))}>Remove</Btn>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageInstruments({instruments,specs,updateInstruments,setEditing,setView}){
  const [ni,setNi]=useState({name:"",model:"",url:"",notes:"",distributor:false});
  return(
    <div style={{maxWidth:680}}>
      <div style={{background:"white",borderRadius:14,border:"1px solid #e8e8e8",overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"13px 18px",background:"#fafafa",borderBottom:"1px solid #f0f0f0",fontWeight:600,fontSize:13}}>Add instrument</div>
        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>MANUFACTURER</label>
              <input value={ni.name} onChange={e=>setNi({...ni,name:e.target.value})} placeholder="e.g. Molecular Devices"
                style={{width:"100%",padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:13}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>MODEL</label>
              <input value={ni.model} onChange={e=>setNi({...ni,model:e.target.value})} placeholder="e.g. SpectraMax i3x"
                style={{width:"100%",padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:13}}/>
            </div>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>PRODUCT PAGE URL</label>
            <input value={ni.url} onChange={e=>setNi({...ni,url:e.target.value})} placeholder="https://..."
              style={{width:"100%",padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:13}}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>BID NOTES / NARRATIVE</label>
            <textarea value={ni.notes} onChange={e=>setNi({...ni,notes:e.target.value})} rows={3}
              placeholder="Key strengths, weaknesses, tender strategy..."
              style={{width:"100%",padding:"8px 12px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:13,resize:"vertical"}}/>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={ni.distributor} onChange={e=>setNi({...ni,distributor:e.target.checked})}/>
            <span style={{fontWeight:500}}>We distribute this product</span>
          </label>
          <Btn variant="primary" style={{alignSelf:"flex-start"}} onClick={()=>{
            if(!ni.name.trim()||!ni.model.trim())return;
            const scores={}; specs.forEach(s=>{scores[s.id]=1;});
            updateInstruments([...instruments,{id:uid(),...ni,scores}]);
            setNi({name:"",model:"",url:"",notes:"",distributor:false});
          }}>Add instrument</Btn>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {instruments.map(inst=>(
          <div key={inst.id} style={{background:"white",borderRadius:10,
            border:`1.5px solid ${inst.distributor?"#1F9162":"#e8e8e8"}`,
            padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
            {inst.distributor&&<Pill color="#1F9162" bg="#EDFAF4">★ YOURS</Pill>}
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13,color:"#111"}}>{inst.name}</div>
              <div style={{fontSize:12,color:"#999"}}>{inst.model}</div>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:"#333"}}>{calcScore(inst,specs)}%</div>
            <Btn style={{padding:"5px 14px",fontSize:12}} onClick={()=>{setEditing({...inst,scores:{...inst.scores}});setView("edit");}}>Score</Btn>
            <Btn variant="danger" style={{padding:"5px 12px",fontSize:12}} onClick={()=>updateInstruments(instruments.filter(i=>i.id!==inst.id))}>Remove</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditInstrument({editing,setEditing,instruments,updateInstruments,specs,setView}){
  const [local,setLocal]=useState(editing);
  if(!local) return null;
  return(
    <div style={{maxWidth:720}}>
      <div style={{background:"white",borderRadius:14,border:"1px solid #e8e8e8",overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"14px 18px",background:"#fafafa",borderBottom:"1px solid #f0f0f0",
          display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15,color:"#111"}}>{local.name}</div>
            <div style={{fontSize:12,color:"#999"}}>{local.model}</div>
          </div>
          <div style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:24,color:"#111"}}>{calcScore(local,specs)}%</div>
        </div>
        <div style={{padding:"16px 18px",borderBottom:"1px solid #f0f0f0",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:3}}>MANUFACTURER</label>
              <input value={local.name} onChange={e=>setLocal({...local,name:e.target.value})}
                style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:7,fontSize:13}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:3}}>MODEL</label>
              <input value={local.model} onChange={e=>setLocal({...local,model:e.target.value})}
                style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:7,fontSize:13}}/>
            </div>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:3}}>PRODUCT URL</label>
            <input value={local.url} onChange={e=>setLocal({...local,url:e.target.value})}
              style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:7,fontSize:13}}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#888",marginBottom:3}}>BID NOTES</label>
            <textarea value={local.notes} rows={2} onChange={e=>setLocal({...local,notes:e.target.value})}
              style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:7,fontSize:13,resize:"vertical"}}/>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={local.distributor} onChange={e=>setLocal({...local,distributor:e.target.checked})}/>
            <span style={{fontWeight:500}}>We distribute this product</span>
          </label>
        </div>
        <div style={{padding:"16px 18px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#888",letterSpacing:".06em",marginBottom:12}}>SPEC COMPLIANCE</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {specs.map(spec=>{
              const val=local.scores[spec.id]??1;
              return(
                <div key={spec.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                  borderRadius:8,background:SCORE_BG[val]}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:"#222"}}>{spec.label}</div>
                    {spec.description&&<div style={{fontSize:11,color:"#aaa"}}>{spec.description}</div>}
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    {[0,1,2].map(v=>(
                      <button key={v} onClick={()=>setLocal({...local,scores:{...local.scores,[spec.id]:v}})}
                        style={{padding:"5px 11px",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:12,
                          border:val===v?"2px solid":"1.5px solid #e0e0e0",
                          background:val===v?SCORE_BG[v]:"white",
                          color:val===v?SCORE_COLOR[v]:"#bbb",
                          borderColor:val===v?SCORE_COLOR[v]:"#e0e0e0"}}>
                        {SCORE_ICONS[v]} {v===0?"Fail":v===1?"Partial":"Meets"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="primary" style={{padding:"10px 24px"}} onClick={()=>{
          updateInstruments(instruments.map(i=>i.id===local.id?local:i));
          setView("dashboard");
        }}>Save changes</Btn>
        <Btn onClick={()=>setView("dashboard")}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App(){
  const [specs,setSpecs]=useState(DEFAULT_SPECS);
  const [instruments,setInstruments]=useState(DEFAULT_INSTRUMENTS);
  const [view,setView]=useState("dashboard");
  const [editing,setEditing]=useState(null);
  const [filterDist,setFilterDist]=useState(false);
  const [saved,setSaved]=useState(false);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    loadState().then(st=>{
      if(st){ if(st.specs)setSpecs(st.specs); if(st.instruments)setInstruments(st.instruments); }
      setLoaded(true);
    });
  },[]);

  const persist=useCallback((s,i)=>{
    saveState({specs:s,instruments:i}).then(()=>{setSaved(true);setTimeout(()=>setSaved(false),1500);});
  },[]);

  const updateSpecs=s=>{ setSpecs(s); persist(s,instruments); };
  const updateInstruments=i=>{ setInstruments(i); persist(specs,i); };

  const NAV=[
    {id:"dashboard",label:"Dashboard"},
    {id:"matrix",label:"Compliance Matrix"},
    {id:"specs",label:"Manage Specs"},
    {id:"instruments",label:"Instruments"},
  ];

  if(!loaded) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
      fontFamily:"system-ui,sans-serif",color:"#aaa",fontSize:14}}>Loading platform…</div>
  );

  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",minHeight:"100vh",background:"#f5f5f5"}}>
      {/* Topbar */}
      <div style={{background:"white",borderBottom:"1px solid #e8e8e8",padding:"0 20px",position:"sticky",top:0,zIndex:100,
        display:"flex",alignItems:"stretch",overflowX:"auto"}}>
        <div style={{display:"flex",alignItems:"center",paddingRight:20,marginRight:16,
          borderRight:"1px solid #f0f0f0",flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#111",lineHeight:1.2}}>🔬 Instrument Platform</div>
            <div style={{fontSize:11,color:"#bbb",marginTop:1}}>{instruments.length} instruments · {specs.length} specs</div>
          </div>
        </div>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setView(n.id)} style={{
            padding:"0 14px",border:"none",background:"none",cursor:"pointer",
            fontSize:13,fontWeight:view===n.id?700:400,
            color:view===n.id?"#111":"#999",
            borderBottom:view===n.id?"2.5px solid #111":"2.5px solid transparent",
            whiteSpace:"nowrap",flexShrink:0
          }}>{n.label}</button>
        ))}
        {view==="edit"&&<span style={{padding:"0 14px",display:"flex",alignItems:"center",
          fontSize:13,fontWeight:700,color:"#111",borderBottom:"2.5px solid #111"}}>Edit Scores</span>}
        {saved&&<span style={{marginLeft:"auto",display:"flex",alignItems:"center",
          fontSize:12,color:"#1F9162",fontWeight:600,flexShrink:0,paddingLeft:12}}>✓ Saved</span>}
        <div style={{marginLeft:saved?"0":"auto",display:"flex",alignItems:"center",gap:8,paddingLeft:12,flexShrink:0}}>
          <button onClick={()=>setFilterDist(!filterDist)} style={{
            padding:"5px 12px",border:"1.5px solid",borderColor:filterDist?"#1F9162":"#ddd",
            borderRadius:8,background:filterDist?"#EDFAF4":"white",
            color:filterDist?"#1F9162":"#888",fontWeight:500,fontSize:12,cursor:"pointer"
          }}>{filterDist?"★ Yours":"All"}</button>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"24px 20px",maxWidth:1400,margin:"0 auto"}}>
        {view==="dashboard"&&<Dashboard instruments={instruments} specs={specs} setView={setView}
          setEditing={setEditing} filterDist={filterDist} setFilterDist={setFilterDist}/>}
        {view==="matrix"&&<Matrix instruments={instruments} specs={specs} filterDist={filterDist}/>}
        {view==="specs"&&<ManageSpecs specs={specs} updateSpecs={updateSpecs}/>}
        {view==="instruments"&&<ManageInstruments instruments={instruments} specs={specs}
          updateInstruments={updateInstruments} setEditing={setEditing} setView={setView}/>}
        {view==="edit"&&<EditInstrument editing={editing} setEditing={setEditing}
          instruments={instruments} updateInstruments={updateInstruments} specs={specs} setView={setView}/>}
      </div>
    </div>
  );
}
