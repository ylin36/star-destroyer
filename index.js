// set up canvas
let canvas = document.createElement('canvas'); 
let ctx = canvas.getContext("2d"); 
document.body.appendChild(canvas); 
canvas.width = window.innerWidth; 
canvas.height = window.innerHeight;

let millisecondsPerFrame = 50;
let total_stars = 250;
let starStream = Rx.Observable.range(1, total_stars)
                    .map(s => {
                        return {
                            x: parseInt(Math.random() * canvas.width),
                            y: parseInt(Math.random() * canvas.height),
                            size: Math.random() * 3 + 1
                        };
                    })
                    .toArray() // collects all stars into an array observable and emit it
                    .flatMap(s => 
                        Rx.Observable.interval(millisecondsPerFrame)
                            .map(() => {
                                s.forEach(a => {
                                    if (a.y >= canvas.height)
                                        a.y = 0;
                                    a.y += 3;
                                })
                                return s;
                            })
                    );

Rx.Observable.combineLatest(
    starStream, s => { return { stars: s} })
    .subscribe(renderScene);


function paintStars(stars) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height); 
    ctx.fillStyle = '#ffffff'; 
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));
}

function renderScene(actors) {
    paintStars(actors.stars);
}