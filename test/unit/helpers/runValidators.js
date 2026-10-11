// Runs an express-validator chain against a mock request, the way its route
// does before calling the controller. Sanitizers such as trim() and
// normalizeEmail() update req.body in place, just as they do in the app.
module.exports = async (chain, req) => {
    for (const validator of chain) {
        await validator.run(req)
    }
}
