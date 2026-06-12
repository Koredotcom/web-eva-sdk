import store from "../../redux/store";
import { fetchGeneratedFiles } from "../../redux/actions/global.action";

/**
 * Maps a raw generated artifact item from the API into a stable, consumer-friendly shape.
 *
 * @param {object} el Raw file item from the API response.
 */
const dataStructuring = (el) => {
    return {
        id: el?.id,
        fileName: el?.fileName,
        fileExtension: el?.fileExtension,
        fileType: el?.fileType,
        size: el?.size,
        uploadedBy: el?.uploadedBy,
        boardId: el?.boardId,
        accountId: el?.accountId,
        createdOn: el?.createdOn,
        resourceId: el?.resourceId,
        resourceType: el?.resourceType,
        encrypted: el?.encrypted,
        parentId: el?.parentId,
        scope: el?.scope,
    };
};

/**
 * Fetches the list of generated artifact files for the current user.
 *
 * Endpoint: GET /ka/users/:userId/files?fileContext=generatedArtifacts&limit=
 *
 * @param {object} [props]
 * @param {number} [props.limit=15]   Max number of files to return.
 * @param {number} [props.skip]       Number of records to skip for pagination.
 * @returns {Promise<{status: string, error: any, data: Array, hasMore: boolean} | {error: true, message: string}>}
 */
const GeneratedFiles = async (props) => {
    const userId = window.sdkConfig?.userId || store.getState()?.global?.profile?.data?.id;

    if (!userId) {
        return { error: true, message: "SDK not initialized. userId is required" };
    }

    const params = {
        limit: props?.limit || 15,
    };
    if (props?.skip !== undefined && props?.skip !== null) {
        params.skip = props.skip;
    }

    try {
        const response = await store
            .dispatch(fetchGeneratedFiles({ userId, params }))
            .unwrap();

        return {
            status: "success",
            error: null,
            data: (response?.files || []).map((el) => dataStructuring(el)),
            hasMore: response?.moreAvailable || false,
        };
    } catch (error) {
        return {
            error: true,
            message: error?.data?.errors?.[0]?.msg || "Unable to fetch generated files",
        };
    }
};

export default GeneratedFiles;
