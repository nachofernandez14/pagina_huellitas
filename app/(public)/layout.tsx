import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/ui/WhatsAppFloat';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1, paddingTop: '109px' }}>
        {children}
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
