import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { soumissionsAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeLabel = {
  TEXTE:'Texte', NOMBRE:'Nombre', DATE:'Date', HEURE:'Heure',
  BOOLEEN:'Oui/Non', LISTE:'Liste', SIGNATURE:'Signature', PHOTO:'Photo', CALCULE:'Calculé'
};

function renderVal(v) {
  if (v.valeur_booleen !== null && v.valeur_booleen !== undefined)
    return <span className={v.valeur_booleen ? 'badge-green' : 'badge-red'}>{v.valeur_booleen ? 'Oui' : 'Non'}</span>;
  if (v.valeur_nombre !== null && v.valeur_nombre !== undefined)
    return <span className="font-mono font-semibold text-gray-800">{v.valeur_nombre} {v.unite||''}</span>;
  if (v.valeur_date)
    return <span>{format(new Date(v.valeur_date),'dd MMM yyyy',{locale:fr})}</span>;
  if (v.valeur_texte) return <span className="text-gray-800">{v.valeur_texte}</span>;
  return <span className="text-gray-300">—</span>;
}

export default function SoumissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { peutValider } = useAuth();
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const load = () => {
    soumissionsAPI.getUne(id).then(r => setS(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const handleStatut = async statut => {
    setValidating(true);
    try {
      await soumissionsAPI.valider(id, { statut });
      toast.success(statut === 'VALIDE' ? 'Soumission validée !' : 'Renvoyée en brouillon');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setValidating(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>;
  if (!s) return <div className="text-center py-16 text-gray-400">Soumission non trouvée</div>;

  // Regrouper valeurs par section
  const sections = s.valeurs?.reduce((acc, v) => {
    const sec = v.section || 'Général';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(v); return acc;
  }, {}) || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-600"/>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-gray-900">{s.form_code}</h1>
            <span className={s.statut==='VALIDE'?'badge-green':s.statut==='SOUMIS'?'badge-blue':'badge-gray'}>{s.statut}</span>
            <span className={s.source==='HORS_LIGNE'?'badge-orange':'badge-gray'}>
              {s.source==='HORS_LIGNE'?'Hors-ligne':'En ligne'}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{s.form_titre}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          ['Auteur', s.auteur_nom],
          ['Rôle', s.auteur_role],
          ['Date', format(new Date(s.date_soumission),'dd MMM yyyy HH:mm',{locale:fr})],
          ['Équipement', s.equipement_nom||'—'],
          ['Module', s.module],
          ['Fréquence', s.form_frequence||'—'],
        ].map(([k,v]) => (
          <div key={k} className="card-sm py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p>
            <p className="font-medium text-gray-800 mt-0.5 text-sm">{v}</p>
          </div>
        ))}
      </div>

      {/* Entête signataires */}
      {s.entete && (
        <div className="card">
          <h3 className="section-title">Entête officielle</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              ['Émetteur', s.entete.emetteur_nom, s.entete.emetteur_fonction, s.entete.emetteur_date],
              ['Vérificateur', s.entete.verificateur_nom, s.entete.verificateur_fonction, s.entete.verificateur_date],
              ['Approbateur', s.entete.approbateur_nom, s.entete.approbateur_fonction, s.entete.approbateur_date],
            ].map(([role, nom, fn, date]) => (
              <div key={role} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{role}</p>
                <p className="font-medium text-gray-800">{nom || '—'}</p>
                {fn && <p className="text-xs text-gray-400">{fn}</p>}
                {date && <p className="text-xs text-gray-400">{format(new Date(date),'dd/MM/yyyy',{locale:fr})}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valeurs saisies par section */}
      {Object.entries(sections).map(([section, valeurs]) => (
        <div key={section} className="card">
          <h3 className="section-title">{section}</h3>
          <div className="divide-y divide-gray-50">
            {valeurs.map(v => (
              <div key={v.id} className="flex items-start justify-between py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">{v.nom_champ}</p>
                  <p className="text-xs text-gray-400">{typeLabel[v.type_champ]||v.type_champ}</p>
                </div>
                <div className="text-right flex-shrink-0">{renderVal(v)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Validation */}
      {peutValider() && s.statut === 'SOUMIS' && (
        <div className="card border-2 border-primary/10">
          <h3 className="section-title flex items-center gap-2">Décision de validation</h3>
          <div className="flex gap-3">
            <button onClick={() => handleStatut('VALIDE')} disabled={validating}
              className="btn-primary flex items-center gap-2 flex-1 justify-center">
              <CheckCircle size={16}/> Valider
            </button>
            <button onClick={() => handleStatut('BROUILLON')} disabled={validating}
              className="btn-danger flex items-center gap-2 flex-1 justify-center">
              <RotateCcw size={16}/> Renvoyer en brouillon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
