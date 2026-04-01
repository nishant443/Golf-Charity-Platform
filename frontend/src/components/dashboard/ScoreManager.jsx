import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../utils/api';

export default function ScoreManager({ scores = [], onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ score: '', played_on: '' });
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.score || !form.played_on) return;
    setLoading(true);
    try {
      const { data } = await api.post('/scores', {
        score: parseInt(form.score),
        played_on: form.played_on,
      });
      toast.success('Score added!');
      setForm({ score: '', played_on: '' });
      setShowAdd(false);
      onUpdate(data.scores);
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed to add score');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    setLoading(true);
    try {
      const { data } = await api.put(`/scores/${id}`, {
        score: parseInt(editForm.score),
        played_on: editForm.played_on,
      });
      toast.success('Score updated!');
      setEditingId(null);
      onUpdate(scores.map(s => s.id === id ? data.score : s));
    } catch (err) {
      toast.error('Failed to update score');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this score?')) return;
    try {
      await api.delete(`/scores/${id}`);
      toast.success('Score deleted');
      onUpdate(scores.filter(s => s.id !== id));
    } catch {
      toast.error('Failed to delete score');
    }
  };

  const startEdit = (score) => {
    setEditingId(score.id);
    setEditForm({ score: score.score, played_on: score.played_on });
  };

  const getScoreColor = (s) => {
    if (s >= 36) return 'text-gold font-bold';
    if (s >= 28) return 'text-forest-600 font-semibold';
    if (s >= 18) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display text-xl font-semibold">Golf Scores</h3>
          <p className="text-gray-400 text-sm mt-0.5">Your latest 5 Stableford scores</p>
        </div>
        {scores.length < 5 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary text-sm px-4 py-2"
          >
            {showAdd ? '✕ Cancel' : '+ Add Score'}
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="mb-5 p-4 bg-forest-50 rounded-xl border border-forest-100"
          >
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label text-xs">Stableford Score (1–45)</label>
                <input
                  type="number"
                  min="1"
                  max="45"
                  className="input text-sm"
                  placeholder="e.g. 32"
                  value={form.score}
                  onChange={e => setForm({ ...form, score: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Date Played</label>
                <input
                  type="date"
                  className="input text-sm"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.played_on}
                  onChange={e => setForm({ ...form, played_on: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary text-sm w-full py-2.5">
              {loading ? 'Adding...' : 'Add Score'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Score list */}
      {scores.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">⛳</div>
          <p className="text-gray-500 text-sm">No scores yet. Add your first round!</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 text-sm px-5 py-2">
            Add First Score
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((score, i) => (
            <motion.div
              key={score.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              {editingId === score.id ? (
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="number" min="1" max="45"
                    className="input text-sm py-1.5"
                    value={editForm.score}
                    onChange={e => setEditForm({ ...editForm, score: e.target.value })}
                  />
                  <input
                    type="date"
                    className="input text-sm py-1.5"
                    value={editForm.played_on}
                    onChange={e => setEditForm({ ...editForm, played_on: e.target.value })}
                  />
                  <button onClick={() => handleEdit(score.id)} className="btn-primary text-xs py-1.5 col-span-1">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1.5 col-span-1">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 flex-shrink-0">
                    <span className={`text-base font-mono ${getScoreColor(score.score)}`}>
                      {score.score}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-500">
                      {format(new Date(score.played_on), 'dd MMM yyyy')}
                    </div>
                    {i === 0 && <span className="text-xs text-forest-600 font-medium">Most recent</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(score)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(score.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {scores.length === 5 && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Maximum 5 scores stored. Adding a new score will replace the oldest.
        </p>
      )}
    </div>
  );
}
