import FileUpload from './fileUpload'

const UploadFile = event => {
    return FileUpload().uploadFile(event)
}

export default UploadFile