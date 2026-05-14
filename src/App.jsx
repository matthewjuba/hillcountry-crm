import { supabase } from './supabase.js';
import { useState, useMemo } from "react";

const B = {
  cream: "#F7F1E6",
  bg: "#F2EAD8",
  bgDeep: "#EDE3CC",
  charcoal: "#1A1612",
  charcoalSoft: "#2C2418",
  s1: "#F5A623",
  s2: "#F08C1A",
  s3: "#E87020",
  s4: "#DC5520",
  s5: "#C73D1A",
  s6: "#B32A12",
  text: "#1A1612",
  textMid: "#6B5540",
  textLight: "#9C8060",
  border: "#DDD0B0",
  card: "#FDFAF3",
  input: "#EEE6D0",
  white: "#FFFFFF",
};

const JOB_TYPES = [
  { id: "residential", label: "Residential", color: B.s1, subcategories: ["Roofing","Painting","Decking","Remodeling","Kitchen Remodel","Bathroom Remodel","Flooring","Siding","Windows & Doors","Landscaping","Fencing","Garage","Basement Finishing","Addition / ADU","Other"] },
  { id: "commercial",  label: "Commercial",  color: B.s3, subcategories: ["Office Buildout","Retail Fit-Out","Roofing","Painting","Flooring","Electrical","Plumbing","HVAC","Signage","Parking Lot","Facade Renovation","Other"] },
  { id: "industrial",  label: "Industrial",  color: B.s5, subcategories: ["Warehouse Build","Equipment Install","Concrete Work","Steel Fabrication","Painting","Roofing","Electrical","Plumbing","Safety Systems","Other"] },
  { id: "consulting",  label: "Consulting",  color: B.s2, subcategories: ["Design Review","Project Management","Feasibility Study","Permitting","Inspection","Cost Estimation","Other"] },
  { id: "maintenance", label: "Maintenance", color: B.s4, subcategories: ["Roofing Repair","Painting Touch-Up","Deck Repair","Plumbing Repair","Electrical Repair","HVAC Service","Gutter Cleaning","Pressure Washing","Pest Control","Other"] },
  { id: "emergency",   label: "Emergency",   color: B.s6, subcategories: ["Water Damage","Fire Damage","Storm Damage","Structural Damage","Burst Pipe","Roof Emergency","Flooding","Other"] },
  { id: "other",       label: "Other",       color: B.textLight, subcategories: ["Other"] },
];

const STATUS_OPTIONS = ["Lead","Active","Completed","On Hold","Cancelled"];
const EMPTY_FORM = { name:"", company:"", email:"", phone:"", jobType:"residential", subcategory:"Roofing", status:"Lead", address:"", notes:"", value:"" };

const fmt = (v) => { const n = parseFloat(v); return isNaN(n) ? "—" : "$" + n.toLocaleString("en-US"); };
const getJT = (id) => JOB_TYPES.find(j => j.id === id) || JOB_TYPES[6];

const STATUS_COLORS = { Lead: B.s1, Active: "#2E7D32", Completed: B.textLight, "On Hold": B.s3, Cancelled: B.s6 };

const StatusDot = ({ status }) => {
  const col = STATUS_COLORS[status] || B.textLight;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.72rem", fontWeight:600, color: col, background: col+"18", padding:"3px 10px 3px 7px", borderRadius:999, border:`1px solid ${col}30` }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:col, display:"inline-block", flexShrink:0 }} />
      {status}
    </span>
  );
};

const Tag = ({ label, color, light }) => (
  <span style={{ fontSize:"0.7rem", fontWeight:600, color: light ? B.textMid : color, background: light ? B.bgDeep : color+"18", padding:"3px 9px", borderRadius:6, border:`1px solid ${light ? B.border : color+"33"}`, letterSpacing:"0.01em" }}>
    {label}
  </span>
);

