import { HistoryData } from '../history'

const HistoryWidget = async (props) => {

  const params = {
    limit: props?.limit || 5,
    unsorted: props?.unsorted || false
  }

  const { data, hasMore, status, error } = await HistoryData(params)

  return { data, hasMore, status, error }

}

export default HistoryWidget