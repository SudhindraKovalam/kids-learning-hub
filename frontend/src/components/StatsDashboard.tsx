import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Profile, ProfileStats } from '../types';
import { ArrowLeft, Star, Award, BookOpen, Clock, Activity, Calendar } from 'lucide-react';

interface StatsDashboardProps {
  profile: Profile;
  onBack: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ profile, onBack }) => {
  const [statsData, setStatsData] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.getProfileStats(profile.id);
        setStatsData(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [profile.id]);

  if (loading || !statsData) {
    return <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)', textAlign: 'center', padding: '5rem 0' }}>Loading your statistics...</div>;
  }

  const { stats, history, totalStars } = statsData;

  const formatDate = (dateStr: string) => {
    // SQLite returns ISO format or text, let's format it nicely
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getSubjectEmoji = (sub: string) => {
    if (sub === 'math') return '🧮';
    if (sub === 'science') return '🔬';
    return '📚';
  };

  return (
    <div className="stats-container">
      <div className="stats-header">
        <button className="btn btn-light btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h2 style={{ color: 'var(--primary)' }}>{profile.name}'s Progress Report 📊</h2>
      </div>

      <div className="stats-grid-2">
        {/* Left Side: Subject-wise Performance Card */}
        <div>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '2px solid #e4eaf5', paddingBottom: '0.5rem' }}>Subject Mastery</h3>
          <div className="stats-subject-summary">
            {/* Math Summary */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #e4eaf5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>🧮 Math Quest</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {stats.math.completed > 0 ? `${stats.math.avgAccuracy}%` : 'No attempts'}
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#e4eaf5', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div style={{ width: `${stats.math.avgAccuracy}%`, height: '100%', background: 'var(--primary)' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Completed {stats.math.completed} workbook{stats.math.completed !== 1 ? 's' : ''} • {stats.math.totalCorrect} stars earned
              </p>
            </div>

            {/* Science Summary */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #e4eaf5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>🔬 Science Lab</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {stats.science.completed > 0 ? `${stats.science.avgAccuracy}%` : 'No attempts'}
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#e4eaf5', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div style={{ width: `${stats.science.avgAccuracy}%`, height: '100%', background: 'var(--success)' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Completed {stats.science.completed} quiz{stats.science.completed !== 1 ? 'zes' : ''} • {stats.science.totalCorrect} stars earned
              </p>
            </div>

            {/* Literacy Summary */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #e4eaf5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>📚 Literacy Hub</span>
                <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                  {stats.literacy.completed > 0 ? `${stats.literacy.avgAccuracy}%` : 'No attempts'}
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#e4eaf5', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div style={{ width: `${stats.literacy.avgAccuracy}%`, height: '100%', background: 'var(--secondary)' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Completed {stats.literacy.completed} quiz{stats.literacy.completed !== 1 ? 'zes' : ''} • {stats.literacy.totalCorrect} stars earned
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Quiz History List */}
        <div>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '2px solid #e4eaf5', paddingBottom: '0.5rem' }}>Adventure Log</h3>
          {history.length === 0 ? (
            <div style={{ textSelf: 'center', color: 'var(--text-light)', padding: '3rem', border: '2px dashed #e4eaf5', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              No completed adventures yet. Go play a game to see your history!
            </div>
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {history.map(item => {
                const accuracy = Math.round((item.score / item.total_questions) * 100);
                const subColorClass = item.subject === 'math' ? 'math-hist' : item.subject === 'science' ? 'science-hist' : 'literacy-hist';

                return (
                  <div key={item.id} className="history-card">
                    <div className="history-info">
                      <div className={`history-icon-wrapper ${subColorClass}`}>
                        {getSubjectEmoji(item.subject)}
                      </div>
                      <div className="history-meta">
                        <h4 style={{ textTransform: 'capitalize' }}>
                          {item.subject === 'math' ? 'Math Quest' : item.subject === 'science' ? 'Science Lab' : 'Literacy Hub'}
                        </h4>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar size={12} /> {formatDate(item.completed_at)}
                        </p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <Clock size={12} /> {formatTime(item.time_spent)}
                        </p>
                      </div>
                    </div>

                    <div className="history-score">
                      <div className="history-score-val">{item.score} / {item.total_questions}</div>
                      <div className="history-score-sub">{accuracy}% Accuracy</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
