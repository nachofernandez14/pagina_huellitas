'use client';

import { FAQ_ITEMS } from '@/lib/seo/faq';
import styles from './page.module.css';

export default function FAQContent() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="section-title text-center">Preguntas frecuentes — Huellitas Petshop Mendoza</h1>
      <p className="section-subtitle text-center">
        Envíos, pagos, devoluciones y compras online en Gran Mendoza
      </p>

      <div className={styles.faqList}>
        {FAQ_ITEMS.map((item, index) => (
          <details key={index} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>{item.question}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>

      <div className={styles.contactSection}>
        <h2>¿No encontraste tu respuesta?</h2>
        <p>Contactanos por WhatsApp o email. Atendemos Mendoza y Gran Mendoza.</p>
        <div className={styles.contactLinks}>
          <a
            href="https://wa.me/5492616635666?text=Hola%20Huellitas%2C%20tengo%20una%20pregunta"
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          <a href="mailto:petshophuellitas65@gmail.com" className="btn btn-secondary">
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
