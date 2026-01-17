// Project: Visitor
// Sketch 01: A Study of Emergent Behavior
//
// This file contains the complete logic for the Boids simulation,
// including UI creation, simulation logic, and rendering.

// --- Global UI Control Objects ---
// Each 'Control' will hold a slider and its value display.
let alignControl, cohesionControl, separationControl, perceptionControl, boidsControl, maxSpeedControl;
let autoPilotCheckbox;

// --- Global Simulation Variables ---
const flock = [];
let time = 0; // A time variable to drive the Perlin noise for auto-pilot mode.

// --- p5.js Setup Function ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // --- UI Initialization ---
  let yPos = 10;
  const yStep = 90;
  
  alignControl = createSliderModule('Alignment', 'How much boids steer to match neighbors\' direction.', yPos, { min: 0, max: 5, defaultValue: 1, step: 0.1 });
  cohesionControl = createSliderModule('Cohesion', 'How much boids steer towards the center of the flock.', yPos += yStep, { min: 0, max: 5, defaultValue: 1, step: 0.1 });
  separationControl = createSliderModule('Separation', 'How much boids steer to avoid crowding neighbors.', yPos += yStep, { min: 0, max: 5, defaultValue: 1.5, step: 0.1 });
  perceptionControl = createSliderModule('Perception', 'How far a boid can "see" its neighbors.', yPos += yStep, { min: 0, max: 300, defaultValue: 50, step: 1 });
  maxSpeedControl = createSliderModule('Max Speed', 'The global maximum speed for all boids.', yPos += yStep, { min: 1, max: 10, defaultValue: 5, step: 0.1 });
  boidsControl = createSliderModule('Boid Count', 'The total number of boids in the simulation.', yPos += yStep, { min: 1, max: 150, defaultValue: 100, step: 1 });
  
  autoPilotCheckbox = createCheckbox('Auto-Pilot', true);
  autoPilotCheckbox.position(10, yPos += yStep);
  autoPilotCheckbox.style('color', 'white');
  autoPilotCheckbox.style('font-family', 'sans-serif');

  boidsControl.slider.input(resetFlock);
  
  // Create the help popup panel
  createHelpPopup();
  
  // Create the initial flock
  resetFlock();
}

// --- p5.js Draw Function ---
function draw() {
  background(17, 17, 17);

  // --- Auto-Pilot Logic ---
  if (autoPilotCheckbox.checked()) {
    time += 0.005;

    let alignValue = map(noise(time), 0, 1, 0, 5);
    let cohesionValue = map(noise(time + 100), 0, 1, 0, 5);
    let separationValue = map(noise(time + 200), 0, 1, 0, 5);
    let perceptionValue = map(noise(time + 300), 0, 1, 50, 200);

    alignControl.slider.value(alignValue);
    cohesionControl.slider.value(cohesionValue);
    separationControl.slider.value(separationValue);
    perceptionControl.slider.value(perceptionValue);

    alignControl.valueDisplay.html(nfc(alignValue, 1));
    cohesionControl.valueDisplay.html(nfc(cohesionValue, 1));
    separationControl.valueDisplay.html(nfc(separationValue, 1));
    perceptionControl.valueDisplay.html(nfc(perceptionValue, 0));
  }

  for (let boid of flock) {
    boid.edges();
    boid.flock(flock);
    boid.update();
    boid.show();
  }
}

function resetFlock() {
  flock.length = 0;
  for (let i = 0; i < boidsControl.slider.value(); i++) {
    flock.push(new Boid());
  }
}

