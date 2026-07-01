import React, { useState } from 'react';
import { api } from '../api';

export const ParentPinSettings: React.FC = () => {
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 numbers.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    try {
      setLoading(true);
      await api.changeParentPin(newPin);
      setMessage('Parent PIN changed successfully!');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #e4eaf5', marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)' }}>🔒 Change Parent PIN</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="new-pin">New 4-Digit PIN</label>
          <input
            type="password"
            id="new-pin"
            className="form-input"
            placeholder="Enter new 4 numbers..."
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={4}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-pin">Confirm New PIN</label>
          <input
            type="password"
            id="confirm-pin"
            className="form-input"
            placeholder="Confirm new 4 numbers..."
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={4}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
            {message}
          </div>
        )}

        <button type="submit" className="btn btn-secondary btn-full btn-sm" disabled={loading}>
          {loading ? 'Updating...' : 'Update PIN'}
        </button>
      </form>
    </div>
  );
};
