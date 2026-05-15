export interface Quiz {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizOption {
  id: number;
  questionId: number;
  optionId: string;
  optionText: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  questionType: 'single-choice' | 'multiple-choice';
  questionText: string;
  orderIndex: number;
  options: QuizOption[];
}

export interface QuizWithQuestions {
  quiz: Quiz;
  questions: QuizQuestion[];
}

export interface CreateQuizPayload {
  title: string;
  questions: CreateQuestionPayload[];
}

export interface CreateQuestionPayload {
  questionType: 'single-choice' | 'multiple-choice';
  questionText: string;
  options: CreateOptionPayload[];
}

export interface CreateOptionPayload {
  optionId: string;
  optionText: string;
  isCorrect: boolean;
}

export interface QuizAnswer {
  questionId: number;
  selectedOptions: string[];
}

export interface QuizResult {
  quizTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
}
