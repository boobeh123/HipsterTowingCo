const Newsletter = require('../models/Newsletter');

exports.subscribe = async (req, res) => {
    try {
      const email = req.body.email;
      if (!email) {
        if (req.headers['content-type'] === 'application/json') {
          return res.status(400).send('Email is required');
        }
        return res.redirect('/?error=1');
      }
      await Newsletter.create({ email });
      if (req.headers['content-type'] === 'application/json') {
        return res.status(200).send('Subscribed!');
      }
      res.redirect('/?subscribed=1');
    } catch (err) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).send('This email is already subscribed or invalid.');
      }
      res.redirect('/?error=1');
    }
  };