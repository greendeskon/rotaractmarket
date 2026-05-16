import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot, runTransaction, collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";
import { useParlay } from "../context/ParlayContext";

export default function MarketDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const { user, userData } = useAuth();
    const { addLeg, legs } = useParlay();
    const [market, setMarket] = useState(null);
    const [shares, setShares] = useState(10);
    const [action, setAction] = useState("buy");
    const [sel, setSel] = useState(null); // selected candidate key for race
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [trades, setTrades] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, "trades"), where("marketId", "==", id)), snap => {
            const tr = snap.docs.map(d => d.data());
            tr.sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            setTrades(tr);
        });
        return unsub;
    }, [id]);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "markets", id), s => { if (s.exists()) setMarket({ id: s.id, ...s.data() }); });
        return unsub;
    }, [id]);

    if (!market) return <div style={{ background:"#09090b", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#52525b" }}>Loading…</div>;

    const isRace = market.type === "race";

    // ── RACE HELPERS ──
    const cands = market.candidates || {};
    const entries = Object.entries(cands);
    const totalPool = entries.reduce((s,[,c]) => s + c.shares, 0);
    const sorted = entries.map(([k,c]) => ({ key:k, name:c.name, shares:c.shares, pct: totalPool > 0 ? Math.round(c.shares/totalPool*100) : 0 })).sort((a,b) => b.pct - a.pct);
    const selData = sel ? sorted.find(d => d.key === sel) : null;
    const racePos = sel ? userData?.portfolio?.[`${id}:${sel}`] : null;

    // ── BINARY HELPERS ──
    const total = (market.yesShares||0) + (market.noShares||0);
    const yesP = total > 0 ? market.yesShares/total : 0.5;
    const yes = Math.round(yesP*100);
    const binPos = userData?.portfolio?.[id];

    function avg(pool, tot, n, buy) {
        const pb = pool/tot;
        const np = buy ? pool+n : pool-n;
        const nt = buy ? tot+n : tot-n;
        if(nt<=0||np<=0) return pb;
        return (pb + np/nt)/2;
    }

    async function tradeRace(candidateKey) {
        setBusy(true); setMsg(null);
        try {
            const mRef = doc(db,"markets",id), uRef = doc(db,"users",user.uid);
            let rec = {};
            await runTransaction(db, async t => {
                const m=(await t.get(mRef)).data(), u=(await t.get(uRef)).data();
                if(m.status!=="open") throw new Error("Market not open");
                const cs = m.candidates, c = cs[candidateKey];
                const tp = Object.values(cs).reduce((s,x)=>s+x.shares,0);
                const pb = c.shares/tp;
                if(action==="buy") {
                    const pa = (c.shares+shares)/(tp+shares);
                    const cost = Math.round(shares*(pb+pa)/2*100)/100;
                    if(u.balance<cost) throw new Error("Insufficient balance");
                    const updated = {...cs}; updated[candidateKey] = {...c, shares:c.shares+shares};
                    const pKey = `${id}:${candidateKey}`, pf = {...u.portfolio};
                    const pos = pf[pKey]||{shares:0,avgCost:0};
                    const ns = pos.shares+shares;
                    pf[pKey] = {shares:ns, avgCost:Math.round(((pos.avgCost||0)*pos.shares+cost)/ns*100)/100};
                    t.update(mRef,{candidates:updated});
                    t.update(uRef,{balance:Math.round((u.balance-cost)*100)/100, portfolio:pf});
                    rec = {type:"buy",candidate:candidateKey,shares,cost,price:Math.round(pb*100)};
                } else {
                    const pKey = `${id}:${candidateKey}`, pos = u.portfolio?.[pKey];
                    if(!pos||pos.shares<shares) throw new Error("Not enough shares");
                    if(c.shares-shares<1) throw new Error("Pool minimum");
                    const pa = (c.shares-shares)/(tp-shares);
                    const pay = Math.round(shares*(pb+pa)/2*100)/100;
                    const updated = {...cs}; updated[candidateKey] = {...c, shares:c.shares-shares};
                    const pf = {...u.portfolio};
                    const rem = pos.shares-shares;
                    if(rem<=0) delete pf[pKey]; else pf[pKey] = {...pos, shares:rem};
                    t.update(mRef,{candidates:updated});
                    t.update(uRef,{balance:Math.round((u.balance+pay)*100)/100, portfolio:pf});
                    rec = {type:"sell",candidate:candidateKey,shares,payout:pay,price:Math.round(pb*100)};
                }
            });
            await addDoc(collection(db,"trades"),{userId:user.uid,marketId:id,...rec,timestamp:serverTimestamp()});
            setMsg({ok:true,text:rec.type==="buy"?`Bought ${shares} ${cands[candidateKey].name} for ₹${rec.cost}`:`Sold ${shares} ${cands[candidateKey].name} for ₹${rec.payout}`});
        } catch(e) { setMsg({ok:false,text:e.message}); }
        setBusy(false);
    }

    async function tradeBinary(side) {
        setBusy(true); setMsg(null);
        try {
            const mRef = doc(db,"markets",id), uRef = doc(db,"users",user.uid);
            let rec = {};
            await runTransaction(db, async t => {
                const m=(await t.get(mRef)).data(), u=(await t.get(uRef)).data();
                if(m.status!=="open") throw new Error("Market not open");
                const tot = m.yesShares+m.noShares;
                const pool = side==="yes"?m.yesShares:m.noShares;
                const pb = pool/tot;
                if(action==="buy") {
                    const pa = (pool+shares)/(tot+shares);
                    const cost = Math.round(shares*(pb+pa)/2*100)/100;
                    if(u.balance<cost) throw new Error("Insufficient balance");
                    const pf = {...u.portfolio}||{};
                    const pos = pf[id]||{shares:0,side,avgCost:0};
                    if(pos.shares>0&&pos.side!==side) throw new Error("Hold "+pos.side.toUpperCase()+" — sell first");
                    const ns = pos.shares+shares;
                    pf[id] = {shares:ns,side,avgCost:Math.round(((pos.avgCost||0)*pos.shares+cost)/ns*100)/100};
                    t.update(mRef, side==="yes"?{yesShares:m.yesShares+shares}:{noShares:m.noShares+shares});
                    t.update(uRef,{balance:Math.round((u.balance-cost)*100)/100,portfolio:pf});
                    rec = {type:"buy",side,shares,cost,price:Math.round(pb*100)};
                } else {
                    const pos = u.portfolio?.[id];
                    if(!pos||pos.side!==side||pos.shares<shares) throw new Error("Not enough shares");
                    const p2 = side==="yes"?m.yesShares:m.noShares;
                    if(p2-shares<1) throw new Error("Pool minimum");
                    const pa = (pool-shares)/(tot-shares);
                    const pay = Math.round(shares*(pb+pa)/2*100)/100;
                    const pf = {...u.portfolio};
                    const rem = pos.shares-shares;
                    if(rem<=0) delete pf[id]; else pf[id] = {...pos,shares:rem};
                    t.update(mRef, side==="yes"?{yesShares:m.yesShares-shares}:{noShares:m.noShares-shares});
                    t.update(uRef,{balance:Math.round((u.balance+pay)*100)/100,portfolio:pf});
                    rec = {type:"sell",side,shares,payout:pay,price:Math.round(pb*100)};
                }
            });
            await addDoc(collection(db,"trades"),{userId:user.uid,marketId:id,...rec,timestamp:serverTimestamp()});
            setMsg({ok:true,text:rec.type==="buy"?`Bought ${shares} ${side.toUpperCase()} for ₹${rec.cost}`:`Sold ${shares} for ₹${rec.payout}`});
        } catch(e) { setMsg({ok:false,text:e.message}); }
        setBusy(false);
    }

    const st = {open:"Trading Open",frozen:"Frozen",settled:market.outcome?`Settled: ${market.outcome.toUpperCase()}`:"Settled"};
    const stc = {open:"#34d399",frozen:"#fbbf24",settled:"#52525b"};

    return (
        <div style={{background:"#09090b",minHeight:"100vh"}}>
            <div style={{maxWidth:580,margin:"0 auto",padding:"24px 16px 80px"}}>
                <button onClick={()=>nav("/markets")} style={{background:"none",border:"none",color:"#52525b",cursor:"pointer",fontSize:13,marginBottom:16,padding:0}}>← Back</button>
                <h1 style={{color:"#e4e4e7",fontSize:20,fontWeight:600,margin:"0 0 4px"}}>{market.title}</h1>
                <div style={{display:"flex",gap:8,marginBottom:20}}>
                    <span style={{color:"#52525b",fontSize:12}}>{market.category}</span>
                    <span style={{color:stc[market.status],fontSize:11,fontWeight:600}}>{st[market.status]}</span>
                </div>

                <Box title="ODDS HISTORY">
                    <MarketChart market={market} trades={trades} isRace={isRace} yesPrice={yes} />
                </Box>

                {isRace ? (<>
                    {/* Race chart */}
                    <Box title="CANDIDATES">
                        {sorted.map(d => {
                            const isSel = sel===d.key;
                            const pos = userData?.portfolio?.[`${id}:${d.key}`];
                            return (
                                <div key={d.key} onClick={()=>setSel(d.key)} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,cursor:"pointer",padding:"4px 6px",borderRadius:6,background:isSel?"rgba(129,140,248,0.08)":"transparent"}}>
                                    <span style={{width:80,fontSize:12,color:isSel?"#818cf8":"#a1a1aa",fontWeight:isSel?600:400,textAlign:"right",flexShrink:0}}>{d.name.split(" ")[0]}</span>
                                    <div style={{flex:1,height:6,background:"#1a1a1f",borderRadius:3,overflow:"hidden"}}>
                                        <div style={{width:`${d.pct}%`,height:"100%",background:isSel?"#818cf8":"#3f3f46",borderRadius:3,transition:"width 0.4s"}}/>
                                    </div>
                                    <span style={{fontSize:12,color:isSel?"#818cf8":"#71717a",fontWeight:600,width:32}}>{d.pct}¢</span>
                                    {pos && <span style={{fontSize:10,color:"#818cf8"}}>({pos.shares})</span>}
                                </div>
                            );
                        })}
                        {!sel && <div style={{color:"#52525b",fontSize:12,marginTop:8,textAlign:"center"}}>↑ Click a candidate to trade</div>}
                    </Box>

                    {/* Trade selected candidate */}
                    {sel && selData && market.status==="open" && (<>
                        <Box title={`TRADE — ${selData.name}`}>
                            <Payoff odds={selData.pct} shares={shares} pool={selData.shares} total={totalPool} action={action}/>
                            <Toggle action={action} setAction={setAction}/>
                            <SharesInput shares={shares} setShares={setShares}/>
                            <button disabled={busy} onClick={()=>tradeRace(sel)} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",cursor:busy?"wait":"pointer",background:"#818cf8",color:"#09090b",fontWeight:700,fontSize:14,opacity:busy?0.5:1,marginTop:8}}>
                                {action==="buy"?`Buy ${selData.name.split(" ")[0]} — ₹${Math.round(shares*avg(selData.shares,totalPool,shares,true)*100)/100}`:`Sell — ₹${Math.round(shares*avg(selData.shares,totalPool,shares,false)*100)/100}`}
                            </button>
                            {msg && <Msg msg={msg}/>}
                        </Box>
                        {/* Parlay */}
                        <button onClick={()=>{const e=addLeg(id,`${selData.name} wins ${market.title}`,market.category,"yes",selData.pct,{type:"race",candidate:sel});if(e)alert(e);}}
                            style={{width:"100%",padding:"10px",borderRadius:6,border:"1px solid #27272a",background:"transparent",color:"#818cf8",fontSize:12,fontWeight:600,cursor:"pointer",marginTop:8}}>
                            {legs.find(l=>l.marketId===id&&l.extra?.candidate===sel)?"✓ In Parlay":`+ Parlay: ${selData.name.split(" ")[0]} wins`}
                        </button>
                    </>)}

                    {/* Position */}
                    {sel && racePos && (
                        <Box title="YOUR POSITION">
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:14}}>
                                <span style={{color:"#818cf8",fontWeight:600}}>{racePos.shares} shares of {selData?.name}</span>
                                <span style={{color:"#71717a"}}>Avg ₹{racePos.avgCost?.toFixed(2)}/share</span>
                            </div>
                            <div style={{display:"flex",gap:6,marginTop:8}}>
                                <MiniBox label="If wins" value={`+₹${(racePos.shares - racePos.shares*(racePos.avgCost||0)).toFixed(0)}`} sub={`Payout ₹${racePos.shares}`} color="#34d399"/>
                                <MiniBox label="If loses" value={`-₹${(racePos.shares*(racePos.avgCost||0)).toFixed(0)}`} sub="Worth ₹0" color="#f87171"/>
                            </div>
                        </Box>
                    )}
                </>) : (<>
                    {/* Binary odds */}
                    <div style={{display:"flex",gap:8,marginBottom:20}}>
                        <div style={{flex:1,background:"#111113",border:"1px solid #1a1a1f",borderRadius:10,padding:16,textAlign:"center"}}>
                            <div style={{color:"#34d399",fontSize:28,fontWeight:700}}>{yes}¢</div><div style={{color:"#52525b",fontSize:12,marginTop:4}}>Yes</div>
                        </div>
                        <div style={{flex:1,background:"#111113",border:"1px solid #1a1a1f",borderRadius:10,padding:16,textAlign:"center"}}>
                            <div style={{color:"#f87171",fontSize:28,fontWeight:700}}>{100-yes}¢</div><div style={{color:"#52525b",fontSize:12,marginTop:4}}>No</div>
                        </div>
                    </div>

                    {binPos && (
                        <Box title="YOUR POSITION">
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:14}}>
                                <span style={{color:binPos.side==="yes"?"#34d399":"#f87171",fontWeight:600}}>{binPos.shares} {binPos.side.toUpperCase()}</span>
                                <span style={{color:"#71717a"}}>Avg ₹{binPos.avgCost?.toFixed(2)}/share</span>
                            </div>
                        </Box>
                    )}

                    {market.status==="open" && (
                        <Box title="TRADE">
                            <Payoff odds={yes} shares={shares} pool={market.yesShares} total={total} action={action} isYesNo/>
                            <Toggle action={action} setAction={setAction}/>
                            <SharesInput shares={shares} setShares={setShares}/>
                            <div style={{display:"flex",gap:8,marginTop:8}}>
                                <button disabled={busy} onClick={()=>tradeBinary("yes")} style={{flex:1,padding:"12px",borderRadius:8,border:"none",cursor:"pointer",background:"#34d399",color:"#09090b",fontWeight:700,fontSize:14,opacity:busy?0.5:1}}>
                                    Yes — ₹{Math.round(shares*avg(market.yesShares,total,shares,action==="buy")*100)/100}
                                </button>
                                <button disabled={busy} onClick={()=>tradeBinary("no")} style={{flex:1,padding:"12px",borderRadius:8,border:"none",cursor:"pointer",background:"#f87171",color:"#09090b",fontWeight:700,fontSize:14,opacity:busy?0.5:1}}>
                                    No — ₹{Math.round(shares*avg(market.noShares,total,shares,action==="buy")*100)/100}
                                </button>
                            </div>
                            {msg && <Msg msg={msg}/>}
                        </Box>
                    )}
                </>)}
            </div>
        </div>
    );
}

