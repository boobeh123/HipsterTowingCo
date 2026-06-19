module.exports = {

    getTerms: async (req, res, next) => {
      try {
          res.render('terms.ejs');
    } catch(err) {
      next(err)
      }
    },

}