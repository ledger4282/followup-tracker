"use strict";
const $=id=>document.getElementById(id),today=()=>{let d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10)},fmt=d=>d?new Date(d+"T12:00:00").toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}):"—",addDays=(d,n)=>{if(!d||n===""||n==null)return "";let x=new Date(d+"T00:00:00Z");x.setUTCDate(x.getUTCDate()+Number(n));return x.toISOString().slice(0,10)},diff=(a,b)=>Math.round((new Date(a+"T00:00:00Z")-new Date(b+"T00:00:00Z"))/86400000);
let records=[],password=null,currentId=null;
function norm(r){r.purchases=Array.isArray(r.purchases)?r.purchases:((r.lpd&&r.lpq)?[{date:r.lpd,qty:Number(r.lpq)}]:[]);return r}
function derive(r){r=norm({...r});let p=[...r.purchases].sort((a,b)=>a.date.localeCompare(b.date)),last=p[p.length-1],dateOnly=r.lpd||"",lpd=last&&last.date>=dateOnly?last.date:dateOnly,lpq=last&&last.date===lpd?last.qty:"",rdd=lpd&&lpq!==""?diff(addDays(lpd,lpq),today()):null;let type="empty",alert="",sort=999998;if(r.nfc==="不关注"){type="inactive";alert="不关注：暂不跟进";sort=1000000}else if(rdd===null){}else if(rdd < -7){type="inactive";alert="已缺药>7天，暂不跟进";sort=999999}else if(rdd<0){type="urgent";alert="紧急：已缺药";sort=rdd}else if(rdd<2){type="urgent";alert="紧急：今明天需购药";sort=rdd}else if(rdd<7){type="soon";alert="次级提醒：7天内需购药";sort=rdd}else{type="normal";alert="药品充足";sort=rdd}
let dot="";if(r.std&&lpd&&lpq!==""){let w=diff(addDays(lpd,Number(lpq)),r.std)/7;dot=w.toFixed(1)+" "+(w<12?"↓":w<24?"=":"↑")}
return {...r,lpd,lpq,rdd,type,alert,sort,dot,cumulative:p.reduce((s,x)=>s+Number(x.qty||0),0),purchases:p}}
function all(){return records.map(derive).sort((a,b)=>a.sort-b.sort||String(a.pt).localeCompare(String(b.pt),"zh"))}
function badge(t){let names={urgent:"紧急",soon:"次级提醒",normal:"药品充足",inactive:"暂不跟进",empty:"未计算"};return `<span class="pill ${t}">${names[t]}</span>`}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
let toastTimer;
function toast(s){clearTimeout(toastTimer);$("toast").textContent=s;$("toast").classList.remove("hidden");toastTimer=setTimeout(()=>$("toast").classList.add("hidden"),2200)}
function row(r,withActions=false){return `<div class="patientRow"><div class="avatar">${esc((r.pt||"档").slice(-1))}</div><div class="patientMain" data-detail="${r.id}"><div class="patientName">${esc(r.pt||"未命名")}</div><div class="patientMeta">${esc(r.hcp||"未填 HCP")} · ${esc(r.dep||"未填科室")} · ${r.rdd===null?"RDD —":`RDD ${r.rdd}天`} · 已记录购药 ${r.cumulative}天</div></div>${badge(r.type)}${withActions?`<button class="secondary" style="padding:8px 9px;font-size:11px" data-purchase="${r.id}">更新购药</button>`:""}</div>`}
function render(){let a=all(),c={urgent:0,soon:0,normal:0,inactive:0,empty:0};a.forEach(r=>c[r.type]++);$("today").textContent=new Date().toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"});$("focusNum").textContent=c.urgent+c.soon;$("metrics").innerHTML=[["urgent","紧急跟进",c.urgent],["soon","近期提醒",c.soon],["normal","药品充足",c.normal],["inactive","暂不跟进",c.inactive]].map(([t,n,v])=>`<div class="metric"><div class="metricTop"><span class="muted">${n}</span><span class="dot" style="background:${t==="urgent"?"#d94a4a":t==="soon"?"#d79a38":t==="normal"?"#22966b":"#9aa3b1"}"></span></div><div class="metricNum">${v}</div><div class="metricLabel">当前档案状态</div></div>`).join("");$("priorityList").innerHTML=a.filter(r=>r.type==="urgent"||r.type==="soon").slice(0,5).map(r=>row(r)).join("")||'<div class="emptyState">暂时没有待处理事项。新增患者档案后，系统会自动计算提醒。</div>';let recent=a.flatMap(r=>r.purchases.map(p=>({...p,pt:r.pt,id:r.id}))).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,4);$("recentList").innerHTML=recent.map(p=>`<div class="patientRow"><div class="avatar">购</div><div class="patientMain" data-detail="${p.id}"><div class="patientName">${esc(p.pt)}</div><div class="patientMeta">${fmt(p.date)} · 本次 ${p.qty} 天</div></div><span class="muted">›</span></div>`).join("")||'<div class="emptyState">还没有购药记录。新增患者后，点击「更新购药」记录第一次购药。</div>';renderPatients();$("statsList").innerHTML=[["患者档案总数",records.length],["已记录累计购药天数",a.reduce((s,r)=>s+r.cumulative,0)+" 天"],["购药记录总数",a.reduce((s,r)=>s+r.purchases.length,0)],["紧急跟进",c.urgent],["次级提醒",c.soon],["正常",c.normal],["暂不跟进",c.inactive]].map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}
function renderPatients(){let q=$("query").value.toLowerCase(),f=$("filter").value,a=all().filter(r=>(!q||[r.pt,r.hcp,r.dep].join(" ").toLowerCase().includes(q))&&(f==="all"||r.type===f));$("patientList").innerHTML=a.map(r=>row(r,true)).join("")||'<div class="emptyState">还没有患者档案。点击「新增患者」建立第一条记录。</div>'}
function tab(t){document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));["home","patients","stats","detail"].forEach(s=>$(s).classList.toggle("active",s===t));$("fab").classList.toggle("hidden",t!=="patients")}
function showDetail(id){currentId=id;const record=records.find(x=>x.id===id);if(!record)return;const r=derive(record);let history=[...r.purchases].sort((a,b)=>b.date.localeCompare(a.date));$("detailContent").innerHTML=`<div class="detailHead"><div class="detailAvatar">${esc((r.pt||"档").slice(-1))}</div><div style="flex:1"><div class="detailName">${esc(r.pt)}</div><div class="muted">${esc(r.hcp||"—")} · ${esc(r.dep||"—")}</div></div>${badge(r.type)}</div><div class="recordActions" style="margin:13px 0"><button data-purchase="${id}">＋ 更新购药</button><button class="secondary" data-edit="${id}">编辑档案</button></div><div class="detailGrid"><div class="detailCell"><div class="k">预计剩余天数 RDD</div><div class="v">${r.rdd === null ? "—" : r.rdd + " 天"}</div></div><div class="detailCell"><div class="k">已记录累计购药天数</div><div class="v">${r.cumulative} 天</div></div><div class="detailCell"><div class="k">最近购药日期 LPD</div><div class="v" style="font-size:15px">${fmt(r.lpd)}</div></div><div class="detailCell"><div class="k">最近购药数量 LPQ</div><div class="v">${r.lpq === "" ? "—" : r.lpq + " 天"}</div></div></div><div class="panel"><div class="panelHead"><div class="panelTitle">档案信息</div></div><div class="kpi"><span>开始日期 STD</span><b>${fmt(r.std)}</b></div><div class="kpi"><span>疗程周数 DOT(w)</span><b>${r.dot||"—"}</b></div><div class="kpi"><span>提醒状态</span><b>${esc(r.alert||"未计算")}</b></div><div class="kpi"><span>备注</span><b>${esc(r.memo||"—")}</b></div></div><div class="panel"><div class="panelHead"><div class="panelTitle">购药历史</div><span class="muted">${history.length} 次记录</span></div>${history.length?`<div class="timeline">${history.map(p=>`<div class="event"><div class="eventDate">${fmt(p.date)}</div><div class="eventText">购药 ${p.qty} 天</div></div>`).join("")}</div>`:'<div class="emptyState">尚无购药记录，可点击「更新购药」添加首次记录</div>'}<p class="note">已记录累计购药天数 = 从开始使用本系统后，逐次记录的所有购药 LPQ 之和。该指标不等同于实际服药天数或依从性。</p></div>`;tab("detail")}
function openPatient(r=null){$("patientForm").reset();$("pid").value=r?.id||"";$("modalTitle").textContent=r?"编辑患者档案":"新增患者档案";$("deletePatient").classList.toggle("hidden",!r);["hcp","dep","pt","std","nfc","memo"].forEach(k=>$(k).value=r?.[k]??"");$("lpd").value=r?derive(r).lpd:"";$("modal").classList.remove("hidden")}
function editPatient(id){let r=records.find(x=>x.id===id);if(r)openPatient(r)}
function openPurchase(id){const record=records.find(x=>x.id===id);if(!record)return;const r=derive(record);currentId=id;$("purchasePatient").textContent=`${r.pt} · 当前已记录购药 ${r.cumulative} 天`;$("purchaseDate").value=today();$("purchaseQty").value="";$("purchaseModal").classList.remove("hidden")}

