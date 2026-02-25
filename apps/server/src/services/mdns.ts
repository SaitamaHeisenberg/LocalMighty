import Bonjour from 'bonjour-service';
import { getLocalIpAddress } from '../utils/network.js';

let bonjourInstance: Bonjour | null = null;

export function startMdnsAdvertisement(port: number) {
  try {
    bonjourInstance = new Bonjour();

    bonjourInstance.publish({
      name: 'LocalMighty',
      type: 'localmighty',
      port: port,
      txt: {
        version: '1.0.0',
        protocol: 'socket.io',
        ip: getLocalIpAddress(),
      },
    });

    console.log(`mDNS service advertised as _localmighty._tcp on port ${port}`);
  } catch (error) {
    console.warn('mDNS advertisement failed (optional feature):', error);
  }
}

export function stopMdnsAdvertisement() {
  if (bonjourInstance) {
    bonjourInstance.unpublishAll();
    bonjourInstance.destroy();
    bonjourInstance = null;
    console.log('mDNS service stopped');
  }
}

export function discoverServices(callback: (service: { name: string; host: string; port: number }) => void) {
  if (!bonjourInstance) {
    bonjourInstance = new Bonjour();
  }

  bonjourInstance.find({ type: 'localmighty' }, (service) => {
    callback({
      name: service.name,
      host: service.host,
      port: service.port,
    });
  });
}
