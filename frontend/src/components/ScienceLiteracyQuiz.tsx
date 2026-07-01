import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Profile, ScienceLiteracyQuestion } from '../types';
import { ArrowLeft, Save, Star, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

interface ScienceLiteracyQuizProps {
  profile: Profile;
  subject: 'science' | 'literacy';
  resume: boolean;
  assignmentId?: number;
  onBack: () => void;
}

export const ScienceLiteracyQuiz: React.FC<ScienceLiteracyQuizProps> = ({
  profile,
  subject,
  resume,
  assignmentId,
  onBack
}) => {
  const [questions, setQuestions] = useState<ScienceLiteracyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean>(false);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({}); // question ID -> selected option
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Load existing session or get new questions
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        setLoading(true);
        let loadedSession = null;
        
        if (resume) {
          if (assignmentId) {
            const list = await api.getAssignments(profile.id);
            const match = list.find(a => a.id === assignmentId);
            loadedSession = match?.state || null;
          } else {
            loadedSession = await api.getActiveSession(profile.id, subject);
          }
        }

        if (loadedSession && loadedSession.questions && loadedSession.questions.length > 0) {
          setQuestions(loadedSession.questions);
          setCurrentIndex(loadedSession.currentIndex || 0);
          setAnswers(loadedSession.answers || {});
          setStartTime(loadedSession.startTime || Date.now());
        } else {
          // Fetch new questions
          const data = await api.getQuestions(subject);
          setQuestions(data);
          setStartTime(Date.now());
          setCurrentIndex(0);
          setAnswers({});
          
          const stateObj = {
            subject,
            startTime: Date.now(),
            questions: data,
            currentIndex: 0,
            answers: {}
          };
          
          if (assignmentId) {
            await api.saveAssignmentState(assignmentId, stateObj);
          } else {
            await api.saveActiveSession(profile.id, subject, stateObj);
          }
        }
      } catch (err) {
        console.error('Error starting quiz:', err);
        alert('Could not start quiz. Please try again.');
        onBack();
      } finally {
        setLoading(false);
      }
    };

    initializeQuiz();
  }, [profile.id, subject, resume, assignmentId]);

  // Enforce locked state on already answered questions (One-Time Answer entry)
  useEffect(() => {
    if (questions.length > 0 && questions[currentIndex]) {
      const currentQ = questions[currentIndex];
      if (answers[currentQ.id]) {
        setSelectedOption(answers[currentQ.id]);
        setIsAnswerChecked(true);
        setIsCurrentCorrect(answers[currentQ.id] === currentQ.correct_option);
      } else {
        setSelectedOption(null);
        setIsAnswerChecked(false);
        setIsCurrentCorrect(false);
      }
    }
  }, [currentIndex, questions, answers]);

  const handleOptionSelect = (option: string) => {
    if (isAnswerChecked) return; // Locked once evaluated
    setSelectedOption(option);
  };

  const handleNextClick = async () => {
    // Stage 1: Evaluate selection on "Check Answer" click (First button state)
    if (!isAnswerChecked) {
      if (!selectedOption) {
        alert('Please select an answer first!');
        return;
      }

      const currentQ = questions[currentIndex];
      const correct = selectedOption === currentQ.correct_option;
      
      setIsCurrentCorrect(correct);
      setIsAnswerChecked(true);

      const updatedAnswers = { ...answers, [currentQ.id]: selectedOption };
      setAnswers(updatedAnswers);

      const stateObj = {
        subject,
        startTime,
        questions,
        currentIndex,
        answers: updatedAnswers
      };

      if (assignmentId) {
        api.saveAssignmentState(assignmentId, stateObj).catch(err => console.error('Failed to save assignment:', err));
      } else {
        api.saveActiveSession(profile.id, subject, stateObj).catch(err => console.error('Failed to save session:', err));
      }
      
      return;
    }

    // Stage 2: Move to the next question or complete the quiz
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      
      const stateObj = {
        subject,
        startTime,
        questions,
        currentIndex: nextIndex,
        answers
      };

      if (assignmentId) {
        api.saveAssignmentState(assignmentId, stateObj).catch(err => console.error('Failed to save assignment:', err));
      } else {
        api.saveActiveSession(profile.id, subject, stateObj).catch(err => console.error('Failed to save session:', err));
      }
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async () => {
    let finalScore = 0;
    questions.forEach(q => {
      const userAns = answers[q.id];
      if (userAns === q.correct_option) {
        finalScore += 1;
      }
    });

    const finalTimeSpent = Math.round((Date.now() - startTime) / 1000);
    setScore(finalScore);
    setTimeSpent(finalTimeSpent);

    try {
      setSaving(true);
      if (assignmentId) {
        await api.submitAssignmentComplete(assignmentId, {
          score: finalScore,
          totalQuestions: questions.length,
          timeSpent: finalTimeSpent
        });
      } else {
        await api.submitQuizComplete({
          profileId: profile.id,
          subject,
          score: finalScore,
          totalQuestions: questions.length,
          timeSpent: finalTimeSpent
        });
      }
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to submit quiz complete:', err);
      alert('Could not record your score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      setSaving(true);
      const stateObj = {
        subject,
        startTime,
        questions,
        currentIndex,
        answers
      };

      if (assignmentId) {
        await api.saveAssignmentState(assignmentId, stateObj);
      } else {
        await api.saveActiveSession(profile.id, subject, stateObj);
      }
      onBack();
    } catch (err) {
      console.error('Error saving session:', err);
      onBack();
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="quiz-container" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)' }}>Loading quiz questions...</div>
      </div>
    );
  }

  if (isCompleted) {
    const accuracy = Math.round((score / questions.length) * 100);
    const title = subject === 'science' ? 'Science Lab' : 'Literacy Hub';
    
    return (
      <div className="quiz-container">
        <div className="reward-overlay">
          <div className="reward-trophy">🏆</div>
          <h1 className="reward-title">Fantastic!</h1>
          <p className="reward-subtitle">You completed the {title} Quiz!</p>

          <div className="reward-stars-container">
            {Array.from({ length: Math.min(score, 5) }).map((_, i) => (
              <div key={i} className="reward-star-animated" style={{ animationDelay: `${i * 0.15}s` }}>
                <Star fill="currentColor" size={48} />
              </div>
            ))}
            {score === 0 && <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>Try again to win stars!</span>}
          </div>

          <div className="reward-stats">
            <div className="reward-stat-box">
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--primary)' }}>
                {score} / {questions.length}
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Correct</p>
            </div>

            <div className="reward-stat-box">
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--success)' }}>
                {accuracy}%
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Accuracy</p>
            </div>

            <div className="reward-stat-box">
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--accent-purple)' }}>
                {formatTime(timeSpent)}
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Time</p>
            </div>
          </div>

          <button className="btn btn-primary" onClick={onBack} style={{ padding: '1rem 3rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progressPercent = Math.round((currentIndex / totalQuestions) * 100);

  const getOptionValue = (letter: string) => {
    if (letter === 'A') return currentQuestion.option_a;
    if (letter === 'B') return currentQuestion.option_b;
    if (letter === 'C') return currentQuestion.option_c;
    return currentQuestion.option_d;
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div>
          <h2 style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>
            {subject === 'science' ? 'Science Lab 🔬' : 'Literacy Hub 📚'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {assignmentId ? 'Assigned Quiz (One-Time Answer entry!)' : 'Practice Quiz'} • Question {currentIndex + 1} of {totalQuestions}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <button className="btn btn-light btn-sm" onClick={handleSaveAndClose} disabled={saving}>
            <Save size={16} /> Save & Exit
          </button>
        </div>
      </div>

      {currentQuestion.passage && (
        <div className="quiz-passage-box">
          <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: 'var(--primary)' }}>📖 Reading Passage</h4>
          <p>{currentQuestion.passage}</p>
        </div>
      )}

      <h3 className="quiz-question-text">{currentQuestion.question}</h3>

      <div className="quiz-options-list">
        {['A', 'B', 'C', 'D'].map((letter) => {
          const isSelected = selectedOption === letter;
          const isCorrectAns = letter === currentQuestion.correct_option;
          
          let cardClass = '';
          if (isSelected) cardClass = 'selected';
          
          if (isAnswerChecked) {
            cardClass += ' disabled';
            if (isCorrectAns) {
              cardClass = 'correct-highlight';
            } else if (isSelected && !isCorrectAns) {
              cardClass = 'incorrect-highlight';
            }
          }

          return (
            <div
              key={letter}
              className={`quiz-option-card ${cardClass}`}
              onClick={() => handleOptionSelect(letter)}
            >
              <div className="quiz-option-letter">{letter}</div>
              <div>{getOptionValue(letter)}</div>
            </div>
          );
        })}
      </div>

      {isAnswerChecked && (
        <div className={`evaluation-box ${isCurrentCorrect ? 'correct' : 'incorrect'}`}>
          <div className="evaluation-icon">
            {isCurrentCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
          </div>
          <div className="evaluation-text">
            <h4>{isCurrentCorrect ? 'Superb! Correct Answer! 🎉' : 'Oops, Not Quite! 😢'}</h4>
            <p>
              {isCurrentCorrect 
                ? `You chose option ${selectedOption}: "${getOptionValue(selectedOption!)}", which is correct!`
                : `You chose option ${selectedOption}: "${getOptionValue(selectedOption!)}". The correct answer was option ${currentQuestion.correct_option}: "${getOptionValue(currentQuestion.correct_option)}".`
              }
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleNextClick}
          disabled={!selectedOption || saving}
          style={{ padding: '1rem 4rem' }}
        >
          {!isAnswerChecked ? (
            <>
              Check Answer <ChevronRight size={20} />
            </>
          ) : currentIndex === totalQuestions - 1 ? (
            'Finish Quiz 🏁'
          ) : (
            <>
              Continue <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
