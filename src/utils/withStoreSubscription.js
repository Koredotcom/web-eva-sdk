import store from "../redux/store";

const withStoreSubscription = (WrappedComponent) => {
  return (props) => {
    let state = store.getState();

    const unsubscribe = store.subscribe(() => {
      state = store.getState();
      // Trigger a re-render or call the wrapped component with the updated state
      WrappedComponent({ ...props, state });
    });

    // Cleanup function to unsubscribe when necessary
    const cleanup = () => {
      unsubscribe();
    };

    // Initial call to the wrapped component
    return WrappedComponent({ ...props, state, cleanup });
  };
};

export default withStoreSubscription;
