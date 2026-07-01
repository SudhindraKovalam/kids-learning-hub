import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Profile, Assignment, ProfileStats } from '../types';
import { ParentPinSettings } from './ParentPinSettings';
import { ArrowLeft, BookOpen, CheckCircle, Trash2 } from 'lucide-react';

interface AdminZoneProps {
  onExit: () => void;
}

export const AdminZone: React.FC<AdminZoneProps> = ({ onExit }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedProfileStats, setSelectedProfileStats] = useState<ProfileStats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Form states
  const [assignSubject, setAssignSubject] = useState<'math' | 'math_word' | 'science' | 'literacy'>('math');
  const [mathOperation, setMathOperation] = useState<string>('mix');
  const [mathCount, setMathCount] = useState<number>(30);
  const [mathWordFormat, setMathWordFormat] = useState<'choices' | 'work_area' | 'mix'>('mix');
  const [loading, setLoading] = useState<boolean>(true);
  const [assigning, setAssigning] = useState<boolean>(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      fetchProfileData(selectedProfile.id);
    } else {
      setSelectedProfileStats(null);
      setAssignments([]);
    }
  }, [selectedProfile]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getProfiles();
      setProfiles(data);
      if (data.length > 0 && !selectedProfile) {
        setSelectedProfile(data[0]);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileData = async (profileId: number) => {
    try {
      const [stats, list] = await Promise.all([
        api.getProfileStats(profileId),
        api.getAssignments(profileId)
      ]);
      setSelectedProfileStats(stats);
      setAssignments(list);
    } catch (err) {
      console.error('Error fetching child data:', err);
    }
  };

  const handleAssignWorkbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    try {
      setAssigning(true);
      let config: { count: number; type?: string } = { count: 10 };

      if (assignSubject === 'math') {
        config = { count: mathCount, type: mathOperation };
      } else if (assignSubject === 'math_word') {
        config = { count: mathCount, format: mathWordFormat };
      }

      await api.assignWorkbook(selectedProfile.id, assignSubject, config);
      await fetchProfileData(selectedProfile.id);
      alert('Workbook assigned successfully!');
    } catch (err) {
      console.error('Error assigning workbook:', err);
      alert('Failed to assign workbook.');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    try {
      await api.deleteAssignment(id);
      if (selectedProfile) {
        await fetchProfileData(selectedProfile.id);
      }
    } catch (err) {
      console.error('Error deleting assignment:', err);
      alert('Failed to delete assignment.');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

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

  return (
    <div className="stats-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="stats-header">
        <button className="btn btn-light btn-sm" onClick={onExit}>
          <ArrowLeft size={16} /> Exit Parent Zone
        </button>
        <h2 style={{ color: 'var(--primary)' }}>🔑 Parent/Administrator Zone</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-title)' }}>Loading settings...</div>
      ) : (
        <div className="stats-grid-2">
          {/* Left Column: Select Child Profile, Assign & Change PIN */}
          <div>
            <h3 style={{ marginBottom: '1.25rem', borderBottom: '2px solid #e4eaf5', paddingBottom: '0.5rem' }}>Profiles</h3>
            
            {/* Profiles Selection list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {profiles.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfile(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1.2rem',
                    borderRadius: 'var(--radius-sm)',
                    background: selectedProfile?.id === p.id ? 'var(--primary-light)' : 'white',
                    border: selectedProfile?.id === p.id ? '2px solid var(--primary)' : '2px solid #e4eaf5',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>{p.avatar}</span>
                    <span style={{ fontWeight: 600, fontSize: '1.05rem', color: selectedProfile?.id === p.id ? 'var(--primary)' : 'var(--text-dark)' }}>{p.name}</span>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No profiles created yet. Create one from the home screen!</div>
              )}
            </div>

            {selectedProfile && (
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #e4eaf5', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)' }}>Assign New Sheet</h3>
                <form onSubmit={handleAssignWorkbook}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="assign-subject">Select Subject</label>
                    <select
                      id="assign-subject"
                      className="form-input"
                      value={assignSubject}
                      onChange={(e) => setAssignSubject(e.target.value as any)}
                    >
                      <option value="math">🧮 Math Quest (Arithmetic)</option>
                      <option value="math_word">📝 Math Word Problems</option>
                      <option value="science">🔬 Science Lab</option>
                      <option value="literacy">📚 Literacy Hub</option>
                    </select>
                  </div>

                  {assignSubject === 'math' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="math-operation">Operation Type</label>
                      <select
                        id="math-operation"
                        className="form-input"
                        value={mathOperation}
                        onChange={(e) => setMathOperation(e.target.value)}
                      >
                        <option value="mix">🌀 Mixed Problems</option>
                        <option value="addition">➕ Addition Only</option>
                        <option value="subtraction">➖ Subtraction Only</option>
                        <option value="multiplication">✖️ Multiplication Only</option>
                        <option value="division">➗ Division Only</option>
                        <option value="fractions">🍕 Fractions (Common & Uncommon)</option>
                      </select>
                    </div>
                  )}
                  {assignSubject === 'math_word' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="word-format">Word Problems Format</label>
                      <select
                        id="word-format"
                        className="form-input"
                        value={mathWordFormat}
                        onChange={(e) => setMathWordFormat(e.target.value as any)}
                      >
                        <option value="mix">🌀 Mixed Format (Workspace & Choices)</option>
                        <option value="work_area">📝 Lined Workspace Only</option>
                        <option value="choices">🔘 Multiple Choice Options Only</option>
                      </select>
                    </div>
                  )}

                  {(assignSubject === 'math' || assignSubject === 'math_word') && (
                    <div className="form-group">
                      <label className="form-label">Number of Problems</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[10, 20, 30, 45, 60].map(count => (
                          <button
                            key={count}
                            type="button"
                            className={`btn btn-sm ${mathCount === count ? 'btn-primary' : 'btn-light'}`}
                            onClick={() => setMathCount(count)}
                            style={{ flex: 1, fontFamily: 'var(--font-title)', fontSize: '0.95rem' }}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(assignSubject === 'science' || assignSubject === 'literacy') && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Assigns a multiple-choice quiz with 10 questions covering 4th-grade topics.
                    </p>
                  )}

                  <button type="submit" className="btn btn-primary btn-full" disabled={assigning}>
                    {assigning ? 'Assigning...' : 'Assign Workbook 📝'}
                  </button>
                </form>
              </div>
            )}

            <ParentPinSettings />
          </div>

          {/* Right Column: List current assignments & completed history */}
          <div>
            {selectedProfile ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>{selectedProfile.avatar}</span>
                  <div>
                    <h3 style={{ fontSize: '1.4rem' }}>{selectedProfile.name}'s Assignments</h3>
                    {selectedProfileStats && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Total stars earned: {selectedProfileStats.totalStars} ⭐
                      </p>
                    )}
                  </div>
                </div>

                {/* Pending Assignments */}
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={16} /> Pending Sheets
                </h4>
                <div style={{ marginBottom: '2.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {assignments.filter(a => a.status !== 'completed').map(a => (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.9rem 1.2rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'white',
                        border: '1px solid #e4eaf5',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>{getSubjectEmoji(a.subject)}</span>
                        <div>
                          <span style={{ fontWeight: 600 }}>{getSubjectTitle(a.subject)}</span>
                          <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '10px', marginLeft: '0.5rem', textTransform: 'capitalize' }}>
                            {a.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                          </span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {a.subject === 'math' 
                              ? `${a.config.count} problems (${a.config.type || 'mix'})` 
                              : a.subject === 'math_word'
                              ? `${a.config.count} word problems`
                              : '10 multiple-choice Qs'} • Assigned {formatDate(a.assigned_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '5px'
                        }}
                        title="Remove Assignment"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  {assignments.filter(a => a.status !== 'completed').length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed #e4eaf5', color: 'var(--text-light)', borderRadius: 'var(--radius-sm)' }}>
                      No pending assignments.
                    </div>
                  )}
                </div>

                {/* Completed Assignments */}
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} /> Completed Sheets
                </h4>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {assignments.filter(a => a.status === 'completed').map(a => {
                    const accuracy = a.score !== null && a.total_questions ? Math.round((a.score / a.total_questions) * 100) : 0;
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.9rem 1.2rem',
                          borderRadius: 'var(--radius-sm)',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.4rem' }}>{getSubjectEmoji(a.subject)}</span>
                          <div>
                            <span style={{ fontWeight: 600 }}>{getSubjectTitle(a.subject)}</span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Completed {a.completed_at ? formatDate(a.completed_at) : ''} • Took {a.time_spent ? Math.round(a.time_spent / 60) : 0}m
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{a.score} / {a.total_questions}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{accuracy}% Correct</div>
                        </div>
                      </div>
                    );
                  })}

                  {assignments.filter(a => a.status === 'completed').length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed #e4eaf5', color: 'var(--text-light)', borderRadius: 'var(--radius-sm)' }}>
                      No sheets completed yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Please select or create a kid profile on the left.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
