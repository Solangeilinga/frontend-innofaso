import { useState, useEffect } from 'react';
import { equipementsAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Search, Plus, Wrench, MapPin, X } from 'lucide-react';

function Modal({ onClose, onCreated }) {
  const [f, setF] = useState({ code_ref:'', nom:'', type_equipement:'', localisation:'', ligne_production:'' });
  const [l, setL] = useState(false);
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  const sub = async e => {
    e.preventDefault();
    if (!f.code_ref||!f.nom) return toast.error('Code et nom requis');
    setL(true);
    try { await equipementsAPI.creer(f); toast.success('Équipement créé !'); onCreated(); }
    catch(err) { toast.error(err.response?.data?.error||'Erreur'); }
    finally { setL(false); }
  };
  return (
    <div className="modal-overlay"><div className="modal max-w-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold">Nouvel équipement</h3>
        <button onClick={onClose}><X size={18} className="text-gray-500"/></button>
      </div>
      <form onSubmit={sub} className="space-y-3">
        {[['code_ref','Code référence *','ex: BROYEUR-01','font-mono'],['nom','Nom *','Nom de l\'équipement',''],['type_equipement','Type','Broyeur, Pompe...',''],['localisation','Localisation','Salle de production',''],['ligne_production','Ligne de production','Ligne 1','']].map(([k,l,p,cls])=>(
          <div key={k}><label className="label">{l}</label>
            <input value={f[k]} onChange={e=>s(k,e.target.value)} placeholder={p} className={`input ${cls}`}/>
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={l} className="btn-primary flex-1">{l?'Création…':'Créer'}</button>
        </div>
      </form>
    </div></div>
  );
}

export default function EquipementsPage() {
  const { peutGerer } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = () => {
    setLoading(true);
    equipementsAPI.lister({ search: search||undefined })
      .then(r => setItems(r.data?.data || (Array.isArray(r.data) ? r.data : []))).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[search]);

  const etatColor = { OPERATIONNEL:'badge-green', EN_PANNE:'badge-red', EN_MAINTENANCE:'badge-yellow' };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {modal && <Modal onClose={()=>setModal(false)} onCreated={()=>{setModal(false);load();}}/>}
      <div className="card flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} className="input pl-11"/>
        </div>
        {peutGerer() && <button onClick={()=>setModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Ajouter</button>}
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        Object.entries(
          items.reduce((acc, e) => {
            const ligne = e.ligne_production || e.ligne_code || 'Sans ligne';
            if (!acc[ligne]) acc[ligne] = [];
            acc[ligne].push(e);
            return acc;
          }, {})
        ).map(([ligne, groupe]) => (
        <div key={ligne} className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-sm text-primary">{ligne}</span>
            <span className="text-xs font-normal text-muted-foreground">{groupe.length} équipement{groupe.length > 1 ? 's' : ''}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groupe.map(e=>(
            <div key={e.id} className="card hover:shadow-float transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wrench size={18} className="text-primary"/>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-xs text-primary">{e.code_ref}</p>
                  <p className="font-semibold text-gray-800 text-sm">{e.nom}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                {e.type_equipement && <p>Type : <span className="text-gray-600">{e.type_equipement}</span></p>}
                {e.localisation && <p className="flex items-center gap-1"><MapPin size={11}/>{e.localisation}</p>}
                {e.ligne_production && <p>Ligne : <span className="text-gray-600">{e.ligne_production}</span></p>}
              </div>
              <span className={`mt-3 inline-flex ${etatColor[e.etat]||'badge-gray'}`}>{e.etat?.replace('_',' ')}</span>
            </div>
          ))}
          </div>
        </div>
        ))
      )}
    </div>
  );
}