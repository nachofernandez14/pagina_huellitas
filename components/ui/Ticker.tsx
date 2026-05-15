import styles from './Ticker.module.css';

const ITEMS = [
  'Donde cada huellita importa',

  'Alimentos premium para tu mascota',

  'Accesorios y todo lo que necesita',
  
  'Las mejores marcas',
];

export default function Ticker() {
  // Duplicamos para que el scroll sea continuo sin cortes
  const repeated = [...ITEMS, ...ITEMS];

  return (
    <div className={styles.ticker}>
      <div className={styles.track}>
        {repeated.map((text, i) => (
          <span key={i} className={styles.item}>
            {text}
            <span className={styles.sep}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
