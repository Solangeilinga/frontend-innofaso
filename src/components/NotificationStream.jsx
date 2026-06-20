import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const VITE_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ICONS = {
  PANNE:               <AlertTriangle size={16} className="text-red-500"/>,
  FORMULAIRE_EN_RETARD:<Bell size={16} className="text-orange-500"/>,
  VALIDATION:          <CheckCircle size={16} className="text-green-500"/>,
  DEFAULT:             <Info size={16} className="text-blue-500"/>,
};

function NotifToast({ message, type }) {
  const icon = ICONS[type] || ICONS.DEFAULT;
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, maxWidth:320 }}>
      <div style={{ flexShrink:0, marginTop:2 }}>{icon}</div>
      <div>
        <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#0f172a' }}>
          Nouvelle notification
        </p>
        <p style={{ margin:'2px 0 0', fontSize:12, color:'#64748b', lineHeight:1.4 }}>
          {message}
        </p>
      </div>
    </div>
  );
}

export default function NotificationStream() {
  const { isAuthenticated } = useAuth();
  const token = localStorage.getItem('if_token');
  const esRef  = useRef(null);
  const retryRef = useRef(null);

  const connect = useCallback(() => {
    if (!token || !isAuthenticated?.()) return;
    if (esRef.current) esRef.current.close();

    const url = `${VITE_API}/api/v1/alertes/stream`;
    // EventSource ne supporte pas les headers — on passe le token en query param
    const es = new EventSource(`${url}?token=${token}`);
    esRef.current = es;

    es.onopen = () => {
      clearTimeout(retryRef.current);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected') return;
        if (data.type === 'alerte' && data.alerte) {
          const { message, type_alerte } = data.alerte;
          toast.custom(
            <NotifToast message={message} type={type_alerte} />,
            {
              duration: 6000,
              position: 'top-right',
              style: {
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                padding: '12px 16px',
              },
            }
          );
          // Son discret
          try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA...').play().catch(()=>{}); } catch(_){}
        }
      } catch (_) {}
    };

    es.onerror = () => {
      es.close();
      // Reconnexion auto après 5s
      retryRef.current = setTimeout(connect, 5000);
    };
  }, [token, isAuthenticated]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      clearTimeout(retryRef.current);
    };
  }, [connect]);

  return null; // Pas de rendu — fonctionne en arrière-plan
}