const storageKey = "personal_tracker_v2";
let writing = false;
let changingVault = false;

$("app").addEventListener("click", event => {
  const control = event.target.closest("[data-detail],[data-purchase],[data-edit]");
  if (!control || writing || changingVault) return;
  if (control.dataset.detail) showDetail(Number(control.dataset.detail));
  if (control.dataset.purchase) openPurchase(Number(control.dataset.purchase));
  if (control.dataset.edit) editPatient(Number(control.dataset.edit));
});

async function commit(next, button, afterSave) {
  if (writing || changingVault || !password) return;
  writing = button.disabled = true;
  try {
    await persist(next, password);
    records = next;
    afterSave();
  } catch {
    toast("本地保存失败，原有记录未被覆盖。请检查浏览器存储。");
  } finally {
    writing = button.disabled = false;
  }
}

$("patientForm").onsubmit = event => {
  event.preventDefault();
  const id = Number($("pid").value) || Date.now();
  const old = records.find(record => record.id === id);
  const record = { ...old, id, purchases: old ? old.purchases : [] };
  for (const field of ["hcp", "dep", "pt", "std", "lpd", "nfc", "memo"]) record[field] = $(field).value;
  if (record.lpd && !validDate(record.lpd)) return toast("请填写有效的最近购药日期");
  record.pt = record.pt.trim();
  if (!record.pt) return toast("请填写患者档案名称或代号");
  const next = old ? records.map(item => item.id === id ? record : item) : [...records, record];
  commit(next, $("patientForm").querySelector('[type="submit"]'), () => {
    $("modal").classList.add("hidden");
    render();
    if (old) showDetail(id);
    toast("档案已保存");
  });
};

