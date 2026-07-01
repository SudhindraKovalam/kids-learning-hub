import React, { useState } from 'react';
import type { Profile, Assignment } from './types';
import { api } from './api';
import { ProfileSelect } from './components/ProfileSelect';
import { Dashboard } from './components/Dashboard';
import { MathWorkbook } from './components/MathWorkbook';
import { ScienceLiteracyQuiz } from './components/ScienceLiteracyQuiz';
import { StatsDashboard } from './components/StatsDashboard';
import { AdminZone } from './components/AdminZone';
import { Lock, ShieldCheck, Users } from 'lucide-react';

type ViewState = 'dashboard' | 'math' | 'science' | 'literacy' | 'stats' | 'admin';

function App() {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [resumeSession, setResumeSession] = useState<boolean>(false);
  
  // Assignment specific states
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | undefined>(undefined);
  const [assignmentConfig, setAssignmentConfig] = useState<any | undefined>(undefined);

  // Parent Gate states
  const [isParentGateOpen, setIsParentGateOpen] = useState<boolean>(false);
  const [parentGateInput, setParentGateInput] = useState<string>('');
  const [parentGateError, setParentGateError] = useState<string>('');

  const handleSelectProfile = (profile: Profile) => {
    setCurrentProfile(profile);
    setActiveAssignmentId(undefined);
    setAssignmentConfig(undefined);
    setCurrentView('dashboard');
  };

  const handleSelectAssignment = (assignment: Assignment) => {
    setActiveAssignmentId(assignment.id);
    setAssignmentConfig(assignment.config);
    setResumeSession(assignment.status === 'in_progress');
    setCurrentView(assignment.subject);
  };

  const handleBackToDashboard = () => {
    setActiveAssignmentId(undefined);
    setAssignmentConfig(undefined);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    setActiveAssignmentId(undefined);
    setAssignmentConfig(undefined);
    setCurrentView('dashboard');
  };

  const handleOpenParentGate = () => {
    setParentGateInput('');
    setParentGateError('');
    setIsParentGateOpen(true);
  };

  const handleParentGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentGateInput.trim()) return;

    try {
      const response = await api.verifyParentPin(parentGateInput);
      if (response.verified) {
        setIsParentGateOpen(false);
        setCurrentView('admin');
      } else {
        setParentGateError('Incorrect Parent PIN. Please try again!');
      }
    } catch (err) {
      console.error(err);
      setParentGateError('Verification failed. Try again.');
    }
  };

  return (
    <div className="app-container">
      {/* Playful Header */}
      <header className="app-header">
        <div className="logo" onClick={handleBackToDashboard}>
          <span className="logo-icon">🚀</span>
          <span>Kids Learning Hub</span>
        </div>

        <div className="header-actions">
          {currentView !== 'admin' && (
            <button className="btn btn-light btn-sm" onClick={handleOpenParentGate} title="Admin Portal">
              <Lock size={16} /> Parent Zone
            </button>
          )}

          {currentProfile && (
            <div className="user-widget" onClick={handleLogout} title="Switch Profile">
              <div className="user-widget-avatar">
                {currentProfile.avatar}
              </div>
              <span className="user-widget-name">{currentProfile.name}</span>
              <Users size={16} style={{ marginLeft: '0.5rem', color: 'var(--primary)' }} />
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Parent Gate Modal */}
        {isParentGateOpen && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <ShieldCheck size={48} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                <h2 className="modal-title" style={{ marginBottom: 0 }}>Parent Security Gate</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Please enter your 4-digit Parent PIN (Default is 0000).</p>
              </div>

              <form onSubmit={handleParentGateSubmit}>
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••"
                    value={parentGateInput}
                    onChange={(e) => setParentGateInput(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={4}
                    autoComplete="off"
                    autoFocus
                    style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '8px' }}
                  />
                </div>

                {parentGateError && (
                  <div style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 600, textAlign: 'center' }}>
                    {parentGateError}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-light btn-full"
                    onClick={() => setIsParentGateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-full">
                    Enter Portal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Views */}
        {currentView === 'admin' ? (
          <AdminZone onExit={handleBackToDashboard} />
        ) : !currentProfile ? (
          <ProfileSelect onSelectProfile={handleSelectProfile} />
        ) : (
          <>
            {currentView === 'dashboard' && (
              <Dashboard
                profile={currentProfile}
                onSelectSubject={(sub, res) => handleSelectAssignment({
                  id: 0, // Free play dummy id
                  profile_id: currentProfile.id,
                  subject: sub,
                  config: {},
                  status: res ? 'in_progress' : 'assigned',
                  score: null,
                  total_questions: null,
                  time_spent: null,
                  state: null,
                  assigned_at: '',
                  completed_at: null
                })}
                onSelectAssignment={handleSelectAssignment}
                onViewStats={() => setCurrentView('stats')}
              />
            )}

            {(currentView === 'math' || currentView === 'math_word') && (
              <MathWorkbook
                profile={currentProfile}
                resume={resumeSession}
                subject={currentView}
                assignmentId={activeAssignmentId}
                config={assignmentConfig}
                onBack={handleBackToDashboard}
              />
            )}

            {(currentView === 'science' || currentView === 'literacy') && (
              <ScienceLiteracyQuiz
                profile={currentProfile}
                subject={currentView}
                resume={resumeSession}
                assignmentId={activeAssignmentId}
                onBack={handleBackToDashboard}
              />
            )}

            {currentView === 'stats' && (
              <StatsDashboard
                profile={currentProfile}
                onBack={handleBackToDashboard}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
