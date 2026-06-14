import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
        style={{ color: 'var(--primary)' }}
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={0.5 + path.id * 0.03}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { login, moduleScope } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', mot_de_passe: '' });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!form.email || !form.mot_de_passe) return toast.error('Veuillez remplir tous les champs');
    setLoading(true);
    try {
      const utilisateur = await login(form.email, form.mot_de_passe);
      toast.success('Connexion réussie !');
      if (utilisateur?.role === 'Admin') {
        navigate(moduleScope ? '/' : '/modules');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Centered Login Form */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <span className="font-display text-2xl font-bold text-primary">InnoFaso</span>
          </div>

          {/* Login Card */}
          <div className="rounded-md bg-white shadow-custom p-5 border border-border backdrop-blur-sm">
            {/* Header with Icon */}
            <div className="flex items-start space-x-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
                <LogIn className="h-5 w-5 text-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Connexion
                </h2>
                <p className="text-sm text-muted-foreground">
                  Accédez à votre espace de travail
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-3">
              {/* Email Field */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({...p, email: e.target.value}))}
                  placeholder="vous@innofaso.bf"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
                  autoComplete="email"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={form.mot_de_passe}
                  onChange={e => setForm(p => ({...p, mot_de_passe: e.target.value}))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
                  autoComplete="current-password"
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    className="w-3 h-3 border border-border rounded bg-white cursor-pointer focus:ring-0 focus:ring-offset-0"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Se souvenir de moi
                  </label>
                </div>
                <button type="button" className="text-xs text-primary hover:underline">
                  Mot de passe oublié?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-opacity cursor-pointer inline-flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"/>
                    <span>Connexion…</span>
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">InnoFaso © {new Date().getFullYear()}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
