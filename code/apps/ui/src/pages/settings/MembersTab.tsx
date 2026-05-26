import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, UserPlus, Mail } from 'lucide-react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { toast } from '../../components/ui/Toast';
import { mockMembers, Member } from '../../data/mockData';

export const MembersTab: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  const handleInvite = () => {
    if (!inviteEmail) return;
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setShowInvite(false);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('Member removed');
  };

  const handleChangeRole = (memberId: string, newRole: 'admin' | 'member') => {
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    toast.success('Role updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Team Members ({members.length})</h3>
        <AnimatedButton variant="primary" size="sm" onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4 mr-1" />
          Invite Member
        </AnimatedButton>
      </div>

      <GlassCard className="p-6">
        <div className="space-y-3">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 glass rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.name}</span>
                    {member.role === 'owner' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Owner</span>
                    )}
                    {member.role === 'admin' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Admin</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              {member.role !== 'owner' && (
                <div className="relative group">
                  <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-36 glass rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'member' : 'admin')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/20"
                    >
                      Make {member.role === 'admin' ? 'Member' : 'Admin'}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-white/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass rounded-2xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-semibold mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <AnimatedButton variant="outline" fullWidth onClick={() => setShowInvite(false)}>
                  Cancel
                </AnimatedButton>
                <AnimatedButton variant="primary" fullWidth onClick={handleInvite}>
                  <Mail className="w-4 h-4 mr-1" />
                  Send Invite
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
