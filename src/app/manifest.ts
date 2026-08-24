import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Emerald Cash Systems',
    short_name: 'Emerald Cash',
    description: 'Vehicle inventory, stock management, and staff training tools for Emerald Cash operations.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f8fafc',
    theme_color: '#10b981', // emerald-500
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'VMS - Vehicle Valuation', short_name: 'VMS', url: '/vms', icons: [{ src: '/vms-icon.svg', sizes: 'any', type: 'image/svg+xml' }] },
      { name: 'LMS - Learning Center', short_name: 'LMS', url: '/lms', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'SMS - Asset Inventory', short_name: 'SMS', url: '/sms/assets', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ]
  };
}
