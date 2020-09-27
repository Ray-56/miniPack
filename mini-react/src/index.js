import React from "./react";
import ReactDOM from "./react-dom";

/*
class ClassCounter extends React.Component {
    constructor(props) {
        super(props);
        this.state =  { number: 1 }
    }
    onClick = () => {
        this.setState(state => ({ number: state.number + 1}));
    }
    render() {
        return (
            <div id="counter">
                <span>{this.state.number}</span>
                <button onClick={this.onClick}>+1</button>
            </div>
        )
    }
}

ReactDOM.render(<ClassCounter name="计数器" />, document.getElementById('root'));
*/
const ADD = "ADD";
function reducer(state, action) {
	switch (action.type) {
		case ADD:
			return { count: state.count + 1 };
		default:
			return state;
	}
}

function FunctionCounter(props) {
	const [num, setNum] = React.useState(0);
	const [countState, dispatch] = React.useReducer(reducer, { count: 0 });
	return (
		<div>
			<div id="counter1">
				<span>{countState.count}</span>
				<button onClick={() => dispatch({ type: ADD })}>+1</button>
			</div>
			<div id="counter2">
				<span>{num}</span>
				<button onClick={() => setNum(num + 1)}>+1</button>
			</div>
		</div>
	);
}

ReactDOM.render(
	<FunctionCounter name="计数器" />,
	document.getElementById("root")
);
