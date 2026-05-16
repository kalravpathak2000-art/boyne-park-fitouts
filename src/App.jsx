import { useState, useEffect, useCallback } from "react";
import { db, storage } from "./firebase";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

const MANAGER_PIN = "1234";
const COMPANY     = "Boyne Park Fitouts";
const TRADES      = ["Fixer","Taper","Plasterer","Painter","Labourer","Other"];
const SITES       = ["Mastercrad","Frame","UCD","BOA","Other"];
const BRAND       = "#1A3A5C";
const BRAND2      = "#F0A500";
const BRAND_DARK  = "#112742";

function todayStr() { return new Date().toISOString().split("T")[0]; }

function formatDate(d) {
  if (!d) return "";
  const [y,m,day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh,sm] = start.split(":").map(Number);
  const [eh,em] = end.split(":").map(Number);
  const diff = (eh*60+em) - (sh*60+sm);
  return diff > 0 ? Math.round(diff/60*10)/10 : 0;
}

const STATUS_CONFIG = {
  pending:  { label:"PENDING",  bg:"#FFF8E1", color:"#7A5000", dot:"#F0A500" },
  approved: { label:"APPROVED", bg:"#E8F5E9", color:"#1B5E20", dot:"#43A047" },
  queried:  { label:"QUERIED",  bg:"#FFEBEE", color:"#B71C1C", dot:"#E53935" },
};

// ── Firebase helpers ────────────────────────────────────────────────────────
async function loadRecords() {
  try {
    const q    = query(collection(db,"daywork"), orderBy("submittedAt","desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });
  } catch(e) { console.error(e); return []; }
}

async function addRecord(record) {
  const docRef = await addDoc(collection(db,"daywork"), {
    ...record,
    photos: [],
    submittedAt: serverTimestamp(),
  });

  if (!record.photos || record.photos.length === 0) return;

  const urls = await Promise.all(record.photos.map(async (photo, index) => {
    const match = photo.match(/^data:(image\/[^;]+);base64,/);
    const mimeType = match ? match[1] : "image/jpeg";
    const ext = mimeType.split("/")[1] || "jpg";
    const fileRef = ref(storage, `daywork/${docRef.id}/${Date.now()}_${index}.${ext}`);
    await uploadString(fileRef, photo, "data_url");
    return await getDownloadURL(fileRef);
  }));

  await updateDoc(docRef, { photos: urls });
}

async function updateRecord(id, updates) {
  await updateDoc(doc(db,"daywork",id), updates);
}

// ── Shared styles ───────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight:"100vh", background:"#F4F6F9",
    fontFamily:"'Segoe UI','Helvetica Neue',sans-serif", color:"#1C1C1E",
  },
  card: {
    background:"#fff", borderRadius:16,
    boxShadow:"0 2px 12px rgba(0,0,0,0.07)", padding:20, marginBottom:14,
  },
  label: {
    fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:"#6B7280",
    marginBottom:6, display:"block", textTransform:"uppercase",
  },
  input: {
    width:"100%", padding:"13px 14px", border:"2px solid #E5E7EB",
    borderRadius:10, fontSize:15, fontFamily:"inherit", color:"#1C1C1E",
    background:"#fff", boxSizing:"border-box", outline:"none",
    transition:"border-color 0.2s", appearance:"none",
  },
  btn: (primary) => ({
    width:"100%", padding:"15px 20px", border:"none", borderRadius:12,
    fontSize:15, fontWeight:700, cursor:"pointer",
    background: primary ? BRAND2 : BRAND,
    color: primary ? BRAND_DARK : "#fff",
  }),
  tag: (status) => ({
    display:"inline-flex", alignItems:"center", gap:5,
    padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
    letterSpacing:"0.08em",
    background:STATUS_CONFIG[status].bg, color:STATUS_CONFIG[status].color,
  }),
};

// ── Components ──────────────────────────────────────────────────────────────
function LogoMark({ size=38 }) {
  return (
    <div style={{
      width:size, height:size, background:BRAND2, borderRadius:size*0.28,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:900, fontSize:size*0.45, color:BRAND_DARK,
      letterSpacing:"-1px", flexShrink:0,
    }}>BP</div>
  );
}

