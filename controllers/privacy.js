module.exports = {

    getPrivacy: async (req, res, next) => {
      try {
          res.render('privacy.ejs');
    } catch(err) {
      next(err)
      }
    },

}