// Project: Visitor
// Sketch 01: A Study of Emergent Behavior
//
// This file contains the complete logic for the Boids simulation,
// including UI creation, simulation logic, and rendering.

// --- Global UI Control Objects ---
let alignControl, cohesionControl, separationControl, perceptionControl, boidsControl, maxSpeedControl;
let autoPilotCheckbox, symbolSelect, controlsContainer;
let controlsVisible = true;

// --- Global Simulation Variables ---
const flock = [];
let time = 0; // A time variable to drive the Perlin noise for auto-pilot mode.

// --- Asset & Character Set Variables ---
const englishChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Expanded Tamil Character Set
const tamilChars = [
  'அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ',
  'க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன',
  'கா', 'கி', 'கு', 'கை', 'கோ', 'சா', 'சி', 'சு', 'சை', 'சோ', 'தா', 'தி', 'து', 'தை', 'தோ',
  'நா', 'நி', 'நு', 'நை', 'நோ', 'பா', 'பி', 'பு', 'பை', 'போ', 'மா', 'மி', 'மு', 'மை', 'மோ'
];

// --- p5.js Setup Function ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // --- UI Initialization ---
  // Container for controls
  controlsContainer = createDiv('');
  controlsContainer.position(10, 10);
  controlsContainer.style('width', '220px'); // Explicit width to prevent wrapping issues
  
  let yPos = 0;
  const yStep = 80; // Slightly reduced step for compactness
  
  // Create sliders with slightly shorter descriptions
  alignControl = createSliderModule('Alignment', 'Steer to match neighbors\' direction.', yPos, { min: 0, max: 5, defaultValue: 1, step: 0.1 }, controlsContainer);
  cohesionControl = createSliderModule('Cohesion', 'Steer towards flock center.', yPos += yStep, { min: 0, max: 5, defaultValue: 1, step: 0.1 }, controlsContainer);
  separationControl = createSliderModule('Separation', 'Steer to avoid crowding.', yPos += yStep, { min: 0, max: 5, defaultValue: 1.5, step: 0.1 }, controlsContainer);
  perceptionControl = createSliderModule('Perception', 'Distance to \'see\' neighbors.', yPos += yStep, { min: 0, max: 300, defaultValue: 50, step: 1 }, controlsContainer);
  maxSpeedControl = createSliderModule('Max Speed', 'Global speed limit.', yPos += yStep, { min: 1, max: 10, defaultValue: 5, step: 0.1 }, controlsContainer);
  boidsControl = createSliderModule('Boid Count', 'Total number of boids.', yPos += yStep, { min: 1, max: 250, defaultValue: 100, step: 1 }, controlsContainer);
  
  // --- Symbol Selector ---
  let symbolLabelContainer = createDiv().parent(controlsContainer).style('color', '#FFF').style('font-family', 'sans-serif');
  symbolLabelContainer.position(0, yPos += yStep);
  createP('Boid Symbol').parent(symbolLabelContainer).style('margin', '0').style('font-weight', 'bold');
  
  symbolSelect = createSelect();
  symbolSelect.parent(symbolLabelContainer);
  symbolSelect.style('margin-top', '5px');
  symbolSelect.style('width', '100%');
  symbolSelect.option('Triangle');
  symbolSelect.option('Stateful o/x');
  symbolSelect.option('English Letters');
  symbolSelect.option('Tamil Letters');
  
  // --- Auto Pilot Checkbox ---
  autoPilotCheckbox = createCheckbox('Auto-Pilot', true);
  autoPilotCheckbox.parent(controlsContainer);
  autoPilotCheckbox.position(0, yPos + 60);
  autoPilotCheckbox.style('color', 'white');
  autoPilotCheckbox.style('font-family', 'sans-serif');

  // --- Color Legend ---
  createColorLegend(yPos + 100, controlsContainer);

  // Fix: Chain the resetFlock callback with the UI update
  boidsControl.slider.input(() => {
    resetFlock();
    boidsControl.valueDisplay.html(boidsControl.slider.value());
  });
  
  createHelpPopup();
  createVisibilityToggle();
  resetFlock();
}

