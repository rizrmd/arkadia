import {chromium} from 'playwright';import {launchOptions} from '../typography/browser.mjs';
// QUIC is unreliable through this sandbox's outbound proxy; use standard HTTPS.
export const launch=()=>chromium.launch(launchOptions(['--disable-quic']));
