/*
 * Keep the existing load-more contract: `loadmore` remains true for initial
 * and subsequent pages; the reducer uses `initialData` for replacement mode.
 */
import { fetchRecentFiles } from "../redux/actions/global.action";
import { setAllRecentFiles } from "../redux/globalSlice";
import store from "../redux/store";

let recentFilesOffset = 1

const LoadMoreRecentFiles = (props) => {

  const params = {
    limit: props?.limit || 10,
    offset: props?.initialData ? 0 : null || recentFilesOffset * (props?.limit || 10)
  }

  const state = store.getState();
  store.dispatch(setAllRecentFiles({...state.global.AllrecentFiles, status: 'loading'}))

  store.dispatch(fetchRecentFiles({
    loadmore: true,
    initialData: !!props?.initialData,
    userId: window.sdkConfig.userId,
    params,
  }))
  recentFilesOffset++

  const dataStructuring = (el) => {
    return {
      id: el?.id,
      fileName: el.fileName,
      fileExtension: el?.fileExtension,
      createdOn: el?.createdOn,
      fileType: el?.fileType,
      scope: el?.scope,
      size: el?.size,
      uploadedBy: el?.uploadedBy
    }
  }

  const recentFilesData = (data) => {
    return data.map(el => {
      return dataStructuring(el)
    })
  }

  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { status, error, data } = state.global.AllrecentFiles;
      if (status !== 'loading') {
        unsubscribe();
        resolve({
          status,
          error,
          data: recentFilesData(data?.files || []),
          hasMore: data?.moreAvailable || false
        });
      }
    });
  });
}

export default LoadMoreRecentFiles
