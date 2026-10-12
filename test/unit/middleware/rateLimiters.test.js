const request = require('supertest');
const express = require('express');
const { inspectionSaveLimiter, photoUploadLimiter, passwordChangeLimiter, exportLimiter } = require('../../../middleware/rateLimiters');

// The limiters keep their counts for the whole run, so every test uses its
// own account ids.

// Stands in for passport and the session: the x-user header picks the account
const buildApp = (limiter, flash) => {
  const app = express();
  app.use((req, res, next) => {
    req.user = { _id: req.get('x-user') };
    req.flash = flash;
    req.session = { save: (cb) => cb(null) };
    next();
  });
  app.post('/target', limiter, (req, res) => res.json({ ok: true }));
  return app;
};

const postAs = (app, account, times) =>
  Array.from({ length: times }).reduce(
    (previous) => previous.then(() => request(app).post('/target').set('x-user', account)),
    Promise.resolve()
  );

describe('inspectionSaveLimiter', () => {
  const app = buildApp(inspectionSaveLimiter, jest.fn());

  it('should answer the 61st save in 15 minutes with a JSON 429', async () => {
    await postAs(app, 'save-a', 60);

    const response = await request(app).post('/target').set('x-user', 'save-a');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many inspections saved. Please wait a few minutes and try again.' });
  });

  it('should count each account separately', async () => {
    await postAs(app, 'save-b', 61);

    const response = await request(app).post('/target').set('x-user', 'save-c');

    expect(response.status).toBe(200);
  });
});

describe('photoUploadLimiter', () => {
  const flash = jest.fn();
  const app = buildApp(photoUploadLimiter, flash);

  // POST /profile/photo has no page of its own to go back to
  it('should send the 11th upload in an hour back to /profile with a message', async () => {
    await postAs(app, 'photo-a', 10);
    expect(flash).not.toHaveBeenCalled();

    const response = await request(app).post('/target').set('x-user', 'photo-a');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/profile');
    expect(flash).toHaveBeenCalledWith('errors', [{ msg: 'Too many photo uploads. Please wait an hour and try again.' }]);
  });
});

describe('passwordChangeLimiter', () => {
  const flash = jest.fn();
  const app = buildApp(passwordChangeLimiter, flash);

  // Counted per account: someone holding a stolen session can't keep guessing
  it('should send the 11th attempt in 15 minutes back to /profile with a message', async () => {
    await postAs(app, 'pw-a', 10);
    expect(flash).not.toHaveBeenCalled();

    const response = await request(app).post('/target').set('x-user', 'pw-a');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/profile');
    expect(flash).toHaveBeenCalledWith('errors', [{ msg: 'Too many password change attempts. Please wait 15 minutes and try again.' }]);
  });

  it('should count each account separately', async () => {
    const response = await request(app).post('/target').set('x-user', 'pw-b');

    expect(response.status).toBe(200);
  });
});

describe('exportLimiter', () => {
  const flash = jest.fn();
  const app = buildApp(exportLimiter, flash);

  it('should send the 21st export in 15 minutes back to /dashboard with a message', async () => {
    await postAs(app, 'export-a', 20);
    expect(flash).not.toHaveBeenCalled();

    const response = await request(app).post('/target').set('x-user', 'export-a');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/dashboard');
    expect(flash).toHaveBeenCalledWith('errors', [{ msg: 'Too many exports. Please wait a few minutes and try again.' }]);
  });
});