$("deletePatient").onclick = () => {
  const id = Number($("pid").value);
  if (!id || writing || !confirm("删除该患者档案及其购药历史？")) return;
  commit(records.filter(record => record.id !== id), $("deletePatient"), () => {
    $("modal").classList.add("hidden");
    tab("patients");
    render();
    toast("档案已删除");
  });
};

$("purchaseForm").onsubmit = event => {
  event.preventDefault();
  const id = currentId;
  const record = records.find(item => item.id === id);
  const date = $("purchaseDate").value;
  const qty = Number($("purchaseQty").value);
  if (!record || !validDate(date) || !validQty(qty)) return toast("请填写有效的购药日期和天数");
  const next = records.map(item => item.id === id ? { ...record, purchases: [...record.purchases, { date, qty }] } : item);
  commit(next, $("purchaseForm").querySelector('[type="submit"]'), () => {
    $("purchaseModal").classList.add("hidden");
    render();
    showDetail(id);
    toast("购药记录已添加，累计天数已更新");
  });
};

$("close").onclick = () => { if (!writing) $("modal").classList.add("hidden"); };
$("closePurchase").onclick = () => { if (!writing) $("purchaseModal").classList.add("hidden"); };
$("newPatient").onclick = $("fab").onclick = $("heroAdd").onclick = () => {
  if (!writing && !changingVault) openPatient();
};
$("backPatients").onclick = () => tab("patients");
$("goUrgent").onclick = () => {
  tab("patients");
  $("filter").value = "urgent";
  renderPatients();
};
$("query").oninput = $("filter").onchange = renderPatients;
document.querySelectorAll(".nav button").forEach(button => {
  button.onclick = () => tab(button.dataset.tab);
});

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

function validQty(qty) {
  return Number.isSafeInteger(qty) && qty > 0 && qty <= 365250;
}

function validatedRecords(data) {
  if (!Array.isArray(data)) throw new Error("Invalid records");
  const ids = new Set();
  return data.map(raw => {
    if (!raw || !Number.isSafeInteger(raw.id) || raw.id <= 0 || ids.has(raw.id)) throw new Error("Invalid record ID");
    ids.add(raw.id);
    const source = norm({ ...raw });
    const record = { id: source.id };
    for (const key of ["hcp", "dep", "pt", "std", "cf", "del", "nfc", "memo"]) {
      const value = source[key];
      if (value != null && typeof value !== "string") throw new Error("Invalid field");
      record[key] = value || "";
    }
    if (record.std && !validDate(record.std)) throw new Error("Invalid start date");
    if (source.lpd != null && source.lpd !== "") {
      if (!validDate(source.lpd)) throw new Error("Invalid last purchase date");
      record.lpd = source.lpd;
    }
    record.purchases = source.purchases.map(purchase => {
      if (!purchase || !validDate(purchase.date) || !validQty(purchase.qty)) throw new Error("Invalid purchase");
      return { date: purchase.date, qty: purchase.qty };
    });
    return record;
  });
}

async function persist(next, secret) {
  const encrypted = await seal(next, secret);
  localStorage.setItem(storageKey, JSON.stringify(encrypted));
}

async function deriveKey(secret, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name:"PBKDF2", salt, iterations:250000, hash:"SHA-256" }, base, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
}

function b64(bytes) {
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  return btoa(chunks.join(""));
}

