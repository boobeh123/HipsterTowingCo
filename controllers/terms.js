module.exports = {

    getTerms: async (req, res) => {
      try {
          res.render('terms.ejs');
    } catch(err) {
      next(err)
      }
    },

}