function Header({ subtitle, onBack, dark }) {
  return (
    <div style={{ background: dark ? BRAND_DARK : BRAND, padding:"20px 20px 18px" }}>
      {onBack && (
        <button onClick={onBack} style={{
          background:"none", border:"none", color:"rgba(255,255,255,0.7)",
          fontSize:13, cursor:"pointer", marginBottom:12, padding:0, fontFamily:"inherit",
        }}>← Back</button>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <LogoMark size={40} />
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:"#fff", lineHeight:1.1 }}>{COMPANY}</div>
          {subtitle && <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LANDING
// ══════════════════════════════════════════════════════════════════════════
function Landing({ onRole }) {
  const roles = [
    { icon:"🔨", label:"Fixer",     desc:"Log your hours & work done" },
    { icon:"🖊️", label:"Taper",     desc:"Log your hours & work done" },
    { icon:"🪣", label:"Plasterer", desc:"Log your hours & work done" },
    { icon:"🎨", label:"Painter",   desc:"Log your hours & work done" },
    { icon:"🦺", label:"Labourer",  desc:"Log your hours & work done" },
    { icon:"🔧", label:"Other",     desc:"Any other trade on site"    },
  ];

  return (
    <div style={S.page}>
      <div style={{ background:BRAND, padding:"28px 24px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
          <LogoMark size={52} />
          <div>
            <div style={{ fontSize:22, fontWeight:900, color:"#fff", lineHeight:1.1 }}>{COMPANY}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginTop:3, letterSpacing:"0.04em" }}>Daywork Recording System</div>
          </div>
        </div>
        <div style={{ height:2, background:BRAND2, borderRadius:2, width:48 }} />
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.7)", marginTop:14 }}>Select your trade to begin</div>
      </div>
      <div style={{ padding:"20px 20px 40px", maxWidth:480, margin:"0 auto", boxSizing:"border-box" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", marginBottom:10 }}>YOUR TRADE</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
          {roles.map(({ icon, label, desc }) => (
            <button key={label} onClick={() => onRole("worker", label)}
              style={{
                display:"flex", alignItems:"center", gap:14, padding:"16px 18px",
                background:"#fff", border:"2px solid #E5E7EB", borderRadius:14,
                cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                transition:"border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=BRAND2; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#E5E7EB"; }}
            >
              <div style={{ fontSize:26, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", background:"#F4F6F9", borderRadius:10 }}>{icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15, color:"#1C1C1E" }}>{label}</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{desc}</div>
              </div>
              <div style={{ color:"#D1D5DB", fontSize:20 }}>›</div>
            </button>
          ))}
        </div>
        <div style={{ height:1, background:"#E5E7EB", margin:"4px 0 18px" }} />
        <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", marginBottom:10 }}>MANAGEMENT</div>
        <button onClick={() => onRole("manager")}
          style={{
            display:"flex", alignItems:"center", gap:14, padding:"16px 18px",
            background:BRAND, border:"2px solid transparent", borderRadius:14,
            cursor:"pointer", fontFamily:"inherit", textAlign:"left", width:"100%",
          }}
        >
          <div style={{ fontSize:26, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.1)", borderRadius:10 }}>📋</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#fff" }}>Manager / Foreman</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginTop:2 }}>Review & approve daywork records</div>
          </div>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:20 }}>›</div>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// WORKER FORM
// ══════════════════════════════════════════════════════════════════════════
function WorkerForm({ defaultTrade, onBack }) {
  const [form, setForm] = useState({
    workerName:"", trade:defaultTrade, site:"Site 1", date:todayStr(),
    startTime:"07:00", endTime:"16:00", area:"", description:"", materials:"",
  });
  const [photos,  setPhotos]  = useState([]);   // array of base64 data URLs
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");
  const [focus,   setFocus]   = useState(null);

  const hours = calcHours(form.startTime, form.endTime);
  const set   = (k,v) => setForm(f => ({ ...f, [k]:v }));

  // ── Photo helpers ──
  const addPhotos = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      setPhotos(prev => {
        if (prev.length >= 3) return prev;
        return prev; // will be updated by reader below
      });
      const reader = new FileReader();
      reader.onload = ev => {
        setPhotos(prev => {
          if (prev.length >= 3) return prev;
          return [...prev, ev.target.result];
        });
      };
      reader.readAsDataURL(file);
    });
    // reset input so same file can be re-selected after removal
    e.target.value = "";
  };

  const removePhoto = (i) => setPhotos(p => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.workerName || !form.description) return;
    setSaving(true); setError("");
    try {
      await addRecord({ ...form, hoursWorked:hours, status:"pending", managerNote:"", photos });
      setDone(true);
    } catch(e) {
      console.error("Submit error:", e);
      setError(`Failed to submit: ${e?.message || e}. Check your internet connection and try again.`);
    } finally { setSaving(false); }
  };

  if (done) return (
    <div style={{ ...S.page, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
      <LogoMark size={56} />
      <div style={{ fontSize:52, margin:"16px 0 8px" }}>✅</div>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>Record Submitted!</div>
      <div style={{ color:"#6B7280", fontSize:14, marginBottom:32 }}>Daywork for {formatDate(form.date)} has been saved.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:300 }}>
        <button style={S.btn(true)} onClick={() => { setDone(false); set("description",""); set("materials",""); setPhotos([]); }}>
          Submit Another
        </button>
        <button style={{ ...S.btn(false), background:"transparent", color:BRAND, border:"2px solid "+BRAND }} onClick={onBack}>
          Back to Home
        </button>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <Header subtitle={`${form.trade} · Daywork Record`} onBack={onBack} />
      <div style={{ padding:"20px 20px 40px", maxWidth:520, margin:"0 auto", boxSizing:"border-box" }}>

        {/* Hours summary card */}
        <div style={{ ...S.card, background:hours>0?BRAND:"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:13, fontWeight:600, color:hours>0?"rgba(255,255,255,0.75)":"#9CA3AF" }}>Hours Today</div>
          <div style={{ fontSize:30, fontWeight:900, color:hours>0?BRAND2:"#D1D5DB" }}>{hours}h</div>
        </div>

        {/* Name + Trade */}
        <div style={S.card}>
          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Your Name *</label>
            <input style={{ ...S.input, borderColor:focus==="name"?BRAND:"#E5E7EB" }}
              placeholder="e.g. John Smith" value={form.workerName}
              onChange={e => set("workerName",e.target.value)}
              onFocus={() => setFocus("name")} onBlur={() => setFocus(null)} />
          </div>
          <div>
            <label style={S.label}>Trade</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {TRADES.map(t => (
                <button key={t} onClick={() => set("trade",t)} style={{
                  padding:"8px 14px", border:`2px solid ${form.trade===t?BRAND:"#E5E7EB"}`,
                  borderRadius:8, background:form.trade===t?BRAND:"#fff",
                  color:form.trade===t?"#fff":"#6B7280",
                  fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit",
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop:16 }}>
            <label style={S.label}>Site *</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {SITES.map(s => (
                <button key={s} onClick={() => set("site",s)} style={{
                  padding:"8px 14px", border:`2px solid ${form.site===s?BRAND2:"#E5E7EB"}`,
                  borderRadius:8, background:form.site===s?BRAND2:"#fff",
                  color:form.site===s?BRAND_DARK:"#6B7280",
                  fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit",
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Date + Times */}
        <div style={S.card}>
          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Date</label>
            <input type="date" style={{ ...S.input, borderColor:focus==="date"?BRAND:"#E5E7EB" }}
              value={form.date} onChange={e => set("date",e.target.value)}
              onFocus={() => setFocus("date")} onBlur={() => setFocus(null)} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[["start","Start Time","startTime"],["end","End Time","endTime"]].map(([fk,lbl,key]) => (
              <div key={fk}>
                <label style={S.label}>{lbl}</label>
                <input type="time" style={{ ...S.input, borderColor:focus===fk?BRAND:"#E5E7EB" }}
                  value={form[key]} onChange={e => set(key,e.target.value)}
                  onFocus={() => setFocus(fk)} onBlur={() => setFocus(null)} />
              </div>
            ))}
          </div>
        </div>

        {/* Work details */}
        <div style={S.card}>
          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Area / Location on Site</label>
            <input style={{ ...S.input, borderColor:focus==="area"?BRAND:"#E5E7EB" }}
              placeholder="e.g. Level 2, Flat 14, Kitchen" value={form.area}
              onChange={e => set("area",e.target.value)}
              onFocus={() => setFocus("area")} onBlur={() => setFocus(null)} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Description of Work *</label>
            <textarea style={{ ...S.input, borderColor:focus==="desc"?BRAND:"#E5E7EB", minHeight:100, resize:"vertical" }}
              placeholder="Describe what you did today..." value={form.description}
              onChange={e => set("description",e.target.value)}
              onFocus={() => setFocus("desc")} onBlur={() => setFocus(null)} />
          </div>
          <div>
            <label style={S.label}>Materials Used (optional)</label>
            <input style={{ ...S.input, borderColor:focus==="mat"?BRAND:"#E5E7EB" }}
              placeholder="e.g. 4 bags bonding, 2 sheets board" value={form.materials}
              onChange={e => set("materials",e.target.value)}
              onFocus={() => setFocus("mat")} onBlur={() => setFocus(null)} />
          </div>
        </div>

        {/* Photo upload */}
        <div style={S.card}>
          <label style={S.label}>Site Photos (up to 3, optional)</label>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {photos.map((src, i) => (
              <div key={i} style={{ position:"relative", width:90, height:90, flexShrink:0 }}>
                <img
                  src={src}
                  alt={`Site photo ${i+1}`}
                  style={{ width:90, height:90, objectFit:"cover", borderRadius:10, border:"2px solid #E5E7EB", display:"block" }}
                />
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    position:"absolute", top:-7, right:-7,
                    width:22, height:22, borderRadius:"50%",
                    border:"2px solid #fff", background:"#E53935",
                    color:"#fff", fontSize:13, fontWeight:900,
                    cursor:"pointer", lineHeight:1,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    padding:0, boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
                  }}
                  aria-label="Remove photo"
                >×</button>
              </div>
            ))}

            {photos.length < 3 && (
              <label style={{
                width:90, height:90, border:"2px dashed #D1D5DB", borderRadius:10,
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", cursor:"pointer", color:"#9CA3AF",
                fontSize:11, fontWeight:700, gap:6, flexShrink:0,
                background:"#FAFAFA", letterSpacing:"0.04em",
              }}>
                <span style={{ fontSize:26, lineHeight:1 }}>📷</span>
                Add Photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display:"none" }}
                  onChange={addPhotos}
                />
              </label>
            )}
          </div>
          {photos.length > 0 && (
            <div style={{ fontSize:11, color:"#9CA3AF", marginTop:10 }}>
              {photos.length}/3 photo{photos.length !== 1 ? "s" : ""} added
            </div>
          )}
        </div>

        {error && (
          <div style={{ background:"#FFEBEE", color:"#B71C1C", borderRadius:10, padding:"12px 16px", marginBottom:14, fontSize:13 }}>
            {error}
          </div>
        )}

        <button
          style={{ ...S.btn(true), opacity:(!form.workerName||!form.description||saving)?0.5:1 }}
          onClick={submit}
          disabled={!form.workerName||!form.description||saving}
        >
          {saving ? "Submitting…" : "Submit Daywork Record"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MANAGER PIN
// ══════════════════════════════════════════════════════════════════════════
function ManagerPin({ onUnlock, onBack }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const check = (p) => {
    if (p === MANAGER_PIN) onUnlock();
    else { setErr(true); setPin(""); setTimeout(() => setErr(false), 1400); }
  };

  const press = (k) => {
    if (k==="⌫") { setPin(p => p.slice(0,-1)); return; }
    if (k===""||pin.length>=4) return;
    const np = pin+k;
    setPin(np);
    if (np.length===4) setTimeout(() => check(np), 120);
  };

  return (
    <div style={S.page}>
      <Header subtitle="Manager Access" onBack={onBack} dark />
      <div style={{ padding:32, display:"flex", flexDirection:"column", alignItems:"center", gap:24 }}>
        <div style={{ fontSize:48, letterSpacing:"0.3em", fontWeight:900, color:err?"#E53935":BRAND }}>
          {"●".repeat(pin.length).padEnd(4,"○")}
        </div>
        {err && <div style={{ color:"#E53935", fontSize:13, fontWeight:700 }}>Incorrect PIN</div>}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, width:"100%", maxWidth:280 }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i) => (
            <button key={i} onClick={() => press(k===""?"":String(k))} style={{
              padding:"18px 0", border:`2px solid ${k===""?"transparent":"#E5E7EB"}`,
              borderRadius:12, background:k===""?"transparent":"#fff",
              fontSize:k==="⌫"?18:22, fontWeight:700,
              cursor:k===""?"default":"pointer",
              boxShadow:k!==""&&k!=="⌫"?"0 1px 4px rgba(0,0,0,0.06)":"none",
              fontFamily:"inherit", color:BRAND,
            }}>{k}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
function ManagerDashboard({ onBack }) {
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [noteText,   setNoteText]   = useState("");
  const [lightbox,   setLightbox]   = useState(null); // src string for full-screen photo

  const refresh = useCallback(async () => {
    const r = await loadRecords(); setRecords(r); setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const updateStatus = async (id, status, note) => {
    const updates = { status };
    if (note !== undefined) updates.managerNote = note;
    await updateRecord(id, updates);
    setRecords(r => r.map(rec => rec.id===id ? { ...rec, ...updates } : rec));
    setSelectedId(null);
  };

  const totals = records.reduce((a,r) => {
    a.hours += r.hoursWorked||0; a[r.status] = (a[r.status]||0)+1; return a;
  }, { hours:0, pending:0, approved:0, queried:0 });

  const filtered = filter==="all" ? records : records.filter(r => r.status===filter);
  const selected = records.find(r => r.id===selectedId);

  if (loading) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, color:"#6B7280" }}>
      Loading records…
    </div>
  );

  // ── Lightbox ──
  if (lightbox) return (
    <div
      onClick={() => setLightbox(null)}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.92)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:1000, cursor:"zoom-out", padding:20,
      }}
    >
      <img
        src={lightbox}
        alt="Site photo full size"
        style={{ maxWidth:"100%", maxHeight:"100%", borderRadius:12, objectFit:"contain" }}
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={() => setLightbox(null)}
        style={{
          position:"absolute", top:16, right:16,
          background:"rgba(255,255,255,0.15)", border:"none",
          color:"#fff", borderRadius:"50%", width:40, height:40,
          fontSize:22, cursor:"pointer", display:"flex",
          alignItems:"center", justifyContent:"center",
        }}
      >×</button>
    </div>
  );

  // ── Detail view ──
  if (selected) return (
    <div style={S.page}>
      <div style={{ background:BRAND_DARK, padding:"20px 20px 18px" }}>
        <button onClick={() => setSelectedId(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.7)", fontSize:13, cursor:"pointer", marginBottom:12, padding:0, fontFamily:"inherit" }}>← Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <LogoMark size={40} />
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", letterSpacing:"0.1em" }}>DAYWORK RECORD</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{selected.workerName}</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"20px 20px 40px", maxWidth:520, margin:"0 auto", boxSizing:"border-box" }}>
        <div style={{ ...S.card, background:BRAND, display:"flex", justifyContent:"space-around" }}>
          {[["Hours",`${selected.hoursWorked}h`],["Start",selected.startTime],["End",selected.endTime],["Date",formatDate(selected.date)]].map(([l,v]) => (
            <div key={l} style={{ textAlign:"center", padding:"4px 12px" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:24, fontWeight:900, color:BRAND2 }}>{v}</div>
            </div>
          ))}
        </div>

        {[["🏢 Site", selected.site||"Not specified"],["📍 Area / Location", selected.area||"Not specified"],["📝 Work Description", selected.description],selected.materials&&["🧱 Materials Used", selected.materials]].filter(Boolean).map(([l,v]) => (
          <div key={l} style={S.card}>
            <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:14, lineHeight:1.6 }}>{v}</div>
          </div>
        ))}

        {/* Site photos */}
        {selected.photos?.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", marginBottom:12 }}>📷 SITE PHOTOS</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {selected.photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Site photo ${i+1}`}
                  onClick={() => setLightbox(src)}
                  style={{
                    width:100, height:100, objectFit:"cover",
                    borderRadius:10, border:"2px solid #E5E7EB",
                    cursor:"zoom-in", display:"block",
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize:11, color:"#9CA3AF", marginTop:10 }}>
              Tap a photo to view full size
            </div>
          </div>
        )}

        <div style={S.card}>
          <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", marginBottom:12 }}>UPDATE STATUS</div>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {["pending","approved","queried"].map(s => (
              <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                flex:1, padding:"10px 4px",
                border:`2px solid ${selected.status===s?STATUS_CONFIG[s].dot:"#E5E7EB"}`,
                borderRadius:10, background:selected.status===s?STATUS_CONFIG[s].bg:"#fff",
                color:selected.status===s?STATUS_CONFIG[s].color:"#9CA3AF",
                fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em",
              }}>{STATUS_CONFIG[s].label}</button>
            ))}
          </div>
          <label style={S.label}>Manager Note</label>
          <textarea style={{ ...S.input, minHeight:72, resize:"vertical", marginBottom:10 }}
            placeholder="Add a note for this worker…"
            value={noteText || selected.managerNote || ""}
            onChange={e => setNoteText(e.target.value)} />
          <button style={S.btn(false)} onClick={() => updateStatus(selected.id, selected.status, noteText)}>
            Save Note
          </button>
        </div>
        <div style={{ fontSize:11, color:"#9CA3AF", textAlign:"center" }}>
          Submitted {new Date(selected.submittedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );

  // ── List view ──
  return (
    <div style={S.page}>
      <div style={{ background:BRAND_DARK, padding:"20px 20px 18px" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.7)", fontSize:13, cursor:"pointer", marginBottom:12, padding:0, fontFamily:"inherit" }}>← Back</button>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <LogoMark size={40} />
            <div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", letterSpacing:"0.1em" }}>MANAGER VIEW</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>Daywork Records</div>
            </div>
          </div>
          <button onClick={refresh} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#fff", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
            ↻ Refresh
          </button>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          {[["Total Hrs", totals.hours.toFixed(1)+"h", BRAND2],["Pending", totals.pending, "#F0A500"],["Approved", totals.approved, "#43A047"],["Queried", totals.queried, "#E53935"]].map(([l,v,c]) => (
            <div key={l} style={{ flex:1, background:"rgba(255,255,255,0.07)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:900, color:c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 40px", maxWidth:520, margin:"0 auto", boxSizing:"border-box" }}>
        <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto" }}>
          {["all","pending","approved","queried"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"8px 16px", border:"2px solid",
              borderColor:filter===f?BRAND:"#E5E7EB",
              borderRadius:20, background:filter===f?BRAND:"#fff",
              color:filter===f?"#fff":"#6B7280",
              fontWeight:600, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit",
            }}>
              {f==="all" ? `All (${records.length})` : `${STATUS_CONFIG[f].label} (${totals[f]})`}
            </button>
          ))}
        </div>

        {filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:48, color:"#9CA3AF" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div>No {filter!=="all"?filter:""} records yet</div>
          </div>
        ) : filtered.map(rec => (
          <button key={rec.id}
            onClick={() => { setSelectedId(rec.id); setNoteText(rec.managerNote||""); }}
            style={{
              display:"block", width:"100%", textAlign:"left", background:"#fff",
              border:"2px solid #E5E7EB", borderRadius:14, padding:16, marginBottom:10,
              cursor:"pointer", fontFamily:"inherit", transition:"border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=BRAND2; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#E5E7EB"; }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{rec.workerName}</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{rec.trade} · {rec.site} · {formatDate(rec.date)}</div>
              </div>
              <div style={S.tag(rec.status)}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:STATUS_CONFIG[rec.status].dot }} />
                {STATUS_CONFIG[rec.status].label}
              </div>
            </div>
            <div style={{ fontSize:13, color:"#4B5563", lineHeight:1.5, marginBottom:10, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {rec.description}
            </div>
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <span style={{ fontSize:14, fontWeight:800, color:BRAND }}>🕐 {rec.hoursWorked}h</span>
              {rec.area && <span style={{ fontSize:12, color:"#9CA3AF" }}>📍 {rec.area}</span>}
              {rec.photos?.length > 0 && <span style={{ fontSize:12, color:"#9CA3AF" }}>📷 {rec.photos.length} photo{rec.photos.length!==1?"s":""}</span>}
              {rec.managerNote && <span style={{ fontSize:12, color:"#9CA3AF" }}>💬 Note</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen,          setScreen]          = useState("landing");
  const [workerTrade,     setWorkerTrade]     = useState("Fixer");
  const [managerUnlocked, setManagerUnlocked] = useState(false);

  if (screen==="worker")
    return <WorkerForm defaultTrade={workerTrade} onBack={() => setScreen("landing")} />;
  if (screen==="manager-pin")
    return <ManagerPin onUnlock={() => { setManagerUnlocked(true); setScreen("manager"); }} onBack={() => setScreen("landing")} />;
  if (screen==="manager" && managerUnlocked)
    return <ManagerDashboard onBack={() => { setManagerUnlocked(false); setScreen("landing"); }} />;

  return <Landing onRole={(role, trade) => {
    if (role==="worker") { setWorkerTrade(trade); setScreen("worker"); }
    else setScreen("manager-pin");
  }} />;
}
