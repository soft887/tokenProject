import React, {ErrorInfo} from "react";
import { isDebug } from "../../settings";

export default class ErrorBoundary extends React.Component<any, {
    error: Error | null;
    errorInfo: ErrorInfo | null;
}> {
    constructor(props: any) {
        super(props);
        // this.state = { hasError: false };
        this.state = {error: null, errorInfo: null};
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({error,errorInfo});
    }

    render() {
        const {errorInfo, error} = this.state;
        if (errorInfo && error) {
            const {renderError} = this.props;
            if (renderError) {
                return renderError({...this.state});
            }
            else {
                console.error({errorInfo, error})
                return (<div>
                    <h1>Something went wrong</h1>
                    <h2>{`${error}`}</h2>
                    {isDebug && 
                        <pre>{`${errorInfo?.componentStack}`}</pre>
                    }
                </div>);
            }
        }

        return this.props.children;
    }
}