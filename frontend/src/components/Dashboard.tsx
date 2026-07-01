import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Profile, ProfileStats, Assignment } from '../types';
import { Star, Award, BookOpen, Clock, Play, BarChart2, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  profile: Profile;
  onSelectSubject: (subject: 'math' | 'science' | 'literacy', resume: boolean) => void;
  onSelectAssignment: (assignment: Assignment) => void;
  onViewStats: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onSelectSubject, onSelectAssignment, onViewStats }) => {
  const [statsData, setStatsData] = useState<ProfileStats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, list] = await Promise.all([
        api.getProfileStats(profile.id),
        api.getAssignments(profile.id)
      ]);
      setStatsData(stats);
      setAssignments(list);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile.id]);

  if (loading || !statsData) {
    return <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)', textAlign: 'center', padding: '5rem 0' }}>Loading your dashboard...</div>;
  }

  const { stats, totalStars } = statsData;

  // Calculate overall stats
  const totalCompleted = stats.math.completed + stats.science.completed + stats.literacy.completed;
  let overallAccuracy = 0;
  const totalQuestions = stats.math.totalQuestions + stats.science.totalQuestions + stats.literacy.totalQuestions;
  const totalCorrect = stats.math.totalCorrect + stats.science.totalCorrect + stats.literacy.totalCorrect;
  if (totalQuestions > 0) {
    overallAccuracy = Math.round((totalCorrect / totalQuestions) * 100);
  }

  const getSubjectEmoji = (sub: string) => {
    if (sub === 'math') return '🧮';
    if (sub === 'math_word') return '📝';
    if (sub === 'science') return '🔬';
    return '📚';
  };

  const getSubjectTitle = (sub: string) => {
    if (sub === 'math') return 'Math Quest';
    if (sub === 'math_word') return 'Math Word Problems';
    if (sub === 'science') return 'Science Lab';
    return 'Literacy Hub';
  };

  const getSubjectDesc = (sub: string) => {
    if (sub === 'math') return 'Double-digit arithmetic & division with remainders';
    if (sub === 'math_word') return 'Curated grade-appropriate math word problems';
    if (sub === 'science') return 'Grade 4 quiz questions on life, earth, and physical sciences';
    return 'Reading comprehension passages and grammar challenges';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const pendingAssignments = assignments.filter(a => a.status !== 'completed');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  return (
    <div>
      {/* Overview Stats Widget */}
      <div className="dashboard-summary">
        <div className="summary-item">
          <div className="summary-circle gold">
            <Star fill="currentColor" size={28} />
          </div>
          <div className="summary-details">
            <h3>{totalStars}</h3>
            <p>Stars Earned</p>
          </div>
        </div>

        <div className="summary-item">
          <div className="summary-circle blue">
            <Award size={28} />
          </div>
          <div className="summary-details">
            <h3>{overallAccuracy}%</h3>
            <p>Avg Accuracy</p>
          </div>
        </div>

        <div className="summary-item">
          <div className="summary-circle pink">
            <BookOpen size={28} />
          </div>
          <div className="summary-details">
            <h3>{totalCompleted}</h3>
            <p>Quizzes Done</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Assignments and Free Play */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem', marginBottom: '3rem' }}>
        
        {/* Kid Assignments Section */}
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
            <span>📝</span> My Assigned Worksheets
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {pendingAssignments.map(a => {
              const isProgress = a.status === 'in_progress';
              const subjectColorClass = a.subject === 'math' ? 'math' : a.subject === 'science' ? 'science' : 'literacy';

              return (
                <div key={a.id} className={`subject-card ${subjectColorClass}`}>
                  {isProgress && <div className="resume-tag">In Progress</div>}
                  
                  <div className="subject-header">
                    <h3 className="subject-title">{getSubjectTitle(a.subject)}</h3>
                    <div className="subject-icon-bg">
                      {getSubjectEmoji(a.subject)}
                    </div>
                  </div>
                  
                  <p className="subject-desc" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    {getSubjectDesc(a.subject)}
                  </p>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', borderTop: '1px solid #f5f7fa', paddingTop: '0.75rem' }}>
                    <strong>Details:</strong> {a.subject === 'math' ? `${a.config.count} problems` : '10 multiple choice questions'}
                    <br />
                    <strong>Assigned:</strong> {formatDate(a.assigned_at)}
                  </div>

                  <button
                    className={`btn ${isProgress ? 'btn-secondary' : 'btn-primary'} btn-full`}
                    onClick={() => onSelectAssignment(a)}
                  >
                    <Play size={16} fill="currentColor" /> {isProgress ? 'Resume Sheet' : 'Start Sheet'}
                  </button>
                </div>
              );
            })}

            {pendingAssignments.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  background: 'white',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px dashed #cbd5e1',
                  boxShadow: 'var(--card-shadow)'
                }}
              >
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🎉</span>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: '0.5rem' }}>All Caught Up!</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  You have completed all assigned workbooks. Ask your parent or administrator to assign a new one in the Parent Zone!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Free Practice Zone */}
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-dark)' }}>
            <span>⭐</span> Free Practice Zone
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Want extra practice? Play these untruncated practice sessions anytime! They won't affect assignments but will add stars to your score!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="subject-card math" style={{ padding: '1.5rem', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>🧮 Math Practice</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Free Play</span>
              </div>
              <button className="btn btn-light btn-sm btn-full" onClick={() => onSelectSubject('math', false)}>
                Play Now
              </button>
            </div>

            <div className="subject-card science" style={{ padding: '1.5rem', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>🔬 Science Practice</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Free Play</span>
              </div>
              <button className="btn btn-light btn-sm btn-full" onClick={() => onSelectSubject('science', false)}>
                Play Now
              </button>
            </div>

            <div className="subject-card literacy" style={{ padding: '1.5rem', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>📚 Literacy Practice</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Free Play</span>
              </div>
              <button className="btn btn-light btn-sm btn-full" onClick={() => onSelectSubject('literacy', false)}>
                Play Now
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Dashboard Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
        <button className="btn btn-light" onClick={onViewStats}>
          <BarChart2 size={20} />
          View Detailed Progress
        </button>
      </div>
    </div>
  );
};