// --- p5.js Draw Function ---
function draw() {
  background(17, 17, 17);

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
    this.isAgitated = false;
    this.char = random(englishChars.split(''));
    this.tamilChar = random(tamilChars);
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
    this.isAgitated = false;
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
      if (steering.mag() > this.maxForce * 0.5) {
          this.isAgitated = true;
      }
    }
    return steering;
  }

  flock(boids) {
    let separation = this.separation(boids);
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);

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
    const size = 12;

    push();
    translate(this.position.x, this.position.y);
    
    if (symbolSelect.value() === 'Triangle') {
      rotate(angle);
    }
    
    fill(hue, 90, 90, 80);
    stroke(hue, 90, 100);

    let symbol = symbolSelect.value();

    switch (symbol) {
      case 'Triangle':
        const triSize = 5;
        beginShape();
        vertex(0, -triSize * 2);
        vertex(-triSize, triSize * 2);
        vertex(triSize, triSize * 2);
        endShape(CLOSE);
        break;
      
      case 'Stateful o/x':
        textAlign(CENTER, CENTER);
        textSize(size);
        if (this.isAgitated) {
          strokeWeight(2);
          text('×', 0, 0);
        } else {
          strokeWeight(1);
          noFill();
          circle(0, 0, size * 0.8);
        }
        break;

      case 'English Letters':
        textAlign(CENTER, CENTER);
        textSize(size);
        textStyle(BOLD);
        text(this.char, 0, 0);
        break;

      case 'Tamil Letters':
        textAlign(CENTER, CENTER);
        textSize(size * 1.5);
        textStyle(NORMAL);
        text(this.tamilChar, 0, 0);
        break;
    }
    
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// --- UI Helper Functions ---

function createSliderModule(title, description, yPos, sliderConfig, parent) {
  const textContainer = createDiv();
  if(parent) textContainer.parent(parent);
  textContainer.position(0, yPos);
  textContainer.style('color', '#FFF');
  textContainer.style('font-family', 'sans-serif');
  textContainer.style('width', '100%'); // Use full width of container

  const titleP = createP(title);
  titleP.parent(textContainer);
  titleP.style('margin', '0');
  titleP.style('font-weight', 'bold');

  const descP = createP(description);
  descP.parent(textContainer);
  descP.style('font-size', '11px'); // Slightly smaller font
  descP.style('margin', '2px 0 5px 0'); // Tighter margins
  descP.style('line-height', '1.2'); // Tighter line height

  const slider = createSlider(
    sliderConfig.min,
    sliderConfig.max,
    sliderConfig.defaultValue,
    sliderConfig.step
  );
  if(parent) slider.parent(parent);
  slider.position(0, yPos + 50); // Adjusted for tighter layout
  slider.style('width', '160px'); // Fixed slider width

  const valueDisplay = createSpan(slider.value());
  if(parent) valueDisplay.parent(parent);
  valueDisplay.position(170, yPos + 55); 
  valueDisplay.style('color', '#FFF');
  valueDisplay.style('font-family', 'monospace');

  slider.input(() => {
    valueDisplay.html(nfc(slider.value(), 1));
  });

  return { slider, valueDisplay };
}

function createColorLegend(yPos, parent) {
  const legendContainer = createDiv();
  if(parent) legendContainer.parent(parent);
  legendContainer.position(0, yPos);
  legendContainer.style('width', '100%');
  
  createP('Speed Legend').parent(legendContainer).style('color', '#FFF').style('font-family', 'sans-serif').style('font-weight', 'bold').style('margin', '0 0 5px 0');
  
  // Create gradient bar
  const gradientBar = createDiv();
  gradientBar.parent(legendContainer);
  gradientBar.style('width', '100%');
  gradientBar.style('height', '10px');
  gradientBar.style('background', 'linear-gradient(to right, blue, red)');
  gradientBar.style('border-radius', '5px');
  
  // Create labels container
  const labels = createDiv();
  labels.parent(legendContainer);
  labels.style('display', 'flex');
  labels.style('justify-content', 'space-between');
  labels.style('color', '#AAA');
  labels.style('font-family', 'sans-serif');
  labels.style('font-size', '10px');
  
  createSpan('Slow').parent(labels);
  createSpan('Fast').parent(labels);
}

