import { mockMembers, Member } from '../data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member';
}

export const memberService = {
  async getMembers(): Promise<Member[]> {
    await delay(500);
    return [...mockMembers];
  },

  async inviteMember(data: InviteMemberData): Promise<Member> {
    await delay(800);
    const newMember: Member = {
      id: Date.now().toString(),
      name: data.email.split('@')[0],
      email: data.email,
      role: data.role,
      avatarUrl: '',
      joinedAt: new Date().toLocaleDateString(),
    };
    console.log('Invited member:', newMember);
    return newMember;
  },

  async removeMember(id: string): Promise<void> {
    await delay(500);
    console.log('Removed member:', id);
  },

  async changeRole(id: string, role: 'admin' | 'member'): Promise<void> {
    await delay(500);
    console.log(`Changed member ${id} role to ${role}`);
  },
};
