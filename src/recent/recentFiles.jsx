import { Timedifference } from '../utils/helpers';
import store from "../redux/store";

const makeRecentFilesData = (data, unsortedProps, limit) => {
  let sortedObj = {}, unsorted = null, hasMore = false, status = '', error = null;

  const dataStructuring = (el) => {
    return {
      id: el?.id,
      fileName: el.fileName,
      fileExtension: el?.fileExtension,
      createdOn: el?.createdOn
    }
  }

  if (!unsortedProps) {
    data?.files?.map(el => {
      let dayscnt = Timedifference(el?.createdOn);
      if (sortedObj[dayscnt]) {
        sortedObj[dayscnt].push(dataStructuring(el));
      }
      else {
        sortedObj[dayscnt] = [];
        sortedObj[dayscnt].push(dataStructuring(el));
      }
    })
  } else {
    unsorted = data?.files
  }
  hasMore = data?.moreAvailable

  return { files: unsorted || sortedObj }
};

const RecentFiles = (props) => {
  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { status, error, data } = state.global.recentFiles;
      if (status !== 'loading') {
        unsubscribe();
        resolve({
          status,
          error,
          data: makeRecentFilesData(data, props?.unsorted, props?.limit) || {},
          hasMore: data?.moreAvailable || false
        });
      }
    });
  });
}

export default RecentFiles;
