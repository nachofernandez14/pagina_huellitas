'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ProfileForm.module.css';

interface Props {
  initialNombre: string;
  initialTelefono: string;
  initialDireccion: string;
  initialZona: string;
}

const ZONAS = [
  { value: 'rodeo',      label: 'Rodeo de la Cruz' },
  { value: 'corralitos', label: 'Corralitos' },
  { value: 'km8',        label: 'KM 8' },
  { value: 'primavera',  label: 'Primavera' },
];

export default function ProfileForm({ initialNombre, initialTelefono, initialDireccion, initialZona }: Props) {
  const [nombre, setNombre] = useState(initialNombre);
  const [telefono, setTelefono] = useState(initialTelefono);
  const [direccion, setDireccion] = useState(initialDireccion);
  const [zona, setZona] = useState(initialZona);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, direccion, zona }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'ok', text: 'Datos actualizados correctamente.' });
        // Refresh server component so the page re-fetches the updated profile
        router.refresh();
      } else {
        setMsg({ type: 'error', text: data.error ?? 'Error al guardar' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Error de red. Intentá nuevamente.' });
    }
    setSaving(false);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-nombre">Nombre completo</label>
        <input
          id="pf-nombre"
          className={styles.input}
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
          maxLength={100}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-telefono">Teléfono</label>
        <input
          id="pf-telefono"
          className={styles.input}
          type="tel"
          value={telefono}
          onChange={(e) => {
            // Solo dígitos, máx 10
            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
            setTelefono(digits);
          }}
          placeholder="Ej: 2613456789"
          maxLength={10}
          inputMode="numeric"
          pattern="[0-9]{10}"
          title="Ingresá 10 dígitos sin el 0 ni el 15 (ej: 2613456789)"
        />
        <span className={styles.hint}>10 dígitos sin el 0 inicial ni el 15 (ej: 2613456789)</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-zona">Zona de entrega</label>
        <select
          id="pf-zona"
          className={styles.input}
          value={zona}
          onChange={(e) => setZona(e.target.value)}
        >
          <option value="">— Seleccioná tu zona —</option>
          {ZONAS.map((z) => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-direccion">Dirección de entrega</label>
        <input
          id="pf-direccion"
          className={styles.input}
          type="text"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Calle, número, piso/depto"
          maxLength={200}
        />
      </div>

      {msg && (
        <p className={`${styles.msg} ${msg.type === 'ok' ? styles.msgOk : styles.msgError}`}>
          {msg.text}
        </p>
      )}

      <button type="submit" className={`btn btn-primary ${styles.saveBtn}`} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}
