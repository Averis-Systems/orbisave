import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, ArrowDownToLine, RefreshCw,
  CreditCard, Video, BookOpen, BarChart2, Bell, Settings,
  TrendingUp, AlertCircle, CheckCircle, Clock, Shield,
  Menu, X, Search, ChevronDown, MoreVertical, Filter,
  Download, UserCheck, UserX, Plus, Eye, Check,
  Calendar, Activity, ArrowUp, ArrowDown, Wallet,
  FileText, Lock, ChevronRight, Zap, AlertTriangle,
  Phone, MapPin, Star, ThumbsUp, ThumbsDown, Info,
  LogOut, User, Printer, RotateCcw, Send, Mic,
  CheckSquare, XCircle, Circle, Layers, PieChart as PieIcon,
  Building2, Globe, Hash, Banknote, ClipboardList, Vote
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

// ─── PALETTE ────────────────────────────────────────────────────────────────
const G = {
  900: "#012b0f",
  800: "#014d1b",
  700: "#016828",
  600: "#018a35",
  500: "#009A44",  // Safaricom primary
  400: "#00b84f",
  300: "#33cc72",
  200: "#80e3aa",
  100: "#ccf2de",
  50:  "#f0fbf4",
};

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const GROUP = {
  name: "Kisumu Agri Chama",
  id: "KAC-2025-001",
  location: "Kisumu, Western Kenya",
  started: "Jan 2025",
  chairperson: "David Omondi",
  treasurer: "Faith Otieno",
  secretary: "James Mwangi",
  totalMembers: 20,
  activeMembers: 18,
  totalPool: 487500,
  monthlyContribution: 5000,
  nextPayoutMember: "Grace Akinyi",
  nextPayoutDate: "12 days",
  nextPayoutAmount: 100000,
  cycleMonth: 9,
  totalCycles: 20,
  groupHealth: 87,
  trustAccount: "KCB Bank – Trust A/C #00847291",
  floatBalance: 12400,
  loanPoolBalance: 45000,
};

