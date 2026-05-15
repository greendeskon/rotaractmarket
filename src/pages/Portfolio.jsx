import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Portfolio() {
    const { user, userData } = useAuth();
    const nav = useNavigate();
    const [markets, setMarkets] = useState({});
    const [myTrades, setMyTrades] = useState([]);
    const [parlays, setParlays] = useState([]);

    useEffect(() => {
        const u1 = onSnapshot(collection(db,"markets"), s => { const m={}; s.docs.forEach(d=>{m[d.id]={id:d.id,...d.data()}}); setMarkets(m); });
        return u1;
    }, []);

    useEffect(() => {
        if(!user) return;
        const u1 = onSnapshot(query(collection(db,"trades"),where("userId","==",user.uid)), s => {
            const all = s.docs.map(d=>d.data());
            all.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
            setMyTrades(all);
        });
        const u2 = onSnapshot(query(collection(db,"parlays"),where("userId","==",user.uid)), s => {
            setParlays(s.docs.map(d=>({id:d.id,...d.data()})));
        });
        return ()=>{u1();u2();};
    }, [user]);

    // Auto-settle parlays
    useEffect(() => {
        if(!Object.keys(markets).length) return;
        parlays.filter(p=>p.status==="pending").forEach(async p => {
            const allSettled = p.legs.every(l => markets[l.marketId]?.status==="settled");
            if(!allSettled) return;
            const allWon = p.legs.every(l => {
                const m = markets[l.marketId];
                if(l.candidate) return m.outcome===l.candidate;
                return m.outcome===l.side;
            });
            try {
                await updateDoc(doc(db,"parlays",p.id), {status:allWon?"won":"lost"});
                if(allWon) {
                    const uSnap = await getDoc(doc(db,"users",user.uid));
                    if(uSnap.exists()) await updateDoc(doc(db,"users",user.uid), {balance:Math.round((uSnap.data().balance+p.potentialPayout)*100)/100});
                }
            } catch(e){console.error(e);}
        });
    }, [parlays, markets, user]);

    const pf = userData?.portfolio || {};
    // Build positions for both binary and race markets
    const positions = Object.entries(pf).map(([key, pos]) => {
        if(key.includes(":")) {
            // Race position: key = "race_gensec:arshita"
            const [mId, candKey] = key.split(":");
            const m = markets[mId];
            if(!m || m.type!=="race") return null;
            const cand = m.candidates?.[candKey];
            if(!cand) return null;
            const tp = Object.values(m.candidates).reduce((s,c)=>s+c.shares,0);
            const cp = cand.shares/tp;
            const cv = Math.round(pos.shares*cp*100)/100;
            const inv = Math.round((pos.avgCost||0)*pos.shares*100)/100;
            return { key, mId, isRace:true, candidateName:cand.name, shares:pos.shares, avgCost:pos.avgCost, currentPrice:Math.round(cp*100), currentValue:cv, invested:inv, pnl:Math.round((cv-inv)*100)/100, market:m, settled:m.status==="settled", won:m.outcome===candKey };
        } else {
            // Binary position
            const m = markets[key];
            if(!m) return null;
            const t = m.yesShares+m.noShares;
            const cp = pos.side==="yes"?m.yesShares/t:m.noShares/t;
            const cv = Math.round(pos.shares*cp*100)/100;
            const inv = Math.round((pos.avgCost||0)*pos.shares*100)/100;
            return { key, mId:key, isRace:false, side:pos.side, shares:pos.shares, avgCost:pos.avgCost, currentPrice:Math.round(cp*100), currentValue:cv, invested:inv, pnl:Math.round((cv-inv)*100)/100, market:m, settled:m.status==="settled", won:m.outcome===pos.side };
        }
    }).filter(Boolean);

    const totalVal = positions.reduce((s,p)=>s+p.currentValue,0);
    const totalPnl = positions.reduce((s,p)=>s+p.pnl,0);

    return (
        <div style={{background:"#09090b",minHeight:"100vh"}}>
            <div style={{maxWidth:580,margin:"0 auto",padding:"28px 16px 60px"}}>
                <h1 style={{color:"#e4e4e7",fontSize:20,fontWeight:600,margin:"0 0 24px"}}>Portfolio</h1>

                <div style={{display:"flex",gap:8,marginBottom:28}}>
                    <SC label="Balance" value={`₹${(userData?.balance??0).toLocaleString()}`} color="#e4e4e7"/>
                    <SC label="Invested" value={`₹${totalVal.toFixed(0)}`} color="#818cf8"/>
                    <SC label="P&L" value={`${totalPnl>=0?"+":""}₹${totalPnl.toFixed(0)}`} color={totalPnl>=0?"#34d399":"#f87171"}/>
                </div>

                <Sec title={`POSITIONS (${positions.length})`}>
                    {positions.length===0 ? <Empty text="No positions — go trade!"/> : positions.map(p => (
                        <div key={p.key} onClick={()=>nav(`/markets/${p.mId}`)} style={{background:"#0c0c0f",borderRadius:6,padding:"10px 12px",marginBottom:4,cursor:"pointer"}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{color:"#d4d4d8",fontSize:13,fontWeight:500}}>
                                    {p.isRace ? `${p.candidateName} — ${p.market.title}` : p.market.title}
                                </span>
                                <span style={{color:p.pnl>=0?"#34d399":"#f87171",fontSize:13,fontWeight:600}}>{p.pnl>=0?"+":""}₹{p.pnl.toFixed(1)}</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#52525b"}}>
                                <span>{p.shares} {p.isRace?"shares":p.side.toUpperCase()} @ {p.currentPrice}¢</span>
                                <span>₹{p.currentValue.toFixed(1)}</span>
                            </div>
                            {p.settled && <div style={{marginTop:4,fontSize:11,fontWeight:600,color:p.won?"#34d399":"#f87171"}}>{p.won?"✓ Won":"✗ Lost"}</div>}
                        </div>
                    ))}
                </Sec>

                {parlays.length>0 && (
                    <Sec title={`PARLAYS (${parlays.length})`}>
                        {parlays.map(p => (
                            <div key={p.id} style={{background:"#0c0c0f",borderRadius:6,padding:"10px 12px",marginBottom:6}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                                    <span style={{color:"#818cf8",fontWeight:600,fontSize:12}}>{p.legs?.length}-leg · {p.multiplier}×</span>
                                    <span style={{fontSize:11,fontWeight:700,color:p.status==="pending"?"#fbbf24":p.status==="won"?"#34d399":"#f87171"}}>{p.status.toUpperCase()}</span>
                                </div>
                                {p.legs?.map((l,i) => {
                                    const m = markets[l.marketId];
                                    const resolved = m?.status==="settled";
                                    const won = resolved && (l.candidate ? m.outcome===l.candidate : m.outcome===l.side);
                                    return (
                                        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",color:"#71717a"}}>
                                            <span style={{color:"#d4d4d8"}}>{l.title || l.marketId}</span>
                                            <span>{resolved?(won?"✓":"✗"):`${l.oddsAtTime}¢`}</span>
                                        </div>
                                    );
                                })}
                                <div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:"1px solid #1a1a1f",fontSize:12}}>
                                    <span style={{color:"#52525b"}}>Stake ₹{p.stake}</span>
                                    <span style={{color:p.status==="won"?"#34d399":"#a1a1aa",fontWeight:600}}>{p.status==="won"?`Won ₹${p.potentialPayout}`:`Potential ₹${p.potentialPayout}`}</span>
                                </div>
                            </div>
                        ))}
                    </Sec>
                )}

                <Sec title="TRADE HISTORY">
                    {myTrades.length===0 ? <Empty text="No trades yet"/> : myTrades.slice(0,30).map((t,i) => {
                        const m = markets[t.marketId];
                        const label = t.candidate ? `${m?.candidates?.[t.candidate]?.name||t.candidate} — ${m?.title||""}` : `${t.shares} ${t.side?.toUpperCase()} — ${m?.title||t.marketId}`;
                        return (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #141416",fontSize:13}}>
                                <div><span style={{color:t.type==="buy"?"#34d399":"#f87171",fontWeight:600}}>{t.type==="buy"?"BUY":"SELL"}</span><span style={{color:"#71717a",marginLeft:8}}>{label}</span></div>
                                <span style={{color:"#52525b"}}>₹{t.cost?.toFixed(1)||t.payout?.toFixed(1)||"—"}</span>
                            </div>
                        );
                    })}
                </Sec>
            </div>
        </div>
    );
}

function SC({label,value,color}) { return <div style={{flex:1,background:"#111113",border:"1px solid #1a1a1f",borderRadius:10,padding:"16px 14px"}}><div style={{color:"#52525b",fontSize:11,fontWeight:600,marginBottom:6}}>{label}</div><div style={{color,fontSize:20,fontWeight:700}}>{value}</div></div>; }
function Sec({title,children}) { return <div style={{marginBottom:24}}><div style={{color:"#71717a",fontSize:11,fontWeight:600,marginBottom:10,letterSpacing:0.5}}>{title}</div>{children}</div>; }
function Empty({text}) { return <div style={{color:"#3f3f46",fontSize:13,padding:"16px 0"}}>{text}</div>; }