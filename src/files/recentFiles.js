import store from "../redux/store";

const RecentFiles = () => {

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
    let obj = data.map(el => {
      return dataStructuring(el)
    })
    return obj;
  }

  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { status, error, data } = state.global.recentFiles;
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
export default RecentFiles;
