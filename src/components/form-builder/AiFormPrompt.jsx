import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Send } from 'lucide-react';
import { formulairesAPI } from '../../services/api';

export default function AiFormPrompt({ formulaireId, onUpdated }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!prompt.trim()) return toast.error('Prompt requis');
    setLoading(true);
    try {
      await formulairesAPI.promptIA(formulaireId, { prompt: prompt.trim() });
      toast.success('Formulaire modifie par IA');
      setPrompt('');
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Modification IA impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Bot size={18} className="text-primary"/>
        <h2 className="font-display text-lg font-semibold text-gray-900">Modification par prompt IA</h2>
      </div>
      <form onSubmit={submit} className="flex gap-3">
        <input value={prompt} onChange={e => setPrompt(e.target.value)}
          className="input flex-1"
          placeholder="ex: ajoute un champ date a gauche du champ nom"/>
        <button type="submit" disabled={loading} className="btn-secondary flex items-center gap-2">
          <Send size={16}/>{loading ? 'Envoi...' : 'Appliquer'}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-2">
        Necessite GROQ_API_KEY dans backend/.env. Le backend envoie le schema actuel et applique uniquement le delta retourne.
      </p>
    </div>
  );
}
