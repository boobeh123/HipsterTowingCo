module.exports = {

    getPrivacy: async (req, res) => {
      try {
          res.render('privacy.ejs');
    } catch(err) {
        console.error(err)
        res.status(500).render('500.ejs');
      }
    },

}