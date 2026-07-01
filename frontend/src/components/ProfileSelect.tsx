import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Profile } from '../types';
import { Plus, X } from 'lucide-react';

interface ProfileSelectProps {
  onSelectProfile: (profile: Profile) => void;
}

const AVATAR_OPTIONS = ['🐶', '🐱', '🦊', '🦁', '🐯', '🐨', '🐼', '🐸', '🦄', '🦖', '🐵', '🦉'];

export const ProfileSelect: React.FC<ProfileSelectProps> = ({ onSelectProfile }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      setError('Please enter a name.');
      return;
    }

    try {
      setError('');
      const created = await api.createProfile(newProfileName.trim(), selectedAvatar);
      setProfiles(prev => [...prev, created]);
      setIsModalOpen(false);
      setNewProfileName('');
      setSelectedAvatar(AVATAR_OPTIONS[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile.');
    }
  };

  const handleDeleteProfile = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the profile when deleting
    if (!window.confirm('Are you sure you want to delete this profile and all its progress?')) {
      return;
    }

    try {
      await api.deleteProfile(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting profile:', err);
      alert('Failed to delete profile.');
    }
  };

  return (
    <div className="profile-select-container">
      <h1>Kids Learning Hub</h1>
      <p className="profile-subtitle">Choose your profile to start learning!</p>

      {loading ? (
        <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)' }}>Loading profiles...</div>
      ) : (
        <div className="profiles-grid">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="profile-card"
              onClick={() => onSelectProfile(profile)}
            >
              <button
                className="delete-profile-btn"
                onClick={(e) => handleDeleteProfile(profile.id, e)}
                title="Delete Profile"
              >
                <X size={16} />
              </button>
              <div className="profile-avatar-wrapper">
                {profile.avatar}
              </div>
              <div className="profile-name">{profile.name}</div>
            </div>
          ))}

          <div
            className="create-profile-card"
            onClick={() => setIsModalOpen(true)}
            title="Create New Profile"
          >
            <Plus size={40} />
            <div style={{ marginTop: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>New Profile</div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Create Profile</h2>
            <form onSubmit={handleCreateProfile}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">
                  What is your name?
                </label>
                <input
                  type="text"
                  id="profile-name"
                  className="form-input"
                  placeholder="Type your name..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  maxLength={15}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Choose an Avatar</label>
                <div className="avatar-selector">
                  {AVATAR_OPTIONS.map(avatar => (
                    <div
                      key={avatar}
                      className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                      onClick={() => setSelectedAvatar(avatar)}
                    >
                      {avatar}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ color: 'var(--error)', marginBottom: '1.5rem', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-light btn-full"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError('');
                    setNewProfileName('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full">
                  Let's Go!
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
