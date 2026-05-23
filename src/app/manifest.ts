import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Emerald Cash Systems',
    short_name: 'Emerald Cash',
    description: 'Vehicle inventory, stock management, and staff training tools for Emerald Cash operations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#10b981', // emerald-500
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      { name: 'Vehicles', short_name: 'Vehicles', url: '/vehicles' },
      { name: 'LMS', short_name: 'LMS', url: '/lms' },
      { name: 'SMS', short_name: 'SMS', url: '/sms' }
    ]
  };
}
