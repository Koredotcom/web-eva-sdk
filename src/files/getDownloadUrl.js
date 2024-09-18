import { getRecentFileDownloadUrl } from "../redux/actions/global.action";
import store from "../redux/store";


const GetDownloadUrl = (file) => {
	const userId = window.sdkConfig.userId;
	const params = {
		boardId:  userId,
		docId: file?.id,
		source: 'attachment'
	}
	store.dispatch(getRecentFileDownloadUrl({ userId, params }))

	return new Promise((resolve) => {
		const unsubscribe = store.subscribe(() => {
			const state = store.getState();
			const { status, error, data } = state.global.recentFileDownloadUrl;
			if (status !== 'loading') {
				unsubscribe();
				resolve({
					status,
					error,
					data: data,
				});
			}
		});
	});
}

export default GetDownloadUrl