// --- Boid Class ---
class Boid {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(2, 4));
    this.acceleration = createVector();
    this.maxForce = 0.2;
  }

  edges() {
    if (this.position.x > width) this.position.x = 0;
    else if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    else if (this.position.y < 0) this.position.y = height;
  }

  align(boids) {
    const perceptionRadius = perceptionControl.slider.value();
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      const d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.velocity);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(maxSpeedControl.slider.value());
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(boids) {
    const perceptionRadius = perceptionControl.slider.value();
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      const d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.position);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      let desired = p5.Vector.sub(steering, this.position);
      desired.setMag(maxSpeedControl.slider.value());
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector();
  }

  separation(boids) {
    const perceptionRadius = perceptionControl.slider.value();
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      const d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius / 2) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.div(d);
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(maxSpeedControl.slider.value());
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  flock(boids) {
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let separation = this.separation(boids);

    alignment.mult(alignControl.slider.value());
    cohesion.mult(cohesionControl.slider.value());
    separation.mult(separationControl.slider.value());

    this.acceleration.add(alignment);
    this.acceleration.add(cohesion);
    this.acceleration.add(separation);
  }

  update() {
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.limit(maxSpeedControl.slider.value());
    this.acceleration.mult(0);
  }

  show() {
    const angle = this.velocity.heading() + PI / 2;
    const speed = this.velocity.mag();
    const maxSpeed = maxSpeedControl.slider.value();
    const hue = map(speed, 0, maxSpeed, 240, 0);

    push();
    translate(this.position.x, this.position.y);
    rotate(angle);
    const size = 5;
    fill(hue, 90, 90, 80);
    stroke(hue, 90, 100);
    beginShape();
    vertex(0, -size * 2);
    vertex(-size, size * 2);
    vertex(size, size * 2);
    endShape(CLOSE);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// --- UI Helper Functions ---

function createSliderModule(title, description, yPos, sliderConfig) {
  const textContainer = createDiv();
  textContainer.position(10, yPos);
  textContainer.style('color', '#FFF');
  textContainer.style('font-family', 'sans-serif');

  const titleP = createP(title);
  titleP.parent(textContainer);
  titleP.style('margin', '0');
  titleP.style('font-weight', 'bold');

  const descP = createP(description);
  descP.parent(textContainer);
  descP.style('font-size', '12px');
  descP.style('margin', '2px 0 10px 0');

  const slider = createSlider(
    sliderConfig.min,
    sliderConfig.max,
    sliderConfig.defaultValue,
    sliderConfig.step
  );
  slider.position(10, yPos + 60);

  const valueDisplay = createSpan(slider.value());
  valueDisplay.position(slider.x + slider.width + 15, yPos + 40);
  valueDisplay.style('color', '#FFF');

  slider.input(() => {
    valueDisplay.html(nfc(slider.value(), 1)); // nfc is p5's number formatting
  });

  return { slider, valueDisplay };
}

function createHelpPopup() {
  // Create the main popup container, hidden by default
  const popup = createDiv('');
  popup.position(0, 0);
  popup.size(width, height);
  popup.style('background-color', 'rgba(0, 0, 0, 0.75)');
  popup.style('display', 'flex');
  popup.style('justify-content', 'center');
  popup.style('align-items', 'center');
  popup.style('z-index', '100'); // Ensure it's on top
  popup.hide();

  // Create the content box inside the popup
  const contentBox = createDiv('');
  contentBox.parent(popup);
  contentBox.style('background-color', '#282828');
  contentBox.style('color', 'white');
  contentBox.style('padding', '20px 30px');
  contentBox.style('border-radius', '10px');
  contentBox.style('max-width', '80%');
  contentBox.style('font-family', 'sans-serif');
  contentBox.style('line-height', '1.5');

  // Add content to the box
  createP('About This Sketch').parent(contentBox).style('font-weight', 'bold').style('font-size', '20px').style('margin-top', '0');
  createP('This is a simulation of flocking behavior, also known as "Boids." Each of the hundreds of boids follows only three simple rules, yet the complex and life-like flocking motion you see is <strong>emergent</strong>—it arises naturally from their interactions, without any central leader.').parent(contentBox);
  
  createP('How to Interact').parent(contentBox).style('font-weight', 'bold').style('font-size', '20px');
  createP('Use the sliders on the left to control the boids\' "desires." By default, an "Auto-Pilot" mode is on, which orchestrates the sliders for you. Uncheck it to take manual control. Try different combinations to see how the flock\'s behavior changes!').parent(contentBox);

  // Attribution and link
  const createdByP = createP('Created by : ').parent(contentBox);
  const vivekLink = createA('https://www.linkedin.com/in/vivekfeelfree/', 'Vivek Rajaselvam', '_blank').parent(createdByP);
  vivekLink.style('color', '#8ab4f8');

  const vibedViaP = createP('Vibed via : ').parent(contentBox);
  const geminiLink = createA('https://geminicli.com/', 'Gemini CLI', '_blank').parent(vibedViaP);
  geminiLink.style('color', '#8ab4f8');
  
  const sourceCodeLink = createA('https://github.com/vivekfeelfree/visitor', 'Open Source Code', '_blank');
  sourceCodeLink.parent(contentBox);
  sourceCodeLink.style('color', '#8ab4f8');

  // Add a blank line for spacing before the close button
  createP('').parent(contentBox);

  // Create the close button
  const closeButton = createButton('Close');
  closeButton.parent(contentBox);
  closeButton.mousePressed(() => popup.hide());

  // Create the main 'Help' button to show the popup
  const helpButton = createButton('?');
  helpButton.position(width - 40, 10);
  helpButton.style('font-size', '20px');
  helpButton.style('border-radius', '50%');
  helpButton.style('width', '30px');
  helpButton.style('height', '30px');
  helpButton.mousePressed(() => popup.show());
}
