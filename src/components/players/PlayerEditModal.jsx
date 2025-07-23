import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';

const PlayerEditModal = ({ player, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({ name: '', email: '', rating: '' });

  useEffect(() => { 
    if (player) setFormData(player);
  }, [player]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
            <div className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Edit Player</h2>
              <div className="space-y-4">
                <Input label="Player Name" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} />
                <Input label="Email" type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} />
                <Input label="Rating" type="number" value={formData.rating || ''} onChange={e => handleChange('rating', e.target.value)} />
              </div>
            </div>
            <div className="p-4 bg-muted/10 flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
        </form>
      </div>
    </div>
  );
};
export default PlayerEditModal;