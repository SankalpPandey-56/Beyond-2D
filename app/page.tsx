import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Beyond 2D — From flat lines to living spaces',
  description: 'Transform your floor plans into immersive 3D spaces. See your ideas take shape beyond two dimensions.',
};

export default function LandingPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#0a0e27' }}>
      <iframe
        src="/landing/index.html"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Beyond 2D Architectural Landing Page"
      />
    </div>
  );
}