function Box({title,children}) {
    return <div style={{background:"#111113",border:"1px solid #1a1a1f",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
        <div style={{color:"#71717a",fontSize:11,fontWeight:600,marginBottom:10,letterSpacing:0.5}}>{title}</div>{children}
    </div>;
}
function Toggle({action,setAction}) {
    return <div style={{display:"flex",gap:4,marginBottom:12,background:"#0c0c0f",borderRadius:6,padding:3}}>
        {["buy","sell"].map(a=><button key={a} onClick={()=>setAction(a)} style={{flex:1,padding:"7px",borderRadius:4,border:"none",cursor:"pointer",background:action===a?"#1e1e24":"transparent",color:action===a?"#e4e4e7":"#52525b",fontWeight:600,fontSize:13,textTransform:"capitalize"}}>{a}</button>)}
    </div>;
}
function SharesInput({shares,setShares}) {
    return <>
        <input type="number" min={1} value={shares} onChange={e=>setShares(Math.max(1,parseInt(e.target.value)||1))} style={{background:"#0c0c0f",border:"1px solid #27272a",borderRadius:6,padding:"10px 12px",color:"#e4e4e7",fontSize:14,width:"100%",boxSizing:"border-box",outline:"none",marginBottom:8}}/>
        <div style={{display:"flex",gap:6,marginBottom:4}}>
            {[5,10,25,50,100].map(n=><button key={n} onClick={()=>setShares(n)} style={{flex:1,padding:"6px",borderRadius:4,border:shares===n?"1px solid #818cf8":"1px solid #27272a",background:shares===n?"rgba(129,140,248,0.1)":"#0c0c0f",color:shares===n?"#818cf8":"#71717a",fontSize:12,fontWeight:600,cursor:"pointer"}}>{n}</button>)}
        </div>
    </>;
}
function Payoff({odds,shares,pool,total,action,isYesNo}) {
    if(action!=="buy") return null;
    function calc(o,p,t) { const pb=p/t,pa=(p+shares)/(t+shares),a=(pb+pa)/2,cost=Math.round(shares*a*100)/100; return {odds:o,cost,payout:shares,profit:Math.round((shares-cost)*100)/100,mult:cost>0?(shares/cost).toFixed(2):"—",ret:cost>0?Math.round((shares-cost)/cost*100):0,be:Math.round(cost/shares*100)}; }
    if(isYesNo) {
        const y=calc(odds,pool,total), n=calc(100-odds,total-pool,total);
        return <div style={{display:"flex",gap:6,marginBottom:12}}>
            <PayoffCard side="YES" color="#34d399" {...y}/>
            <PayoffCard side="NO" color="#f87171" {...n}/>
        </div>;
    }
    const d = calc(odds,pool,total);
    return <div style={{marginBottom:12}}><PayoffCard side="BUY" color="#818cf8" {...d}/></div>;
}
function PayoffCard({side,color,odds,cost,payout,profit,mult,ret,be}) {
    const R=({l,v,c})=><div style={{display:"flex",justifyContent:"space-between",color:"#52525b",marginBottom:3,fontSize:12}}><span>{l}</span><span style={{color:c||"#a1a1aa",fontWeight:500}}>{v}</span></div>;
    return <div style={{flex:1,background:"#0c0c0f",borderRadius:8,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color,fontWeight:700,fontSize:14}}>{side}</span><span style={{color:"#818cf8",fontWeight:700,fontSize:16}}>{mult}×</span></div>
        <R l="Current odds" v={`${odds}¢`} c={color}/><R l="You pay" v={`₹${cost}`}/><R l="Payout if wins" v={`₹${payout}`} c="#e4e4e7"/><R l="Profit" v={`+₹${profit} (${ret}%)`} c="#34d399"/><R l="Loss" v={`-₹${cost}`} c="#f87171"/>
        <div style={{borderTop:"1px solid #1a1a1f",marginTop:4,paddingTop:4}}><R l="Break-even" v={`${be}%`} c="#818cf8"/></div>
    </div>;
}
function MiniBox({label,value,sub,color}) {
    return <div style={{flex:1,background:"#0c0c0f",borderRadius:6,padding:"10px 12px"}}><div style={{color:"#52525b",fontSize:11,marginBottom:4}}>{label}</div><div style={{color,fontWeight:700,fontSize:16}}>{value}</div><div style={{color:"#3f3f46",fontSize:11,marginTop:2}}>{sub}</div></div>;
}
function Msg({msg}) {
    return <div style={{marginTop:10,padding:"8px 12px",borderRadius:6,fontSize:13,background:msg.ok?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",color:msg.ok?"#34d399":"#f87171"}}>{msg.text}</div>;
}

function MarketChart({ market, trades, isRace, yesPrice }) {
    if (!trades || trades.length === 0) {
        return <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#52525b", fontSize: 13 }}>No trades yet to show chart</div>;
    }

    let data = [];
    if (!isRace) {
        data = trades.map((t, i) => {
            let p = t.price;
            if (t.side === "no") p = 100 - p;
            return { index: i, Yes: p };
        });
        data.push({ index: trades.length, Yes: yesPrice });
    } else {
        data = trades.map((t, i) => {
            const candName = market.candidates?.[t.candidate]?.name.split(" ")[0] || t.candidate;
            return { index: i, [candName]: t.price };
        });
        const cur = { index: trades.length };
        const tot = Object.values(market.candidates).reduce((s, c) => s + c.shares, 0);
        Object.entries(market.candidates).forEach(([k, c]) => {
            cur[c.name.split(" ")[0]] = tot > 0 ? Math.round((c.shares/tot)*100) : 0;
        });
        data.push(cur);
    }

    const colors = ["#818cf8", "#34d399", "#f87171", "#fbbf24", "#c084fc", "#60a5fa"];

    return (
        <div style={{ height: 160, width: "100%", marginTop: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis dataKey="index" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                        contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8, fontSize: 12, color: "#e4e4e7" }}
                        itemStyle={{ fontWeight: 600 }}
                        labelStyle={{ display: "none" }}
                        cursor={{ stroke: "#27272a", strokeWidth: 1 }}
                    />
                    {!isRace ? (
                        <Line type="monotone" dataKey="Yes" stroke="#34d399" strokeWidth={3} dot={false} isAnimationActive={false} />
                    ) : (
                        Object.values(market.candidates).map((c, i) => (
                            <Line key={c.name} type="monotone" dataKey={c.name.split(" ")[0]} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                        ))
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}