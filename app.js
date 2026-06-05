// =============================================================
// World Cup 2026 Predictor — Application Logic
// =============================================================

// --- Config check (defer until gate passed) ---
function configIsValid() {
  return !!SUPABASE_URL && !SUPABASE_URL.includes("PASTE_YOUR") && !!SUPABASE_KEY && !SUPABASE_KEY.includes("PASTE_YOUR");
}

// --- Supabase client ---
const sb = (typeof SUPABASE_URL !== "undefined" && !SUPABASE_URL.includes("PASTE"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// --- Constants ---
const GROUPS = {
  A:["Mexico","South Africa","South Korea","Czechia"],
  B:["Canada","Bosnia & Herzegovina","Qatar","Switzerland"],
  C:["Brazil","Morocco","Haiti","Scotland"],
  D:["USA","Paraguay","Australia","Turkey"],
  E:["Germany","Curaçao","Ivory Coast","Ecuador"],
  F:["Netherlands","Japan","Sweden","Tunisia"],
  G:["Belgium","Egypt","Iran","New Zealand"],
  H:["Spain","Cape Verde","Saudi Arabia","Uruguay"],
  I:["France","Senegal","Iraq","Norway"],
  J:["Argentina","Algeria","Austria","Jordan"],
  K:["Portugal","DR Congo","Uzbekistan","Colombia"],
  L:["England","Croatia","Ghana","Panama"]
};
const ALL_TEAMS = Object.values(GROUPS).flat();
const LOCK_TIME = new Date(LOCK_TIME_ISO).getTime();
const KO_PTS = {r32:2, r16:3, qf:4, sf:5, bronze:4, final:10};
const SEL_STYLE = {
  "1":"background:#1a7a3c;color:#fff;border-color:#1a7a3c",
  "x":"background:#1f6fc4;color:#fff;border-color:#1f6fc4",
  "2":"background:#c77400;color:#fff;border-color:#c77400"
};

// --- State ---
let CU = null;                  // current user object {id, name, ...}
let userPicks = {};             // {match_id: '1'/'x'/'2'}
let userKoPicks = {};           // {match_id: 'team_name'}
let allUsers = [];              // for leaderboard
let allUserPicks = {};          // {user_id: {match_id: pick}}
let allUserKoPicks = {};        // {user_id: {match_id: team}}
let admGroupRes = {};           // {match_id: '1'/'x'/'2'}
let admKoRes = {};              // {match_id: 'team_name'}
let settings = {force_locked:"false", top_scorer_result:"", admin_password:"admin2026"};
let scoresByUser = {};          // computed
let isAdm = false;
let vG = "A", aG = "A";
let pickSec = "groups", admSec = "groups";
let adminClickCount = 0;

// --- Helpers ---
function isTimeLocked() { return settings.force_locked === "true" || Date.now() >= LOCK_TIME; }
function isUserLocked() { return isTimeLocked() || (CU && CU.submitted); }

function gMatches(g) {
  const t = GROUPS[g], m = [];
  for (let i = 0; i < t.length; i++) for (let j = i+1; j < t.length; j++)
    m.push({id: `${g}${i}${j}`, home: t[i], away: t[j]});
  return m;
}
function allGM() { return Object.keys(GROUPS).flatMap(g => gMatches(g)); }
function groupComplete(picks, g) { return gMatches(g).every(m => picks[m.id]); }

function showSaving() {
  const el = document.getElementById("saving-indicator");
  el.style.display = "block";
  clearTimeout(window._savingTO);
  window._savingTO = setTimeout(() => el.style.display = "none", 800);
}

// --- Data loading ---
async function loadSettings() {
  if (!sb) return;
  try {
    const {data} = await sb.from("settings").select("*");
    if (data) {
      const s = {};
      data.forEach(r => s[r.key] = r.value);
      settings = {...settings, ...s};
    }
  } catch (e) { console.error("loadSettings", e); }
}
async function loadAdminResults() {
  if (!sb) return;
  try {
    const [g, k] = await Promise.all([
      sb.from("admin_group_results").select("*"),
      sb.from("admin_ko_results").select("*"),
    ]);
    admGroupRes = {};
    (g.data || []).forEach(r => admGroupRes[r.match_id] = r.result);
    admKoRes = {};
    (k.data || []).forEach(r => admKoRes[r.match_id] = r.winner);
  } catch (e) { console.error("loadAdminResults", e); }
}
async function loadUserPicks() {
  if (!sb || !CU) return;
  try {
    const [p, k] = await Promise.all([
      sb.from("group_picks").select("*").eq("user_id", CU.id),
      sb.from("ko_picks").select("*").eq("user_id", CU.id),
    ]);
    userPicks = {};
    (p.data || []).forEach(r => userPicks[r.match_id] = r.pick);
    userKoPicks = {};
    (k.data || []).forEach(r => userKoPicks[r.match_id] = r.team);
  } catch (e) { console.error("loadUserPicks", e); }
}
async function loadAllForLeaderboard() {
  if (!sb) return;
  try {
    const [u, gp, kp] = await Promise.all([
      sb.from("users").select("*"),
      sb.from("group_picks").select("*"),
      sb.from("ko_picks").select("*"),
    ]);
    allUsers = u.data || [];
    allUserPicks = {};
    (gp.data || []).forEach(r => {
      if (!allUserPicks[r.user_id]) allUserPicks[r.user_id] = {};
      allUserPicks[r.user_id][r.match_id] = r.pick;
    });
    allUserKoPicks = {};
    (kp.data || []).forEach(r => {
      if (!allUserKoPicks[r.user_id]) allUserKoPicks[r.user_id] = {};
      allUserKoPicks[r.user_id][r.match_id] = r.team;
    });
  } catch (e) { console.error("loadAllForLeaderboard", e); }
}

// --- Standings & bracket logic ---
function calcStandings(res, g) {
  const teams = GROUPS[g].map(n => ({name:n, pts:0, w:0, d:0, l:0}));
  const idx = {};
  teams.forEach((t,i) => idx[t.name] = i);
  gMatches(g).forEach(m => {
    const r = res[m.id]; if (!r) return;
    const th = teams[idx[m.home]], ta = teams[idx[m.away]];
    if (r === "1") { th.pts+=3; th.w++; ta.l++; }
    else if (r === "2") { ta.pts+=3; ta.w++; th.l++; }
    else if (r === "x") { th.pts++; ta.pts++; th.d++; ta.d++; }
  });
  return teams.sort((a,b) => b.pts - a.pts);
}

function buildR32(gRes) {
  const top = {}, sec = {}, thirds = [];
  Object.keys(GROUPS).forEach(g => {
    const st = calcStandings(gRes, g);
    top[g] = st[0] ? st[0].name : "?";
    sec[g] = st[1] ? st[1].name : "?";
    if (st[2]) thirds.push({name: st[2].name, pts: st[2].pts});
  });
  thirds.sort((a,b) => b.pts - a.pts);
  const t3 = thirds.slice(0,8).map(t => t.name);
  const tb = i => t3[i] || "3rd place (TBD)";
  return [
    {id:"r32_1", home:top.A,    away:sec.B},
    {id:"r32_2", home:top.C,    away:sec.F},
    {id:"r32_3", home:top.E,    away:tb(0)},
    {id:"r32_4", home:top.G,    away:sec.H},
    {id:"r32_5", home:top.I,    away:tb(1)},
    {id:"r32_6", home:top.K,    away:sec.L},
    {id:"r32_7", home:sec.A,    away:top.B},
    {id:"r32_8", home:tb(2),    away:sec.C},
    {id:"r32_9", home:top.D,    away:tb(3)},
    {id:"r32_10",home:sec.E,    away:top.F},
    {id:"r32_11",home:sec.G,    away:top.H},
    {id:"r32_12",home:tb(4),    away:sec.I},
    {id:"r32_13",home:top.J,    away:tb(5)},
    {id:"r32_14",home:sec.K,    away:top.L},
    {id:"r32_15",home:sec.D,    away:sec.J},
    {id:"r32_16",home:tb(6),    away:tb(7)},
  ];
}

function buildBracket(gRes, koRes) {
  const r32 = buildR32(gRes);
  function pair(prev, pfx, i) {
    const a = prev[i*2], b = prev[i*2+1];
    return {
      id: `${pfx}${i+1}`,
      home: koRes[a.id] || `Winner of match ${a.id}`,
      away: koRes[b.id] || `Winner of match ${b.id}`
    };
  }
  const r16 = Array.from({length:8}, (_,i) => pair(r32, "r16_", i));
  const qf  = Array.from({length:4}, (_,i) => pair(r16, "qf_",  i));
  const sf  = Array.from({length:2}, (_,i) => pair(qf,  "sf_",  i));
  const sfW0 = koRes[sf[0].id] || null;
  const sfW1 = koRes[sf[1].id] || null;
  const sfL0 = sfW0 ? (sfW0 === sf[0].home ? sf[0].away : sf[0].home) : null;
  const sfL1 = sfW1 ? (sfW1 === sf[1].home ? sf[1].away : sf[1].home) : null;
  return {
    r32, r16, qf, sf,
    bronze: {id:"bronze", home: sfL0 || "SF1 loser", away: sfL1 || "SF2 loser"},
    final:  {id:"final",  home: sfW0 || "SF1 winner", away: sfW1 || "SF2 winner"}
  };
}

// --- Boot ---
async function boot() {
  if (!sb) return;
  await loadSettings();
  await loadAdminResults();
  // restore session
  const uid = localStorage.getItem("wc2026_uid");
  if (uid) {
    try {
      const {data} = await sb.from("users").select("*").eq("id", uid).maybeSingle();
      if (data) { CU = data; await loadUserPicks(); }
    } catch (e) {}
  }
  updateHome();
  setInterval(tickCountdown, 1000);
  tickCountdown();
  setInterval(async () => {
    await loadSettings();
    await loadAdminResults();
    updateHome();
  }, 30000);
}

function tickCountdown() {
  const el = document.getElementById("home-cd"); if (!el) return;
  const d = LOCK_TIME - Date.now();
  if (d <= 0) { el.textContent = ""; return; }
  const dd = Math.floor(d/86400000);
  const hh = Math.floor((d % 86400000)/3600000);
  const mm = Math.floor((d % 3600000)/60000);
  const ss = Math.floor((d % 60000)/1000);
  el.textContent = `Tournament starts in: ${dd}d ${hh}h ${mm}m ${ss}s`;
}

function updateHome() {
  document.getElementById("h-players").textContent = allUsers.length || "—";
  const lk = isTimeLocked();
  document.getElementById("h-st").textContent = lk ? "Locked" : "Open";
  document.getElementById("h-st").style.color = lk ? "var(--danger)" : "var(--primary)";
  document.getElementById("home-lock").style.display = lk ? "flex" : "none";
}

// --- Navigation ---
function nav(p) {
  ["home","reg","pick","board","admin"].forEach(id => {
    document.getElementById("pg-"+id).classList.toggle("on", id === p);
  });
  const tabs = {home:0, reg:1, pick:2, board:3, admin:4};
  document.querySelectorAll(".ntab").forEach((b,i) => b.classList.toggle("on", i === tabs[p]));
  if (p === "pick") renderPick();
  if (p === "board") loadAllForLeaderboard().then(() => { computeScores(); renderBoard(); });
  if (p === "admin") renderAdm();
  if (p === "reg") {
    const lk = isTimeLocked();
    document.getElementById("reg-lock").style.display = lk ? "flex" : "none";
    document.getElementById("reg-btn").disabled = lk;
  }
}

function showAdmin() {
  adminClickCount++;
  if (adminClickCount >= 3) {
    document.getElementById("admin-tab").style.display = "";
    nav("admin");
  }
}

// --- Auth ---
async function register() {
  const name = document.getElementById("reg-name").value.trim();
  const pass = document.getElementById("reg-pass").value.trim();
  const msg = document.getElementById("reg-msg");
  msg.className = "err-msg";
  if (isTimeLocked()) { msg.textContent = "Sign-up closed."; return; }
  if (name.length < 2) { msg.textContent = "Name too short."; return; }
  if (pass.length < 4) { msg.textContent = "Password too short (min 4)."; return; }
  try {
    const {data: existing} = await sb.from("users").select("id").eq("name", name).maybeSingle();
    if (existing) { msg.textContent = "Name already taken."; return; }
    const {data: created, error} = await sb.from("users").insert({name, password: pass}).select().single();
    if (error) { msg.textContent = "Error: " + error.message; return; }
    CU = created;
    localStorage.setItem("wc2026_uid", CU.id);
    userPicks = {}; userKoPicks = {};
    msg.className = "ok-msg"; msg.textContent = "Account created!";
    setTimeout(() => nav("pick"), 600);
  } catch (e) {
    msg.textContent = "Error: " + (e.message || e);
  }
}

async function doLogin() {
  const name = document.getElementById("li-name").value.trim();
  const pass = document.getElementById("li-pass").value.trim();
  const msg = document.getElementById("li-msg");
  msg.className = "err-msg";
  try {
    const {data} = await sb.from("users").select("*").eq("name", name).maybeSingle();
    if (!data) { msg.textContent = "User not found."; return; }
    if (data.password !== pass) { msg.textContent = "Wrong password."; return; }
    CU = data;
    localStorage.setItem("wc2026_uid", CU.id);
    await loadUserPicks();
    msg.className = "ok-msg"; msg.textContent = "Logged in!";
    setTimeout(() => nav("pick"), 500);
  } catch (e) {
    msg.textContent = "Error: " + (e.message || e);
  }
}

function logout() {
  CU = null;
  userPicks = {}; userKoPicks = {};
  localStorage.removeItem("wc2026_uid");
  nav("home");
}

// --- Picks: save handlers ---
async function setPick(id, val) {
  if (!CU || isUserLocked()) return;
  userPicks[id] = val;
  // Optimistic UI
  renderPickGroup();
  renderPickStandings();
  renderPickGTabs();
  updateProgress();
  showSaving();
  try {
    await sb.from("group_picks").upsert(
      {user_id: CU.id, match_id: id, pick: val},
      {onConflict: "user_id,match_id"}
    );
  } catch (e) { console.error("setPick", e); }
}

async function setKoPick(id, team) {
  if (!CU || isUserLocked()) return;
  userKoPicks[id] = team;
  renderPickKO();
  updateProgress();
  showSaving();
  try {
    await sb.from("ko_picks").upsert(
      {user_id: CU.id, match_id: id, team},
      {onConflict: "user_id,match_id"}
    );
  } catch (e) { console.error("setKoPick", e); }
}



async function saveTopScorer() {
  if (!CU || isUserLocked()) return;
  const t = document.getElementById("pick-topscorer").value.trim();
  CU.top_scorer = t;
  updateProgress();
  showSaving();
  try { await sb.from("users").update({top_scorer: t}).eq("id", CU.id); }
  catch (e) { console.error("saveTopScorer", e); }
}

async function submitPicks() {
  if (!CU || isUserLocked()) return;
  if (!confirm("Submit your picks? Once submitted you cannot change them anymore.")) return;
  showSaving();
  try {
    await sb.from("users").update({
      submitted: true,
      submitted_at: new Date().toISOString()
    }).eq("id", CU.id);
    CU.submitted = true;
    CU.submitted_at = new Date().toISOString();
    renderPick();
  } catch (e) { alert("Error: " + (e.message || e)); }
}

// --- Picks: rendering ---
function pickTab(t) {
  pickSec = t;
  document.querySelectorAll(".pick-tabs .pick-tab").forEach((b,i) => {
    b.classList.toggle("on", ["groups","knockout","special"][i] === t);
  });
  document.getElementById("sec-groups").style.display    = t === "groups"   ? "" : "none";
  document.getElementById("sec-knockout").style.display  = t === "knockout" ? "" : "none";
  document.getElementById("sec-special").style.display   = t === "special"  ? "" : "none";
  if (t === "knockout") renderPickKO();
}

function renderPick() {
  if (!CU) {
    document.getElementById("pick-gate").style.display = "";
    document.getElementById("pick-main").style.display = "none";
    return;
  }
  document.getElementById("pick-gate").style.display = "none";
  document.getElementById("pick-main").style.display = "";
  document.getElementById("pick-uname").textContent = CU.name;
  const lk = isUserLocked();
  document.getElementById("pick-submitted-banner").style.display = CU.submitted ? "flex" : "none";
  document.getElementById("pick-lock-banner").style.display = (isTimeLocked() && !CU.submitted) ? "flex" : "none";
  
  const tsInput = document.getElementById("pick-topscorer");
  tsInput.value = CU.top_scorer || "";
  tsInput.disabled = lk;
  tsInput.oninput = saveTopScorer;
  renderPickGTabs();
  renderPickGroup();
  renderPickStandings();
  updateProgress();
}

function renderPickGTabs() {
  document.getElementById("pick-gtabs").innerHTML = Object.keys(GROUPS).map(g => {
    const done = groupComplete(userPicks, g);
    const cls = `stab${g === vG ? " on" : ""}${done ? " done" : ""}`;
    const tick = done ? " ✓" : "";
    return `<button class="${cls}" onclick="swVG('${g}')">${g}${tick}</button>`;
  }).join("");
}
function swVG(g) { vG = g; renderPickGTabs(); renderPickGroup(); renderPickStandings(); }

function ox2Row(m, picks, locked, cbFn) {
  const cur = picks[m.id] || null;
  const dis = locked ? "disabled" : "";
  function btn(val, label) {
    const style = cur === val ? ` style="${SEL_STYLE[val]}"` : "";
    return `<button class="ox2-btn"${style} ${dis} onclick="${cbFn}('${m.id}','${val}')">${label}</button>`;
  }
  return `<div class="ox2-row"><span class="ox2-tm">${m.home}</span><div class="ox2-btns">${btn("1","1")}${btn("x","X")}${btn("2","2")}</div><span class="ox2-tm r">${m.away}</span></div>`;
}

function renderPickGroup() {
  const lk = isUserLocked();
  let h = `<div class="card"><div class="lbl">Group ${vG}</div>`;
  if (!lk) h += `<div style="margin-bottom:10px"><span class="legend-chip"><span class="legend-box" style="background:#1a7a3c">1</span>home wins</span><span class="legend-chip"><span class="legend-box" style="background:#1f6fc4">X</span>draw</span><span class="legend-chip"><span class="legend-box" style="background:#c77400">2</span>away wins</span></div>`;
  gMatches(vG).forEach(m => { h += ox2Row(m, userPicks, lk, "setPick"); });
  h += `</div>`;
  document.getElementById("pick-gcontent").innerHTML = h;
}

function renderPickStandings() {
  const st = calcStandings(userPicks, vG);
  let h = `<div class="card"><div class="lbl">Group ${vG} — projected standings</div>`;
  st.forEach((t,i) => {
    h += `<div class="trow"><span style="color:var(--text-sec);font-size:12px;width:16px">${i+1}.</span><span style="flex:1;font-size:13px;font-weight:500">${t.name}${i<2 ? '<span class="adv">advances</span>' : ""}</span><span style="font-size:11px;color:var(--text-sec);min-width:70px">${t.w}W ${t.d}D ${t.l}L</span><span style="font-size:14px;font-weight:500;min-width:24px;text-align:right">${t.pts}</span></div>`;
  });
  document.getElementById("pick-standings").innerHTML = h + "</div>";
}

function renderPickKO() {
  if (!CU) return;
  const bracket = buildBracket(userPicks, userKoPicks);
  const lk = isUserLocked();
  const rounds = [
    {label:"Round of 32",   pts:"2 pts", matches: bracket.r32},
    {label:"Round of 16",   pts:"3 pts", matches: bracket.r16},
    {label:"Quarter-finals",pts:"4 pts", matches: bracket.qf},
    {label:"Semi-finals",   pts:"5 pts", matches: bracket.sf},
    {label:"Third place",   pts:"4 pts", matches: [bracket.bronze]},
    {label:"Final",         pts:"Finalist 5 pts · Champion 10 pts", matches: [bracket.final]},
  ];
  let h = "";
  rounds.forEach(({label, pts, matches}) => {
    h += `<div class="round-hdr">${label}<span class="pts-badge">${pts}</span></div>`;
    matches.forEach(m => {
      const isTBD = /Winner|loser|TBD|SF/.test(m.home) || /Winner|loser|TBD|SF/.test(m.away);
      const sel = userKoPicks[m.id] || null;
      const canClick = !isTBD && !lk;
      const hCls = `ko-tm${sel === m.home ? " sel" : ""}${!canClick ? " disabled" : ""}${isTBD ? " tbd" : ""}`;
      const aCls = `ko-tm${sel === m.away ? " sel" : ""}${!canClick ? " disabled" : ""}${isTBD ? " tbd" : ""}`;
      const hClk = canClick ? `onclick="setKoPick('${m.id}','${m.home.replace(/'/g,"\\'")}')"` : "";
      const aClk = canClick ? `onclick="setKoPick('${m.id}','${m.away.replace(/'/g,"\\'")}')"` : "";
      h += `<div class="ko-match${isTBD ? " pending" : ""}"><div class="ko-teams-row"><div class="${hCls}" ${hClk}>${m.home}</div><div class="ko-vs">vs</div><div class="${aCls}" ${aClk}>${m.away}</div></div></div>`;
    });
  });
  document.getElementById("pick-ko-content").innerHTML = h;
}

function updateProgress() {
  const total = allGM().length;
  const done = Object.keys(userPicks).filter(k => userPicks[k]).length;
  const pct = Math.round(done/total*100);
  const el = document.getElementById("prog-fill"); if (el) el.style.width = pct + "%";
  const lbl = document.getElementById("prog-label"); if (lbl) lbl.textContent = `${done} / ${total} group picks`;
  const pp = document.getElementById("prog-pct"); if (pp) pp.textContent = pct + "%";
  updateSubmitState(done, total);
}

function updateSubmitState(done, total) {
  if (!CU) return;
  const submitCard = document.getElementById("submit-card");
  const btn = document.getElementById("submit-btn");
  const status = document.getElementById("submit-status");
  if (CU.submitted) { submitCard.style.display = "none"; return; }
  if (isTimeLocked()) { submitCard.style.display = "none"; return; }
  submitCard.style.display = "";
  const groupsMissing = total - done;
  const koTotal = 32;
  const koDone = Object.keys(userKoPicks).filter(k => userKoPicks[k]).length;
  const koMissing = koTotal - koDone;
  const tsMissing = !CU.top_scorer || !CU.top_scorer.trim();
  const missing = [];
  if (groupsMissing > 0) missing.push(`${groupsMissing} group match${groupsMissing===1?"":"es"}`);
  if (koMissing > 0) missing.push(`${koMissing} knockout pick${koMissing===1?"":"s"}`);
  if (tsMissing) missing.push("top scorer");
  if (missing.length > 0) {
    btn.disabled = true;
    status.innerHTML = `Still missing: <strong>${missing.join(", ")}</strong>. Fill everything to unlock submit.`;
  } else {
    btn.disabled = false;
    status.textContent = `Everything filled — ready to submit! Once submitted you cannot change your picks anymore.`;
  }
}

// --- Leaderboard ---
function computeScores() {
  scoresByUser = {};
  allUsers.forEach(u => {
    scoresByUser[u.id] = {total:0, group:0, adv:0, ko:0, spec:0};
  });

  // Group match points
  allGM().forEach(m => {
    const r = admGroupRes[m.id]; if (!r) return;
    allUsers.forEach(u => {
      const p = (allUserPicks[u.id] || {})[m.id];
      if (p && p === r) {
        scoresByUser[u.id].group += 2;
        scoresByUser[u.id].total += 2;
      }
    });
  });

  // Advancement points
  const realAdv = {};
  Object.keys(GROUPS).forEach(g => {
    realAdv[g] = calcStandings(admGroupRes, g).slice(0,2).map(t => t.name);
  });
  allUsers.forEach(u => {
    const userPicksMap = allUserPicks[u.id] || {};
    const predAdv = {};
    Object.keys(GROUPS).forEach(g => {
      predAdv[g] = calcStandings(userPicksMap, g).slice(0,2).map(t => t.name);
    });
    Object.keys(GROUPS).forEach(g => {
      predAdv[g].forEach(t => {
        if (realAdv[g].includes(t)) {
          scoresByUser[u.id].adv += 2;
          scoresByUser[u.id].total += 2;
        }
      });
    });
  });

  // KO match winner points
  const realBracket = buildBracket(admGroupRes, admKoRes);
  ["r32","r16","qf","sf"].forEach(k => {
    const pts = KO_PTS[k];
    realBracket[k].forEach(rm => {
      const realW = admKoRes[rm.id]; if (!realW) return;
      allUsers.forEach(u => {
        const userBracket = buildBracket(allUserPicks[u.id] || {}, allUserKoPicks[u.id] || {});
        const userM = userBracket[k].find(um => um.id === rm.id);
        if (!userM) return;
        const userW = (allUserKoPicks[u.id] || {})[userM.id];
        if (userW && userW === realW) {
          scoresByUser[u.id].ko += pts;
          scoresByUser[u.id].total += pts;
        }
      });
    });
  });

  // Bronze
  const bronzeW = admKoRes["bronze"];
  if (bronzeW) {
    allUsers.forEach(u => {
      const userW = (allUserKoPicks[u.id] || {})["bronze"];
      if (userW && userW === bronzeW) {
        scoresByUser[u.id].ko += KO_PTS.bronze;
        scoresByUser[u.id].total += KO_PTS.bronze;
      }
    });
  }

  

  // Top scorer
  if (settings.top_scorer_result) {
    const ts = settings.top_scorer_result.toLowerCase().trim();
    allUsers.forEach(u => {
      if ((u.top_scorer || "").toLowerCase().trim() === ts) {
        scoresByUser[u.id].spec += 8;
        scoresByUser[u.id].total += 8;
      }
    });
  }
}

function renderBoard() {
  const lb = document.getElementById("lb-list");
  if (!allUsers.length) {
    lb.innerHTML = '<div style="font-size:13px;color:var(--text-sec)">No participants yet.</div>';
    document.getElementById("lb-specials").innerHTML = "";
    document.getElementById("h-players").textContent = "0";
    return;
  }
  document.getElementById("h-players").textContent = allUsers.length;
  const sorted = [...allUsers].sort((a,b) => (scoresByUser[b.id]?.total || 0) - (scoresByUser[a.id]?.total || 0));
  const rc = ["av1","av2","av3"], ri = ["🥇","🥈","🥉"];
  lb.innerHTML = sorted.map((u,i) => {
    const sc = scoresByUser[u.id] || {total:0,group:0,adv:0,ko:0,spec:0};
    const subBadge = u.submitted ? '<span class="badge bg" style="margin-left:6px;font-size:10px">submitted</span>' : "";
   const champPick = (allUserKoPicks[u.id] || {})["final"];
    return `<div class="lb-row"><div class="av ${i<3?rc[i]:"avn"}">${i<3?ri[i]:i+1}</div><div><div style="font-size:14px;font-weight:500">${u.name}${subBadge}</div><div style="font-size:11px;color:var(--text-sec);margin-top:1px">Group: ${sc.group} · Adv: ${sc.adv} · KO: ${sc.ko} · Specials: ${sc.spec}</div><div style="font-size:11px;color:var(--text-tert)">Champion pick: ${champPick || "—"} · Top scorer: ${u.top_scorer || "—"}</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:500">${sc.total}</div><div style="font-size:11px;color:var(--text-sec)">pts</div></div></div>`;
  }).join("");

  const wc = {}, tc = {};
  allUsers.forEach(u => {
const champ = (allUserKoPicks[u.id] || {})["final"];
    if (champ) wc[champ] = (wc[champ] || 0) + 1;
    if (u.top_scorer) { const k = u.top_scorer.toLowerCase(); tc[k] = (tc[k] || 0) + 1; }
  });
  document.getElementById("lb-specials").innerHTML =
    `<div style="font-size:13px;font-weight:500;margin-bottom:8px">Special picks summary</div>
    <div style="font-size:13px;margin-bottom:6px"><span style="color:var(--text-sec)">Champion: </span>${
      Object.entries(wc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([t,c])=>`${t} <span style="color:var(--text-sec)">(${c})</span>`).join(" · ") || "—"
    }</div>
    <div style="font-size:13px"><span style="color:var(--text-sec)">Top scorer: </span>${
      Object.entries(tc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([t,c])=>`${t} <span style="color:var(--text-sec)">(${c})</span>`).join(" · ") || "—"
    }</div>`;
}

// --- Admin ---
async function adminIn() {
  const pw = document.getElementById("adm-pw").value;
  const msg = document.getElementById("adm-msg");
  msg.className = "err-msg";
  await loadSettings();
  if (pw !== settings.admin_password) { msg.textContent = "Wrong password."; return; }
  isAdm = true;
  document.getElementById("admin-tab").style.display = "";
  document.getElementById("adm-gate").style.display = "none";
  document.getElementById("adm-main").style.display = "";
  await loadAdminResults();
  await loadAdminUsers();
  renderAdm();
}

async function loadAdminUsers() {
  if (!isAdm || !sb) return;
  try {
    const {data} = await sb.from("users").select("*").order("created_at", {ascending: true});
    const list = document.getElementById("adm-user-list");
    const countEl = document.getElementById("adm-user-count");
    if (!data || !data.length) {
      list.innerHTML = '<div style="font-size:13px;color:var(--text-sec)">No players yet.</div>';
      countEl.textContent = "0";
      return;
    }
    countEl.textContent = data.length;
    list.innerHTML = data.map(u => {
      const safeName = u.name.replace(/'/g, "\\'");
      const sub = u.submitted ? ' <span class="badge bg" style="font-size:10px">submitted</span>' : '';
      return `<div class="trow">
        <div style="flex:1;font-size:13px;font-weight:500">${u.name}${sub}</div>
        <button onclick="deleteUser('${u.id}','${safeName}')" style="font-size:11px;padding:4px 10px;color:var(--danger);border-color:var(--danger);background:#fff">Delete</button>
      </div>`;
    }).join("");
  } catch (e) { console.error("loadAdminUsers", e); }
}

async function deleteUser(id, name) {
  if (!confirm(`Delete player "${name}"?\n\nThis will permanently remove all their picks. This cannot be undone.`)) return;
  showSaving();
  try {
    await sb.from("users").delete().eq("id", id);
    await loadAdminUsers();
  } catch (e) { alert("Error deleting: " + (e.message || e)); }
}
function adminOut() {
  isAdm = false;
  adminClickCount = 0;
  document.getElementById("admin-tab").style.display = "none";
  document.getElementById("adm-gate").style.display = "";
  document.getElementById("adm-main").style.display = "none";
  nav("home");
}
async function changeAdmPw() {
  const v = document.getElementById("adm-newpw").value.trim();
  if (v.length < 4) { alert("Password must be at least 4 characters"); return; }
  showSaving();
  await sb.from("settings").update({value: v}).eq("key", "admin_password");
  settings.admin_password = v;
  document.getElementById("adm-newpw").value = "";
  alert("Password updated.");
}
async function toggleLock() {
  const newVal = settings.force_locked === "true" ? "false" : "true";
  showSaving();
  await sb.from("settings").update({value: newVal}).eq("key", "force_locked");
  settings.force_locked = newVal;
  updateHome();
  renderAdm();
}
async function setTS() {
  const v = document.getElementById("adm-ts").value.trim();
  showSaving();
  await sb.from("settings").update({value: v}).eq("key", "top_scorer_result");
  settings.top_scorer_result = v;
}

function admTab(t) {
  admSec = t;
  document.querySelectorAll("#pg-admin .pick-tabs .pick-tab").forEach((b,i) =>
    b.classList.toggle("on", ["groups","knockout"][i] === t));
  document.getElementById("adm-g-sec").style.display = t === "groups" ? "" : "none";
  document.getElementById("adm-ko-sec").style.display = t === "knockout" ? "" : "none";
  if (t === "knockout") renderAdmKO();
}

function renderAdm() {
  if (!isAdm) return;
  const lk = isTimeLocked();
  document.getElementById("lock-btn").textContent = settings.force_locked === "true" ? "Remove force lock" : "Force lock now";
  document.getElementById("lock-lbl").textContent = lk ? "LOCKED" : "Open — auto-locks Jun 11 17:00";
  document.getElementById("lock-lbl").style.color = lk ? "var(--danger)" : "var(--primary)";
  document.getElementById("adm-ts").value = settings.top_scorer_result || "";
  document.getElementById("adm-gtabs").innerHTML = Object.keys(GROUPS).map(g =>
    `<button class="stab${g === aG ? " on" : ""}" onclick="swAG('${g}')">${g}</button>`
  ).join("");
  renderAGroup();
  renderAStandings();
}
function swAG(g) { aG = g; document.querySelectorAll("#adm-gtabs .stab").forEach((b,i) => b.classList.toggle("on", Object.keys(GROUPS)[i] === g)); renderAGroup(); renderAStandings(); }

function renderAGroup() {
  let h = `<div class="card"><div class="lbl">Group ${aG} — official results</div><div style="margin-bottom:10px"><span class="legend-chip"><span class="legend-box" style="background:#1a7a3c">1</span>home wins</span><span class="legend-chip"><span class="legend-box" style="background:#1f6fc4">X</span>draw</span><span class="legend-chip"><span class="legend-box" style="background:#c77400">2</span>away wins</span></div>`;
  gMatches(aG).forEach(m => { h += ox2Row(m, admGroupRes, false, "setAdmPick"); });
  h += "</div>";
  document.getElementById("adm-gcontent").innerHTML = h;
}
function renderAStandings() {
  const st = calcStandings(admGroupRes, aG);
  let h = `<div class="card"><div class="lbl">Group ${aG} — standings</div>`;
  st.forEach((t,i) => {
    h += `<div class="trow"><span style="color:var(--text-sec);font-size:12px;width:16px">${i+1}.</span><span style="flex:1;font-size:13px;font-weight:500">${t.name}${i<2 ? '<span class="adv">advances</span>' : ""}</span><span style="font-size:11px;color:var(--text-sec);min-width:70px">${t.w}W ${t.d}D ${t.l}L</span><span style="font-size:14px;font-weight:500;min-width:24px;text-align:right">${t.pts}</span></div>`;
  });
  document.getElementById("adm-gstandings").innerHTML = h + "</div>";
}

async function setAdmPick(id, val) {
  admGroupRes[id] = val;
  renderAGroup(); renderAStandings();
  showSaving();
  try {
    await sb.from("admin_group_results").upsert(
      {match_id: id, result: val},
      {onConflict: "match_id"}
    );
  } catch (e) { console.error("setAdmPick", e); }
}

function renderAdmKO() {
  const bracket = buildBracket(admGroupRes, admKoRes);
  const rounds = [
    {label:"Round of 32",   matches: bracket.r32},
    {label:"Round of 16",   matches: bracket.r16},
    {label:"Quarter-finals",matches: bracket.qf},
    {label:"Semi-finals",   matches: bracket.sf},
    {label:"Third place",   matches: [bracket.bronze]},
    {label:"Final",         matches: [bracket.final]},
  ];
  let h = "";
  rounds.forEach(({label, matches}) => {
    h += `<div class="round-hdr">${label}</div>`;
    matches.forEach(m => {
      const isTBD = /Winner|loser|SF/.test(m.home) || /Winner|loser|SF/.test(m.away);
      const sel = admKoRes[m.id] || null;
      const canClick = !isTBD;
      const hCls = `ko-tm${sel === m.home ? " sel" : ""}${!canClick ? " disabled" : ""}${isTBD ? " tbd" : ""}`;
      const aCls = `ko-tm${sel === m.away ? " sel" : ""}${!canClick ? " disabled" : ""}${isTBD ? " tbd" : ""}`;
      const hClk = canClick ? `onclick="setAdmKo('${m.id}','${m.home.replace(/'/g,"\\'")}')"` : "";
      const aClk = canClick ? `onclick="setAdmKo('${m.id}','${m.away.replace(/'/g,"\\'")}')"` : "";
      h += `<div class="ko-match${isTBD ? " pending" : ""}"><div class="ko-teams-row"><div class="${hCls}" ${hClk}>${m.home}</div><div class="ko-vs">vs</div><div class="${aCls}" ${aClk}>${m.away}</div></div></div>`;
    });
  });
  document.getElementById("adm-ko-content").innerHTML = h;
}

async function setAdmKo(id, team) {
  admKoRes[id] = team;
  renderAdmKO();
  showSaving();
  try {
    await sb.from("admin_ko_results").upsert(
      {match_id: id, winner: team},
      {onConflict: "match_id"}
    );
  } catch (e) { console.error("setAdmKo", e); }
}

async function adminRecalc() {
  const m = document.getElementById("adm-saved");
  m.style.color = "var(--text-sec)";
  m.textContent = "Loading…";
  await loadSettings();
  await loadAdminResults();
  await loadAllForLeaderboard();
  computeScores();
  m.style.color = "var(--success-text)";
  m.textContent = "Scores recalculated!";
  setTimeout(() => m.textContent = "", 3000);
}

// --- Site password gate ---
const SITE_PASSWORD = "S426";

function showAppAfterGate() {
  document.getElementById("site-gate").style.display = "none";
  if (!configIsValid()) {
    document.getElementById("config-error").style.display = "block";
    return;
  }
  document.getElementById("app-content").style.display = "block";
  if (sb) boot();
}

function checkSitePw() {
  const v = document.getElementById("site-pw").value.trim();
  if (v === SITE_PASSWORD) {
    localStorage.setItem("wc2026_site_pw_ok", "1");
    showAppAfterGate();
  } else {
    document.getElementById("site-pw-msg").innerHTML = '<div style="color:#FFB4B4;font-size:13px">Wrong code. Try again.</div>';
    document.getElementById("site-pw").value = "";
    document.getElementById("site-pw").focus();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("site-pw");
  if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") checkSitePw(); });
});

if (localStorage.getItem("wc2026_site_pw_ok") === "1") {
  showAppAfterGate();
} else {
  document.getElementById("site-gate").style.display = "block";
}
