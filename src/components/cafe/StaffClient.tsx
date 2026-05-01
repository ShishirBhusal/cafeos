'use client';

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  User,
  ChefHat,
  Receipt,
  UserCog,
  Mail,
  Shield,
  UserPlus,
  X,
  MoreVertical,
  Trash2,
  RefreshCw,
} from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLES = [
  { key: 'counter', label: 'Counter', desc: 'POS, take orders, process payments', icon: Receipt },
  { key: 'kitchen', label: 'Kitchen', desc: 'View and manage kitchen display', icon: ChefHat },
  { key: 'waiter', label: 'Waiter', desc: 'Take orders from tables', icon: User },
  { key: 'cafe_manager', label: 'Manager', desc: 'Full access to dashboard & reports', icon: UserCog },
] as const;

const ROLE_COLORS: Record<string, string> = {
  counter: 'bg-blue-50 text-blue-700',
  kitchen: 'bg-stone-100 text-stone-700',
  waiter: 'bg-emerald-50 text-emerald-700',
  cafe_manager: 'bg-purple-50 text-purple-700',
};

interface StaffClientProps {
  cafeId: string;
  ownerEmail: string;
  initialStaff: StaffMember[];
}

export default function StaffClient({ cafeId, ownerEmail, initialStaff }: StaffClientProps) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('counter');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_cafe_staff', { p_cafe_id: cafeId });
    if (data) setStaff(data as StaffMember[]);
    setLoading(false);
  }, [cafeId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAdding(true);

    const { data, error: rpcError } = await supabase.rpc('add_cafe_staff', {
      p_cafe_id: cafeId,
      p_email: addEmail.trim(),
      p_role: addRole,
    });

    setAdding(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      setError(result.error || 'Failed to add staff');
      return;
    }

    setSuccess('Staff member added successfully');
    setAddEmail('');
    setAddRole('counter');
    setShowAddModal(false);
    await refreshStaff();
  };

  const handleRoleChange = async (assignmentId: string, newRole: string) => {
    const { data } = await supabase.rpc('update_cafe_staff_role', {
      p_assignment_id: assignmentId,
      p_role: newRole,
    });
    const result = data as { success: boolean } | null;
    if (result?.success) {
      await refreshStaff();
    }
    setMenuOpen(null);
  };

  const handleRemove = async (assignmentId: string) => {
    const { data } = await supabase.rpc('remove_cafe_staff', {
      p_assignment_id: assignmentId,
    });
    const result = data as { success: boolean } | null;
    if (result?.success) {
      await refreshStaff();
    }
    setMenuOpen(null);
  };

  const getRoleIcon = (role: string) => {
    const r = ROLES.find(r => r.key === role);
    if (!r) return <User className="w-4 h-4" />;
    const Icon = r.icon;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Owner Card */}
      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 text-sm">You (Owner)</h3>
            <p className="text-xs text-stone-500 truncate">{ownerEmail}</p>
          </div>
          <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-medium rounded-lg">
            Owner
          </span>
        </div>
      </div>

      {/* Staff List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
            Team ({staff.length})
          </h2>
          <button
            onClick={refreshStaff}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setError(''); setSuccess(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add staff
        </button>
      </div>

      {/* Staff Members */}
      {staff.length > 0 ? (
        <div className="space-y-2">
          {staff.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl p-4 border border-stone-200 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
                {getRoleIcon(member.role)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-stone-900 text-sm truncate">
                  {member.full_name || member.email}
                </h3>
                {member.full_name && (
                  <p className="text-xs text-stone-500 truncate">{member.email}</p>
                )}
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${ROLE_COLORS[member.role] || 'bg-stone-100 text-stone-700'}`}>
                {ROLES.find(r => r.key === member.role)?.label || member.role}
              </span>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                  className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen === member.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stone-200 rounded-xl shadow-lg z-10 py-1">
                    <div className="px-3 py-1.5 text-xs font-medium text-stone-400 uppercase">
                      Change role
                    </div>
                    {ROLES.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => handleRoleChange(member.id, r.key)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2 ${
                          member.role === r.key ? 'text-stone-900 font-medium' : 'text-stone-600'
                        }`}
                      >
                        <r.icon className="w-3.5 h-3.5" />
                        {r.label}
                        {member.role === r.key && <span className="ml-auto text-xs text-stone-400">current</span>}
                      </button>
                    ))}
                    <div className="border-t border-stone-100 mt-1 pt-1">
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove from team
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-stone-400" />
          </div>
          <h3 className="font-medium text-stone-900 mb-1">No staff yet</h3>
          <p className="text-sm text-stone-500 mb-4">
            Add your team members so they can access the counter, kitchen display, or dashboard.
          </p>
          <button
            onClick={() => { setShowAddModal(true); setError(''); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add your first staff member
          </button>
        </div>
      )}

      {/* Role Guide */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Role permissions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <div key={r.key} className="flex items-start gap-2.5">
              <div className={`p-1.5 rounded-lg ${ROLE_COLORS[r.key]}`}>
                <r.icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-stone-900">{r.label}</h4>
                <p className="text-xs text-stone-500">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Toast */}
      {success && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 z-50">
          {success}
          <button onClick={() => setSuccess('')} className="ml-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">Add staff member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                  />
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  They must have a CafeOS account with this email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setAddRole(r.key)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        addRole === r.key
                          ? 'border-stone-900 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <r.icon className="w-4 h-4 text-stone-600" />
                        <span className="text-sm font-medium text-stone-900">{r.label}</span>
                      </div>
                      <p className="text-xs text-stone-500">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !addEmail.trim()}
                  className="flex-1 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add to team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
