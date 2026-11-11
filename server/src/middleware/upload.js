const path = require('path')
const multer = require('multer')

const MAX_FILE_MB = 5
const ALLOWED = { '.pdf': 'pdf', '.txt': 'txt' }

// Files stay in memory: we only need the text, the file itself is never saved
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED[ext]) {
      return cb(Object.assign(new Error('Only .pdf and .txt files are allowed'), { status: 400 }))
    }
    cb(null, true)
  },
}).single('file')

// Runs multer for the "file" field and turns its errors into clear 400 messages.
// Sets req.file.fileType ("pdf" | "txt") and a readable req.file.originalname.
function uploadNote(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `File must be ${MAX_FILE_MB} MB or smaller`
          : 'Send one file in the "file" field'
      return res.status(400).json({ error: message })
    }
    if (err) return next(err)
    if (!req.file) {
      return res.status(400).json({ error: 'Choose a .pdf or .txt file to upload' })
    }
    // Multer reads file names as latin1; convert so Hindi or emoji names show correctly
    req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    req.file.fileType = ALLOWED[path.extname(req.file.originalname).toLowerCase()]
    next()
  })
}

module.exports = { uploadNote, MAX_FILE_MB }
