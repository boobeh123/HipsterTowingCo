module.exports = {

    getPrivacy: async (req, res) => {
      try {
          res.render('privacy.ejs');
    } catch(err) {
      next(err)
      }
    },

}