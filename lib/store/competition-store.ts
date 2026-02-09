import { create } from 'zustand';
import type { Competition, Athlete, Attempt } from '@/types';

interface CompetitionState {
  currentCompetition: Competition | null;
  athletes: Athlete[];
  attempts: Attempt[];
  isLoading: boolean;
  setCompetition: (competition: Competition | null) => void;
  setAthletes: (athletes: Athlete[]) => void;
  setAttempts: (attempts: Attempt[]) => void;
  updateAttempt: (attemptId: string, updates: Partial<Attempt>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useCompetitionStore = create<CompetitionState>((set) => ({
  currentCompetition: null,
  athletes: [],
  attempts: [],
  isLoading: false,
  
  setCompetition: (competition) => set({ currentCompetition: competition }),
  
  setAthletes: (athletes) => set({ athletes }),
  
  setAttempts: (attempts) => set({ attempts }),
  
  updateAttempt: (attemptId, updates) =>
    set((state) => ({
      attempts: state.attempts.map((attempt) =>
        attempt.id === attemptId ? { ...attempt, ...updates } : attempt
      ),
    })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  reset: () =>
    set({
      currentCompetition: null,
      athletes: [],
      attempts: [],
      isLoading: false,
    }),
}));
