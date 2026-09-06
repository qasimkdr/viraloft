const mongoose = require('mongoose');

const adSlotSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  placement: { type: String, required: true, trim: true },
  size: { type: String, default: 'responsive', trim: true },
  code: { type: String, default: '' },
  enabled: { type: Boolean, default: false },
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
  singletonKey: { type: String, unique: true, default: 'site' },
  siteName: { type: String, default: 'Viraloft' },
  siteTagline: { type: String, default: 'Social media growth tools and digital marketing resources.' },
  adsEnabled: { type: Boolean, default: false },
  adsenseClientId: { type: String, default: '' },
  adsTxtPublisherId: { type: String, default: '' },
  consentMessageEnabled: { type: Boolean, default: true },
  adSlots: {
    type: [adSlotSchema],
    default: () => [
      { key: 'home_top', label: 'Home top banner', placement: 'home-top', size: 'responsive', enabled: false, code: '' },
      { key: 'home_mid', label: 'Home in-content', placement: 'home-mid', size: 'responsive', enabled: false, code: '' },
      { key: 'content_sidebar', label: 'Content sidebar', placement: 'content-sidebar', size: '300x250', enabled: false, code: '' },
      { key: 'content_bottom', label: 'Content bottom', placement: 'content-bottom', size: 'responsive', enabled: false, code: '' },
    ],
  },
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
