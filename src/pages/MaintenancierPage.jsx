import { useState, useEffect } from 'react';
import { formulairesAPI, soumissionsAPI } from '../services/api';
import { useAuth } from '../store/auth';
import { Calendar, FileCheck, AlertCircle, CheckCircle } from 'lucide-react';

export default function MaintenancierPage() {
  const { user } = useAuth();
  const [formulaires, setFormulaires] = useState([]);
  const [soumissions, setSoumissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [formRes, subRes] = await Promise.all([
        formulairesAPI.lister({ module: 'MAINTENANCE' }),
        soumissionsAPI.lister({ utilisateur_id: user?.id })
      ]);
      setFormulaires(formRes.data?.data || (Array.isArray(formRes.data) ? formRes.data : []));
      setSoumissions(subRes.data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold">Espace Maintenancier</h1>
        <p className="text-muted-foreground">Bienvenue, {user?.prenom} {user?.nom}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileCheck className="text-primary" size={24}/>
            </div>
            <div>
              <p className="text-2xl font-bold">{soumissions.length}</p>
              <p className="text-sm text-muted-foreground">Soumissions</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24}/>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {soumissions.filter(s => s.statut === 'VALIDE').length}
              </p>
              <p className="text-sm text-muted-foreground">Validées</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="text-yellow-600" size={24}/>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {soumissions.filter(s => s.statut === 'SOUMIS').length}
              </p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Formulaires disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formulaires.map(f => (
            <div key={f.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition">
              <h3 className="font-medium">{f.titre}</h3>
              <p className="text-sm text-muted-foreground">{f.code}</p>
              <a
                href={`/formulaires/${f.id}/remplir`}
                className="mt-3 inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition"
              >
                Remplir
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Mes soumissions récentes</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Formulaire</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {soumissions.slice(0, 10).map(s => (
                <tr key={s.id} className="border-b border-border/60 hover:bg-primary/[0.03]">
                  <td className="px-4 py-3">
                    {new Date(s.date_soumission).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">{s.formulaire_titre}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.statut === 'VALIDE' ? 'bg-green-100 text-green-800' :
                      s.statut === 'SOUMIS' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {s.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {soumissions.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              Aucune soumission
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