const MEMBERS = [
  { id:1, name:"Grace Akinyi",    phone:"0712 345 678", status:"active", paid:true,  rotation:1, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:true,  kyc:"verified" },
  { id:2, name:"David Omondi",    phone:"0723 456 789", status:"active", paid:true,  rotation:2, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified", isChair:true },
  { id:3, name:"Faith Otieno",    phone:"0734 567 890", status:"active", paid:true,  rotation:3, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified", isTreasurer:true },
  { id:4, name:"James Mwangi",    phone:"0745 678 901", status:"active", paid:false, rotation:4, loanActive:true,  joinDate:"Jan 2025", contributions:8, missed:1,  nextPayout:false, kyc:"verified", isSecretary:true },
  { id:5, name:"Mary Wanjiku",    phone:"0756 789 012", status:"active", paid:true,  rotation:5, loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
  { id:6, name:"Peter Kamau",     phone:"0767 890 123", status:"active", paid:false, rotation:6, loanActive:false, joinDate:"Jan 2025", contributions:7, missed:2,  nextPayout:false, kyc:"verified" },
  { id:7, name:"Ann Chebet",      phone:"0778 901 234", status:"active", paid:true,  rotation:7, loanActive:false, joinDate:"Feb 2025", contributions:8, missed:1,  nextPayout:false, kyc:"verified" },
  { id:8, name:"John Kipchoge",   phone:"0789 012 345", status:"active", paid:true,  rotation:8, loanActive:true,  joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
  { id:9, name:"Esther Nyambura", phone:"0790 123 456", status:"active", paid:false, rotation:9, loanActive:false, joinDate:"Jan 2025", contributions:6, missed:3,  nextPayout:false, kyc:"pending" },
  { id:10,name:"Paul Njoroge",    phone:"0701 234 567", status:"active", paid:true,  rotation:10,loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
  { id:11,name:"Lucy Atieno",     phone:"0712 345 679", status:"active", paid:true,  rotation:11,loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
  { id:12,name:"Robert Ochieng",  phone:"0723 456 780", status:"active", paid:true,  rotation:12,loanActive:false, joinDate:"Mar 2025", contributions:7, missed:0,  nextPayout:false, kyc:"verified" },
  { id:13,name:"Susan Wambui",    phone:"0734 567 891", status:"active", paid:false, rotation:13,loanActive:false, joinDate:"Jan 2025", contributions:8, missed:1,  nextPayout:false, kyc:"verified" },
  { id:14,name:"Charles Mutua",   phone:"0745 678 902", status:"active", paid:true,  rotation:14,loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
  { id:15,name:"Agnes Njeri",     phone:"0756 789 013", status:"active", paid:true,  rotation:15,loanActive:false, joinDate:"Feb 2025", contributions:8, missed:0,  nextPayout:false, kyc:"verified" },
  { id:16,name:"Samuel Kiplimo",  phone:"0767 890 124", status:"active", paid:true,  rotation:16,loanActive:false, joinDate:"Jan 2025", contributions:9, missed:0,  nextPayout:false, kyc:"verified" },
  { id:17,name:"Caroline Muthoni",phone:"0778 901 235", status:"active", paid:false, rotation:17,loanActive:false, joinDate:"Jan 2025", contributions:5, missed:4,  nextPayout:false, kyc:"pending" },
  { id:18,name:"Benjamin Oduya",  phone:"0789 012 346", status:"active", paid:true,  rotation:18,loanActive:false, joinDate:"Apr 2025", contributions:6, missed:0,  nextPayout:false, kyc:"verified" },
  { id:19,name:"Diana Cherotich", phone:"0790 123 457", status:"inactive",paid:false,rotation:19,loanActive:false, joinDate:"Jan 2025", contributions:3, missed:6,  nextPayout:false, kyc:"verified" },
  { id:20,name:"Michael Onyango", phone:"0701 234 568", status:"inactive",paid:false,rotation:20,loanActive:false, joinDate:"Jan 2025", contributions:4, missed:5,  nextPayout:false, kyc:"verified" },
];

const LOANS = [
  { id:"LN-001", member:"James Mwangi",   amount:15000, purpose:"Fertilizer purchase", requested:"Sep 28, 2025", status:"pending",  approvals:{chair:false,treasurer:false}, interest:10, term:"3 months", collateral:"Rotation payout" },
  { id:"LN-002", member:"John Kipchoge",  amount:8000,  purpose:"Medical emergency",   requested:"Oct 1, 2025",  status:"active",   approvals:{chair:true, treasurer:true},  interest:10, term:"2 months", disbursed:"Oct 3, 2025", repaid:3200, due:"Dec 3, 2025" },
  { id:"LN-003", member:"Mary Wanjiku",   amount:12000, purpose:"School fees",         requested:"Sep 15, 2025", status:"repaid",   approvals:{chair:true, treasurer:true},  interest:10, term:"2 months" },
  { id:"LN-004", member:"Esther Nyambura",amount:5000,  purpose:"Business stock",      requested:"Oct 2, 2025",  status:"pending",  approvals:{chair:false,treasurer:false}, interest:10, term:"1 month", collateral:"Savings record" },
];

const CONTRIBUTIONS_HISTORY = [
  { month:"Feb", collected:95000, target:100000 },
  { month:"Mar", collected:100000,target:100000 },
  { month:"Apr", collected:90000, target:100000 },
  { month:"May", collected:100000,target:100000 },
  { month:"Jun", collected:85000, target:100000 },
  { month:"Jul", collected:100000,target:100000 },
  { month:"Aug", collected:95000, target:100000 },
  { month:"Sep", collected:100000,target:100000 },
  { month:"Oct", collected:72000, target:100000 },
];

const TRANSACTIONS = [
  { id:"TXN-1021", date:"Oct 5, 2025",  type:"contribution", member:"David Omondi",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFJ7823K" },
  { id:"TXN-1020", date:"Oct 5, 2025",  type:"contribution", member:"Grace Akinyi",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFJ7822K" },
  { id:"TXN-1019", date:"Oct 5, 2025",  type:"contribution", member:"Faith Otieno",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFJ7821K" },
  { id:"TXN-1018", date:"Oct 3, 2025",  type:"loan_disburse",member:"John Kipchoge",   amount:8000,  direction:"out", status:"confirmed", ref:"MPesa:QFG5511J" },
  { id:"TXN-1017", date:"Oct 3, 2025",  type:"contribution", member:"Mary Wanjiku",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QFG5510J" },
  { id:"TXN-1016", date:"Oct 1, 2025",  type:"loan_repay",   member:"John Kipchoge",   amount:3200,  direction:"in",  status:"confirmed", ref:"MPesa:QFA3390A" },
  { id:"TXN-1015", date:"Sep 30, 2025", type:"payout",       member:"Charles Mutua",   amount:100000,direction:"out", status:"confirmed", ref:"MPesa:QEZ9001Z" },
  { id:"TXN-1014", date:"Sep 5, 2025",  type:"contribution", member:"Samuel Kiplimo",  amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QEE2341E" },
  { id:"TXN-1013", date:"Sep 5, 2025",  type:"contribution", member:"Lucy Atieno",     amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QEE2340E" },
  { id:"TXN-1012", date:"Sep 5, 2025",  type:"contribution", member:"Paul Njoroge",    amount:5000,  direction:"in",  status:"confirmed", ref:"MPesa:QEE2339E" },
];

const MEETINGS = [
  { id:"MTG-009", date:"Oct 12, 2025", time:"10:00 AM", type:"monthly",   status:"upcoming", agenda:["October contribution review","LN-001 loan approval vote","LN-004 loan approval vote","Q4 savings plan discussion"], attendance:null },
  { id:"MTG-008", date:"Sep 14, 2025", time:"10:00 AM", type:"monthly",   status:"completed",agenda:["September contributions","Charles Mutua payout confirmation","Loan engine policy update"],attendance:18 },
  { id:"MTG-007", date:"Aug 10, 2025", time:"10:00 AM", type:"monthly",   status:"completed",agenda:["August contributions","Seasonal farming review"],attendance:17 },
  { id:"MTG-006", date:"Jul 6, 2025",  time:"10:00 AM", type:"emergency", status:"completed",agenda:["Emergency: Esther Nyambura missed contributions","Member warning vote"],attendance:16 },
];

const ROTATION_SCHEDULE = [
  { position:1, member:"Grace Akinyi",    status:"upcoming", month:"Oct 2025", amount:100000 },
  { position:2, member:"James Mwangi",    status:"scheduled",month:"Nov 2025", amount:100000 },
  { position:3, member:"Mary Wanjiku",    status:"scheduled",month:"Dec 2025", amount:100000 },
  { position:4, member:"Ann Chebet",      status:"scheduled",month:"Jan 2026", amount:100000 },
  { position:5, member:"Faith Otieno",    status:"scheduled",month:"Feb 2026", amount:100000 },
  { position:6, member:"John Kipchoge",   status:"scheduled",month:"Mar 2026", amount:100000 },
  { position:7, member:"Lucy Atieno",     status:"scheduled",month:"Apr 2026", amount:100000 },
  { position:8, member:"Paul Njoroge",    status:"scheduled",month:"May 2026", amount:100000 },
];

const POOL_DATA = [
  { name:"Main Pool",   value:487500, color: G[500] },
  { name:"Loan Pool",  value:45000,  color: G[300] },
  { name:"Float",      value:12400,  color: G[200] },
];

const NOTIFICATIONS = [
  { id:1, type:"alert",   title:"3 members have not paid this month",             time:"2 hours ago",  read:false, action:"View Members" },
  { id:2, type:"approval",title:"Loan request LN-001 awaiting your approval",    time:"4 hours ago",  read:false, action:"Review Loan" },
  { id:3, type:"approval",title:"Loan request LN-004 awaiting your approval",    time:"1 day ago",    read:false, action:"Review Loan" },
  { id:4, type:"info",    title:"Grace Akinyi payout due in 12 days",            time:"1 day ago",    read:true,  action:"View Rotation" },
  { id:5, type:"warning", title:"Esther Nyambura KYC verification pending",       time:"2 days ago",   read:true,  action:"View Member" },
  { id:6, type:"meeting", title:"Monthly meeting scheduled for Oct 12, 10:00 AM",time:"3 days ago",   read:true,  action:"View Meeting" },
  { id:7, type:"success", title:"STK push batch sent to 20 members",             time:"5 days ago",   read:true,  action:null },
  { id:8, type:"success", title:"Charles Mutua payout KES 100,000 confirmed",    time:"7 days ago",   read:true,  action:"View Ledger" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => "KES " + Number(n).toLocaleString();
const initials = (name) => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const avatarColor = (name) => {
  const colors = [G[700],G[600],G[500],G[800],"#1a5c2e","#026632","#013d1d"];
  let h = 0; for(let c of name) h = (h*31+c.charCodeAt(0))%colors.length;
  return colors[Math.abs(h)];
};

// ─── NAV ITEMS ───────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard",     label:"Dashboard",      icon:LayoutDashboard, badge:null },
  { id:"members",       label:"Members",        icon:Users,            badge:null },
  { id:"contributions", label:"Contributions",  icon:Wallet,           badge:null },
  { id:"rotations",     label:"Rotations",      icon:RefreshCw,        badge:null },
  { id:"loans",         label:"Loans",          icon:CreditCard,       badge:2 },
  { id:"meetings",      label:"Meetings",       icon:Video,            badge:null },
  { id:"ledger",        label:"Ledger",         icon:BookOpen,         badge:null },
  { id:"reports",       label:"Reports",        icon:BarChart2,        badge:null },
  { id:"notifications", label:"Notifications",  icon:Bell,             badge:3 },
  { id:"settings",      label:"Settings",       icon:Settings,         badge:null },
];

// ─── COMPONENT: Avatar ───────────────────────────────────────────────────────
function Avatar({ name, size=36, ring=false }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:avatarColor(name),
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.35, fontWeight:700, color:"#fff",
      flexShrink:0,
      outline: ring ? `2px solid ${G[500]}` : "none",
      outlineOffset:2,
    }}>
      {initials(name)}
    </div>
  );
}

// ─── COMPONENT: Badge ────────────────────────────────────────────────────────
function Badge({ count }) {
  if(!count) return null;
  return (
    <span style={{
      background:"#e53e3e", color:"#fff", fontSize:10, fontWeight:700,
      borderRadius:99, padding:"1px 6px", minWidth:18, textAlign:"center",
      lineHeight:"16px",
    }}>{count}</span>
  );
}

// ─── COMPONENT: Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, trend, accent, wide }) {
  return (
    <div style={{
      background:"#fff",
      borderRadius:14,
      padding:"20px 24px",
      boxShadow:"0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,154,68,0.04)",
      gridColumn: wide ? "span 2" : "span 1",
      position:"relative",
      overflow:"hidden",
      borderTop:`3px solid ${accent||G[500]}`,
    }}>
      <div style={{position:"absolute",top:16,right:16,opacity:.07,transform:"scale(2.2)",transformOrigin:"top right"}}>
        <Icon size={36} color={G[500]} />
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{
          width:34,height:34,borderRadius:9,
          background:G[50],display:"flex",alignItems:"center",justifyContent:"center"
        }}>
          <Icon size={16} color={G[500]} />
        </div>
        <span style={{fontSize:12,fontWeight:600,color:"#6b7280",letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{fontSize:26,fontWeight:800,color:"#0d2416",letterSpacing:"-0.02em",marginBottom:4}}>{value}</div>
      {sub && <div style={{fontSize:12,color:trend==="up"?G[500]:trend==="down"?"#e53e3e":"#9ca3af",display:"flex",alignItems:"center",gap:4}}>
        {trend==="up"&&<ArrowUp size={11}/>}{trend==="down"&&<ArrowDown size={11}/>}{sub}
      </div>}
    </div>
  );
}

// ─── PAGE: Dashboard ─────────────────────────────────────────────────────────
function PageDashboard({ setPage }) {
  const paidCount = MEMBERS.filter(m=>m.paid&&m.status==="active").length;
  const activeMembers = MEMBERS.filter(m=>m.status==="active").length;
  const collectedThisMonth = paidCount * GROUP.monthlyContribution;

  return (
    <div>
      {/* Alert Banner */}
      <div style={{
        background:G[50],border:`1px solid ${G[200]}`,borderRadius:10,
        padding:"10px 16px",marginBottom:24,
        display:"flex",alignItems:"center",gap:12
      }}>
        <AlertCircle size={16} color={G[600]} />
        <span style={{fontSize:13,color:G[800],flex:1}}>
          <strong>{activeMembers - paidCount} members</strong> have not contributed this month. STK push sent. Next meeting: <strong>Oct 12, 2025</strong>.
        </span>
        <button onClick={()=>setPage("members")} style={{
          fontSize:12,fontWeight:600,color:G[600],background:"none",border:"none",cursor:"pointer",
          textDecoration:"underline"
        }}>View Members</button>
      </div>

      {/* Stat Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        <StatCard label="Total Pool Balance"  value={fmt(GROUP.totalPool)}      sub="Trust A/C: KCB"         icon={Banknote}     accent={G[500]} />
        <StatCard label="This Month's Collection" value={fmt(collectedThisMonth)} sub={`${paidCount}/${activeMembers} paid`} icon={ArrowDownToLine} accent={G[400]} trend="up"/>
        <StatCard label="Next Payout"         value={fmt(GROUP.nextPayoutAmount)} sub={`${GROUP.nextPayoutMember} · ${GROUP.nextPayoutDate}`} icon={RefreshCw} accent="#f59e0b" />
        <StatCard label="Loan Pool"           value={fmt(GROUP.loanPoolBalance)} sub="2 active loans"        icon={CreditCard}   accent={G[600]} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
        <StatCard label="Active Members"      value={`${GROUP.activeMembers}/${GROUP.totalMembers}`} sub="2 inactive members" icon={Users} accent={G[700]}/>
        <StatCard label="Pending Approvals"   value="2" sub="Loan requests"       icon={ClipboardList} accent="#e53e3e" />
        <StatCard label="Group Health Score"  value={`${GROUP.groupHealth}%`}     sub="Collection rate"      icon={Activity}     accent={G[500]} trend="up"/>
      </div>

      {/* Charts Row */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:24}}>
        {/* Collection Trend */}
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#0d2416"}}>Monthly Collection Trend</div>
              <div style={{fontSize:12,color:"#6b7280"}}>Feb – Oct 2025</div>
            </div>
            <div style={{fontSize:12,color:G[500],fontWeight:600}}>Target: KES 100,000</div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={CONTRIBUTIONS_HISTORY} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={G[500]} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={G[500]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false} tickFormatter={v=>v/1000+"k"}/>
              <Tooltip formatter={(v)=>fmt(v)} contentStyle={{fontSize:12,borderRadius:8,border:"1px solid #e5e7eb"}}/>
              <Area type="monotone" dataKey="target" stroke="#e5e7eb" strokeDasharray="4 4" fill="none" strokeWidth={1}/>
              <Area type="monotone" dataKey="collected" stroke={G[500]} fill="url(#cg)" strokeWidth={2.5} dot={{fill:G[500],r:3}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pool Breakdown */}
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:4}}>Fund Allocation</div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:16}}>Current pool breakdown</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={POOL_DATA} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" strokeWidth={0}>
                {POOL_DATA.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip formatter={(v)=>fmt(v)} contentStyle={{fontSize:11,borderRadius:8}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
            {POOL_DATA.map(d=>(
              <div key={d.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/>
                  <span style={{fontSize:12,color:"#6b7280"}}>{d.name}</span>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:"#0d2416"}}>{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Recent Transactions */}
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0d2416"}}>Recent Transactions</div>
            <button onClick={()=>setPage("ledger")} style={{fontSize:12,color:G[500],fontWeight:600,background:"none",border:"none",cursor:"pointer"}}>View All</button>
          </div>
          {TRANSACTIONS.slice(0,5).map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:30,height:30,borderRadius:8,
                  background:t.direction==="in"?G[50]:"#fff5f5",
                  display:"flex",alignItems:"center",justifyContent:"center"
                }}>
                  {t.direction==="in"
                    ?<ArrowDownToLine size={14} color={G[500]}/>
                    :<ArrowUp size={14} color="#e53e3e"/>
                  }
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"#0d2416"}}>{t.member}</div>
                  <div style={{fontSize:11,color:"#9ca3af",textTransform:"capitalize"}}>{t.type.replace("_"," ")}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:700,color:t.direction==="in"?G[500]:"#e53e3e"}}>
                  {t.direction==="in"?"+":"-"}{fmt(t.amount).replace("KES ","")}
                </div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{t.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Actions */}
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:16}}>Pending Chairperson Actions</div>
          {LOANS.filter(l=>l.status==="pending").map(loan=>(
            <div key={loan.id} style={{
              border:`1px solid #fee2e2`,borderRadius:10,padding:"12px 14px",marginBottom:12,background:"#fff5f5"
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#0d2416"}}>{loan.member}</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>{loan.purpose} · {loan.id}</div>
                </div>
                <span style={{fontSize:13,fontWeight:800,color:G[600]}}>{fmt(loan.amount)}</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setPage("loans")} style={{
                  flex:1,padding:"6px 10px",borderRadius:6,fontSize:11,fontWeight:700,
                  background:G[500],color:"#fff",border:"none",cursor:"pointer"
                }}>Review</button>
                <button style={{
                  flex:1,padding:"6px 10px",borderRadius:6,fontSize:11,fontWeight:700,
                  background:"#fff",color:"#6b7280",border:"1px solid #e5e7eb",cursor:"pointer"
                }}>Defer</button>
              </div>
            </div>
          ))}
          {/* Upcoming meeting */}
          <div style={{border:`1px solid ${G[100]}`,borderRadius:10,padding:"12px 14px",background:G[50]}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <Calendar size={13} color={G[600]}/>
              <span style={{fontSize:11,fontWeight:700,color:G[700],textTransform:"uppercase",letterSpacing:"0.04em"}}>Upcoming Meeting</span>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:"#0d2416"}}>Monthly Chama Meeting</div>
            <div style={{fontSize:12,color:"#6b7280"}}>Oct 12, 2025 · 10:00 AM · {MEETINGS[0].agenda.length} agenda items</div>
            <button onClick={()=>setPage("meetings")} style={{
              marginTop:8,padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
              background:G[500],color:"#fff",border:"none",cursor:"pointer"
            }}>View Agenda</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: Members ────────────────────────────────────────────────────────────
function PageMembers() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const filtered = MEMBERS.filter(m=>{
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter==="all" || (filter==="unpaid"&&!m.paid) || (filter==="inactive"&&m.status==="inactive") || (filter==="loans"&&m.loanActive);
    return matchSearch && matchFilter;
  });
  const m = selected ? MEMBERS.find(x=>x.id===selected) : null;

  return (
    <div style={{display:"grid",gridTemplateColumns: m ? "1fr 340px" : "1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        {/* Toolbar */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid #f0f0f0",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:1,minWidth:180}}>
            <Search size={14} color="#9ca3af" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search members..."
              style={{width:"100%",paddingLeft:32,paddingRight:10,height:34,border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          {["all","unpaid","inactive","loans"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{
              padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",
              background:filter===f?G[500]:"#f5f5f5",color:filter===f?"#fff":"#6b7280",border:"none"
            }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
          ))}
          <button style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",
            background:G[500],color:"#fff",border:"none",display:"flex",alignItems:"center",gap:5}}>
            <Plus size={13}/> Invite Member
          </button>
        </div>

        {/* Stats bar */}
        <div style={{display:"flex",gap:0,borderBottom:"1px solid #f0f0f0"}}>
          {[
            {label:"Total",v:MEMBERS.length,c:"#0d2416"},
            {label:"Active",v:MEMBERS.filter(m=>m.status==="active").length,c:G[500]},
            {label:"Paid",v:MEMBERS.filter(m=>m.paid).length,c:G[500]},
            {label:"Unpaid",v:MEMBERS.filter(m=>!m.paid&&m.status==="active").length,c:"#e53e3e"},
            {label:"KYC Pending",v:MEMBERS.filter(m=>m.kyc==="pending").length,c:"#f59e0b"},
          ].map(s=>(
            <div key={s.label} style={{flex:1,padding:"10px 16px",textAlign:"center",borderRight:"1px solid #f0f0f0"}}>
              <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#fafafa"}}>
              {["Member","Phone","Status","This Month","Contributions","Rotation","KYC",""].map(h=>(
                <th key={h} style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"#6b7280",textAlign:"left",borderBottom:"1px solid #f0f0f0",textTransform:"uppercase",letterSpacing:"0.04em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(mem=>(
              <tr key={mem.id}
                onClick={()=>setSelected(selected===mem.id?null:mem.id)}
                style={{cursor:"pointer",background:selected===mem.id?G[50]:"#fff",borderBottom:"1px solid #f9f9f9"}}
                onMouseEnter={e=>e.currentTarget.style.background=selected===mem.id?G[50]:"#fafafa"}
                onMouseLeave={e=>e.currentTarget.style.background=selected===mem.id?G[50]:"#fff"}
              >
                <td style={{padding:"10px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Avatar name={mem.name} size={30}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#0d2416"}}>{mem.name}</div>
                      <div style={{fontSize:10,color:"#9ca3af"}}>
                        {mem.isChair&&"Chair · "}{mem.isTreasurer&&"Treasurer · "}{mem.isSecretary&&"Secretary · "}#{mem.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"10px 16px",fontSize:12,color:"#6b7280"}}>{mem.phone}</td>
                <td style={{padding:"10px 16px"}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                    background:mem.status==="active"?G[50]:"#fff5f5",
                    color:mem.status==="active"?G[600]:"#e53e3e"
                  }}>{mem.status}</span>
                </td>
                <td style={{padding:"10px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:mem.paid?G[500]:"#e53e3e"}}/>
                    <span style={{fontSize:12,fontWeight:600,color:mem.paid?G[500]:"#e53e3e"}}>{mem.paid?"Paid":"Unpaid"}</span>
                  </div>
                </td>
                <td style={{padding:"10px 16px"}}>
                  <div style={{fontSize:12,color:"#0d2416"}}>{mem.contributions}/9</div>
                  {mem.missed>0&&<div style={{fontSize:10,color:"#e53e3e"}}>{mem.missed} missed</div>}
                </td>
                <td style={{padding:"10px 16px",fontSize:12,color:"#6b7280"}}>#{mem.rotation}</td>
                <td style={{padding:"10px 16px"}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,
                    background:mem.kyc==="verified"?G[50]:"#fefce8",
                    color:mem.kyc==="verified"?G[600]:"#d97706"
                  }}>{mem.kyc==="verified"?"Verified":"Pending"}</span>
                </td>
                <td style={{padding:"10px 16px"}}>
                  <MoreVertical size={14} color="#9ca3af"/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Member Detail Panel */}
      {m && (
        <div style={{background:"#fff",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",padding:"24px",overflowY:"auto",maxHeight:680}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <Avatar name={m.name} size={56} ring/>
            <div style={{fontSize:16,fontWeight:800,color:"#0d2416",marginTop:10}}>{m.name}</div>
            <div style={{fontSize:12,color:"#6b7280"}}>{m.phone}</div>
            {(m.isChair||m.isTreasurer||m.isSecretary)&&(
              <span style={{fontSize:11,fontWeight:700,background:G[500],color:"#fff",padding:"2px 10px",borderRadius:99,marginTop:4,display:"inline-block"}}>
                {m.isChair?"Chairperson":m.isTreasurer?"Treasurer":"Secretary"}
              </span>
            )}
          </div>

          {[
            {label:"Member ID",val:`#${m.id}`},
            {label:"Join Date",val:m.joinDate},
            {label:"KYC Status",val:m.kyc},
            {label:"Rotation Position",val:`#${m.rotation}`},
            {label:"Status",val:m.status},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f5f5f5",fontSize:13}}>
              <span style={{color:"#6b7280"}}>{r.label}</span>
              <span style={{fontWeight:600,color:"#0d2416"}}>{r.val}</span>
            </div>
          ))}

          <div style={{marginTop:16,marginBottom:8,fontSize:12,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>Contribution History</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {Array.from({length:9},(_,i)=>(
              <div key={i} style={{
                width:28,height:28,borderRadius:6,fontSize:10,fontWeight:700,
                display:"flex",alignItems:"center",justifyContent:"center",
                background: i<m.contributions ? G[500] : "#f0f0f0",
                color: i<m.contributions ? "#fff" : "#bbb",
              }}>M{i+1}</div>
            ))}
          </div>

          <div style={{marginTop:16,display:"flex",gap:8}}>
            <button style={{flex:1,padding:"8px",borderRadius:8,background:G[500],color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              Send Reminder
            </button>
            {m.status==="inactive"&&(
              <button style={{flex:1,padding:"8px",borderRadius:8,background:"#fff",color:"#e53e3e",border:"1px solid #e53e3e",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                Remove Member
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE: Contributions ──────────────────────────────────────────────────────
function PageContributions() {
  const paidCount = MEMBERS.filter(m=>m.paid&&m.status==="active").length;
  const unpaidCount = MEMBERS.filter(m=>!m.paid&&m.status==="active").length;

  return (
    <div>
      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        <StatCard label="Collected (Oct)" value={fmt(paidCount*5000)} sub={`${paidCount} members`} icon={CheckCircle} accent={G[500]} trend="up"/>
        <StatCard label="Outstanding" value={fmt(unpaidCount*5000)} sub={`${unpaidCount} pending`} icon={AlertCircle} accent="#f59e0b"/>
        <StatCard label="Target" value={fmt(100000)} sub="20 members × KES 5,000" icon={Banknote} accent={G[700]}/>
        <StatCard label="Collection Rate" value="72%" sub="This month" icon={Activity} accent={G[600]}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* This month status */}
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0d2416"}}>October 2025 — Member Status</div>
            <button style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:700,
              background:G[500],color:"#fff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              <Send size={12}/> Bulk Reminder
            </button>
          </div>

          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:4}}>
              <span>Collection progress</span><span>{paidCount}/{MEMBERS.filter(m=>m.status==="active").length}</span>
            </div>
            <div style={{height:8,borderRadius:99,background:"#f0f0f0",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:G[500],width:`${(paidCount/18)*100}%`}}/>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {MEMBERS.filter(m=>m.status==="active").map(mem=>(
              <div key={mem.id} style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"8px 0",borderBottom:"1px solid #f9f9f9"
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:mem.paid?G[500]:"#e5e7eb",flexShrink:0}}/>
                  <Avatar name={mem.name} size={24}/>
                  <span style={{fontSize:12,color:"#0d2416"}}>{mem.name}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:600,color:mem.paid?G[500]:"#9ca3af"}}>
                    {mem.paid?"KES 5,000":"—"}
                  </span>
                  <span style={{
                    fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99,
                    background:mem.paid?G[50]:"#f9fafb",
                    color:mem.paid?G[600]:"#9ca3af"
                  }}>{mem.paid?"Paid":"Pending"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule + History */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Schedule */}
          <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:4}}>Contribution Schedule</div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:16}}>STK push triggers automatically on the 5th of each month</div>
            {[
              {label:"Frequency",val:"Monthly (5th)"},
              {label:"Amount per member",val:"KES 5,000"},
              {label:"Payment method",val:"M-Pesa STK Push"},
              {label:"Grace period",val:"5 days"},
              {label:"Late penalty",val:"KES 200"},
              {label:"Seasonal adjustment",val:"Harvest-based override available"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f5f5f5",fontSize:12}}>
                <span style={{color:"#6b7280"}}>{r.label}</span>
                <span style={{fontWeight:600,color:"#0d2416"}}>{r.val}</span>
              </div>
            ))}
            <button style={{marginTop:14,width:"100%",padding:"8px",borderRadius:8,
              background:"#f5f5f5",color:"#0d2416",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              Edit Schedule
            </button>
          </div>

          {/* Monthly history */}
          <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:16}}>Monthly Summary</div>
            {CONTRIBUTIONS_HISTORY.slice(-5).reverse().map(h=>{
              const pct = Math.round((h.collected/h.target)*100);
              return (
                <div key={h.month} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:"#0d2416",fontWeight:600}}>{h.month} 2025</span>
                    <span style={{color:pct===100?G[500]:pct>=80?"#f59e0b":"#e53e3e",fontWeight:700}}>{pct}%</span>
                  </div>
                  <div style={{height:6,borderRadius:99,background:"#f0f0f0",overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:99,background:pct===100?G[500]:pct>=80?"#f59e0b":"#e53e3e",width:`${pct}%`}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: Rotations ─────────────────────────────────────────────────────────
function PageRotations() {
  return (
    <div>
      {/* Header card */}
      <div style={{
        background:`linear-gradient(135deg, ${G[800]} 0%, ${G[600]} 100%)`,
        borderRadius:14,padding:"24px 28px",marginBottom:24,color:"#fff"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,opacity:.7,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Next Payout</div>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.02em"}}>{GROUP.nextPayoutMember}</div>
            <div style={{fontSize:14,opacity:.8,marginTop:4}}>Rotation #9 of 20 · Due in {GROUP.nextPayoutDate}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:32,fontWeight:900}}>{fmt(GROUP.nextPayoutAmount)}</div>
            <div style={{fontSize:13,opacity:.7}}>Gross payout · 3% fee applies</div>
            <div style={{fontSize:12,opacity:.6,marginTop:2}}>Net: {fmt(GROUP.nextPayoutAmount*0.97)}</div>
          </div>
        </div>
        <div style={{marginTop:20,display:"flex",gap:8}}>
          <button style={{padding:"8px 18px",borderRadius:8,background:"rgba(255,255,255,0.2)",
            color:"#fff",border:"1px solid rgba(255,255,255,0.3)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Preview Payout
          </button>
          <button style={{padding:"8px 18px",borderRadius:8,background:"#fff",
            color:G[700],border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Trigger Early Payout
          </button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Rotation schedule */}
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:16}}>Rotation Schedule</div>
          {ROTATION_SCHEDULE.map((r,i)=>(
            <div key={r.position} style={{
              display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
              borderRadius:10,marginBottom:6,
              background:r.status==="upcoming"?G[50]:"#fafafa",
              border:r.status==="upcoming"?`1.5px solid ${G[300]}`:"1px solid #f0f0f0"
            }}>
              <div style={{
                width:28,height:28,borderRadius:"50%",flexShrink:0,
                background:r.status==="upcoming"?G[500]:"#e5e7eb",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:800,color:r.status==="upcoming"?"#fff":"#9ca3af"
              }}>{r.position}</div>
              <Avatar name={r.member} size={28}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#0d2416"}}>{r.member}</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{r.month}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:700,color:r.status==="upcoming"?G[500]:"#9ca3af"}}>{fmt(r.amount)}</div>
                {r.status==="upcoming"&&<span style={{fontSize:10,fontWeight:700,color:G[600],background:G[50],padding:"1px 6px",borderRadius:99}}>NEXT</span>}
              </div>
            </div>
          ))}
          <div style={{textAlign:"center",marginTop:12,fontSize:12,color:"#9ca3af"}}>
            +12 more rotations · Full cycle ends Dec 2026
          </div>
        </div>

        {/* Payout history + settings */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:16}}>Completed Payouts</div>
            {[
              {pos:8,member:"Charles Mutua",   date:"Sep 30",amount:100000},
              {pos:7,member:"Ann Chebet",       date:"Aug 31",amount:100000},
              {pos:6,member:"Peter Kamau",      date:"Jul 31",amount:95000},
              {pos:5,member:"Mary Wanjiku",     date:"Jun 30",amount:100000},
              {pos:4,member:"John Kipchoge",    date:"May 31",amount:90000},
            ].map(p=>(
              <div key={p.pos} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <CheckCircle size={14} color={G[500]}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:"#0d2416"}}>{p.member}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>Rotation #{p.pos} · {p.date}</div>
                  </div>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:G[500]}}>{fmt(p.amount)}</span>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:12}}>Rotation Settings</div>
            {[
              {label:"Order type",val:"Agreed sequence"},
              {label:"Payout trigger",val:"Automatic (end of month)"},
              {label:"Fee on payout",val:"3% (KES 3,000)"},
              {label:"Fee beneficiary",val:"OrbiSave platform"},
              {label:"Dispute window",val:"48 hours post-payout"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f5f5f5",fontSize:12}}>
                <span style={{color:"#6b7280"}}>{r.label}</span>
                <span style={{fontWeight:600,color:"#0d2416"}}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: Loans ──────────────────────────────────────────────────────────────
function PageLoans() {
  const [approving, setApproving] = useState(null);
  const [approved, setApproved] = useState([]);

  const doApprove = (id) => {
    setApproved(prev => [...prev, id]);
    setApproving(null);
  };

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        <StatCard label="Pending Approval" value="2" sub="Awaiting chair review" icon={Clock} accent="#f59e0b"/>
        <StatCard label="Active Loans" value="1" sub="KES 8,000 outstanding" icon={CreditCard} accent={G[500]}/>
        <StatCard label="Loan Pool Available" value={fmt(GROUP.loanPoolBalance)} sub="Available to lend" icon={Wallet} accent={G[600]}/>
        <StatCard label="Total Interest Earned" value="KES 1,800" sub="Returned to group" icon={TrendingUp} accent={G[700]} trend="up"/>
      </div>

      {/* Pending loans */}
      <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <AlertCircle size={16} color="#f59e0b"/>
          <span style={{fontSize:14,fontWeight:700,color:"#0d2416"}}>Pending Loan Requests</span>
          <span style={{fontSize:11,fontWeight:700,background:"#fef3c7",color:"#d97706",padding:"1px 8px",borderRadius:99}}>Requires your approval</span>
        </div>

        {LOANS.filter(l=>l.status==="pending").map(loan=>(
          <div key={loan.id} style={{
            border:`1px solid #fde68a`,borderRadius:12,padding:"16px 20px",marginBottom:12,
            background:"#fffbeb"
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avatar name={loan.member} size={38}/>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#0d2416"}}>{loan.member}</div>
                  <div style={{fontSize:12,color:"#6b7280"}}>{loan.id} · Requested {loan.requested}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:900,color:"#0d2416"}}>{fmt(loan.amount)}</div>
                <div style={{fontSize:11,color:"#6b7280"}}>@{loan.interest}% interest · {loan.term}</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
              {[
                {label:"Purpose",val:loan.purpose},
                {label:"Collateral",val:loan.collateral||"Contribution record"},
                {label:"Repayment",val:loan.term},
              ].map(f=>(
                <div key={f.label} style={{background:"#fff",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em"}}>{f.label}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"#0d2416",marginTop:2}}>{f.val}</div>
                </div>
              ))}
            </div>

            {/* Approval track */}
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:12,color:"#6b7280"}}>Approval status:</div>
              {[
                {label:"Chairperson (You)", approved: approved.includes(loan.id)},
                {label:"Treasurer",approved:loan.approvals.treasurer},
                {label:"Platform Admin",approved:false},
              ].map(a=>(
                <div key={a.label} style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{
                    width:20,height:20,borderRadius:"50%",
                    background:a.approved?G[500]:"#e5e7eb",
                    display:"flex",alignItems:"center",justifyContent:"center"
                  }}>
                    {a.approved?<Check size={10} color="#fff"/>:<Clock size={10} color="#9ca3af"/>}
                  </div>
                  <span style={{fontSize:11,color:"#6b7280"}}>{a.label}</span>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:8}}>
              {!approved.includes(loan.id)
                ? <>
                    <button onClick={()=>doApprove(loan.id)} style={{
                      padding:"8px 20px",borderRadius:8,background:G[500],color:"#fff",
                      border:"none",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6
                    }}><ThumbsUp size={13}/> Approve</button>
                    <button style={{
                      padding:"8px 20px",borderRadius:8,background:"#fff",color:"#e53e3e",
                      border:"1px solid #e53e3e",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6
                    }}><ThumbsDown size={13}/> Decline</button>
                    <button style={{
                      padding:"8px 20px",borderRadius:8,background:"#fff",color:"#6b7280",
                      border:"1px solid #e5e7eb",fontSize:12,fontWeight:700,cursor:"pointer"
                    }}>Defer to Meeting</button>
                  </>
                : <div style={{display:"flex",alignItems:"center",gap:6,color:G[500],fontSize:12,fontWeight:700}}>
                    <CheckCircle size={14}/> Your approval recorded. Waiting for Treasurer.
                  </div>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Active + historical loans */}
      <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:16}}>All Loans</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#fafafa"}}>
              {["Loan ID","Member","Amount","Purpose","Status","Disbursed","Repayment",""].map(h=>(
                <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#6b7280",textAlign:"left",
                  borderBottom:"1px solid #f0f0f0",textTransform:"uppercase",letterSpacing:"0.04em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOANS.map(loan=>(
              <tr key={loan.id} style={{borderBottom:"1px solid #f9f9f9"}}>
                <td style={{padding:"10px 14px",fontSize:12,fontWeight:600,color:G[600]}}>{loan.id}</td>
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <Avatar name={loan.member} size={24}/>
                    <span style={{fontSize:12,color:"#0d2416"}}>{loan.member}</span>
                  </div>
                </td>
                <td style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:"#0d2416"}}>{fmt(loan.amount)}</td>
                <td style={{padding:"10px 14px",fontSize:12,color:"#6b7280"}}>{loan.purpose}</td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{
                    fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                    background:loan.status==="active"?G[50]:loan.status==="repaid"?"#f0fdf4":loan.status==="pending"?"#fef3c7":"#f9fafb",
                    color:loan.status==="active"?G[600]:loan.status==="repaid"?"#16a34a":loan.status==="pending"?"#d97706":"#9ca3af"
                  }}>{loan.status}</span>
                </td>
                <td style={{padding:"10px 14px",fontSize:12,color:"#6b7280"}}>{loan.disbursed||"—"}</td>
                <td style={{padding:"10px 14px",fontSize:12,color:"#6b7280"}}>
                  {loan.repaid?`${fmt(loan.repaid)} / ${fmt(loan.amount)}`:"—"}
                </td>
                <td style={{padding:"10px 14px"}}>
                  <Eye size={14} color="#9ca3af" style={{cursor:"pointer"}}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PAGE: Meetings ──────────────────────────────────────────────────────────
function PageMeetings() {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {/* Upcoming */}
      <div>
        <div style={{
          background:`linear-gradient(135deg, ${G[700]} 0%, ${G[500]} 100%)`,
          borderRadius:14,padding:"20px 24px",marginBottom:16,color:"#fff"
        }}>
          <div style={{fontSize:12,opacity:.7,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Upcoming Meeting</div>
          <div style={{fontSize:20,fontWeight:800}}>{MEETINGS[0].date} · {MEETINGS[0].time}</div>
          <div style={{fontSize:13,opacity:.8,marginTop:4}}>Monthly Chama Meeting · {MEETINGS[0].agenda.length} agenda items</div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={{padding:"8px 16px",borderRadius:8,background:"#fff",color:G[700],
              border:"none",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              <Video size={13}/> Start Meeting
            </button>
            <button style={{padding:"8px 16px",borderRadius:8,background:"rgba(255,255,255,0.2)",
              color:"#fff",border:"1px solid rgba(255,255,255,0.3)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              Send Invites
            </button>
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:12}}>Agenda — Oct 12, 2025</div>
          {MEETINGS[0].agenda.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>
              <div style={{
                width:22,height:22,borderRadius:"50%",background:G[50],
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10,fontWeight:800,color:G[600],flexShrink:0,marginTop:1
              }}>{i+1}</div>
              <div>
                <div style={{fontSize:13,color:"#0d2416"}}>{a}</div>
                {a.includes("LN-")&&<span style={{fontSize:11,background:"#fef3c7",color:"#d97706",padding:"1px 6px",borderRadius:99,fontWeight:600}}>Loan vote</span>}
              </div>
            </div>
          ))}
          <button style={{marginTop:14,width:"100%",padding:"8px",borderRadius:8,
            background:"#f5f5f5",color:"#0d2416",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Add Agenda Item
          </button>
        </div>
      </div>

      {/* History + Voting */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:12}}>Meeting History</div>
          {MEETINGS.slice(1).map(m=>(
            <div key={m.id} style={{padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#0d2416"}}>{m.date} · {m.time}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{m.agenda.length} items · {m.attendance} attended</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {m.type==="emergency"&&<span style={{fontSize:10,fontWeight:700,background:"#fee2e2",color:"#e53e3e",padding:"1px 6px",borderRadius:99}}>Emergency</span>}
                  <span style={{fontSize:10,fontWeight:700,background:G[50],color:G[600],padding:"1px 6px",borderRadius:99}}>Completed</span>
                  <Eye size={13} color="#9ca3af" style={{cursor:"pointer"}}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:4}}>Digital Voting</div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:16}}>Create resolutions for members to vote on asynchronously</div>
          {[
            {q:"Approve James Mwangi loan LN-001",yes:10,no:2,pending:6,total:18},
            {q:"Approve Esther Nyambura loan LN-004",yes:7,no:5,pending:6,total:18},
          ].map((v,i)=>(
            <div key={i} style={{border:"1px solid #f0f0f0",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600,color:"#0d2416",marginBottom:8}}>{v.q}</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <div style={{flex:v.yes,background:G[500],height:6,borderRadius:99}}/>
                <div style={{flex:v.no,background:"#e53e3e",height:6,borderRadius:99}}/>
                <div style={{flex:v.pending,background:"#e5e7eb",height:6,borderRadius:99}}/>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,color:"#6b7280"}}>
                <span style={{color:G[500],fontWeight:600}}>{v.yes} Yes</span>
                <span style={{color:"#e53e3e",fontWeight:600}}>{v.no} No</span>
                <span>{v.pending} Pending</span>
              </div>
            </div>
          ))}
          <button style={{width:"100%",padding:"8px",borderRadius:8,
            background:G[500],color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6
          }}><Vote size={13}/> Create New Resolution</button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: Ledger ─────────────────────────────────────────────────────────────
function PageLedger() {
  const [filter, setFilter] = useState("all");
  const filtered = TRANSACTIONS.filter(t=> filter==="all" || t.type===filter);
  return (
    <div>
      <div style={{background:"#fff",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #f0f0f0",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginRight:8}}>
            <Lock size={14} color={G[500]}/>
            <span style={{fontSize:13,fontWeight:700,color:"#0d2416"}}>Immutable Transaction Ledger</span>
            <span style={{fontSize:11,background:G[50],color:G[600],padding:"1px 8px",borderRadius:99,fontWeight:600}}>Read-only · Tamper-proof</span>
          </div>
          {["all","contribution","payout","loan_disburse","loan_repay"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{
              padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",
              background:filter===f?G[500]:"#f5f5f5",color:filter===f?"#fff":"#6b7280",border:"none"
            }}>{f.replace("_"," ")}</button>
          ))}
          <button style={{marginLeft:"auto",padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:700,
            background:"#f5f5f5",color:"#0d2416",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <Download size={12}/> Export CSV
          </button>
        </div>

        <div style={{padding:"10px 20px",background:"#fffbeb",borderBottom:"1px solid #fde68a",display:"flex",gap:6,alignItems:"center"}}>
          <Shield size={13} color="#d97706"/>
          <span style={{fontSize:12,color:"#92400e"}}>All transactions are cryptographically recorded. No entry can be modified or deleted. All members can view this ledger.</span>
        </div>

        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#fafafa"}}>
              {["TX ID","Date","Type","Member","Amount","Direction","M-Pesa Ref","Status"].map(h=>(
                <th key={h} style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"#6b7280",textAlign:"left",
                  borderBottom:"1px solid #f0f0f0",textTransform:"uppercase",letterSpacing:"0.04em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t=>(
              <tr key={t.id} style={{borderBottom:"1px solid #f9f9f9"}}>
                <td style={{padding:"10px 16px",fontSize:11,fontFamily:"monospace",color:G[600]}}>{t.id}</td>
                <td style={{padding:"10px 16px",fontSize:12,color:"#6b7280"}}>{t.date}</td>
                <td style={{padding:"10px 16px"}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,
                    background:t.type==="contribution"?G[50]:t.type==="payout"?"#eff6ff":t.type==="loan_disburse"?"#fef3c7":"#f5f3ff",
                    color:t.type==="contribution"?G[600]:t.type==="payout"?"#1d4ed8":t.type==="loan_disburse"?"#d97706":"#7c3aed"
                  }}>{t.type.replace("_"," ")}</span>
                </td>
                <td style={{padding:"10px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <Avatar name={t.member} size={22}/>
                    <span style={{fontSize:12,color:"#0d2416"}}>{t.member}</span>
                  </div>
                </td>
                <td style={{padding:"10px 16px",fontSize:13,fontWeight:700,
                  color:t.direction==="in"?G[500]:"#e53e3e"}}>
                  {t.direction==="in"?"+":"-"}{fmt(t.amount).replace("KES ","")}
                </td>
                <td style={{padding:"10px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {t.direction==="in"
                      ?<ArrowDownToLine size={13} color={G[500]}/>
                      :<ArrowUp size={13} color="#e53e3e"/>
                    }
                    <span style={{fontSize:11,color:t.direction==="in"?G[500]:"#e53e3e",fontWeight:600}}>
                      {t.direction==="in"?"IN":"OUT"}
                    </span>
                  </div>
                </td>
                <td style={{padding:"10px 16px",fontSize:11,fontFamily:"monospace",color:"#9ca3af"}}>{t.ref}</td>
                <td style={{padding:"10px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <CheckCircle size={12} color={G[500]}/>
                    <span style={{fontSize:11,color:G[500],fontWeight:600}}>Confirmed</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PAGE: Reports ────────────────────────────────────────────────────────────
function PageReports() {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        <StatCard label="Total Contributions YTD" value="KES 847,500" sub="9 months" icon={TrendingUp} accent={G[500]} trend="up"/>
        <StatCard label="Total Payouts YTD" value="KES 785,000" sub="8 completed" icon={RefreshCw} accent={G[600]}/>
        <StatCard label="Interest Earned" value="KES 1,800" sub="From internal loans" icon={Banknote} accent={G[700]} trend="up"/>
        <StatCard label="Float Income" value="KES 12,400" sub="Trust account interest" icon={Building2} accent={G[400]}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:4}}>Cumulative Pool Growth</div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:16}}>Jan – Oct 2025</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={[
              {m:"Jan",pool:0},{m:"Feb",pool:95000},{m:"Mar",pool:195000},{m:"Apr",pool:285000},
              {m:"May",pool:385000},{m:"Jun",pool:370000},{m:"Jul",pool:470000},
              {m:"Aug",pool:465000},{m:"Sep",pool:365000},{m:"Oct",pool:437500},
            ]} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={G[500]} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={G[500]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="m" tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false} tickFormatter={v=>v/1000+"k"}/>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{fontSize:12,borderRadius:8,border:"1px solid #e5e7eb"}}/>
              <Area type="monotone" dataKey="pool" stroke={G[500]} fill="url(#pg)" strokeWidth={2.5}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:12}}>Generate Reports</div>
            {[
              {label:"Monthly Statement", icon:FileText},
              {label:"Member Contribution Report",icon:Users},
              {label:"Loan Activity Report",icon:CreditCard},
              {label:"Audit Trail Export",icon:Lock},
              {label:"SDG Impact Report",icon:Globe},
            ].map(r=>(
              <button key={r.label} style={{
                width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                borderRadius:8,marginBottom:6,background:"#f9fafb",border:"1px solid #f0f0f0",
                cursor:"pointer",textAlign:"left"
              }}>
                <r.icon size={14} color={G[500]}/>
                <span style={{fontSize:12,fontWeight:600,color:"#0d2416"}}>{r.label}</span>
                <Download size={12} color="#9ca3af" style={{marginLeft:"auto"}}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Member performance */}
      <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:16}}>Member Reliability Scores</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
          {MEMBERS.filter(m=>m.status==="active").slice(0,10).map(m=>{
            const score = Math.round((m.contributions/9)*100);
            return (
              <div key={m.id} style={{textAlign:"center",padding:"12px 8px",border:"1px solid #f0f0f0",borderRadius:10}}>
                <Avatar name={m.name} size={32}/>
                <div style={{fontSize:11,fontWeight:600,color:"#0d2416",marginTop:6,lineHeight:1.3}}>{m.name.split(" ")[0]}</div>
                <div style={{fontSize:13,fontWeight:800,color:score>=90?G[500]:score>=70?"#f59e0b":"#e53e3e",marginTop:3}}>{score}%</div>
                <div style={{height:4,borderRadius:99,background:"#f0f0f0",overflow:"hidden",marginTop:4}}>
                  <div style={{height:"100%",borderRadius:99,background:score>=90?G[500]:score>=70?"#f59e0b":"#e53e3e",width:`${score}%`}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: Notifications ──────────────────────────────────────────────────────
function PageNotifications() {
  const typeIcon = (t) => {
    if(t==="alert") return <AlertCircle size={16} color="#e53e3e"/>;
    if(t==="approval") return <CheckSquare size={16} color="#f59e0b"/>;
    if(t==="success") return <CheckCircle size={16} color={G[500]}/>;
    if(t==="warning") return <AlertTriangle size={16} color="#f59e0b"/>;
    if(t==="meeting") return <Video size={16} color="#3b82f6"/>;
    return <Info size={16} color="#6b7280"/>;
  };
  return (
    <div style={{background:"#fff",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0d2416"}}>All Notifications</div>
        <button style={{fontSize:12,color:G[500],fontWeight:600,background:"none",border:"none",cursor:"pointer"}}>Mark all read</button>
      </div>
      {NOTIFICATIONS.map(n=>(
        <div key={n.id} style={{
          display:"flex",gap:12,padding:"14px 20px",borderBottom:"1px solid #f9f9f9",
          background:n.read?"#fff":G[50],alignItems:"flex-start"
        }}>
          <div style={{
            width:36,height:36,borderRadius:10,background:n.read?"#f5f5f5":"#fff",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            border:`1px solid ${n.read?"#f0f0f0":G[100]}`
          }}>{typeIcon(n.type)}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:n.read?500:700,color:"#0d2416"}}>{n.title}</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{n.time}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {n.action&&<button style={{
              fontSize:11,fontWeight:700,color:G[600],background:G[50],border:`1px solid ${G[200]}`,
              padding:"3px 10px",borderRadius:6,cursor:"pointer",whiteSpace:"nowrap"
            }}>{n.action}</button>}
            {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:G[500],flexShrink:0}}/>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PAGE: Settings ───────────────────────────────────────────────────────────
function PageSettings() {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {[
        {
          title:"Group Information",
          fields:[
            {label:"Group Name",val:GROUP.name,type:"text"},
            {label:"Group ID",val:GROUP.id,type:"text",readonly:true},
            {label:"Location",val:GROUP.location,type:"text"},
            {label:"Trust Account",val:GROUP.trustAccount,type:"text",readonly:true},
          ]
        },
        {
          title:"Leadership",
          fields:[
            {label:"Chairperson",val:GROUP.chairperson,type:"text"},
            {label:"Treasurer",val:GROUP.treasurer,type:"text"},
            {label:"Secretary",val:GROUP.secretary,type:"text"},
          ]
        },
        {
          title:"Contribution Rules",
          fields:[
            {label:"Monthly Amount",val:"KES 5,000",type:"text"},
            {label:"Due Date",val:"5th of each month",type:"text"},
            {label:"Grace Period",val:"5 days",type:"text"},
            {label:"Late Penalty",val:"KES 200",type:"text"},
          ]
        },
        {
          title:"Loan Policy",
          fields:[
            {label:"Max Loan Amount",val:"3x contributions",type:"text"},
            {label:"Interest Rate",val:"10% flat",type:"text"},
            {label:"Approval Required",val:"Chair + Treasurer",type:"text"},
            {label:"Disbursement Window",val:"48 hours post-approval",type:"text"},
          ]
        },
      ].map(section=>(
        <div key={section.title} style={{background:"#fff",borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0d2416",marginBottom:16}}>{section.title}</div>
          {section.fields.map(f=>(
            <div key={f.label} style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:4}}>{f.label}</label>
              <input defaultValue={f.val} readOnly={f.readonly}
                style={{
                  width:"100%",boxSizing:"border-box",padding:"8px 10px",
                  border:`1px solid ${f.readonly?"#f0f0f0":"#e5e7eb"}`,borderRadius:8,fontSize:12,
                  color:f.readonly?"#9ca3af":"#0d2416",background:f.readonly?"#fafafa":"#fff",outline:"none"
                }}/>
            </div>
          ))}
          {!section.fields.some(f=>f.readonly) &&
            <button style={{marginTop:8,padding:"7px 16px",borderRadius:8,background:G[500],color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              Save Changes
            </button>
          }
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function OrbiSaveDashboard() {
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const PAGE_MAP = {
    dashboard:     { component: <PageDashboard setPage={setPage}/>, title:"Overview", sub:"Kisumu Agri Chama" },
    members:       { component: <PageMembers/>,       title:"Members",       sub:"Manage group members" },
    contributions: { component: <PageContributions/>, title:"Contributions",  sub:"Track monthly savings" },
    rotations:     { component: <PageRotations/>,     title:"Rotations",     sub:"Payout cycle management" },
    loans:         { component: <PageLoans/>,         title:"Loans",         sub:"Internal credit management" },
    meetings:      { component: <PageMeetings/>,      title:"Meetings",      sub:"Governance & digital voting" },
    ledger:        { component: <PageLedger/>,        title:"Ledger",        sub:"Immutable transaction history" },
    reports:       { component: <PageReports/>,       title:"Reports",       sub:"Analytics & exports" },
    notifications: { component: <PageNotifications/>, title:"Notifications", sub:"Alerts & activity" },
    settings:      { component: <PageSettings/>,      title:"Settings",      sub:"Group configuration" },
  };

  const unread = NOTIFICATIONS.filter(n=>!n.read).length;
  const currentPage = PAGE_MAP[page];

  return (
    <div style={{
      display:"flex", height:"100vh", fontFamily:"'DM Sans', 'Segoe UI', sans-serif",
      background:"#f4f7f4", overflow:"hidden"
    }}>
      {/* SIDEBAR */}
      <div style={{
        width: sidebarCollapsed ? 64 : 230,
        background: G[900],
        display:"flex", flexDirection:"column",
        transition:"width 0.2s ease",
        flexShrink:0,
        overflow:"hidden",
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? "18px 0" : "20px 20px",
          borderBottom:`1px solid rgba(255,255,255,0.06)`,
          display:"flex",alignItems:"center",
          justifyContent: sidebarCollapsed ? "center" : "space-between"
        }}>
          {!sidebarCollapsed && (
            <div>
              <div style={{fontSize:18,fontWeight:900,color:"#fff",letterSpacing:"-0.03em"}}>
                <span style={{color:G[400]}}>Orbi</span>Save
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.06em",textTransform:"uppercase",marginTop:1}}>
                Financial Platform
              </div>
            </div>
          )}
          <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} style={{
            background:"rgba(255,255,255,0.07)",border:"none",cursor:"pointer",
            color:"rgba(255,255,255,0.5)",borderRadius:7,
            width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          }}>
            <Menu size={14}/>
          </button>
        </div>

        {/* Group pill */}
        {!sidebarCollapsed && (
          <div style={{margin:"12px 14px",background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"10px 12px",border:`1px solid rgba(255,255,255,0.07)`}}>
            <div style={{fontSize:11,color:G[300],fontWeight:700,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>Active Group</div>
            <div style={{fontSize:12,color:"#fff",fontWeight:700}}>{GROUP.name}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>{GROUP.id}</div>
          </div>
        )}

        {/* Nav */}
        <nav style={{flex:1,padding:"8px 10px",overflowY:"auto"}}>
          {NAV.map(item=>{
            const isActive = page===item.id;
            const badgeCount = item.id==="notifications" ? unread : item.badge;
            return (
              <button key={item.id} onClick={()=>setPage(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  width:"100%",display:"flex",alignItems:"center",
                  gap:10,padding: sidebarCollapsed ? "10px 0" : "9px 12px",
                  borderRadius:9,marginBottom:2,cursor:"pointer",border:"none",
                  background: isActive ? G[500] : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  transition:"all 0.15s",
                }}
                onMouseEnter={e=>!isActive&&(e.currentTarget.style.background="rgba(255,255,255,0.06)")}
                onMouseLeave={e=>!isActive&&(e.currentTarget.style.background="transparent")}
              >
                <item.icon size={16} style={{flexShrink:0}}/>
                {!sidebarCollapsed && <>
                  <span style={{fontSize:13,fontWeight:isActive?700:500,flex:1,textAlign:"left"}}>{item.label}</span>
                  {badgeCount && <Badge count={badgeCount}/>}
                </>}
                {sidebarCollapsed && badgeCount && (
                  <div style={{
                    position:"absolute",width:6,height:6,borderRadius:"50%",
                    background:"#e53e3e",marginLeft:8,marginTop:-12
                  }}/>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{
          padding: sidebarCollapsed ? "14px 0" : "12px 14px",
          borderTop:`1px solid rgba(255,255,255,0.06)`,
          display:"flex",alignItems:"center",gap:10,
          justifyContent: sidebarCollapsed ? "center" : "flex-start"
        }}>
          <Avatar name={GROUP.chairperson} size={30}/>
          {!sidebarCollapsed && (
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{GROUP.chairperson}</div>
              <div style={{fontSize:10,color:G[300]}}>Chairperson</div>
            </div>
          )}
          {!sidebarCollapsed && <LogOut size={13} color="rgba(255,255,255,0.3)" style={{cursor:"pointer",flexShrink:0}}/>}
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Top bar */}
        <div style={{
          height:60,background:"#fff",borderBottom:"1px solid #efefef",
          display:"flex",alignItems:"center",padding:"0 24px",gap:12,
          flexShrink:0
        }}>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:800,color:"#0d2416",letterSpacing:"-0.02em"}}>{currentPage.title}</div>
            <div style={{fontSize:11,color:"#9ca3af"}}>{currentPage.sub}</div>
          </div>

          {/* Trust account status */}
          <div style={{
            display:"flex",alignItems:"center",gap:6,padding:"5px 12px",
            borderRadius:8,background:G[50],border:`1px solid ${G[100]}`
          }}>
            <Shield size={12} color={G[500]}/>
            <span style={{fontSize:11,fontWeight:600,color:G[700]}}>KCB Trust A/C</span>
            <div style={{width:6,height:6,borderRadius:"50%",background:G[500]}}/>
          </div>

          <div style={{position:"relative"}}>
            <button onClick={()=>setPage("notifications")} style={{
              position:"relative",width:36,height:36,borderRadius:9,
              background:unread?"#fff5f5":"#f5f5f5",border:`1px solid ${unread?"#fecaca":"#f0f0f0"}`,
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"
            }}>
              <Bell size={16} color={unread?"#e53e3e":"#6b7280"}/>
              {unread>0&&(
                <div style={{
                  position:"absolute",top:-4,right:-4,
                  width:16,height:16,borderRadius:"50%",
                  background:"#e53e3e",color:"#fff",fontSize:9,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center"
                }}>{unread}</div>
              )}
            </button>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <Avatar name={GROUP.chairperson} size={32} ring/>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#0d2416"}}>{GROUP.chairperson}</div>
              <div style={{fontSize:10,color:G[500],fontWeight:600}}>Chairperson</div>
            </div>
            <ChevronDown size={13} color="#9ca3af"/>
          </div>
        </div>

        {/* Page content */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {currentPage.component}
        </div>
      </div>
    </div>
  );
}
