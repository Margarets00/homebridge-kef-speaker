import type { API } from 'homebridge';

import { KefLsxIIPlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, KefLsxIIPlatform);
};
