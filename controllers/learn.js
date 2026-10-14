// The public guides under /learn. They're plain pages: each view sets its own
// title and description through the head partial.
module.exports = {

    getLearn: async (req, res, next) => {
      try {
          res.render('learn/index.ejs');
    } catch(err) {
      next(err)
      }
    },

    getDvirGuide: async (req, res, next) => {
      try {
          res.render('learn/dvir.ejs');
    } catch(err) {
      next(err)
      }
    },

    getPreTripGuide: async (req, res, next) => {
      try {
          res.render('learn/pre-trip.ejs');
    } catch(err) {
      next(err)
      }
    },

}
