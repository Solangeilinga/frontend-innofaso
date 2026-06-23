import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { processusAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import {
  Calendar, ClipboardList, FileCheck, ShieldCheck, Loader2,
  ChevronRight, Send, FileText, MessageSquare, CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ETAPES = [
  { id: 'PLANIFICATION', label: 'Plannification', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'EXECUTION',     label: 'Exécution',     icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'VERIFICATION',  label: 'Vérification',  icon: FileCheck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'VALIDATION',    label: 'Validation',    icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

const userCanSee = (tache, userId, role) => {
  if (['ADMIN', 'RESP_MAINT', 'RESP_PROD'].includes(role)) return true;
  return (
    tache.executeur_id === userId ||
    tache.verificateur_id === userId ||
    tache.validateur_id === userId
  );
};

const userCanAct = (tache, userId, etape) => {
  if (etape === 'EXECUTION') return tache.executeur_id === userId;
  if (etape === 'VERIFICATION') return tache.verificateur_id === userId;
  if (etape === 'VALIDATION') return tache.validateur_id === userId;
  return false;
};

export default function PlanningPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState('PLANIFICATION');
  const [counts, setCounts] = useState({ execution_en_cours: 0, execution_terminee: 0, verification_en_cours: 0, verification_terminee: 0, validation_en_cours: 0, validation_terminee: 0 });
  const [taches, setTaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyModal, setVerifyModal] = useState(null);
  const [validateModal, setValidateModal] = useState(null);

  const loadCounts = useCallback(() => {
    processusAPI.compter({ utilisateur_id: user?.id })
      .then(r => setCounts(r.data))
      .catch(() => {});
  }, [user?.id]);

  const loadTaches = useCallback(() => {
    if (activeStep === 'PLANIFICATION') {
      setTaches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    processusAPI.lister({ etape: activeStep })
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setTaches(list.filter(t => userCanSee(t, user?.id, user?.role)));
      })
      .catch(() => setTaches([]))
      .finally(() => setLoading(false));
  }, [activeStep, user?.id, user?.role]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadTaches(); }, [loadTaches]);

  const refresh = () => { loadCounts(); loadTaches(); };

  const handleExecuter = async (tache) => {
    navigate(`/formulaires/${tache.formulaire_id}/remplir`);
  };

  const handleMarquerExecute = async (tacheId) => {
    try {
      await processusAPI.executer(tacheId, {});
      toast.success('Tâche marquée comme exécutée');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'exécution');
    }
  };

  const handleVerifier = async (tache, commentaire) => {
    try {
      await processusAPI.verifier(tache.id, { commentaire });
      toast.success('Tâche vérifiée avec succès');
      setVerifyModal(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la vérification');
    }
  };

  const handleValider = async (tache, commentaire) => {
    try {
      await processusAPI.valider(tache.id, { commentaire });
      toast.success('Tâche validée avec succès');
      setValidateModal(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la validation');
    }
  };

  const countFor = (etape) => {
    if (etape === 'EXECUTION') return { enCours: Number(counts.execution_en_cours), terminee: Number(counts.execution_terminee) };
    if (etape === 'VERIFICATION') return { enCours: Number(counts.verification_en_cours), terminee: Number(counts.verification_terminee) };
    if (etape === 'VALIDATION') return { enCours: Number(counts.validation_en_cours), terminee: Number(counts.validation_terminee) };
    return { enCours: 0, terminee: 0 };
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
      <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-secondary/5 p-6 shadow-sm">
        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <FileText size={22} />
            <span className="text-xs font-semibold uppercase tracking-widest">Processus</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Planning — Chaîne de processus</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Suivez l&apos;avancement des tâches de la planification à la validation. Chaque étape notifie automatiquement le responsable suivant.
          </p>
        </div>
      </header>

      {/* Process Chain */}
      <div className="relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ETAPES.map((step, idx) => {
            const c = countFor(step.id);
            const isActive = activeStep === step.id;
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
                  isActive
                    ? `${step.border} ${step.bg} shadow-md scale-[1.02]`
                    : 'border-border bg-card hover:shadow-sm hover:border-muted-foreground/30'
                }`}
              >
                <div className={`rounded-full p-3 ${isActive ? step.bg : 'bg-muted'}`}>
                  <Icon size={28} className={isActive ? step.color : 'text-muted-foreground'} />
                </div>
                <span className={`text-sm font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {idx + 1}. {step.label}
                </span>
                {step.id !== 'PLANIFICATION' && (
                  <div className="flex items-center gap-2 text-xs">
                    {c.enCours > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {c.enCours} en cours
                      </span>
                    )}
                    {c.terminee > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {c.terminee} faite{c.terminee > 1 ? 's' : ''}
                      </span>
                    )}
                    {c.enCours === 0 && c.terminee === 0 && (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </div>
                )}
                {step.id === 'PLANIFICATION' && (
                  <span className="text-xs text-muted-foreground">Accéder au planning</span>
                )}
                {idx < ETAPES.length - 1 && (
                  <ChevronRight size={18} className="absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hidden md:block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[300px]">
        {activeStep === 'PLANIFICATION' && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Calendar size={48} className="mx-auto text-primary/40 mb-4" />
            <h3 className="text-lg font-bold mb-2">Planification des tâches</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
              Créez et gérez le planning maintenance : assignez les quarts, tagguez les formulaires,
              et définissez les exécuteurs, vérificateurs et validateurs pour chaque tâche.
            </p>
            <button
              type="button"
              onClick={() => navigate('/plannification')}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
            >
              <Calendar size={18} /> Accéder à la planification
            </button>
          </div>
        )}

        {activeStep !== 'PLANIFICATION' && (
          <>
            {loading ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 animate-spin" size={24} /> Chargement…
              </div>
            ) : taches.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
                <ClipboardList size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Aucune tâche en {activeStep === 'EXECUTION' ? 'exécution' : activeStep === 'VERIFICATION' ? 'vérification' : 'validation'}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {taches.map(tache => {
                  const canAct = userCanAct(tache, user?.id, activeStep);
                  const etapeInfo = ETAPES.find(e => e.id === activeStep);
                  const Icon = etapeInfo?.icon || FileText;
                  return (
                    <div key={tache.id} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`rounded-lg p-2 ${etapeInfo?.bg} flex-shrink-0`}>
                            <Icon size={18} className={etapeInfo?.color} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm">{tache.formulaire_titre}</h4>
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tache.formulaire_code}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span>Assigné à : <strong>{tache[`${activeStep.toLowerCase()}_prenom`] || '?'} {tache[`${activeStep.toLowerCase()}_nom`] || ''}</strong></span>
                              {tache.date_soumission && (
                                <span>Soumis le {format(new Date(tache.date_soumission), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                              )}
                              {tache.commentaire_verification && activeStep === 'VALIDATION' && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={12} /> Commentaire vérif. : {tache.commentaire_verification}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canAct && activeStep === 'EXECUTION' && (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleExecuter(tache)}
                                className="btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                              >
                                <Send size={13} /> Remplir
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarquerExecute(tache.id)}
                                className="btn-primary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                              >
                                <CheckCircle size={13} /> Marquer exécuté
                              </button>
                            </div>
                          )}
                          {canAct && activeStep === 'VERIFICATION' && (
                            <button
                              type="button"
                              onClick={() => setVerifyModal(tache)}
                              className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                            >
                              <FileCheck size={13} /> Vérifier
                            </button>
                          )}
                          {canAct && activeStep === 'VALIDATION' && (
                            <button
                              type="button"
                              onClick={() => setValidateModal(tache)}
                              className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                            >
                              <ShieldCheck size={13} /> Valider
                            </button>
                          )}
                          {!canAct && (
                            <span className="text-xs text-muted-foreground italic">En attente</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {verifyModal && (
        <ActionModal
          title="Vérification de la tâche"
          tache={verifyModal}
          onClose={() => setVerifyModal(null)}
          onConfirm={(commentaire) => handleVerifier(verifyModal, commentaire)}
          confirmLabel="Confirmer la vérification"
          confirmIcon={<FileCheck size={16} />}
          showComment
          commentLabel="Commentaire de vérification"
        />
      )}

      {validateModal && (
        <ActionModal
          title="Validation de la tâche"
          tache={validateModal}
          onClose={() => setValidateModal(null)}
          onConfirm={(commentaire) => handleValider(validateModal, commentaire)}
          confirmLabel="Valider la tâche"
          confirmIcon={<ShieldCheck size={16} />}
          showComment
          commentLabel="Commentaire de validation"
        />
      )}
    </div>
  );
}

function ActionModal({ title, tache, onClose, onConfirm, confirmLabel, confirmIcon, showComment, commentLabel }) {
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm(commentaire);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <p><span className="font-semibold">Formulaire :</span> {tache.formulaire_titre}</p>
          <p><span className="font-semibold">Code :</span> {tache.formulaire_code}</p>
          {tache.commentaire_verification && (
            <p><span className="font-semibold">Commentaire vérif. :</span> {tache.commentaire_verification}</p>
          )}
        </div>

        {showComment && (
          <div>
            <label className="label">{commentaire || 'Commentaire'}</label>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Saisissez un commentaire…"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : confirmIcon}
            {loading ? 'Traitement…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
