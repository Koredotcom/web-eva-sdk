import store from "../redux/store";

const PossibilitiesWidget = () => {
  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.global.config.possibilities) {
        unsubscribe();
        resolve({ possibilitiesData: state.global.config.possibilities });
      }
    });
  });
}

export default PossibilitiesWidget