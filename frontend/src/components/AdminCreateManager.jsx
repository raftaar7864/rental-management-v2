// frontend/src/components/AdminCreateManager.jsx
import React, { useState } from 'react';
import axios from 'axios';

const AdminCreateManager = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [building, setBuilding] = useState(''); // optional building id
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return alert('name, email and password are required');

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name, email, password, role: 'manager', building: building || undefined
      });
      alert('Manager created');
      setName(''); setEmail(''); setPassword(''); setBuilding('');
      if (onCreated) onCreated(res.data.user);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="p-4 border rounded">
      <h3 className="mb-2 font-semibold">Create Manager</h3>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="block w-full p-2 mb-2" />
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" className="block w-full p-2 mb-2" />
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="block w-full p-2 mb-2" />
      <input value={building} onChange={e=>setBuilding(e.target.value)} placeholder="Building ID (optional)" className="block w-full p-2 mb-2" />
      <button type="submit" disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">
        {loading ? 'Creating...' : 'Create Manager'}
      </button>
    </form>
  );
};

export default AdminCreateManager;
