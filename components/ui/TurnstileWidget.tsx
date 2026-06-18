'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!containerRef.current || !siteKey) return;

    const container = containerRef.current;

    const renderWidget = () => {
      if (!container || !window.turnstile) return;

      const existingWidgetId = container.getAttribute('data-turnstile-widget');
      if (existingWidgetId) {
        widgetIdRef.current = existingWidgetId;
        return;
      }

      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => {
          widgetIdRef.current = null;
          container.removeAttribute('data-turnstile-widget');
          onExpire?.();
        },
        'error-callback': () => {
          widgetIdRef.current = null;
          container.removeAttribute('data-turnstile-widget');
          onError?.();
        },
      });
      container.setAttribute('data-turnstile-widget', widgetIdRef.current!);
      setReady(true);
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector(`script[src="${TURNSTILE_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', renderWidget);
      } else {
        const script = document.createElement('script');
        script.src = TURNSTILE_URL;
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      // No hacemos nada en cleanup para que el widget sobreviva al
      // doble montaje de React Strict Mode en desarrollo. Al navegar
      // a otra página, el DOM se destruye y limpia todo naturalmente.
    };
  }, [siteKey, onVerify, onExpire, onError]);

  if (!siteKey) {
    console.error('NEXT_PUBLIC_TURNSTILE_SITE_KEY no configurada');
    return null;
  }

  return (
    <div style={{ minHeight: '65px', display: 'flex', justifyContent: 'center' }}>
      <div ref={containerRef} />
    </div>
  );
}
