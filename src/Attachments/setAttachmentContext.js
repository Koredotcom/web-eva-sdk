import FileUpload from './fileUpload'

const SetAttachmentContext = file => {
  return FileUpload().setAttachmentContext(file)
}

export default SetAttachmentContext