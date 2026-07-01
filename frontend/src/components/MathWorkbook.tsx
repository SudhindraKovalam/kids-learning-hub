import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Profile, MathProblem } from '../types';
import { ArrowLeft, CheckCircle2, XCircle, Save, Star } from 'lucide-react';

interface MathWorkbookProps {
  profile: Profile;
  resume: boolean;
  subject: 'math' | 'math_word';
  assignmentId?: number;
  config?: { count?: number; type?: string };
  onBack: () => void;
}

interface WordProblemState {
  id: number;
  question: string;
  answer: string;
  explanation: string;
  userAnswer?: string;
  isCorrect?: boolean;
  locked?: boolean;
}

export const MathWorkbook: React.FC<MathWorkbookProps> = ({
  profile,
  resume,
  subject,
  assignmentId,
  config,
  onBack
}) => {
  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [wordProblems, setWordProblems] = useState<WordProblemState[]>([]);
  const [problemCount, setProblemCount] = useState<number>(config?.count || 10);
  const [mathType, setMathType] = useState<string>(config?.type || 'mix');
  const [isConfiguring, setIsConfiguring] = useState<boolean>(!resume && !assignmentId);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);

  // Load existing session (either assignment state or free play session)
  useEffect(() => {
    const loadSession = async () => {
      try {
        setSaving(true);
        if (resume) {
          if (assignmentId) {
            // Load assignment state
            const list = await api.getAssignments(profile.id);
            const match = list.find(a => a.id === assignmentId);
            if (match && match.state) {
              if (subject === 'math_word') {
                setWordProblems(match.state.mathProblems as any || []);
              } else {
                setProblems(match.state.mathProblems || []);
              }
              setStartTime(match.state.startTime || Date.now());
              setIsConfiguring(false);
            } else {
              setIsConfiguring(false);
              await handleStartNewWorkbook(config?.count || 10, config?.type || 'mix');
            }
          } else {
            // Load free play state
            const session = await api.getActiveSession(profile.id, subject);
            if (session && session.mathProblems) {
              if (subject === 'math_word') {
                setWordProblems(session.mathProblems as any || []);
              } else {
                setProblems(session.mathProblems);
              }
              setStartTime(session.startTime || Date.now());
              setIsConfiguring(false);
            } else {
              setIsConfiguring(true);
            }
          }
        } else if (assignmentId) {
          // New assignment worksheet - generate immediately without config screen
          setIsConfiguring(false);
          await handleStartNewWorkbook(config?.count || 10, config?.type || 'mix');
        }
      } catch (err) {
        console.error('Error loading math session:', err);
        setIsConfiguring(true);
      } finally {
        setSaving(false);
      }
    };
    
    loadSession();
  }, [resume, profile.id, assignmentId, subject]);

  const handleStartNewWorkbook = async (countVal: number = problemCount, typeVal: string = mathType) => {
    try {
      setSaving(true);
      let stateObj: any;

      if (subject === 'math_word') {
        const generated = await api.getMathWordProblems(countVal);
        const initialized = generated.map(wp => ({
          ...wp,
          userAnswer: '',
          isCorrect: undefined,
          locked: false
        }));
        setWordProblems(initialized);
        setStartTime(Date.now());
        setIsConfiguring(false);

        stateObj = {
          subject,
          startTime: Date.now(),
          mathProblems: initialized // saved in same field name for DB simplicity
        };
      } else {
        const generated = await api.getMathQuestions(countVal, typeVal);
        const initialized = generated.map(p => ({
          ...p,
          userAnswer: '',
          userRemainder: p.type === 'division' || p.type === '/' ? '' : undefined,
          isCorrect: undefined,
          locked: false
        }));
        setProblems(initialized);
        setStartTime(Date.now());
        setIsConfiguring(false);

        stateObj = {
          subject,
          startTime: Date.now(),
          mathProblems: initialized
        };
      }
      
      if (assignmentId) {
        await api.saveAssignmentState(assignmentId, stateObj);
      } else {
        await api.saveActiveSession(profile.id, subject, stateObj);
      }
    } catch (err) {
      console.error('Error generating math questions:', err);
      alert('Could not start math workbook. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (id: number, field: 'userAnswer' | 'userRemainder', value: string) => {
    if (subject === 'math_word') {
      // Filter for word problems: numeric only
      const numericValue = value.replace(/[^0-9\-]/g, '');
      setWordProblems(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, userAnswer: numericValue };
        }
        return p;
      }));
    } else {
      // For fractions: allow digits and slash
      const filterRegex = mathType === 'fractions' || problems.find(p => p.id === id)?.type === 'fractions'
        ? /[^0-9\/]/g
        : /[^0-9\-]/g;
      const filteredValue = value.replace(filterRegex, '');
      
      setProblems(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, [field]: filteredValue };
        }
        return p;
      }));
    }
  };

  // Perform validation on fraction answers
  const validateFraction = (userInput: string, decimalAnswer: number): boolean => {
    if (!userInput.trim()) return false;
    const parts = userInput.split('/');
    if (parts.length === 2) {
      const userN = parseInt(parts[0]);
      const userD = parseInt(parts[1]);
      if (isNaN(userN) || isNaN(userD) || userD === 0) return false;
      return Math.abs((userN / userD) - decimalAnswer) < 0.0001;
    } else if (parts.length === 1) {
      const val = parseFloat(parts[0]);
      if (isNaN(val)) return false;
      return Math.abs(val - decimalAnswer) < 0.0001;
    }
    return false;
  };

  // Perform blur validation & save state
  const handleInputBlur = async (id: number, e?: React.FocusEvent<HTMLInputElement>) => {
    // For division problems, check if focus moved to the other field in the same card
    if (e && e.currentTarget && e.relatedTarget) {
      const cardElement = e.currentTarget.closest('.math-card');
      if (cardElement && cardElement.contains(e.relatedTarget as Node)) {
        // Focus is still inside the division card (moving between Quotient and Remainder)
        return;
      }
    }

    let stateObj: any;

    if (subject === 'math_word') {
      let updatedWps: WordProblemState[] = [];
      setWordProblems(prev => {
        updatedWps = prev.map(p => {
          if (p.id === id) {
            if (p.userAnswer === undefined || p.userAnswer === '') {
              return { ...p, isCorrect: undefined };
            }
            const correct = p.userAnswer.trim() === p.answer.trim();
            // Lock if playing assignment
            const isLocked = assignmentId ? true : false;
            return { ...p, isCorrect: correct, locked: isLocked };
          }
          return p;
        });

        stateObj = {
          subject,
          startTime,
          mathProblems: updatedWps
        };

        if (assignmentId) {
          api.saveAssignmentState(assignmentId, stateObj).catch(err => console.error('Failed to auto-save assignment:', err));
        } else {
          api.saveActiveSession(profile.id, subject, stateObj).catch(err => console.error('Failed to auto-save session:', err));
        }

        return updatedWps;
      });
    } else {
      let updatedProblems: MathProblem[] = [];
      setProblems(prev => {
        updatedProblems = prev.map(p => {
          if (p.id === id) {
            if (p.userAnswer === undefined || p.userAnswer === '') {
              return { ...p, isCorrect: undefined };
            }

            let correct = false;

            if (p.type === 'fractions') {
              correct = validateFraction(p.userAnswer, p.decimalAnswer || 0);
            } else if (p.type === 'division' || p.type === '/') {
              const ans = parseInt(p.userAnswer);
              const rem = p.userRemainder !== undefined && p.userRemainder !== '' ? parseInt(p.userRemainder) : 0;
              correct = (ans === p.answer) && (rem === (p.remainder || 0));
            } else {
              const ans = parseInt(p.userAnswer);
              correct = ans === p.answer;
            }

            const isLocked = assignmentId ? true : false;
            return { ...p, isCorrect: correct, locked: isLocked };
          }
          return p;
        });
        
        stateObj = {
          subject,
          startTime,
          mathProblems: updatedProblems
        };

        if (assignmentId) {
          api.saveAssignmentState(assignmentId, stateObj).catch(err => console.error('Failed to auto-save assignment:', err));
        } else {
          api.saveActiveSession(profile.id, subject, stateObj).catch(err => console.error('Failed to auto-save session:', err));
        }

        return updatedProblems;
      });
    }
  };

  const handleSaveAndClose = async () => {
    try {
      setSaving(true);
      const stateObj = {
        subject,
        startTime,
        mathProblems: subject === 'math_word' ? wordProblems : problems
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

  const handleFinishWorkbook = async () => {
    let finalScore = 0;
    let totalQuestions = 0;

    if (subject === 'math_word') {
      const validated = wordProblems.map(p => {
        if (p.userAnswer === undefined || p.userAnswer === '') {
          return { ...p, isCorrect: false, locked: true };
        }
        const correct = p.userAnswer.trim() === p.answer.trim();
        return { ...p, isCorrect: correct, locked: true };
      });
      finalScore = validated.filter(p => p.isCorrect).length;
      totalQuestions = validated.length;
      setWordProblems(validated);
    } else {
      const validated = problems.map(p => {
        if (p.userAnswer === undefined || p.userAnswer === '') {
          return { ...p, isCorrect: false, locked: true };
        }
        let correct = false;
        if (p.type === 'fractions') {
          correct = validateFraction(p.userAnswer, p.decimalAnswer || 0);
        } else if (p.type === 'division' || p.type === '/') {
          const ans = parseInt(p.userAnswer);
          const rem = p.userRemainder !== undefined && p.userRemainder !== '' ? parseInt(p.userRemainder) : 0;
          correct = (ans === p.answer) && (rem === (p.remainder || 0));
        } else {
          const ans = parseInt(p.userAnswer);
          correct = ans === p.answer;
        }
        return { ...p, isCorrect: correct, locked: true };
      });
      finalScore = validated.filter(p => p.isCorrect).length;
      totalQuestions = validated.length;
      setProblems(validated);
    }

    const finalTimeSpent = Math.round((Date.now() - startTime) / 1000);
    setScore(finalScore);
    setTimeSpent(finalTimeSpent);

    try {
      setSaving(true);
      if (assignmentId) {
        await api.submitAssignmentComplete(assignmentId, {
          score: finalScore,
          totalQuestions,
          timeSpent: finalTimeSpent
        });
      } else {
        await api.submitQuizComplete({
          profileId: profile.id,
          subject,
          score: finalScore,
          totalQuestions,
          timeSpent: finalTimeSpent
        });
      }
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to submit math workbook:', err);
      alert('Could not record your score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isConfiguring) {
    return (
      <div className="workbook-container">
        <button className="btn btn-light btn-sm" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="workbook-config">
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '1rem' }}>
            {subject === 'math_word' ? 'Word Problems Practice' : 'Math Practice Workbook'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>How many questions do you want in your workbook today?</p>
          
          <div className="config-options">
            {[5, 10, 15, 20].map(count => (
              <button
                key={count}
                className={`config-btn ${problemCount === count ? 'selected' : ''}`}
                onClick={() => setProblemCount(count)}
              >
                {count}
              </button>
            ))}
          </div>

          {subject === 'math' && (
            <div className="form-group" style={{ maxWidth: '280px', margin: '0 auto 2rem' }}>
              <label className="form-label">Select Type</label>
              <select
                className="form-input"
                value={mathType}
                onChange={(e) => setMathType(e.target.value)}
              >
                <option value="mix">🌀 Mixed Problems</option>
                <option value="addition">➕ Addition Only</option>
                <option value="subtraction">➖ Subtraction Only</option>
                <option value="multiplication">✖️ Multiplication Only</option>
                <option value="division">➗ Division Only</option>
                <option value="fractions">🍕 Fractions Only</option>
              </select>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={() => handleStartNewWorkbook(problemCount, mathType)}
            disabled={saving}
            style={{ padding: '1rem 3rem' }}
          >
            {saving ? 'Creating...' : 'Let\'s Start! 🚀'}
          </button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const totalQ = subject === 'math_word' ? wordProblems.length : problems.length;
    const accuracy = Math.round((score / totalQ) * 100);
    
    return (
      <div className="workbook-container">
        <div className="reward-overlay">
          <div className="reward-trophy">🏆</div>
          <h1 className="reward-title">Amazing Job!</h1>
          <p className="reward-subtitle">You finished your Math Workbook!</p>

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
                {score} / {totalQ}
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Correct Answers</p>
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Time Spent</p>
            </div>
          </div>

          <button className="btn btn-primary" onClick={onBack} style={{ padding: '1rem 3rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workbook-container">
      <div className="workbook-header">
        <div>
          <h2 style={{ color: 'var(--primary)' }}>
            {subject === 'math_word' ? 'Math Word Quest 📝' : 'Math Quest 🧮'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {assignmentId ? 'Assigned worksheet (One-Time Answer entry!)' : 'Practice Workbook'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-light btn-sm" onClick={handleSaveAndClose} disabled={saving}>
            <Save size={16} /> Save & Exit
          </button>
        </div>
      </div>

      {/* Render Word Problems Layout */}
      {subject === 'math_word' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
          {wordProblems.map((wp, idx) => (
            <div
              key={wp.id}
              className={`math-card ${
                wp.isCorrect === true
                  ? 'correct'
                  : wp.isCorrect === false
                  ? 'incorrect'
                  : ''
              }`}
              style={{ alignItems: 'flex-start', width: '100%', padding: '2rem' }}
            >
              <div className="math-card-feedback">
                {wp.isCorrect === true && <CheckCircle2 size={20} />}
                {wp.isCorrect === false && <XCircle size={20} />}
              </div>

              <h4 style={{ fontSize: '1.15rem', lineHeight: '1.6', marginBottom: '1.25rem', fontFamily: 'var(--font-body)' }}>
                <strong>Problem {idx + 1}:</strong> {wp.question}
              </h4>

              <div className="math-inputs">
                <input
                  type="text"
                  className="math-input"
                  value={wp.userAnswer || ''}
                  onChange={(e) => handleInputChange(wp.id, 'userAnswer', e.target.value)}
                  onBlur={() => handleInputBlur(wp.id)}
                  disabled={wp.locked}
                  maxLength={6}
                  placeholder="?"
                  autoComplete="off"
                  style={{ width: '120px', textAlign: 'left', padding: '0 1rem' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render Equations Layout (Arithmetic & Fractions) */}
      {subject === 'math' && (
        <div className="math-problems-list">
          {problems.map((problem) => {
            const isDiv = problem.type === 'division' || problem.type === '/';
            const isFraction = problem.type === 'fractions';
            
            return (
              <div
                key={problem.id}
                className={`math-card ${
                  problem.isCorrect === true
                    ? 'correct'
                    : problem.isCorrect === false
                    ? 'incorrect'
                    : ''
                }`}
              >
                <div className="math-card-feedback">
                  {problem.isCorrect === true && <CheckCircle2 size={20} />}
                  {problem.isCorrect === false && <XCircle size={20} />}
                </div>

                {isFraction ? (
                  /* Playful Fraction visual equation */
                  <div className="math-equation" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>{problem.num1}</span>
                      <span style={{ borderTop: '2px solid var(--text-dark)', padding: '2px 6px', width: '100%', textAlign: 'center' }}>{problem.den1}</span>
                    </div>
                    <span>{problem.fractionOp}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>{problem.num2}</span>
                      <span style={{ borderTop: '2px solid var(--text-dark)', padding: '2px 6px', width: '100%', textAlign: 'center' }}>{problem.den2}</span>
                    </div>
                    <span>=</span>
                  </div>
                ) : (
                  /* Standard Arithmetic equation */
                  <div className="math-equation">
                    {problem.num1} {problem.type === '/' || problem.type === 'division' ? '÷' : problem.type === '*' || problem.type === 'multiplication' ? '×' : problem.type === 'subtraction' ? '−' : '+'} {problem.num2}
                  </div>
                )}

                <div className="math-inputs">
                  <div className="math-input-wrapper">
                    {isDiv && <span className="math-input-label">Quotient</span>}
                    {isFraction && <span className="math-input-label" style={{ fontSize: '0.65rem' }}>e.g. 5/7</span>}
                    <input
                      type="text"
                      className="math-input"
                      value={problem.userAnswer || ''}
                      onChange={(e) => handleInputChange(problem.id, 'userAnswer', e.target.value)}
                      onBlur={(e) => handleInputBlur(problem.id, e)}
                      disabled={problem.locked}
                      maxLength={8}
                      placeholder="?"
                      autoComplete="off"
                      style={{ width: isFraction ? '110px' : '80px' }}
                    />
                  </div>

                  {isDiv && (
                    <>
                      <span className="remainder-symbol">R</span>
                      <div className="math-input-wrapper">
                        <span className="math-input-label">Remainder</span>
                        <input
                          type="text"
                          className="math-input"
                          value={problem.userRemainder || ''}
                          onChange={(e) => handleInputChange(problem.id, 'userRemainder', e.target.value)}
                          onBlur={(e) => handleInputBlur(problem.id, e)}
                          disabled={problem.locked}
                          maxLength={3}
                          placeholder="0"
                          autoComplete="off"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleFinishWorkbook}
          style={{ padding: '1rem 4rem' }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Finish Workbook 🏁'}
        </button>
      </div>
    </div>
  );
};
