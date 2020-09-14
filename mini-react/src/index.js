import React from './react';
import ReactDOM from './react-dom';

let style = { border: '3px solid red', margin: '5px'};

let element1 = (
    <div id="A1" style={style}>
        A11
        <div id="B1">
            B1
            <div id="C1" style={style}>C1</div>
            <div id="C2" style={style}>C2</div>
        </div>
        <div id="B2" style={style}>B2</div>
    </div>
);

ReactDOM.render(
    element1,
    document.getElementById('root')
);

let render2 = document.getElementById('render2');
render2.addEventListener('click', () => {
    let element2 = (
        <div id="A1-new" style={style}>
            A1-new
            <div id="B1-new">
                B1-new
                <div id="C1-new" style={style}>C1-new</div>
                <div id="C2-new" style={style}>C2-new</div>
            </div>
            <div id="B2-new" style={style}>B2</div>
            <div id="B3-new" style={style}>B3</div>
        </div>
    );
    
    ReactDOM.render(
        element2,
        render2
    );
});

let render3 = document.getElementById('render2');
render3.addEventListener('click', () => {
    let element2 = (
        <div id="A1-new2" style={style}>
            A1-new2
            <div id="B1-new2">
                B1-new2
                <div id="C1-new2" style={style}>C1-new2</div>
                <div id="C2-new2" style={style}>C2-new2</div>
            </div>
            <div id="B2-new2" style={style}>B22</div>
        </div>
    );
    
    ReactDOM.render(
        element2,
        render3
    );
});
