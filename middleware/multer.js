const multer = require('multer')
const path = require('path')

/**************************************************************
 * Allowed image types
 * A file is accepted only when its extension AND its MIME type
 * both map to the same entry here. The extension is lowercased
 * first, so photo.JPG is treated the same as photo.jpg.
 *
 * Caveat worth knowing: file.mimetype is the Content-Type the
 * client put in the multipart body — multer never reads the file's
 * actual bytes. This check stops honest mistakes, not a determined
 * attacker. Cloudinary is what genuinely validates the contents:
 * it decodes and re-encodes the image server-side and rejects
 * anything that isn't really an image.
 **************************************************************/
const ALLOWED_TYPES = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
}

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

const upload = multer({
    storage: multer.diskStorage({}),
    limits: {
        fileSize: MAX_FILE_BYTES,
        files: 1, // Reject extra file parts appended to the request
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()

        if (!Object.hasOwn(ALLOWED_TYPES, ext) || ALLOWED_TYPES[ext] !== file.mimetype) {
            return cb(new Error('Please upload a JPG or PNG image.'), false)
        }

        cb(null, true)
    },
})

/**************************************************************
 * uploadProfilePhoto
 * Wraps upload.single('file') so an upload failure becomes a flash
 * message and a redirect instead of an error page.
 *
 * Multer reports failures by calling next(err), which skips straight
 * to the central error handler and renders errors/500.ejs. That means
 * a user picking a .gif or an oversized photo would get a full error
 * page rather than being told what to do differently. Catching the
 * error here keeps the flash-then-redirect pattern the controllers
 * already use.
 **************************************************************/
const uploadProfilePhoto = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) { return next() }

        let message
        if (err instanceof multer.MulterError) {
            message = err.code === 'LIMIT_FILE_SIZE'
                ? 'That image is too large. Please upload a file under 5MB.'
                : 'That file could not be uploaded. Please try again.'
        } else {
            message = err.message || 'That file could not be uploaded. Please try again.'
        }

        req.flash('errors', [{ msg: message }])
        req.session.save((saveErr) => {
            if (saveErr) { return next(saveErr) }
            res.redirect('/profile')
        })
    })
}

module.exports = { uploadProfilePhoto }
