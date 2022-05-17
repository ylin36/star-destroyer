// set up canvas
let canvas = document.createElement('canvas'); 
let shipImage = document.createElement('img');
let enemyImage = document.createElement('img')
shipImage.setAttribute('src', 'ship.png');
enemyImage.setAttribute('src', 'enemy.png');

let ctx = canvas.getContext("2d"); 
document.body.appendChild(canvas); 
canvas.width = window.innerWidth; 
canvas.height = window.innerHeight;

// background
let millisecondsPerFrame = 50;
let totalStars = 250;

// user
let shipY = canvas.height - 30;
let bulletSpeed = 15; // move up in pixels

// enemy
let enemyFrequency = 1500;

let backgroundStarsGenerator = Rx.Observable.range(1, totalStars)
    .map(s => {
        return {
            x: parseInt(Math.random() * canvas.width),
            y: parseInt(Math.random() * canvas.height),
            size: Math.random() * 3 + 1
        };
    })
    .toArray() // collects all stars into an array observable and emit it
    .switchMap(s => // return array of stars into an observable that emits its new location in intervals
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

let shipLocation = Rx.Observable.fromEvent(canvas, 'mousemove')
    .map(event => { 
        return {
                x: event.clientX, y: event.clientY };
            })
    .startWith({x: canvas.width / 2, y: shipY });   

// at each interval emit, accumulate another random enemy into total list of enemies
let enemyGenerator = Rx.Observable.interval(enemyFrequency)
    .scan(s => {
        let enemy = { x: parseInt(Math.random() * canvas.width), y: -30 };
        s.push(enemy);
        return s; 
    }, []);
                    
let playerFiring = Rx.Observable.merge(
        Rx.Observable.fromEvent(canvas, 'click'), 
        Rx.Observable.fromEvent(document, 'keydown').filter(function(evt) { 
            return evt.keyCode === 32; 
        }))
    .startWith({})
    .sample(200) // throttle firing at 200ms
    .timestamp();

// merge firing event with shiplocation, so when firing event happens, we can post ship location as bullet location
let shotBullets = Rx.Observable.combineLatest(
    playerFiring,
    shipLocation,
    (bullet, ship) => {   
        return { timestamp: bullet.timestamp, x: ship.x, y: ship.y }; 
    })
    .distinctUntilChanged(s => s.timestamp) // use timestamp to ensure events only trigger off bullet shot and not movement of ship
    .scan((firedShots, curShot) => { 
        firedShots.push({x: curShot.x, y: curShot.y}); 
        return firedShots;
}, []);

// MAIN clock
// combinate backgroundStarsGenerator and shipLocation, and enemyGenerator and set a projection function
// first emit when all events emited atleast once. once it emits, each emit from a source concat with latest emit from others
// a sampling speed is used to make the event emit at constant time. keep samping same as lowest speed of frame, to make it feel more consistent
Rx.Observable.combineLatest(backgroundStarsGenerator, shipLocation, enemyGenerator, shotBullets,
        (stars, ship, enemies, bullets) => { return { stars: stars, ship: ship, enemies: enemies, bullets: bullets} })
    .sample(millisecondsPerFrame)
    .subscribe(renderScene);

function renderScene(actors) {
    paintStars(actors.stars);
    paintSpaceShip(actors.ship.x, actors.ship.y);
    paintEnemies(actors.enemies, actors.ship);
    paintBullets(actors.bullets, actors.enemies);
}

// TODO: change this to binary stream background
function paintStars(stars) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height); 
    ctx.fillStyle = '#ffffff'; 
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));
}

function paintSpaceShip(x, y) { 
    ctx.drawImage(shipImage, x, y, 100, 100);
}

// Helper function to get a random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function paintEnemies(enemies, ship) { 
  enemies.forEach(function(enemy) {
    // make enemy go near ship
    
    enemy.y += ship.y > enemy.y ? 5 : -5;
    enemy.x += ship.x > enemy.x ? 5 : -5;
    ctx.drawImage(enemyImage, enemy.x, enemy.y, 100, 100);
  });
}

function paintBullets(bullets, enemies) {
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (collision(bullet, enemy)) {
                // move them off screen, they're gone
                bullet.x = bullet.y = enemy.x = enemy.y = -100;
            }
        });

        bullet.y -= bulletSpeed;
        ctx.drawImage(enemyImage, bullet.x + 50, bullet.y, 5, 5);
    }); 
}

function collision(obj1, obj2) {
  return (obj1.x > obj2.x - 50 && obj1.x < obj2.x + 50) &&
         (obj1.y > obj2.y - 50 && obj1.y < obj2.y + 50);
}

// TODO: incident going out of SLA. (incidents grow bigger)
// TODO: giant boss outage
// TODO: spawn CALM powerboost after giant boss to get big bullet (last 10 seconds)
// TODO: bullets are cpu spike / memory high
// TODO: spawn reboot server that destroy all incident temporarily and then spawn 10 incidents at once