function createVisibilityToggle() {
    const toggleButton = createButton('Hide Controls');
    toggleButton.position(10, height - 40);
    toggleButton.style('background', 'rgba(0,0,0,0.5)');
    toggleButton.style('color', 'white');
    toggleButton.style('border', '1px solid #555');
    toggleButton.style('padding', '5px 10px');
    toggleButton.style('cursor', 'pointer');
    
    toggleButton.mousePressed(() => {
        controlsVisible = !controlsVisible;
        if (controlsVisible) {
            controlsContainer.show();
            toggleButton.html('Hide Controls');
        } else {
            controlsContainer.hide();
            toggleButton.html('Show Controls');
        }
    });
}

function createHelpPopup() {
  const popup = createDiv('');
  popup.position(0, 0);
  popup.size(width, height);
  popup.style('background-color', 'rgba(0, 0, 0, 0.75)');
  popup.style('display', 'flex');
  popup.style('justify-content', 'center');
  popup.style('align-items', 'center');
  popup.style('z-index', '100');
  popup.hide();

  const contentBox = createDiv('');
  contentBox.parent(popup);
  contentBox.style('background-color', '#282828');
  contentBox.style('color', 'white');
  contentBox.style('padding', '20px 30px');
  contentBox.style('border-radius', '10px');
  contentBox.style('max-width', '80%');
  contentBox.style('font-family', 'sans-serif');
  contentBox.style('line-height', '1.5');

  createP('About This Sketch').parent(contentBox).style('font-weight', 'bold').style('font-size', '20px').style('margin-top', '0');
  createP('This is a simulation of flocking behavior, also known as \'Boids.\' Each of the hundreds of boids follows only three simple rules, yet the complex and life-like flocking motion you see is <strong>emergent</strong>—it arises naturally from their interactions, without any central leader.').parent(contentBox);
  
  createP('How to Interact').parent(contentBox).style('font-weight', 'bold').style('font-size', '20px');
  createP('Use the sliders on the left to control the boids\' \'desires.\' By default, an \'Auto-Pilot\' mode is on, which orchestrates the sliders for you. Uncheck it to take manual control. Try different combinations to see how the flock\'s behavior changes!').parent(contentBox);

  const createdByP = createP('Created by : ').parent(contentBox);
  const vivekLink = createA('https://www.linkedin.com/in/vivekfeelfree/', 'Vivek Rajaselvam', '_blank').parent(createdByP);
  vivekLink.style('color', '#8ab4f8');

  const vibedViaP = createP('Vibed via : ').parent(contentBox);
  const geminiLink = createA('https://geminicli.com/', 'Gemini CLI', '_blank').parent(vibedViaP);
  geminiLink.style('color', '#8ab4f8');
  
  const sourceCodeLink = createA('https://github.com/vivekfeelfree/visitor', 'Open Source Code', '_blank');
  sourceCodeLink.parent(contentBox);
  sourceCodeLink.style('color', '#8ab4f8');

  createP('').parent(contentBox);

  const closeButton = createButton('Close');
  closeButton.parent(contentBox);
  closeButton.mousePressed(() => popup.hide());

  const helpButton = createButton('?');
  helpButton.position(width - 40, 10);
  helpButton.style('font-size', '20px');
  helpButton.style('border-radius', '50%');
  helpButton.style('width', '30px');
  helpButton.style('height', '30px');
  helpButton.mousePressed(() => popup.show());
}
