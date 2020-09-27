/*

*/

let style = { border: '3px solid red', margin: '5px'};

let element = (
    <div id="A1" style={style}>
        A1
        <div>
            B1
            <div id="C1" style={style}>C1</div>
            <div id="C2" style={style}>C2</div>
        </div>
        <div id="B2" style={style}>B2</div>
    </div>
);

