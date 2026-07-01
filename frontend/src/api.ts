import type { Profile, ProfileStats, MathProblem, ScienceLiteracyQuestion, ActiveSession, Assignment } from './types';

const API_BASE_URL = 'http://localhost:5001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Profiles
  getProfiles: () => request<Profile[]>('/profiles'),
  
  createProfile: (name: string, avatar: string) => 
    request<Profile>('/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, avatar }),
    }),
    
  deleteProfile: (id: number) => 
    request<{ message: string }>(`/profiles/${id}`, {
      method: 'DELETE',
    }),
    
  getProfileStats: (id: number) => 
    request<ProfileStats>(`/profiles/${id}/stats`),

  // Quizzes
  getMathQuestions: (count: number, type: string = 'mix') => 
    request<MathProblem[]>(`/quizzes/math?count=${count}&type=${type}`),
    
  getMathWordProblems: (count: number) => 
    request<any[]>(`/quizzes/word-problems?count=${count}`),
    
  getQuestions: (subject: 'science' | 'literacy') => 
    request<ScienceLiteracyQuestion[]>(`/quizzes/questions?subject=${subject}`),
    
  submitQuizComplete: (data: {
    profileId: number;
    subject: 'math' | 'science' | 'literacy';
    score: number;
    totalQuestions: number;
    timeSpent: number;
  }) => 
    request<{ message: string }>('/quizzes/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Sessions
  getActiveSession: (profileId: number, subject: 'math' | 'science' | 'literacy') => 
    request<ActiveSession | null>(`/sessions/${profileId}/${subject}`),
    
  saveActiveSession: (profileId: number, subject: 'math' | 'science' | 'literacy', state: ActiveSession) => 
    request<{ message: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ profileId, subject, state }),
    }),
    
  deleteActiveSession: (profileId: number, subject: 'math' | 'science' | 'literacy') => 
    request<{ message: string }>(`/sessions/${profileId}/${subject}`, {
      method: 'DELETE',
    }),

  // Assignments
  getAssignments: (profileId: number) => 
    request<Assignment[]>(`/assignments/${profileId}`),
    
  assignWorkbook: (profileId: number, subject: 'math' | 'science' | 'literacy', config: { count?: number }) => 
    request<Assignment>('/assignments', {
      method: 'POST',
      body: JSON.stringify({ profileId, subject, config }),
    }),
    
  deleteAssignment: (id: number) => 
    request<{ message: string }>(`/assignments/${id}`, {
      method: 'DELETE',
    }),
    
  saveAssignmentState: (id: number, state: ActiveSession) => 
    request<{ message: string }>(`/assignments/${id}/state`, {
      method: 'POST',
      body: JSON.stringify({ state }),
    }),
    
  submitAssignmentComplete: (id: number, data: { score: number; totalQuestions: number; timeSpent: number }) => 
    request<{ message: string }>(`/assignments/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Parent PIN Management
  verifyParentPin: (pin: string) => 
    request<{ verified: boolean }>('/parent/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
    
  changeParentPin: (newPin: string) => 
    request<{ message: string }>('/parent/pin', {
      method: 'POST',
      body: JSON.stringify({ newPin }),
    }),
};