const inp = { background:B.input, border:`1.5px solid ${B.border}`, borderRadius:10, color:B.text, padding:"10px 13px", fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit", resize:"vertical", transition:"border-color 0.15s" };
const ghostBtn = { background:"transparent", border:`1.5px solid ${B.border}`, color:B.textMid, padding:"9px 18px", borderRadius:10, cursor:"pointer", fontSize:"0.85rem", fontWeight:600, fontFamily:"inherit" };
const pillStyle = (active, color) => ({ background: active ? color+"20" : "transparent", border:`1.5px solid ${active ? color : B.border}`, color: active ? color : B.textLight, padding:"5px 13px", borderRadius:999, cursor:"pointer", fontSize:"0.75rem", fontWeight: active ? 700 : 500, transition:"all 0.12s", whiteSpace:"nowrap", fontFamily:"inherit" });
const primaryBtn = { background:`linear-gradient(135deg, ${B.s1} 0%, ${B.s5} 100%)`, border:"none", color:"#fff", padding:"11px 20px", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:"0.9rem", fontFamily:"inherit", letterSpacing:"0.01em", boxShadow:`0 4px 14px ${B.s3}44` };

export default function CRM() {
  const [clients, setClients] = useState([
    { id:1, name:"Sarah Mitchell", company:"Mitchell Homes", email:"sarah@mitchellhomes.com", phone:"555-0101", jobType:"residential", subcategory:"Kitchen Remodel", status:"Active", address:"142 Oak Lane, Boerne TX", notes:"Full kitchen remodel, modern finish.", value:"18500" },
    { id:2, name:"Derek Osei", company:"Osei Logistics", email:"d.osei@oseilog.com", phone:"555-0234", jobType:"commercial", subcategory:"Roofing", status:"Lead", address:"500 Industrial Blvd, San Antonio TX", notes:"Full commercial roof replacement.", value:"92000" },
    { id:3, name:"Tanya Rivera", company:"", email:"tanyar@email.com", phone:"555-0378", jobType:"emergency", subcategory:"Storm Damage", status:"Completed", address:"77 Elm St, Kerrville TX", notes:"Storm damage, resolved quickly.", value:"3200" },
    { id:4, name:"Marcus Webb", company:"Webb Properties", email:"mwebb@webbprop.com", phone:"555-0412", jobType:"residential", subcategory:"Roofing", status:"Lead", address:"88 Pinecrest Dr, Fredericksburg TX", notes:"Full shingle replacement, 2400 sqft.", value:"14800" },
  ]);

  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editMode, setEditMode] = useState(false);
  const [filterJob, setFilterJob] = useState("all");
  const [filterSub, setFilterSub] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [nextId, setNextId] = useState(5);

  const setJobType = (id) => { const jt = getJT(id); setForm(f => ({ ...f, jobType:id, subcategory:jt.subcategories[0] })); };

  const filtered = useMemo(() => clients.filter(c => {
    if (filterJob !== "all" && c.jobType !== filterJob) return false;
    if (filterSub !== "all" && c.subcategory !== filterSub) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search) { const q = search.toLowerCase(); return [c.name,c.company,c.email,c.subcategory].some(s=>(s||"").toLowerCase().includes(q)); }
    return true;
  }).sort((a,b) => {
    if (sortBy==="name") return a.name.localeCompare(b.name);
    if (sortBy==="value") return parseFloat(b.value||0)-parseFloat(a.value||0);
    if (sortBy==="status") return a.status.localeCompare(b.status);
    return 0;
  }), [clients,filterJob,filterSub,filterStatus,search,sortBy]);

  const totalValue = useMemo(() => clients.reduce((s,c) => s+(parseFloat(c.value)||0),0), [clients]);
  const openAdd = () => { setForm(EMPTY_FORM); setEditMode(false); setView("add"); };
  const openDetail = (c) => { setSelected(c); setView("detail"); };
  const openEdit = (c) => { setForm({...c}); setEditMode(true); setView("add"); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editMode) { setClients(prev => prev.map(c => c.id===form.id ? {...form} : c)); setSelected({...form}); setView("detail"); }
    else { setClients(prev => [...prev, {...form, id:nextId}]); setNextId(n=>n+1); setView("list"); }
  };
  const del = (id) => { setClients(prev => prev.filter(c=>c.id!==id)); setView("list"); setSelected(null); };

  const Sel = ({label,name,options,onChange}) => (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.1em",color:B.textLight,textTransform:"uppercase"}}>{label}</label>
      <select value={form[name]} onChange={e => onChange ? onChange(e.target.value) : setForm(f=>({...f,[name]:e.target.value}))} style={inp}>
        {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  );
  const Inp = ({label,name,type="text",multiline}) => (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.1em",color:B.textLight,textTransform:"uppercase"}}>{label}</label>
      {multiline ? <textarea rows={3} value={form[name]} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} style={inp} />
                 : <input type={type} value={form[name]} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} style={inp} />}
    </div>
  );
  const formJT = getJT(form.jobType);

  return (
    <div style={{ minHeight:"100vh", background:B.bg, color:B.text, fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>

      {/* ── HEADER ── */}
      <header style={{ background:B.charcoal, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px #0000002a" }}>
        {/* Thin sunset accent */}
        <div style={{ height:3, background:`linear-gradient(90deg,${B.s1},${B.s2},${B.s3},${B.s4},${B.s5},${B.s6})` }} />
        <div style={{ padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Logo mark */}
            <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg,${B.s1},${B.s5})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", boxShadow:`0 2px 8px ${B.s3}55` }}>
              🏠
            </div>
            <div style={{ display:"flex", flexDirection:"column", lineHeight:1.2 }}>
              <span style={{ fontWeight:800, fontSize:"0.95rem", letterSpacing:"-0.01em", color:B.cream }}>Hill Country Repair Co.</span>
              <span style={{ fontSize:"0.65rem", color:B.textLight, letterSpacing:"0.08em", fontWeight:500 }}>CLIENT MANAGER</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {view !== "list" && <button onClick={() => setView("list")} style={{ ...ghostBtn, color:B.cream, borderColor:"#ffffff25", padding:"7px 14px" }}>← Back</button>}
            <button onClick={openAdd} style={{ ...primaryBtn, padding:"8px 16px", fontSize:"0.82rem" }}>+ New Client</button>
          </div>
        </div>
      </header>

      <div style={{ flex:1, maxWidth:1080, width:"100%", margin:"0 auto", padding:"24px 16px", boxSizing:"border-box" }}>

        {/* ── LIST ── */}
        {view === "list" && <>

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:24 }}>
            {[
              { label:"Clients", val:clients.length, accent:B.charcoal },
              { label:"Active", val:clients.filter(c=>c.status==="Active").length, accent:"#2E7D32" },
              { label:"Leads", val:clients.filter(c=>c.status==="Lead").length, accent:B.s2 },
              { label:"Pipeline", val:fmt(totalValue), accent:B.s4 },
            ].map(s => (
              <div key={s.label} style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:14, padding:"16px 14px", boxShadow:"0 1px 6px #0000000a", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:s.accent, borderRadius:"14px 14px 0 0" }} />
                <div style={{ fontSize:"1.6rem", fontWeight:800, color:s.accent, letterSpacing:"-0.04em", marginTop:4 }}>{s.val}</div>
                <div style={{ fontSize:"0.68rem", color:B.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
            <div style={{ flex:"1 1 200px", minWidth:140, position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:"0.9rem", opacity:0.4, pointerEvents:"none" }}>🔍</span>
              <input placeholder="Search clients..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ ...inp, paddingLeft:34 }} />
            </div>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ ...inp, flex:"0 0 auto", width:"auto" }}>
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ ...inp, flex:"0 0 auto", width:"auto" }}>
              <option value="name">Name A–Z</option>
              <option value="value">Value ↓</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* Job type filter tabs */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            <button onClick={()=>{setFilterJob("all");setFilterSub("all");}} style={pillStyle(filterJob==="all", B.s3)}>All Types</button>
            {JOB_TYPES.map(j => (
              <button key={j.id} onClick={()=>{setFilterJob(j.id);setFilterSub("all");}} style={pillStyle(filterJob===j.id, j.color)}>
                {j.label} <span style={{opacity:0.45,fontSize:"0.8em"}}>({clients.filter(c=>c.jobType===j.id).length})</span>
              </button>
            ))}
          </div>

          {/* Subcategory filter — slides in when job type selected */}
          {filterJob !== "all" && (() => {
            const jt = getJT(filterJob);
            return (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:16, padding:"10px 12px", background:B.card, borderRadius:12, border:`1px solid ${B.border}`, borderLeft:`3px solid ${jt.color}` }}>
                <button onClick={()=>setFilterSub("all")} style={pillStyle(filterSub==="all", jt.color)}>All</button>
                {jt.subcategories.map(sub => {
                  const cnt = clients.filter(c=>c.jobType===filterJob && c.subcategory===sub).length;
                  return (
                    <button key={sub} onClick={()=>setFilterSub(sub)} style={pillStyle(filterSub===sub, jt.color)}>
                      {sub}{cnt>0 && <span style={{opacity:0.45,fontSize:"0.8em",marginLeft:3}}>({cnt})</span>}
                    </button>
                  );
                })}
              </div>
            );
          })()}
          {filterJob === "all" && <div style={{marginBottom:16}} />}

          {/* Client grid */}
          {filtered.length === 0
            ? <div style={{ textAlign:"center", padding:"64px 20px", color:B.textLight }}>
                <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📋</div>
                <div style={{ fontWeight:700, fontSize:"1rem" }}>No clients match your filters</div>
                <div style={{ fontSize:"0.85rem", marginTop:6 }}>Try adjusting your search or add a new client</div>
              </div>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:12 }}>
                {filtered.map(c => {
                  const jt = getJT(c.jobType);
                  return (
                    <div key={c.id} onClick={()=>openDetail(c)}
                      style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.18s", boxShadow:"0 1px 4px #00000008" }}
                      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${jt.color}28`; e.currentTarget.style.borderColor=jt.color+"55"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 1px 4px #00000008"; e.currentTarget.style.borderColor=B.border; }}
                    >
                      {/* Colored top stripe */}
                      <div style={{ height:3, background:jt.color }} />
                      <div style={{ padding:"14px 15px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:"0.97rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                            {c.company && <div style={{ fontSize:"0.76rem", color:B.textMid, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.company}</div>}
                          </div>
                          <StatusDot status={c.status} />
                        </div>

                        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:10, alignItems:"center" }}>
                          <Tag label={jt.label} color={jt.color} />
                          {c.subcategory && <Tag label={c.subcategory} light />}
                          {c.value && <span style={{ marginLeft:"auto", fontSize:"0.82rem", fontWeight:800, color:B.s4 }}>{fmt(c.value)}</span>}
                        </div>

                        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${B.border}`, display:"flex", flexDirection:"column", gap:3 }}>
                          {c.email && <div style={{ fontSize:"0.73rem", color:B.textLight, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>✉ {c.email}</div>}
                          {c.phone && <div style={{ fontSize:"0.73rem", color:B.textLight }}>📞 {c.phone}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </>}

        {/* ── ADD / EDIT ── */}
        {view === "add" && (
          <div style={{ maxWidth:620, margin:"0 auto" }}>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontWeight:800, fontSize:"1.3rem", margin:0, letterSpacing:"-0.02em" }}>{editMode ? "Edit Client" : "New Client"}</h2>
              <p style={{ margin:"4px 0 0", fontSize:"0.82rem", color:B.textLight }}>Fill in the details below to {editMode ? "update the" : "add a new"} client record.</p>
            </div>

            <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:16, padding:"22px 20px", boxShadow:"0 2px 16px #0000000c", display:"flex", flexDirection:"column", gap:14 }}>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{gridColumn:"1/-1"}}><Inp label="Full Name *" name="name" /></div>
                <Inp label="Company" name="company" />
                <Inp label="Job Value ($)" name="value" type="number" />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Inp label="Email" name="email" type="email" />
                <Inp label="Phone" name="phone" />
              </div>

              {/* Job type + subcategory section */}
              <div style={{ background:B.bg, borderRadius:12, padding:"14px", border:`1px solid ${B.border}`, display:"flex", flexDirection:"column", gap:12 }}>
                <Sel label="Job Type" name="jobType" options={JOB_TYPES.map(j=>({value:j.id,label:j.label}))} onChange={setJobType} />
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  <label style={{ fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", color:B.textLight, textTransform:"uppercase" }}>Subcategory</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {formJT.subcategories.map(sub => {
                      const active = form.subcategory === sub;
                      return (
                        <button key={sub} onClick={()=>setForm(f=>({...f,subcategory:sub}))}
                          style={{ background: active ? formJT.color+"20" : B.card, border:`1.5px solid ${active ? formJT.color : B.border}`, color: active ? formJT.color : B.textMid, padding:"5px 12px", borderRadius:8, cursor:"pointer", fontSize:"0.78rem", fontWeight: active ? 700 : 500, transition:"all 0.12s", fontFamily:"inherit" }}>
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Sel label="Status" name="status" options={STATUS_OPTIONS} />
              <Inp label="Address" name="address" />
              <Inp label="Notes" name="notes" multiline />

              <div style={{ display:"flex", gap:10, paddingTop:4 }}>
                <button onClick={()=>setView(editMode?"detail":"list")} style={ghostBtn}>Cancel</button>
                <button onClick={save} style={{ ...primaryBtn, flex:1 }}>{editMode ? "Save Changes" : "Add Client"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL ── */}
        {view === "detail" && selected && (() => {
          const c = clients.find(cl=>cl.id===selected.id) || selected;
          const jt = getJT(c.jobType);
          return (
            <div style={{ maxWidth:600, margin:"0 auto" }}>
              <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:16, overflow:"hidden", boxShadow:"0 2px 16px #0000000c" }}>
                {/* Gradient header banner */}
                <div style={{ background:`linear-gradient(135deg, ${jt.color}22, ${jt.color}08)`, borderBottom:`1px solid ${jt.color}33`, padding:"20px 22px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                    <div>
                      <h2 style={{ fontWeight:800, fontSize:"1.4rem", margin:0, letterSpacing:"-0.02em" }}>{c.name}</h2>
                      {c.company && <div style={{ color:B.textMid, fontWeight:500, marginTop:4, fontSize:"0.88rem" }}>{c.company}</div>}
                    </div>
                    <StatusDot status={c.status} />
                  </div>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:12 }}>
                    <Tag label={jt.label} color={jt.color} />
                    {c.subcategory && <Tag label={c.subcategory} light />}
                  </div>
                </div>

                <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>
                  {/* Value callout */}
                  {c.value && (
                    <div style={{ background:B.charcoal, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:"0.7rem", color:B.textLight, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Job Value</span>
                      <span style={{ fontSize:"1.8rem", fontWeight:800, color:B.s1, letterSpacing:"-0.04em" }}>{fmt(c.value)}</span>
                    </div>
                  )}

                  {/* Contact grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[{icon:"✉",label:"Email",val:c.email},{icon:"📞",label:"Phone",val:c.phone},{icon:"📍",label:"Address",val:c.address}]
                      .filter(r=>r.val).map(r => (
                        <div key={r.label} style={{ gridColumn:r.label==="Address"?"1/-1":undefined, background:B.bg, borderRadius:10, padding:"11px 14px", border:`1px solid ${B.border}` }}>
                          <div style={{ fontSize:"0.64rem", color:B.textLight, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{r.icon} {r.label}</div>
                          <div style={{ fontSize:"0.87rem", color:B.text, fontWeight:500 }}>{r.val}</div>
                        </div>
                      ))}
                  </div>

                  {/* Notes */}
                  {c.notes && (
                    <div style={{ background:B.bg, borderRadius:10, padding:"12px 14px", border:`1px solid ${B.border}` }}>
                      <div style={{ fontSize:"0.64rem", color:B.textLight, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>📝 Notes</div>
                      <div style={{ fontSize:"0.87rem", color:B.textMid, lineHeight:1.65 }}>{c.notes}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:"flex", gap:10, paddingTop:4 }}>
                    <button onClick={()=>del(c.id)} style={{ ...ghostBtn, color:B.s6, borderColor:B.s6+"44" }}>Delete</button>
                    <button onClick={()=>openEdit(c)} style={{ ...primaryBtn, flex:1 }}>Edit Client</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
