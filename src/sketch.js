// Project: Visitor
// Sketch 01: A Study of Emergent Behavior
//
// This file contains the complete logic for the Boids simulation,
// including UI creation, simulation logic, and rendering.

// --- Global UI Variables ---
let alignSlider, cohesionSlider, separationSlider, perceptionSlider, boidsSlider;

// --- Global Simulation Variables ---
const flock = [];

// --- p5.js Setup Function ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  // Set color mode to HSB (Hue, Saturation, Brightness) for intuitive color mapping.
  colorMode(HSB, 360, 100, 100, 100);

  // --- UI Initialization ---
  // Use the modular UI function (defined below) to create the control panels.
  alignSlider = createSliderModule('Alignment', 'How much boids steer to match neighbors\' direction.', 10, { min: 0, max: 5, defaultValue: 1, step: 0.1 });
  cohesionSlider = createSliderModule('Cohesion', 'How much boids steer towards the center of the flock.', 100, { min: 0, max: 5, defaultValue: 1, step: 0.1 });
  separationSlider = createSliderModule('Separation', 'How much boids steer to avoid crowding neighbors.', 190, { min: 0, max: 5, defaultValue: 1.5, step: 0.1 });
  perceptionSlider = createSliderModule('Perception', 'How far a boid can "see" its neighbors.', 280, { min: 0, max: 300, defaultValue: 50, step: 1 });
  boidsSlider = createSliderModule('Boid Count', 'The total number of boids in the simulation.', 370, { min: 1, max: 150, defaultValue: 100, step: 1 });

  // Attach an event listener to the boid count slider to dynamically change the flock size.
  boidsSlider.input(resetFlock);

  // --- Boid Initialization ---
  // Create the initial flock based on the slider's default value.
  resetFlock();
}

// --- p5.js Draw Function ---
function draw() {
  background(17, 17, 17);

  // Update and display every boid in the flock
  for (let boid of flock) {
    boid.edges();
    boid.flock(flock);
    boid.update();
    boid.show();
  }
}

/**
 * Resets the flock by clearing the array and repopulating it
 * based on the current value of the boidsSlider.
 */
function resetFlock() {
  flock.length = 0; // Clear the existing flock array.
  for (let i = 0; i < boidsSlider.value(); i++) {
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
    this.maxForce = 0.2; // Maximum steering force
    this.maxSpeed = 5;   // Maximum speed
  }

  edges() {
    if (this.position.x > width) this.position.x = 0;
    else if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    else if (this.position.y < 0) this.position.y = height;
  }

  // --- REFACTORED FLOCKING METHODS ---

  align(boids) {
    const perceptionRadius = perceptionSlider.value();
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.velocity);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      // Steering formula: steer = desired - velocity
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(boids) {
    const perceptionRadius = perceptionSlider.value();
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.position);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      // A vector pointing from the location to the target
      let desired = p5.Vector.sub(steering, this.position);
      desired.setMag(this.maxSpeed);
      // Steering formula: steer = desired - velocity
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector();
  }

  separation(boids) {
    const perceptionRadius = perceptionSlider.value();
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      // Only separate from very close neighbors
      if (other != this && d < perceptionRadius / 2) {
        // Calculate vector pointing away from neighbor
        let diff = p5.Vector.sub(this.position, other.position);
        // Weight by distance (the closer it is, the stronger we repel)
        diff.div(d); 
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      // Steering formula: steer = desired - velocity
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  flock(boids) {
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let separation = this.separation(boids);

    // Weight the forces using the sliders
    alignment.mult(alignSlider.value());
    cohesion.mult(cohesionSlider.value());
    separation.mult(separationSlider.value());

    // Apply the forces to acceleration
    this.acceleration.add(alignment);
    this.acceleration.add(cohesion);
    this.acceleration.add(separation);
  }

  update() {
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.acceleration.mult(0); // Reset acceleration each frame
  }

  show() {
    const angle = this.velocity.heading() + PI / 2;
    const speed = this.velocity.mag();
    const hue = map(speed, 0, this.maxSpeed, 240, 0); // Blue to Red

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

// --- Window Resize Handling ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// --- UI Helper Function ---
/**
 * Creates a complete slider module with a title, description, value display, and the slider itself.
 */
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
  // Position the value display to the right of the slider
  valueDisplay.position(slider.x + slider.width + 15, yPos + 40); 
  valueDisplay.style('color', '#FFF');

  slider.input(() => {
    valueDisplay.html(slider.value());
  });

  return slider;
}
