import FileUpload from "./fileUpload"
const RemoveContext = source => {
  return FileUpload().removeContext(source)
}

export default RemoveContext