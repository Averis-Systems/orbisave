"use client"

import { useState } from "react"
import { Plus, Search, MoreVertical, Send, UserMinus, UserCheck, Shield, Loader2 } from "lucide-react"
import { useGroups } from "@/hooks/useGroups"
import { useMembers, useSuspendMember, useReinstateMember } from "@/hooks/useMembers"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
const avatarColors = ["bg-[#0a2540]", "bg-[#016828]", "bg-[#0f3460]", "bg-[#018a35]", "bg-[#00ab00]"]
const avatarColorClass = (name: string) => { 
  if (!name) return avatarColors[0]
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % avatarColors.length; return avatarColors[Math.abs(h)] 
}

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full ${avatarColorClass(name)} flex items-center justify-center text-white font-black shrink-0`}>
       <span className="text-[10px]">{initials(name || "?")}</span>
    </div>
  )
}

export default function MembersPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: groups, isLoading: groupsLoading } = useGroups()
  const activeGroup = groups?.[0] || null

  const { data: members, isLoading: membersLoading } = useMembers(activeGroup?.id || null)
  const suspendMember = useSuspendMember()
  const reinstateMember = useReinstateMember()

  const filtered = members?.filter(m => {
    const matchSearch = m.member_name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === "all" ? true :
      filter === "active" ? m.status === "active" :
      filter === "suspended" ? m.status === "suspended" : true
    return matchSearch && matchFilter
  }) || []

  const selectedMember = selectedId ? members?.find(m => m.id === selectedId) : null

  const handleStatusToggle = async () => {
    if (!selectedMember || !activeGroup) return
    try {
      if (selectedMember.status === 'active') {
        await suspendMember.mutateAsync({ groupId: activeGroup.id, memberId: selectedMember.id })
        toast.success(`${selectedMember.member_name} has been suspended.`)
      } else if (selectedMember.status === 'suspended') {
        await reinstateMember.mutateAsync({ groupId: activeGroup.id, memberId: selectedMember.id })
        toast.success(`${selectedMember.member_name} has been reinstated.`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Membership action failed")
    }
  }

  // Loading handled at content level

  const stats = [
    { label: "Total Pool Members", v: members?.length || 0, color: "text-[#0a2540]" },
    { label: "Active Contributors", v: members?.filter(m => m.status === "active").length || 0, color: "text-[#00ab00]" },
    { label: "Suspended / Idle", v: members?.filter(m => m.status === "suspended").length || 0, color: "text-red-500" },
    { label: "Admin & Staff", v: members?.filter(m => m.role !== 'member').length || 0, color: "text-[#0a2540]" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0a2540] mb-2">Member Registry</h1>
          <p className="text-gray-500 font-bold">Manage group participants, roles, and collection statuses.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-[#00ab00] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#00ab00]/20 hover:bg-[#008a00] transition-all">
          <Plus size={16} /> Invite Contributor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Registry */}
        <div className={`bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden ${selectedMember ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* Registry Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-50 border-b border-gray-50">
             {stats.map((s, i) => (
                <div key={i} className="p-6 text-center">
                   <p className="text-2xl font-black text-[#0a2540]">{s.v}</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">{s.label}</p>
                </div>
             ))}
          </div>

          {/* Registry Toolbar */}
          <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-6 justify-between items-center">
             <div className="relative w-full md:w-96">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-[#0a2540] outline-none focus:ring-2 focus:ring-[#00ab00] transition-all"
                />
             </div>
             <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                {(["all", "active", "suspended"] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      filter === f ? 'bg-white text-[#0a2540] shadow-sm' : 'text-gray-400 hover:text-[#0a2540]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
             </div>
          </div>

          {/* Registry Table */}
          <div className="overflow-x-auto min-h-[400px] relative">
            {membersLoading ? (
               <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-[#00ab00] opacity-20" />
               </div>
            ) : null}
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50">
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Member Identity</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pool Role</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
                     <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filtered.map(mem => (
                    <tr 
                      key={mem.id}
                      onClick={() => setSelectedId(selectedId === mem.id ? null : mem.id)}
                      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${selectedId === mem.id ? 'bg-[#e9f3ed]' : ''}`}
                    >
                       <td className="p-6">
                          <div className="flex items-center gap-4">
                             <Avatar name={mem.member_name} />
                             <div>
                                <p className="text-sm font-black text-[#0a2540]">{mem.member_name}</p>
                                <p className="text-[10px] font-bold text-gray-400">{mem.member_email}</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            mem.status === 'active' ? 'bg-green-50 text-[#00ab00] border-green-100' : 'bg-red-50 text-red-500 border-red-100'
                          }`}>
                            {mem.status}
                          </span>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-2">
                             {mem.role !== 'member' && <Shield size={12} className="text-[#0a2540]" />}
                             <span className={`text-xs font-black capitalize ${mem.role !== 'member' ? 'text-[#0a2540]' : 'text-gray-400'}`}>
                               {mem.role}
                             </span>
                          </div>
                       </td>
                       <td className="p-6 text-[11px] font-bold text-gray-500">
                          {new Date(mem.joined_at).toLocaleDateString()}
                       </td>
                       <td className="p-6 text-right">
                          <button className="text-gray-300 group-hover:text-[#0a2540] transition-colors">
                             <MoreVertical size={16} />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
            {!membersLoading && filtered.length === 0 && (
               <div className="py-20 text-center text-gray-300 font-bold italic text-sm">
                  No matching participants found.
               </div>
            )}
          </div>
        </div>

        {/* Detail Inspector */}
        {selectedMember && (
          <div className="lg:col-span-4 bg-white rounded-lg border border-gray-100 shadow-sm p-8 animate-in slide-in-from-right duration-300 sticky top-24">
             <div className="text-center mb-10">
                <div className="inline-flex relative mb-6">
                   <Avatar name={selectedMember.member_name} size={16} />
                   <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-white shadow-md flex items-center justify-center">
                      {selectedMember.status === 'active' ? <UserCheck size={14} className="text-[#00ab00]" /> : <UserMinus size={14} className="text-red-500" />}
                   </div>
                </div>
                <h3 className="text-xl font-black text-[#0a2540] mb-1">{selectedMember.member_name}</h3>
                <p className="text-xs font-bold text-gray-400 mb-4">{selectedMember.member_email}</p>
                <div className="flex justify-center gap-2">
                   <span className="px-3 py-1 bg-gray-50 text-[#0a2540] text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border border-gray-100">
                      ID: {selectedMember.id.slice(0, 8)}
                   </span>
                </div>
             </div>

             <div className="space-y-4 mb-10">
                {[
                  { label: "Pool Position", val: `#${selectedMember.rotation_position}` },
                  { label: "Cycle Status", val: selectedMember.status },
                  { label: "Access Tier", val: selectedMember.role },
                  { label: "Enrollment", val: new Date(selectedMember.joined_at).toLocaleDateString() },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{r.label}</span>
                     <span className="text-xs font-black text-[#0a2540] capitalize">{r.val}</span>
                  </div>
                ))}
             </div>

             <div className="grid grid-cols-1 gap-3">
                <button className="w-full py-4 bg-[#0a2540] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-[#0f3460] transition-all">
                   <Send size={14} /> Direct Message
                </button>
                {selectedMember.role === 'member' && (
                  <button 
                    onClick={handleStatusToggle}
                    disabled={suspendMember.isPending || reinstateMember.isPending}
                    className={`w-full py-4 border rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                      selectedMember.status === 'active' 
                        ? 'border-red-100 text-red-500 hover:bg-red-50' 
                        : 'border-green-100 text-[#00ab00] hover:bg-green-50'
                    }`}
                  >
                     {selectedMember.status === 'active' ? "Suspend Participant" : "Reinstate Access"}
                  </button>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
