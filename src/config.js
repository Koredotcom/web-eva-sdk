import BotConversation from "./chat/botAgent/getBotConversation";
// import CustomTemplateComponentManager from "./chat/botAgent/customTemplatesFolder/CustomTemplateComponentManager";
// import HoldConversationTemplateManager from "./chat/botAgent/customTemplatesFolder/HoldConversationTemplateManager";
import {
  fetchAgents,
  fetchConfigData,
  fetchProfileData,
  fetchHistory,
  fetchRecentFiles,
  presenceStart,
  getAllAnnouncements,
} from "./redux/actions/global.action";
import {
  setAnnouncements,
  setAutoRemoveWebSearchFromContext,
  setEnabledDebugging,
  setAppMetaData,
  setDisableHistorySectionInChatSection,
  setEnableContextByFollowupContext,
} from "./redux/globalSlice";
import store from "./redux/store";
import { WebSocketService } from "./socket/socket.service";
import { initializeSDKRuntime } from "./sdkRuntime";

export const initializeSDK = async (config) => {
  if (typeof window !== "undefined" && window.__EVA_SDK_INITIALIZED__) {
    console.warn(
      "EvaSDK already initialized. Ignoring duplicate initialization."
    );
    return;
  }

  const requiredKeys = ["accessToken", "api_url", "userId"];
  let initialHistoryLimit = config?.initialHistoryLimit || 10;

  let misConfig = false;
  requiredKeys.map((key) => {
    if (!Object.keys(config).includes(key)) {
      console.error(`SDK initialization error: '${key}' is required.`);
      misConfig = true;
      return;
    }
  });

  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    misConfig
  ) {
    return;
  }

  if (typeof window !== "undefined") {
    window.__EVA_SDK_INITIALIZED__ = true;
    window.sdkConfig = config;
  }

  if (config?.autoRemoveWebSearchFromContext) {
    store.dispatch(setAutoRemoveWebSearchFromContext(true));
  }

  const chatInterface = initializeSDKRuntime({
    containerId: config?.containerId,
  });
  if (config?.chatInterface) {
    chatInterface.configureChatInterfaceElements(config.chatInterface);
  }

  store.dispatch(fetchConfigData(config.userId));
  store.dispatch(fetchProfileData(config.userId));
  store.dispatch(fetchAgents({ userId: config.userId }));
  store.dispatch(
    fetchHistory({ onload: true, params: { limit: initialHistoryLimit } })
  );
  store.dispatch(
    fetchRecentFiles({
      onload: true,
      userId: config.userId,
      params: { limit: 10 },
    })
  );
  const announcementData = await store.dispatch(
    getAllAnnouncements({ params: { userId: config.userId } })
  );
  const announcementObj = {
    data: announcementData?.payload?.announcements,
    status: "success",
    error: null,
  };
  store.dispatch(setAnnouncements(announcementObj));

  store.dispatch(setAppMetaData(config.appMetaData));
  store.dispatch(
    setDisableHistorySectionInChatSection(
      config?.disableHistorySectionInChatSection || false
    )
  );

  await store.dispatch(presenceStart());

  store.dispatch(setEnabledDebugging(config.enableDebugging));

  if (Object.prototype.hasOwnProperty.call(config, "enableContextByFollowupContext")) {
    store.dispatch(
      setEnableContextByFollowupContext(config.enableContextByFollowupContext)
    );
  }

  if (config?.initializeBotSDK) {
    const botInstance = BotConversation();
    botInstance.initializeBotSDK(config.initializeBotSDK);
    botInstance.enableEVABotSdk(true);
  }

  WebSocketService.initialize({
    url: config.presence_url,
    options: {
      query: {
        userid: config.userId,
        channels: 7,
        sToken: store.getState().global?.presenceStart?.data?.sToken,
        rnd: new Date().getTime(),
      },
    },
  });
  WebSocketService.connect();
};
