import { Component, Fragment } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

// Failure containment for one screen.
//
// A render error anywhere under this component used to unmount the whole tree:
// React tears down to the root when nothing catches, so one bad waypoint on the
// tracing screen took the header, the nav bar and the other six screens with
// it, and the only way back was closing the app. There is nothing a child can
// do with a blank white screen.
//
// One of these wraps each view in src/App.jsx, so a broken screen costs exactly
// that screen: the nav bar underneath is still React-rendered and still works,
// and every other view is a tap away.
//
// It is a class because that is what React still requires — getDerivedStateFromError
// and componentDidCatch have no hook equivalent. It is the only class in src/.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    // `attempt` keys the children below. Try again has to *remount* them, not
    // re-render them: whatever state made the last render throw is held in
    // those components, and handing them back the same state renders the same
    // error straight into the same boundary.
    this.state = { error: null, attempt: 0 };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // The stack is the only record of what happened — the card below says
    // nothing about the error, deliberately, because a parent reading it cannot
    // act on a stack trace and a child certainly cannot.
    console.error(`The ${this.props.label ?? 'app'} screen could not be drawn`, error, info?.componentStack);
  }

  handleRetry() {
    this.setState((previous) => ({ error: null, attempt: previous.attempt + 1 }));
  }

  render() {
    if (this.state.error === null) {
      return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
    }

    return (
      <div
        role="alert"
        className="flex-1 flex flex-col justify-center items-center p-4"
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-sm w-full flex flex-col items-center text-center gap-3">
          <div className="bg-amber-50 text-amber-600 w-14 h-14 rounded-2xl flex justify-center items-center">
            <TriangleAlert size={28} />
          </div>

          <h3 className="text-xl font-bold text-slate-800">Something went wrong loading this screen</h3>

          <p className="text-slate-600 font-medium text-sm">
            Nothing was lost — points, stickers and saved letters are all still here. Try this screen
            again, or go somewhere else and come back.
          </p>

          <button
            onClick={this.handleRetry}
            className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    );
  }
}
