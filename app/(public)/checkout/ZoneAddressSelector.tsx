'use client';

import styles from './page.module.css';

const ZONAS = [
  { value: 'rodeo', label: 'Rodeo de la Cruz' },
  { value: 'corralitos', label: 'Corralitos' },
  { value: 'km8', label: 'KM 8' },
  { value: 'primavera', label: 'Primavera' },
];

interface Props {
  zona: string;
  direccion: string;
  onZonaChange: (zona: string) => void;
  onDireccionChange: (dir: string) => void;
}

export function ZoneAddressSelector({ zona, direccion, onZonaChange, onDireccionChange }: Props) {
  const zonaLabel = ZONAS.find((z) => z.value === zona)?.label ?? '';
  return (
    <>
      <div className={styles.zonaSection}>
        <label className={styles.zonaLabel}>Selecciona tu zona *</label>
        <div className={styles.zonaOpciones}>
          {ZONAS.map((z) => (
            <button
              key={z.value}
              type="button"
              className={`${styles.zonaBtn} ${zona === z.value ? styles.zonaBtnActive : ''}`}
              onClick={() => { onZonaChange(z.value); onDireccionChange(''); }}
            >
              {z.label}
            </button>
          ))}
        </div>
        {zona && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="direccion">Direccion en {zonaLabel} *</label>
            <input
              id="direccion"
              type="text"
              value={direccion}
              onChange={(e) => onDireccionChange(e.target.value)}
              placeholder={`Tu calle y numero en ${zonaLabel}`}
              required
              autoComplete="street-address"
            />
          </div>
        )}
      </div>
    </>
  );
}
