import { defineConfig } from 'vite';

const allowedHosts = ['mdslaney-ubuntu-01.lal.cisco.com'];

export default defineConfig({
  base: '/mermaider/',
  server: { host: '0.0.0.0', allowedHosts },
  preview: { host: '0.0.0.0', allowedHosts },
});
