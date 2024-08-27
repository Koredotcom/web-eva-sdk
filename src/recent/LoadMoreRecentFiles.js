import { fetchRecentFiles } from "../redux/actions/global.action";
import store from "../redux/store";

const LoadMoreRecentFiles = async (props) => {
  store.dispatch(fetchRecentFiles({userId: window.sdkConfig.userId, params: {limit: props?.limit, offset: props?.offset}}))
};

export default LoadMoreRecentFiles;
