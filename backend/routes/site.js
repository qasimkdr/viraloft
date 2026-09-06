const express = require('express');
const SiteSettings = require('../models/SiteSettings');
const { protect } = require('../middleware/auth');
const { permit } = require('../middleware/roles');

const router = express.Router();

const getSettings = async () => SiteSettings.findOneAndUpdate(
  { singletonKey: 'site' },
  { $setOnInsert: { singletonKey: 'site' } },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

// Public configuration deliberately excludes disabled/raw admin-only fields.
router.get('/settings', async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      siteName: settings.siteName,
      siteTagline: settings.siteTagline,
      adsEnabled: settings.adsEnabled,
      adsenseClientId: settings.adsenseClientId,
      consentMessageEnabled: settings.consentMessageEnabled,
      adSlots: settings.adSlots
        .filter((slot) => settings.adsEnabled && slot.enabled && slot.code)
        .map(({ key, label, placement, size, code }) => ({ key, label, placement, size, code })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load site settings' });
  }
});

router.get('/ads.txt', async (_req, res) => {
  try {
    const settings = await getSettings();
    const publisher = String(settings.adsTxtPublisherId || '').trim();
    res.type('text/plain');
    if (!publisher) return res.send('# Configure the AdSense publisher ID in Admin > Monetization\n');
    return res.send(`google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`);
  } catch {
    res.status(500).type('text/plain').send('# Unable to load ads.txt configuration\n');
  }
});

router.get('/admin/settings', protect, permit('admin'), async (_req, res) => {
  try { res.json(await getSettings()); }
  catch { res.status(500).json({ message: 'Failed to load site settings' }); }
});

router.put('/admin/settings', protect, permit('admin'), async (req, res) => {
  try {
    const allowed = ['siteName', 'siteTagline', 'adsEnabled', 'adsenseClientId', 'adsTxtPublisherId', 'consentMessageEnabled', 'adSlots'];
    const update = {};
    allowed.forEach((key) => { if (Object.prototype.hasOwnProperty.call(req.body, key)) update[key] = req.body[key]; });
    const settings = await SiteSettings.findOneAndUpdate(
      { singletonKey: 'site' },
      { $set: update, $setOnInsert: { singletonKey: 'site' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update site settings' });
  }
});

module.exports = router;
