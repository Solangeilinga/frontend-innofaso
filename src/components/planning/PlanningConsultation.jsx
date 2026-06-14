import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { planningAPI } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, FileText, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const TAUX_CIBLE = 90;

function tauxClass(t) {
  if (t >= TAUX_CIBLE) return 'text-emerald-600 bg-emerald-50';
  if (t >= 75) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

/** Vue lecture seule pour techniciens / opérateurs */
export default function PlanningConsultation() {
  const now = new Date();
  const [lignes, setLignes] = useState([]);
  const [selectedLigne, setSelectedLigne] = useState('');
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [semaineIndex, setSemaineIndex] = useState(Math.min(4, Math.ceil(now.getDate() / 7)));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    planningAPI.listerLignes().then(r => {
      setLignes(r.data);
      if (r.data.length) setSelectedLigne(r.data[0].id);
    });
  }, []);

  const load = useCallback(() => {
    if (!selectedLigne) return;
    setLoading(true);
    planningAPI
      .obtenirPlanningMois({ ligne_id: selectedLigne, mois, annee, semaine_index: semaineIndex })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [selectedLigne, mois, annee, semaineIndex]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!data?.jours || !data?.quarts_ref) return [];
    const out = [];
    for (const jour of data.jours) {
      for (const quart of data.quarts_ref) {
        const assigned = (jour.quarts_assignes || []).find(q => q.quart_id === quart.id);
        const li = assigned?.ligne_intervention;
        out.push({
          key: `${jour.id}-${quart.id}`,
          jour_semaine: jour.jour_semaine,
          date_jour: jour.date_jour,
          quart,
          maintenancier_nom: assigned?.maintenancier_nom,
          co_maintenancier_nom: assigned?.co_maintenancier_nom,
          duree_arret: li?.duree_arret ?? 0,
          taux: li?.taux_disponibilite ?? null,
          cause: li?.cause_indisponibilite,
          observations: li?.observations,
          ligne_code: data.ligne?.code,
        });
      }
    }
    return out;
  }, [data]);

  const moisLabel = format(new Date(annee, mois - 1, 1), 'MMMM yyyy', { locale: fr });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="rounded-2xl border border-border bg-muted/30 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Eye size={20} />
              <span className="text-xs font-semibold uppercase tracking-widest">Consultation</span>
            </div>
            <h1 className="text-2xl font-bold">Planning maintenance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Affichage en lecture seule. Pour saisir une intervention, utilisez le formulaire corrective.
            </p>
          </div>
          <Link to="/formulaires" className="btn-primary inline-flex items-center gap-2 text-sm">
            <FileText size={16} /> Remplir une intervention
          </Link>
        </div>
      </header>

      <div className="card-sm flex flex-wrap gap-4">
        <select value={selectedLigne} onChange={e => setSelectedLigne(e.target.value)} className="input max-w-xs">
          {lignes.map(l => (
            <option key={l.id} value={l.id}>{l.code}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 rounded-lg border border-border px-1">
          <button
            type="button"
            onClick={() => {
              let m = mois - 1;
              let a = annee;
              if (m < 1) { m = 12; a -= 1; }
              setMois(m);
              setAnnee(a);
            }}
            className="p-2"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[120px] text-center text-sm font-semibold capitalize">{moisLabel}</span>
          <button
            type="button"
            onClick={() => {
              let m = mois + 1;
              let a = annee;
              if (m > 12) { m = 1; a += 1; }
              setMois(m);
              setAnnee(a);
            }}
            className="p-2"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {[1, 2, 3, 4].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSemaineIndex(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              semaineIndex === s ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            S{String(s).padStart(2, '0')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Quart</th>
                <th className="px-3 py-2">Maintenancier</th>
                <th className="px-3 py-2">Ligne</th>
                <th className="px-3 py-2">Arrêt</th>
                <th className="px-3 py-2">Dispo.</th>
                <th className="px-3 py-2">Cause</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    {row.jour_semaine}
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(row.date_jour), 'dd/MM')}
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.quart.nom}</td>
                  <td className="px-3 py-2">{row.maintenancier_nom || '—'}</td>
                  <td className="px-3 py-2">{row.ligne_code}</td>
                  <td className="px-3 py-2">{Number(row.duree_arret).toFixed(1)}h</td>
                  <td className="px-3 py-2">
                    {row.taux != null ? (
                      <span className={`rounded px-1.5 text-xs font-bold ${tauxClass(row.taux)}`}>
                        {Number(row.taux).toFixed(0)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-xs">{row.cause || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">Aucun planning publié pour cette période.</p>
          )}
        </div>
      )}
    </div>
  );
}
