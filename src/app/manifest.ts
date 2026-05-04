import { MetadataRoute } from 'next';
// This is a loop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EmeraldCash VMS',
    short_name: 'VMS',
    description: 'Vehicle Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#10b981', // emerald-500
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      { name: 'Add Vehicle', url: '/vehicles/add' },
      { name: 'LMS', url: '/lms' }
    ]
  };
}