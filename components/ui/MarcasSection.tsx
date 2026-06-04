import Image from 'next/image';
import styles from './MarcasSection.module.css';

const MARCAS = [
  { nombre: 'Agility',      img: '/images/marcas/agility.png'       },
  { nombre: 'Biomax',       img: '/images/marcas/biomax.jpeg'        },
  { nombre: 'Canfeed',      img: '/images/marcas/canfeed.jpg'        },
  { nombre: 'Cat Chow',     img: '/images/marcas/cat_chow.png'       },
  { nombre: 'Dog Selection',img: '/images/marcas/dog_selection.png'  },
  { nombre: 'Essential',    img: '/images/marcas/essential.png'      },
  { nombre: 'Exact',        img: '/images/marcas/exact.jpg'          },
  { nombre: 'Gati',         img: '/images/marcas/gati.jpg'           },
  { nombre: 'Gooster',      img: '/images/marcas/gooster.png'        },
  { nombre: 'Gran Campeón', img: '/images/marcas/gran_campeon.jpg'   },
  { nombre: 'Ken-L',        img: '/images/marcas/ken-l.jpg'          },
  { nombre: 'Estampa',      img: '/images/marcas/logo-estampa3.jpg'  },
  { nombre: 'Instinto',     img: '/images/marcas/Logo_instinto.png'  },
  { nombre: 'Nutribon',     img: '/images/marcas/nutribon.jfif'      },
  { nombre: 'Optimun',      img: '/images/marcas/optimun.jpg'        },
  { nombre: 'Pedigree',     img: '/images/marcas/pedigree-logo.png'  },
  { nombre: 'Sabrositos',   img: '/images/marcas/sabrositos.jfif'    },
  { nombre: 'Sieger',       img: '/images/marcas/sieger.png'         },
  { nombre: 'Upper',        img: '/images/marcas/upper.jpg'          },
  { nombre: 'Vagoneta',     img: '/images/marcas/VAGONETA-LOGO.png'  },
  { nombre: 'Voraz',        img: '/images/marcas/voraz.png'          },
  { nombre: 'Whiskas',      img: '/images/marcas/whiskas.jpg'        },
];

export default function MarcasSection() {
  return (
    <section className={styles.marcasSection}>
      <div className="container">
        <h2 className={`section-title text-center ${styles.marcasTitle}`}>Marcas que trabajamos</h2>
        <div className={styles.marcasTrack}>
          {MARCAS.map((marca) => (
            <div key={marca.nombre} className={styles.marcaItem}>
              <Image
                src={marca.img}
                alt={marca.nombre}
                width={130}
                height={70}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