const un64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
async function seal(data, secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt);
  const encrypted = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return { v:2, salt:b64(salt), iv:b64(iv), data:b64(new Uint8Array(encrypted)) };
}

async function unseal(envelope, secret) {
  if (!envelope || envelope.v !== 2) throw new Error("Invalid backup version");
  const salt = un64(envelope.salt);
  const iv = un64(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error("Invalid encryption parameters");
  const key = await deriveKey(secret, salt);
  const clear = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, un64(envelope.data));
  return validatedRecords(JSON.parse(new TextDecoder().decode(clear)));
}

function prepareLock() {
  $("unlock").disabled = true;
  if (!window.isSecureContext || !window.crypto || !window.crypto.subtle || !window.TextEncoder || !window.TextDecoder) {
    $("lockDesc").textContent = "此浏览器无法使用本地加密。请在最新版微信、Safari 或 Chrome 中打开正式 HTTPS 链接。";
    return;
  }
  try {
    const exists = localStorage.getItem(storageKey) !== null;
    const probe = storageKey + "_probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    $("lockTitle").textContent = exists ? "输入密码解锁" : "设置访问密码";
    $("unlock").textContent = exists ? "解锁并进入" : "设置密码并进入";
    $("pw").placeholder = exists ? "输入访问密码" : "至少 8 位密码";
    $("lockDesc").textContent = "记录加密保存在当前网站和浏览器中。请保管密码并定期导出加密备份。";
    $("unlock").disabled = false;
  } catch {
    $("lockDesc").textContent = "此浏览器无法保存本地数据。请启用网站数据存储，或在常规浏览窗口重新打开。";
  }
}

$("unlock").onclick = async () => {
  const secret = $("pw").value;
  if (secret.length < 8) return toast("密码至少 8 位");
  if (changingVault) return;
  changingVault = $("unlock").disabled = true;
  let saved;
  try {
    saved = localStorage.getItem(storageKey);
    const next = saved === null ? [] : await unseal(JSON.parse(saved), secret);
    if (saved === null) await persist(next, secret);
    records = next;
    render();
    password = secret;
    $("pw").value = "";
    $("lock").classList.add("hidden");
    $("app").classList.remove("hidden");
    tab("home");
  } catch {
    records = [];
    $("lockDesc").textContent = saved == null ? "无法初始化本地存储。请检查网站存储设置后重试。" : "无法解锁。请核对密码，或检查本地数据是否损坏。";
  } finally {
    changingVault = $("unlock").disabled = false;
  }
};
$("pw").onkeydown = event => { if (event.key === "Enter") $("unlock").click(); };

$("settings").onclick = () => {
  if (writing || changingVault || !confirm("锁定应用？请确认已记住密码。")) return;
  password = currentId = null;
  records = [];
  for (const id of ["modal", "purchaseModal", "fab", "app"]) $(id).classList.add("hidden");
  for (const id of ["patientList", "priorityList", "recentList", "detailContent", "purchasePatient", "statsList", "metrics", "toast"]) $(id).textContent = "";
  $("focusNum").textContent = "0";
  $("toast").classList.add("hidden");
  $("patientForm").reset();
  $("purchaseForm").reset();
  $("query").value = "";
  $("filter").value = "all";
  $("pw").value = "";
  $("lock").classList.remove("hidden");
  prepareLock();
};

$("backup").onclick = async () => {
  if (!password || writing || changingVault) return;
  changingVault = $("backup").disabled = true;
  try {
    const encrypted = await seal(records, password);
    const backup = { format:"personal-tracker-encrypted-backup", ...encrypted };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type:"application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "随访台-加密备份-" + today() + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast("已请求下载，请确认加密备份已保存。");
  } catch {
    toast("导出失败，请重试。");
  } finally {
    changingVault = $("backup").disabled = false;
  }
};

$("restore").onclick = () => {
  if (!writing && !changingVault) $("restoreFile").click();
};
$("restoreFile").onchange = async event => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file || !password || writing || changingVault) return;
  changingVault = $("restore").disabled = true;
  let next;
  try {
    const backup = JSON.parse(await file.text());
    if (backup.format !== "personal-tracker-encrypted-backup") throw new Error("Invalid backup format");
    const secret = prompt("请输入创建这份备份时使用的密码");
    if (!secret) return;
    next = await unseal(backup, secret);
    if (!confirm("将恢复 " + next.length + " 条档案并覆盖当前记录。请确认已备份当前数据。继续吗？")) return;
    await persist(next, password);
    records = next;
    render();
    toast("恢复成功");
  } catch {
    toast(next ? "本地保存失败，原有记录未被覆盖。" : "无法读取备份。请检查文件和备份密码。");
  } finally {
    changingVault = $("restore").disabled = false;
  }
};

prepareLock();
