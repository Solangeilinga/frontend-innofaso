import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Package } from 'lucide-react';
import { useAuth } from '../store/auth';

const MODULES = [
  {
    key: 'MAINTENANCE',
    title: 'Maintenance',
    description: 'Gestion des équipements, alertes, planning et stock.',
    fallback: Wrench,
  },
  {
    key: 'PRODUCTION',
    title: 'Production',
    description: 'Suivi des formulaires et des soumissions de production.',
    fallback: Package,
  },
];

const ACCENTS = {
  MAINTENANCE: {
    box: 'bg-primary/10 border-primary/20',
    text: 'text-primary',
    cta: 'text-primary',
  },
  PRODUCTION: {
    box: 'bg-secondary/10 border-secondary/20',
    text: 'text-secondary',
    cta: 'text-secondary',
  },
};

function ModuleCard({ moduleKey, title, description, iconSrc, iconAlt, fallback: Icon, onSelect }) {
  const [imgOk, setImgOk] = useState(true);
  const accent = ACCENTS[moduleKey];
  const showImg = iconSrc && imgOk;

  return (
    <button
      type="button"
      onClick={() => onSelect(moduleKey)}
      className="card w-full text-left transition-shadow hover:shadow-lg"
    >
      <div className="flex items-center gap-5">
        <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center ${accent.box}`}>
          {showImg ? (
            <img
              src={iconSrc}
              alt={iconAlt}
              className="w-10 h-10 object-contain"
              onError={() => setImgOk(false)}
            />
          ) : (
            <Icon size={28} className={accent.text} />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className={`ml-auto text-xs font-semibold ${accent.cta}`}>Ouvrir</div>
      </div>
    </button>
  );
}

export default function AdminModuleHomePage() {
  const navigate = useNavigate();
  const { selectModule } = useAuth();

  const handleSelect = (moduleKey) => {
    selectModule(moduleKey);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-foreground">Choisir un module</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Selectionnez votre espace de travail : maintenance ou production.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULES.map((module) => (
            <ModuleCard
              key={module.key}
              moduleKey={module.key}
              title={module.title}
              description={module.description}
              iconSrc={module.iconSrc}
              iconAlt={module.iconAlt}
              fallback={module.fallback}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground mt-8">
          <p>
            Icone maintenance :{' '}
            <a
              href="https://www.flaticon.com/fr/icones-gratuites/depanneur"
              title="depanneur icones"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Depanneur icones creees par bsd - Flaticon
            </a>
          </p>
          <p>
            Icone production :{' '}
            <a
              href="https://www.flaticon.com/fr/icones-gratuites/production"
              title="production icones"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:underline"
            >
              Production icones creees par Muhammad Ali - Flaticon
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
