import { create } from 'zustand';

export interface Meeting {
  id: string;
  title: string;
  time: string;
  projectId: string;
  projectName: string;
  attendees: string[];
}

interface MeetState {
  todayMeetings: Meeting[];
  fetchTodayMeetings: () => void;
}

export const useMeetStore = create<MeetState>((set) => ({
  todayMeetings: [],
  fetchTodayMeetings: () => {
    set({
      todayMeetings: [
        { id: '1', title: 'Daily Standup', time: '10:00 AM', projectId: '3', projectName: 'SPL-II Development', attendees: ['Jane', 'John'] },
        { id: '2', title: 'Design Review', time: '2:30 PM', projectId: '1', projectName: 'Global Rebrand', attendees: ['Sarah', 'Mike'] }
      ]
    });
  }
}));
