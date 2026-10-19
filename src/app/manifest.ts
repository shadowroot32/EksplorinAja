import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EksplorinAja — Ruang Belajar AI',
    short_name: 'EksplorinAja',
    description: 'Ruang belajar AI untuk ringkasan, flashcard, kuis, dan progres belajar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#2563eb',
    lang: 'id',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
