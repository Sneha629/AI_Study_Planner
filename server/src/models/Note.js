const { Schema, model } = require('mongoose')

const noteSchema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'txt'], required: true },
    // Raw text kept so cards can be regenerated
    extractedText: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

module.exports = model('Note', noteSchema)
