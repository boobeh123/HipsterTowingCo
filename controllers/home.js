module.exports = {
    getIndex: (req,res)=>{
        if (req.isAuthenticated()) {
            res.redirect('/todos')
          } else {
            res.render('index.ejs')
          }
    }
}