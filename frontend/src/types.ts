export interface Profile {
  id: number;
  name: string;
  avatar: string;
  created_at: string;
}

export interface QuizHistoryItem {
  id: number;
  profile_id: number;
  subject: 'math' | 'science' | 'literacy';
  score: number;
  total_questions: number;
  time_spent: number;
  completed_at: string;
}

export interface SubjectStats {
  completed: number;
  totalQuestions: number;
  totalCorrect: number;
  avgAccuracy: number;
}

export interface ProfileStats {
  profile: Profile;
  history: QuizHistoryItem[];
  stats: {
    math: SubjectStats;
    science: SubjectStats;
    literacy: SubjectStats;
  };
  totalStars: number;
  activeSessions: string[]; // subjects that have active sessions, e.g. ['math']
}

export interface MathProblem {
  id: number;
  type: '+' | '-' | '*' | '/';
  num1: number;
  num2: number;
  answer: number; // Quotient for division, result for others
  remainder?: number; // Remainder for division only
  userAnswer?: string;
  userRemainder?: string;
  isCorrect?: boolean;
}

export interface ScienceLiteracyQuestion {
  id: number;
  subject: 'science' | 'literacy';
  topic: string;
  passage: string | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
}

export interface ActiveSession {
  subject: 'math' | 'science' | 'literacy';
  startTime: number;
  mathProblems?: MathProblem[];
  questions?: ScienceLiteracyQuestion[];
  currentIndex?: number;
  answers?: { [key: number]: string }; // For multiple choice, question ID -> selected option
  timeSpent?: number;
}

export interface Assignment {
  id: number;
  profile_id: number;
  subject: 'math' | 'science' | 'literacy';
  config: { count?: number };
  status: 'assigned' | 'in_progress' | 'completed';
  score: number | null;
  total_questions: number | null;
  time_spent: number | null;
  state: ActiveSession | null;
  assigned_at: string;
  completed_at: string | null;
}

